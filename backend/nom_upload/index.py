import json
import os
import re
import hashlib

import psycopg2

SCHEMA = os.environ.get('MAIN_DB_SCHEMA', 'public')

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
    'Access-Control-Max-Age': '86400',
}

LAT_TO_CYR = {
    'A': 'А', 'B': 'В', 'C': 'С', 'E': 'Е', 'H': 'Н', 'K': 'К', 'M': 'М',
    'O': 'О', 'P': 'Р', 'T': 'Т', 'X': 'Х', 'Y': 'У',
    'a': 'а', 'c': 'с', 'e': 'е', 'o': 'о', 'p': 'р', 'x': 'х', 'y': 'у',
}
CYR_TO_LAT = {v: k for k, v in LAT_TO_CYR.items()}

INVISIBLE = re.compile(r'[\u00a0\u200b\u200c\u200d\ufeff\t\r\n]+')


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


def clean(text):
    if text is None:
        return ''
    text = INVISIBLE.sub(' ', str(text))
    return re.sub(r'\s{2,}', ' ', text).strip()


def to_alphabet(text, mode):
    """Переписывает буквы-двойники в выбранную сторону. Возвращает текст и список непереводимых."""
    if not text or mode not in ('lat', 'cyr'):
        return text, []
    table = CYR_TO_LAT if mode == 'lat' else LAT_TO_CYR
    bad = set()
    out = []
    for ch in text:
        if ch in table:
            out.append(table[ch])
            continue
        if mode == 'lat' and 'а' <= ch.lower() <= 'я':
            bad.add(ch)
        if mode == 'cyr' and 'a' <= ch.lower() <= 'z':
            bad.add(ch)
        out.append(ch)
    return ''.join(out), sorted(bad)


def norm_article(value):
    if not value:
        return None
    cleaned = ''.join(ch for ch in str(value).upper() if ch.isalnum())
    return cleaned or None


MODEL_RE = re.compile(r'^[A-Za-zА-Яа-я\-./]*\d[\w\-./]*$')
CODE_RE = re.compile(r'^[A-Z]{2,}$')
UNIT_RE = re.compile(r'^\d+[.,]?\d*(вт|w|в|v|мм|см|м|кг|г|л|ач|ah|гц|hz|шт)$', re.I)
LAT_WORD_RE = re.compile(r'^[A-Za-z][A-Za-z&\-]+$')


def parse_name(name, groups, brands):
    """Разбирает наименование на группу, бренд, модель и признаки."""
    words = [w.strip('.,;') for w in re.split(r'[\s,;]+', name) if w.strip('.,;')]
    low = name.lower()

    brand = None
    for b in brands:
        if re.search(r'(^|\W)' + re.escape(b.lower()) + r'(\W|$)', low):
            if brand is None or len(b) > len(brand):
                brand = b

    group = None
    for g in groups:
        if re.search(r'(^|\W)' + re.escape(g.lower()), low):
            if group is None or len(g) > len(group):
                group = g
    if not group and words:
        first = words[0]
        if not MODEL_RE.match(first) and (not brand or first.lower() != brand.lower()):
            group = first

    if not brand:
        for w in words:
            if group and w.lower() in group.lower().split():
                continue
            if LAT_WORD_RE.match(w) and not CODE_RE.match(w):
                brand = w
                break

    used = set()
    for part in (group, brand):
        if part:
            for w in part.split():
                used.add(w.lower())

    free = [w for w in words if w.lower() not in used]

    model = None
    model_idx = -1
    for i, w in enumerate(free):
        if UNIT_RE.match(w):
            continue
        if MODEL_RE.match(w):
            model = w
            model_idx = i
            break

    if model_idx > 0:
        prev = free[model_idx - 1]
        if CODE_RE.match(prev):
            model = prev + ' ' + model
            model_idx -= 1

    rest = []
    skip = set()
    if model:
        parts = model.split()
        for i in range(model_idx, model_idx + len(parts)):
            skip.add(i)
    for i, w in enumerate(free):
        if i in skip:
            continue
        rest.append(w)

    features = [r for r in rest if len(r) > 1]
    return {
        'group': group,
        'brand': brand,
        'model': model,
        'features': features[:8],
    }


def load_refs(conn):
    with conn.cursor() as cur:
        cur.execute(f"SELECT name FROM {SCHEMA}.nom_groups")
        groups = [r[0] for r in cur.fetchall()]
        cur.execute(f"SELECT name FROM {SCHEMA}.nom_brands")
        brands = [r[0] for r in cur.fetchall()]
    return groups, brands


def find_match(conn, article_norm, group, brand, model):
    """Ищет существующую позицию: сперва по очищенному артикулу, потом по бренду и модели."""
    with conn.cursor() as cur:
        if article_norm:
            cur.execute(
                f"SELECT id FROM {SCHEMA}.nomenclature WHERE article_norm = {q(article_norm)} LIMIT 1"
            )
            row = cur.fetchone()
            if row:
                return row[0], 'совпадение'
            cur.execute(
                f"SELECT nomenclature_id FROM {SCHEMA}.nomenclature_supplier_articles "
                f"WHERE article_norm = {q(article_norm)} LIMIT 1"
            )
            row = cur.fetchone()
            if row:
                return row[0], 'совпадение'
        if brand and model:
            cur.execute(
                f"SELECT n.id FROM {SCHEMA}.nomenclature n "
                f"LEFT JOIN {SCHEMA}.nom_brands b ON b.id = n.brand_id "
                f"WHERE lower(coalesce(b.name,'')) = lower({q(brand)}) "
                f"AND lower(coalesce(n.model,'')) = lower({q(model)}) LIMIT 1"
            )
            row = cur.fetchone()
            if row:
                return row[0], 'похоже'
    return None, 'новое'


def analyze(conn, body):
    rows = body.get('rows') or []
    alpha_name = body.get('alpha_name') or 'none'
    alpha_article = body.get('alpha_article') or 'none'
    groups, brands = load_refs(conn)

    out = []
    for r in rows:
        raw_name = clean(r.get('name'))
        raw_article = clean(r.get('article'))
        problems = []

        name, bad_name = to_alphabet(raw_name, alpha_name)
        article, bad_art = to_alphabet(raw_article, alpha_article)
        if bad_name:
            problems.append('непереводимые буквы в наименовании: ' + ' '.join(bad_name))
        if bad_art:
            problems.append('непереводимые буквы в артикуле: ' + ' '.join(bad_art))

        if not name:
            out.append({
                'row': r.get('row'), 'raw_name': raw_name, 'verdict': 'проблема',
                'problems': ['пустое наименование'], 'skip': True,
            })
            continue

        parsed = parse_name(name, groups, brands)
        if r.get('brand'):
            parsed['brand'] = clean(r.get('brand'))
        if r.get('group'):
            parsed['group'] = clean(r.get('group'))
        if not article:
            article = parsed['model'] or ''
        if not parsed['model'] and not article:
            problems.append('не нашли модель и артикул')
        if not parsed['group']:
            problems.append('не определилась группа')

        art_norm = norm_article(article)
        match_id, verdict = find_match(conn, art_norm, parsed['brand'], parsed['model'])

        out.append({
            'row': r.get('row'),
            'raw_name': raw_name,
            'name': name,
            'group': parsed['group'],
            'brand': parsed['brand'],
            'model': parsed['model'],
            'article': article or None,
            'features': parsed['features'],
            'weight': r.get('weight'),
            'volume': r.get('volume'),
            'match_id': match_id,
            'verdict': 'проблема' if problems and verdict == 'новое' else verdict,
            'problems': problems,
            'skip': False,
        })
    return out


def ref_id(cur, table, name):
    if not name:
        return None
    name = str(name).strip()
    if not name:
        return None
    cur.execute(f"SELECT id FROM {SCHEMA}.{table} WHERE lower(name) = lower({q(name)})")
    row = cur.fetchone()
    if row:
        return row[0]
    cur.execute(f"INSERT INTO {SCHEMA}.{table} (name) VALUES ({q(name)}) RETURNING id")
    return cur.fetchone()[0]


def start_upload(conn, user_id, body):
    supplier = clean(body.get('supplier'))
    with conn.cursor() as cur:
        sid = ref_id(cur, 'nom_suppliers', supplier) if supplier else None
        cur.execute(
            f"INSERT INTO {SCHEMA}.nom_uploads "
            f"(supplier_id, supplier_name, file_name, rows_total, mapping, created_by) "
            f"VALUES ({q(sid)}, {q(supplier or None)}, {q(clean(body.get('file_name')) or None)}, "
            f"{q(int(body.get('rows_total') or 0))}, {q(json.dumps(body.get('mapping') or {}, ensure_ascii=False))}, "
            f"{q(user_id)}) RETURNING id"
        )
        upload_id = cur.fetchone()[0]
    conn.commit()
    return upload_id


def commit_rows(conn, user_id, body):
    upload_id = int(body.get('upload_id') or 0)
    supplier = clean(body.get('supplier'))
    rows = body.get('rows') or []
    created = updated = skipped = 0

    with conn.cursor() as cur:
        for r in rows:
            if r.get('skip'):
                skipped += 1
                cur.execute(
                    f"INSERT INTO {SCHEMA}.nom_upload_rows "
                    f"(upload_id, row_num, raw_name, raw_article, verdict, problem) VALUES "
                    f"({q(upload_id)}, {q(r.get('row'))}, {q(r.get('raw_name'))}, {q(r.get('article'))}, "
                    f"'пропущено', {q('; '.join(r.get('problems') or []) or None)})"
                )
                continue

            article = r.get('article')
            art_norm = norm_article(article)
            nom_id = r.get('match_id')

            if nom_id:
                updated += 1
            else:
                gid = ref_id(cur, 'nom_groups', r.get('group'))
                bid = ref_id(cur, 'nom_brands', r.get('brand'))
                weight = r.get('weight')
                volume = r.get('volume')
                cur.execute(
                    f"INSERT INTO {SCHEMA}.nomenclature "
                    f"(group_id, brand_id, model, article, article_norm, weight, volume, created_by, upload_id) "
                    f"VALUES ({q(gid)}, {q(bid)}, {q(r.get('model'))}, {q(article)}, {q(art_norm)}, "
                    f"{q(float(weight) if weight not in (None, '') else None)}, "
                    f"{q(float(volume) if volume not in (None, '') else None)}, "
                    f"{q(user_id)}, {q(upload_id)}) RETURNING id"
                )
                nom_id = cur.fetchone()[0]
                created += 1

            for f in (r.get('features') or []):
                fid = ref_id(cur, 'nom_features', f)
                if fid:
                    cur.execute(
                        f"INSERT INTO {SCHEMA}.nomenclature_features (nomenclature_id, feature_id) "
                        f"VALUES ({q(nom_id)}, {q(fid)}) ON CONFLICT DO NOTHING"
                    )

            if r.get('name'):
                cur.execute(
                    f"SELECT 1 FROM {SCHEMA}.nomenclature_supplier_names "
                    f"WHERE nomenclature_id = {q(nom_id)} AND lower(name) = lower({q(r.get('name'))}) "
                    f"AND coalesce(lower(supplier_name),'') = coalesce(lower({q(supplier or None)}),'')"
                )
                if not cur.fetchone():
                    cur.execute(
                        f"INSERT INTO {SCHEMA}.nomenclature_supplier_names "
                        f"(nomenclature_id, supplier_name, name) "
                        f"VALUES ({q(nom_id)}, {q(supplier or None)}, {q(r.get('name'))})"
                    )

            if article:
                cur.execute(
                    f"SELECT 1 FROM {SCHEMA}.nomenclature_supplier_articles "
                    f"WHERE nomenclature_id = {q(nom_id)} AND article_norm = {q(art_norm)} "
                    f"AND coalesce(lower(supplier_name),'') = coalesce(lower({q(supplier or None)}),'')"
                )
                if not cur.fetchone():
                    cur.execute(
                        f"INSERT INTO {SCHEMA}.nomenclature_supplier_articles "
                        f"(nomenclature_id, supplier_name, article, article_norm) "
                        f"VALUES ({q(nom_id)}, {q(supplier or None)}, {q(article)}, {q(art_norm)})"
                    )

            cur.execute(
                f"INSERT INTO {SCHEMA}.nom_upload_rows "
                f"(upload_id, row_num, raw_name, raw_article, verdict, nomenclature_id) VALUES "
                f"({q(upload_id)}, {q(r.get('row'))}, {q(r.get('raw_name'))}, {q(article)}, "
                f"{q(r.get('verdict'))}, {q(nom_id)})"
            )

        cur.execute(
            f"UPDATE {SCHEMA}.nom_uploads SET created_new = created_new + {created}, "
            f"updated_existing = updated_existing + {updated}, skipped = skipped + {skipped} "
            f"WHERE id = {q(upload_id)}"
        )
    conn.commit()
    return {'created': created, 'updated': updated, 'skipped': skipped}


def finish_upload(conn, upload_id):
    with conn.cursor() as cur:
        cur.execute(
            f"UPDATE {SCHEMA}.nom_uploads SET status = 'завершена', finished_at = now() "
            f"WHERE id = {q(int(upload_id))} "
            f"RETURNING rows_total, created_new, updated_existing, skipped"
        )
        row = cur.fetchone()
    conn.commit()
    if not row:
        return None
    return {'rows_total': row[0], 'created': row[1], 'updated': row[2], 'skipped': row[3]}


def history(conn):
    with conn.cursor() as cur:
        cur.execute(
            f"SELECT id, supplier_name, file_name, rows_total, created_new, updated_existing, "
            f"skipped, status, created_at FROM {SCHEMA}.nom_uploads "
            f"ORDER BY created_at DESC LIMIT 50"
        )
        return [
            {
                'id': r[0], 'supplier': r[1], 'file_name': r[2], 'rows_total': r[3],
                'created': r[4], 'updated': r[5], 'skipped': r[6],
                'status': r[7], 'created_at': r[8],
            }
            for r in cur.fetchall()
        ]


def suppliers(conn):
    with conn.cursor() as cur:
        cur.execute(f"SELECT id, name FROM {SCHEMA}.nom_suppliers ORDER BY name")
        return [{'id': r[0], 'name': r[1]} for r in cur.fetchall()]


def handler(event: dict, context) -> dict:
    """Загрузка прайсов поставщиков в номенклатуру: разбор строк, сличение, запись. Только владелец."""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'isBase64Encoded': False, 'body': ''}

    params = event.get('queryStringParameters') or {}
    action = params.get('action') or 'history'

    if action == 'health':
        return respond(200, {'status': 'ok'})

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    try:
        user_id = verify_owner(conn, auth_token(event))
        if not user_id:
            return respond(403, {'error': 'forbidden'})

        ip = client_ip(event)
        ua = user_agent(event)
        body = json.loads(event.get('body') or '{}') if method == 'POST' else {}

        if action == 'suppliers':
            return respond(200, {'suppliers': suppliers(conn)})

        if action == 'history':
            return respond(200, {'uploads': history(conn)})

        if action == 'analyze' and method == 'POST':
            return respond(200, {'rows': analyze(conn, body)})

        if action == 'start' and method == 'POST':
            upload_id = start_upload(conn, user_id, body)
            owner_log(conn, user_id, 'nom_upload_start', str(upload_id),
                      f"Начата загрузка прайса: {body.get('file_name') or ''}", ip, ua)
            return respond(200, {'upload_id': upload_id})

        if action == 'commit' and method == 'POST':
            return respond(200, commit_rows(conn, user_id, body))

        if action == 'finish' and method == 'POST':
            result = finish_upload(conn, body.get('upload_id') or 0)
            if not result:
                return respond(404, {'error': 'not_found'})
            owner_log(conn, user_id, 'nom_upload_finish', str(body.get('upload_id')),
                      f"Загрузка завершена: создано {result['created']}, "
                      f"обновлено {result['updated']}, пропущено {result['skipped']}", ip, ua)
            return respond(200, result)

        return respond(404, {'error': 'unknown_action'})
    finally:
        conn.close()