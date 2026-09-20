import json
import os
import hashlib
from datetime import datetime, timedelta, timezone

import psycopg2
from psycopg2.extensions import adapt

SCHEMA = os.environ.get('MAIN_DB_SCHEMA', 'public')
ELEVATED_MINUTES = 30

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
    'Access-Control-Max-Age': '86400',
}


def q(value):
    if value is None:
        return 'NULL'
    return adapt(value).getquoted().decode('utf-8')


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


def check_access(conn, token):
    """Строгий порядок: вошёл -> активен -> второй вход -> владелец."""
    result = {
        'authenticated': False,
        'elevated': False,
        'is_owner': False,
        'owner_candidate': False,
        'user': None,
        'session_id': None,
        'elevated_until': None,
        'reason': 'no_token',
    }
    if not token:
        return result

    with conn.cursor() as cur:
        cur.execute(
            f"SELECT s.id, u.id, u.display_name, u.avatar_url, u.status "
            f"FROM {SCHEMA}.sessions s JOIN {SCHEMA}.users u ON u.id = s.user_id "
            f"WHERE s.token_hash = {q(sha256(token))} AND s.revoked_at IS NULL "
            f"AND s.expires_at > now()"
        )
        row = cur.fetchone()
        if not row:
            result['reason'] = 'not_authenticated'
            return result

        session_id, user_id, name, avatar, status = row
        if status != 'active':
            result['reason'] = 'account_blocked'
            return result

        result['authenticated'] = True
        result['session_id'] = session_id
        result['user'] = {'id': user_id, 'name': name, 'avatar': avatar}
        result['reason'] = 'needs_elevation'

        owner_vk_id_pre = os.environ.get('OWNER_VK_ID')
        if owner_vk_id_pre:
            cur.execute(
                f"SELECT 1 FROM {SCHEMA}.user_identities "
                f"WHERE user_id = {q(user_id)} AND provider = 'vk' "
                f"AND provider_user_id = {q(str(owner_vk_id_pre).strip())}"
            )
            result['owner_candidate'] = bool(cur.fetchone())

        cur.execute(
            f"SELECT expires_at FROM {SCHEMA}.elevated_sessions "
            f"WHERE session_id = {q(session_id)} AND revoked_at IS NULL "
            f"AND expires_at > now() ORDER BY expires_at DESC LIMIT 1"
        )
        elevated = cur.fetchone()
        if not elevated:
            return result

        result['elevated'] = True
        result['elevated_until'] = elevated[0].isoformat()
        result['reason'] = 'ok'
        result['is_owner'] = result['owner_candidate']

    return result


def owner_log(cur, user_id, action, target, details, ip, ua):
    cur.execute(
        f"INSERT INTO {SCHEMA}.owner_log (user_id, action, target, details, ip, user_agent) "
        f"VALUES ({q(user_id)}, {q(action)}, {q(target)}, {q(details)}, {q(ip)}, {q(ua)})"
    )


def activity_log(cur, user_id, action, details, ip):
    cur.execute(
        f"INSERT INTO {SCHEMA}.activity_log (user_id, action, details, ip) "
        f"VALUES ({q(user_id)}, {q(action)}, {q(details)}, {q(ip)})"
    )


def action_status(event, conn):
    access = check_access(conn, auth_token(event))
    if not access['authenticated']:
        return respond(401, {'authenticated': False, 'reason': access['reason']})
    return respond(200, {
        'authenticated': True,
        'elevated': access['elevated'],
        'is_owner': access['is_owner'],
        'owner_candidate': access['owner_candidate'],
        'elevated_until': access['elevated_until'],
        'user': access['user'],
    })


def action_elevate(event, conn):
    ip = client_ip(event)
    ua = user_agent(event)
    access = check_access(conn, auth_token(event))

    if not access['authenticated']:
        return respond(401, {'error': 'not_authenticated'})

    if access['elevated']:
        return respond(200, {
            'ok': True,
            'elevated_until': access['elevated_until'],
            'is_owner': access['is_owner'],
        })

    expires = datetime.now(timezone.utc) + timedelta(minutes=ELEVATED_MINUTES)
    user_id = access['user']['id']

    with conn.cursor() as cur:
        cur.execute(
            f"INSERT INTO {SCHEMA}.elevated_sessions (session_id, user_id, method, expires_at, ip) "
            f"VALUES ({q(access['session_id'])}, {q(user_id)}, 'button', {q(expires.isoformat())}, {q(ip)})"
        )
        is_owner = access['owner_candidate']
        if is_owner:
            owner_log(cur, user_id, 'elevate', 'vault', 'Пройден второй вход', ip, ua)
        else:
            activity_log(cur, user_id, 'elevate', 'Пройден второй вход', ip)
    conn.commit()

    return respond(200, {
        'ok': True,
        'elevated_until': expires.isoformat(),
        'is_owner': is_owner,
    })


def action_drop(event, conn):
    access = check_access(conn, auth_token(event))
    if not access['authenticated']:
        return respond(401, {'error': 'not_authenticated'})

    with conn.cursor() as cur:
        cur.execute(
            f"UPDATE {SCHEMA}.elevated_sessions SET revoked_at = now() "
            f"WHERE session_id = {q(access['session_id'])} AND revoked_at IS NULL"
        )
        if access['is_owner']:
            owner_log(cur, access['user']['id'], 'drop_elevation', 'vault',
                      'Второй вход сброшен', client_ip(event), user_agent(event))
    conn.commit()
    return respond(200, {'ok': True})


def action_owner_log(event, conn):
    access = check_access(conn, auth_token(event))
    if not access['is_owner']:
        return respond(403, {'error': 'forbidden', 'reason': access['reason']})

    with conn.cursor() as cur:
        cur.execute(
            f"SELECT action, target, details, ip, created_at FROM {SCHEMA}.owner_log "
            f"ORDER BY created_at DESC LIMIT 100"
        )
        rows = [{
            'action': r[0],
            'target': r[1],
            'details': r[2],
            'ip': r[3],
            'created_at': r[4].isoformat(),
        } for r in cur.fetchall()]
    return respond(200, {'entries': rows})


def handler(event: dict, context) -> dict:
    """Второй вход и проверка прав владельца панели управления."""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'isBase64Encoded': False, 'body': ''}

    params = event.get('queryStringParameters') or {}
    action = params.get('action') or 'status'

    if action == 'health':
        return respond(200, {'status': 'ok', 'owner_configured': bool(os.environ.get('OWNER_VK_ID'))})

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    try:
        if action == 'status' and method == 'GET':
            return action_status(event, conn)
        if action == 'elevate' and method == 'POST':
            return action_elevate(event, conn)
        if action == 'drop' and method == 'POST':
            return action_drop(event, conn)
        if action == 'owner_log' and method == 'GET':
            return action_owner_log(event, conn)
        return respond(404, {'error': 'unknown_action'})
    finally:
        conn.close()