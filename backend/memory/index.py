import json
import os
import hashlib

import psycopg2
from psycopg2.extensions import adapt

SCHEMA = os.environ.get('MAIN_DB_SCHEMA', 'public')

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
    'Access-Control-Max-Age': '86400',
}

SECTIONS = {
    'instruction': 'Инструкция для Юры',
    'vk_setup': 'Подключение ВК',
    'done': 'Сделано',
    'plans': 'Планы',
    'decisions': 'Решения',
    'blocks': 'Блоки',
    'access': 'Доступы',
    'issues': 'Проблемы',
    'glossary': 'Словарь',
}

MEMORY_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')


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
        'body': json.dumps(payload, ensure_ascii=False),
    }


def sha256(value):
    return hashlib.sha256(value.encode('utf-8')).hexdigest()


def client_ip(event):
    ctx = event.get('requestContext') or {}
    return ((ctx.get('identity') or {}).get('sourceIp')) or ''


def user_agent(event):
    headers = event.get('headers') or {}
    for key in ('User-Agent', 'user-agent'):
        if headers.get(key):
            return headers[key][:400]
    return ''


def auth_token(event):
    headers = event.get('headers') or {}
    for key in ('X-Auth-Token', 'x-auth-token'):
        if headers.get(key):
            return headers[key]
    return ''


def verify_owner(conn, token):
    """Тот же строгий порядок: вошёл -> активен -> второй вход -> владелец."""
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


def read_section(name):
    path = os.path.join(MEMORY_DIR, f'{name}.json')
    if not os.path.exists(path):
        return {'title': SECTIONS.get(name, name), 'items': []}
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)


def handler(event: dict, context) -> dict:
    """Память проекта: содержимое отдаётся только владельцу после второго входа."""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'isBase64Encoded': False, 'body': ''}

    params = event.get('queryStringParameters') or {}
    action = params.get('action') or 'all'

    if action == 'health':
        return respond(200, {'status': 'ok', 'sections': list(SECTIONS.keys())})

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    try:
        user_id = verify_owner(conn, auth_token(event))
        if not user_id:
            return respond(403, {'error': 'forbidden'})

        ip = client_ip(event)
        ua = user_agent(event)

        if action == 'all':
            data = {key: read_section(key) for key in SECTIONS}
            owner_log(conn, user_id, 'read_memory', 'all', 'Открыта страница Память', ip, ua)
            return respond(200, {'sections': SECTIONS, 'data': data})

        if action == 'section':
            name = params.get('name') or ''
            if name not in SECTIONS:
                return respond(404, {'error': 'unknown_section'})
            owner_log(conn, user_id, 'read_memory', name, f'Открыт раздел {SECTIONS[name]}', ip, ua)
            return respond(200, {'section': name, 'data': read_section(name)})

        return respond(404, {'error': 'unknown_action'})
    finally:
        conn.close()