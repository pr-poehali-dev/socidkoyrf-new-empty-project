import json
import os
import hashlib

import psycopg2

SCHEMA = os.environ.get('MAIN_DB_SCHEMA', 'public')

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
    'Access-Control-Max-Age': '86400',
}


def q(value):
    if value is None:
        return 'NULL'
    if isinstance(value, bool):
        return 'TRUE' if value else 'FALSE'
    if isinstance(value, (int, float)):
        return str(value)
    return "'" + str(value).replace("\\", "\\\\").replace("'", "''") + "'"


def respond(status, payload):
    return {
        'statusCode': status,
        'headers': {**CORS, 'Content-Type': 'application/json'},
        'isBase64Encoded': False,
        'body': json.dumps(payload, ensure_ascii=False, default=str),
    }


def sha256(value):
    return hashlib.sha256(value.encode('utf-8')).hexdigest()


def auth_token(event):
    headers = event.get('headers') or {}
    for key in ('X-Auth-Token', 'x-auth-token'):
        if headers.get(key):
            return headers[key]
    return ''


def client_ip(event):
    ctx = event.get('requestContext') or {}
    return ((ctx.get('identity') or {}).get('sourceIp')) or ''


def user_agent(event):
    headers = event.get('headers') or {}
    for key in ('User-Agent', 'user-agent'):
        if headers.get(key):
            return headers[key][:400]
    return ''


def verify_owner(conn, token):
    """Вошёл -> активен -> второй вход -> владелец."""
    if not token:
        return None
    owner_vk_id = os.environ.get('OWNER_VK_ID')
    if not owner_vk_id:
        return None

    with conn.cursor() as cur:
        cur.execute(
            f"SELECT s.id, u.id FROM {SCHEMA}.sessions s "
            f"JOIN {SCHEMA}.users u ON u.id = s.user_id "
            f"WHERE s.token_hash = {q(sha256(token))} AND s.revoked_at IS NULL "
            f"AND s.expires_at > now() AND u.status = 'active'"
        )
        row = cur.fetchone()
        if not row:
            return None
        session_id, user_id = row

        cur.execute(
            f"SELECT 1 FROM {SCHEMA}.elevated_sessions "
            f"WHERE session_id = {q(session_id)} AND revoked_at IS NULL AND expires_at > now()"
        )
        if not cur.fetchone():
            return None

        cur.execute(
            f"SELECT 1 FROM {SCHEMA}.user_identities "
            f"WHERE user_id = {q(user_id)} AND provider = 'vk' "
            f"AND provider_user_id = {q(str(owner_vk_id).strip())}"
        )
        if not cur.fetchone():
            return None

    return user_id


def owner_log(conn, user_id, action, target, details, ip, ua):
    with conn.cursor() as cur:
        cur.execute(
            f"INSERT INTO {SCHEMA}.owner_log (user_id, action, target, details, ip, user_agent) "
            f"VALUES ({q(user_id)}, {q(action)}, {q(target)}, {q(details)}, {q(ip)}, {q(ua)})"
        )
    conn.commit()


def norm_article(value):
    if not value:
        return None
    cleaned = ''.join(ch for ch in str(value).upper() if ch.isalnum())
    return cleaned or None


def ref_id(conn, table, name):
    """Находит или создаёт элемент справочника, возвращает id."""
    if not name:
        return None
    name = str(name).strip()
    if not name:
        return None
    with conn.cursor() as cur:
        cur.execute(f"SELECT id FROM {SCHEMA}.{table} WHERE lower(name) = lower({q(name)})")
        row = cur.fetchone()
        if row:
            return row[0]
        cur.execute(f"INSERT INTO {SCHEMA}.{table} (name) VALUES ({q(name)}) RETURNING id")
        return cur.fetchone()[0]


def refs(conn):
    out = {}
    with conn.cursor() as cur:
        for key, table in (('groups', 'nom_groups'), ('brands', 'nom_brands'), ('features', 'nom_features')):
            cur.execute(f"SELECT id, name FROM {SCHEMA}.{table} ORDER BY name")
            out[key] = [{'id': r[0], 'name': r[1]} for r in cur.fetchall()]
    return out


def list_items(conn, params):
    search = (params.get('search') or '').strip()
    group_id = params.get('group_id')
    brand_id = params.get('brand_id')
    limit = min(int(params.get('limit') or 50), 200)
    offset = int(params.get('offset') or 0)

    where = ['1=1']
    if search:
        like = q('%' + search.lower() + '%')
        where.append(
            f"(lower(coalesce(n.model,'')) LIKE {like} OR lower(coalesce(n.article,'')) LIKE {like} "
            f"OR lower(coalesce(b.name,'')) LIKE {like} OR lower(coalesce(g.name,'')) LIKE {like} "
            f"OR EXISTS (SELECT 1 FROM {SCHEMA}.nomenclature_supplier_names sn "
            f"WHERE sn.nomenclature_id = n.id AND lower(sn.name) LIKE {like}))"
        )
    if group_id:
        where.append(f"n.group_id = {q(int(group_id))}")
    if brand_id:
        where.append(f"n.brand_id = {q(int(brand_id))}")
    cond = ' AND '.join(where)

    with conn.cursor() as cur:
        cur.execute(
            f"SELECT count(*) FROM {SCHEMA}.nomenclature n "
            f"LEFT JOIN {SCHEMA}.nom_brands b ON b.id = n.brand_id "
            f"LEFT JOIN {SCHEMA}.nom_groups g ON g.id = n.group_id WHERE {cond}"
        )
        total = cur.fetchone()[0]

        cur.execute(
            f"SELECT n.id, g.name, b.name, n.model, n.article, n.weight, n.volume, "
            f"coalesce((SELECT array_agg(f.name ORDER BY f.name) FROM {SCHEMA}.nomenclature_features nf "
            f"JOIN {SCHEMA}.nom_features f ON f.id = nf.feature_id WHERE nf.nomenclature_id = n.id), '{{}}') "
            f"FROM {SCHEMA}.nomenclature n "
            f"LEFT JOIN {SCHEMA}.nom_brands b ON b.id = n.brand_id "
            f"LEFT JOIN {SCHEMA}.nom_groups g ON g.id = n.group_id "
            f"WHERE {cond} ORDER BY n.id DESC LIMIT {limit} OFFSET {offset}"
        )
        items = [
            {
                'id': r[0], 'group': r[1], 'brand': r[2], 'model': r[3], 'article': r[4],
                'weight': float(r[5]) if r[5] is not None else None,
                'volume': float(r[6]) if r[6] is not None else None,
                'features': list(r[7] or []),
            }
            for r in cur.fetchall()
        ]
    return {'items': items, 'total': total, 'limit': limit, 'offset': offset}


def get_item(conn, item_id):
    with conn.cursor() as cur:
        cur.execute(
            f"SELECT n.id, n.group_id, g.name, n.brand_id, b.name, n.model, n.article, "
            f"n.weight, n.volume, n.created_at, n.updated_at, n.upload_id, n.ext_1c_id "
            f"FROM {SCHEMA}.nomenclature n "
            f"LEFT JOIN {SCHEMA}.nom_brands b ON b.id = n.brand_id "
            f"LEFT JOIN {SCHEMA}.nom_groups g ON g.id = n.group_id WHERE n.id = {q(int(item_id))}"
        )
        r = cur.fetchone()
        if not r:
            return None
        item = {
            'id': r[0], 'group_id': r[1], 'group': r[2], 'brand_id': r[3], 'brand': r[4],
            'model': r[5], 'article': r[6],
            'weight': float(r[7]) if r[7] is not None else None,
            'volume': float(r[8]) if r[8] is not None else None,
            'created_at': r[9], 'updated_at': r[10], 'upload_id': r[11], 'ext_1c_id': r[12],
        }
        cur.execute(
            f"SELECT f.id, f.name FROM {SCHEMA}.nomenclature_features nf "
            f"JOIN {SCHEMA}.nom_features f ON f.id = nf.feature_id "
            f"WHERE nf.nomenclature_id = {q(int(item_id))} ORDER BY f.name"
        )
        item['features'] = [{'id': x[0], 'name': x[1]} for x in cur.fetchall()]

        cur.execute(
            f"SELECT id, supplier_name, name, created_at FROM {SCHEMA}.nomenclature_supplier_names "
            f"WHERE nomenclature_id = {q(int(item_id))} ORDER BY id"
        )
        item['supplier_names'] = [
            {'id': x[0], 'supplier': x[1], 'name': x[2], 'created_at': x[3]} for x in cur.fetchall()
        ]

        cur.execute(
            f"SELECT id, supplier_name, article FROM {SCHEMA}.nomenclature_supplier_articles "
            f"WHERE nomenclature_id = {q(int(item_id))} ORDER BY id"
        )
        item['supplier_articles'] = [
            {'id': x[0], 'supplier': x[1], 'article': x[2]} for x in cur.fetchall()
        ]
    return item


def save_item(conn, user_id, body):
    item_id = body.get('id')
    group_id = ref_id(conn, 'nom_groups', body.get('group'))
    brand_id = ref_id(conn, 'nom_brands', body.get('brand'))
    model = (body.get('model') or '').strip() or None
    article = (body.get('article') or '').strip() or None
    if not article and model:
        article = model
    weight = body.get('weight')
    volume = body.get('volume')
    weight = float(weight) if weight not in (None, '') else None
    volume = float(volume) if volume not in (None, '') else None

    with conn.cursor() as cur:
        if item_id:
            cur.execute(
                f"UPDATE {SCHEMA}.nomenclature SET group_id = {q(group_id)}, brand_id = {q(brand_id)}, "
                f"model = {q(model)}, article = {q(article)}, article_norm = {q(norm_article(article))}, "
                f"weight = {q(weight)}, volume = {q(volume)}, updated_at = now() "
                f"WHERE id = {q(int(item_id))} RETURNING id"
            )
            row = cur.fetchone()
            if not row:
                return None
            item_id = row[0]
        else:
            cur.execute(
                f"INSERT INTO {SCHEMA}.nomenclature "
                f"(group_id, brand_id, model, article, article_norm, weight, volume, created_by) "
                f"VALUES ({q(group_id)}, {q(brand_id)}, {q(model)}, {q(article)}, "
                f"{q(norm_article(article))}, {q(weight)}, {q(volume)}, {q(user_id)}) RETURNING id"
            )
            item_id = cur.fetchone()[0]

        features = body.get('features') or []
        cur.execute(
            f"DELETE FROM {SCHEMA}.nomenclature_features WHERE nomenclature_id = {q(int(item_id))}"
        )
        for name in features:
            fid = ref_id(conn, 'nom_features', name)
            if fid:
                cur.execute(
                    f"INSERT INTO {SCHEMA}.nomenclature_features (nomenclature_id, feature_id) "
                    f"VALUES ({q(int(item_id))}, {q(fid)}) ON CONFLICT DO NOTHING"
                )

        supplier_name = (body.get('supplier_name') or '').strip()
        source_name = (body.get('source_name') or '').strip()
        if source_name:
            cur.execute(
                f"INSERT INTO {SCHEMA}.nomenclature_supplier_names "
                f"(nomenclature_id, supplier_name, name) "
                f"VALUES ({q(int(item_id))}, {q(supplier_name or None)}, {q(source_name)})"
            )
    conn.commit()
    return item_id


def handler(event: dict, context) -> dict:
    """Справочник номенклатуры: список, карточка, создание и правка. Только владелец."""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'isBase64Encoded': False, 'body': ''}

    params = event.get('queryStringParameters') or {}
    action = params.get('action') or 'list'

    if action == 'health':
        return respond(200, {'status': 'ok'})

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    try:
        user_id = verify_owner(conn, auth_token(event))
        if not user_id:
            return respond(403, {'error': 'forbidden'})

        ip = client_ip(event)
        ua = user_agent(event)

        if action == 'list':
            data = list_items(conn, params)
            data['refs'] = refs(conn)
            return respond(200, data)

        if action == 'item':
            item = get_item(conn, params.get('id') or 0)
            if not item:
                return respond(404, {'error': 'not_found'})
            return respond(200, {'item': item, 'refs': refs(conn)})

        if action == 'save' and method == 'POST':
            body = json.loads(event.get('body') or '{}')
            item_id = save_item(conn, user_id, body)
            if not item_id:
                return respond(404, {'error': 'not_found'})
            owner_log(
                conn, user_id, 'nomenclature_save', str(item_id),
                'Сохранена позиция номенклатуры', ip, ua,
            )
            return respond(200, {'id': item_id, 'item': get_item(conn, item_id)})

        return respond(404, {'error': 'unknown_action'})
    finally:
        conn.close()
