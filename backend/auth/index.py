import json
import os
import hashlib
import secrets
import base64
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone

import psycopg2
from psycopg2.extensions import adapt

SCHEMA = os.environ.get('MAIN_DB_SCHEMA', 'public')
SESSION_DAYS = 30
STATE_TTL_MINUTES = 10
POLICY_VERSION = '1.0'

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


def db():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def respond(status, payload):
    return {
        'statusCode': status,
        'headers': {**CORS, 'Content-Type': 'application/json'},
        'isBase64Encoded': False,
        'body': json.dumps(payload, ensure_ascii=False),
    }


def now():
    return datetime.now(timezone.utc)


def random_token():
    return secrets.token_urlsafe(48)


def sha256(value):
    return hashlib.sha256(value.encode('utf-8')).hexdigest()


def pkce_challenge(verifier):
    digest = hashlib.sha256(verifier.encode('utf-8')).digest()
    return base64.urlsafe_b64encode(digest).decode('utf-8').rstrip('=')


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


def write_log(cur, user_id, provider, event_name, success, reason, ip, ua):
    cur.execute(
        f"INSERT INTO {SCHEMA}.auth_log (user_id, provider, event, success, reason, ip, user_agent) "
        f"VALUES ({q(user_id)}, {q(provider)}, {q(event_name)}, {q(bool(success))}, "
        f"{q(reason)}, {q(ip)}, {q(ua)})"
    )


def http_post(url, data):
    body = urllib.parse.urlencode(data).encode('utf-8')
    req = urllib.request.Request(
        url,
        data=body,
        headers={'Content-Type': 'application/x-www-form-urlencoded'},
        method='POST',
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read().decode('utf-8'))


def action_start(event):
    params = event.get('queryStringParameters') or {}
    redirect_uri = params.get('redirect_uri') or ''
    if not redirect_uri.startswith('https://') and not redirect_uri.startswith('http://localhost'):
        return respond(400, {'error': 'bad_redirect_uri'})

    app_id = os.environ.get('VK_APP_ID')
    if not app_id:
        return respond(503, {'error': 'vk_not_configured'})

    state = random_token()
    verifier = random_token()
    expires = now() + timedelta(minutes=STATE_TTL_MINUTES)

    conn = db()
    try:
        with conn.cursor() as cur:
            cur.execute(
                f"INSERT INTO {SCHEMA}.auth_states (state, provider, code_verifier, redirect_uri, expires_at) "
                f"VALUES ({q(state)}, 'vk', {q(verifier)}, {q(redirect_uri)}, {q(expires.isoformat())})"
            )
        conn.commit()
    finally:
        conn.close()

    query = urllib.parse.urlencode({
        'response_type': 'code',
        'client_id': app_id,
        'redirect_uri': redirect_uri,
        'state': state,
        'code_challenge': pkce_challenge(verifier),
        'code_challenge_method': 'S256',
        'scope': 'vkid.personal_info',
    })
    return respond(200, {'url': f'https://id.vk.com/authorize?{query}'})


def action_callback(event):
    body = json.loads(event.get('body') or '{}')
    code = body.get('code') or ''
    state = body.get('state') or ''
    device_id = body.get('device_id') or ''
    ip = client_ip(event)
    ua = user_agent(event)

    if not code or not state:
        return respond(400, {'error': 'missing_code'})

    app_id = os.environ.get('VK_APP_ID')
    secure_key = os.environ.get('VK_SECURE_KEY')

    conn = db()
    try:
        with conn.cursor() as cur:
            cur.execute(
                f"UPDATE {SCHEMA}.auth_states SET used_at = now() "
                f"WHERE state = {q(state)} AND provider = 'vk' "
                f"AND used_at IS NULL AND expires_at > now() "
                f"RETURNING code_verifier, redirect_uri"
            )
            row = cur.fetchone()
            if not row:
                write_log(cur, None, 'vk', 'login', False, 'bad_state', ip, ua)
                conn.commit()
                return respond(400, {'error': 'bad_state'})
            verifier, redirect_uri = row
            conn.commit()

        if not app_id or not secure_key:
            return respond(503, {'error': 'vk_not_configured'})

        token_data = http_post('https://id.vk.com/oauth2/auth', {
            'grant_type': 'authorization_code',
            'code': code,
            'code_verifier': verifier,
            'client_id': app_id,
            'client_secret': secure_key,
            'device_id': device_id,
            'redirect_uri': redirect_uri,
        })
        access_token = token_data.get('access_token')
        if not access_token:
            with conn.cursor() as cur:
                write_log(cur, None, 'vk', 'login', False, 'token_exchange_failed', ip, ua)
            conn.commit()
            return respond(400, {'error': 'token_exchange_failed'})

        info = http_post('https://id.vk.com/oauth2/user_info', {
            'access_token': access_token,
            'client_id': app_id,
        })
        vk_user = (info or {}).get('user') or {}
        vk_id = str(vk_user.get('user_id') or '')
        if not vk_id:
            with conn.cursor() as cur:
                write_log(cur, None, 'vk', 'login', False, 'no_user_info', ip, ua)
            conn.commit()
            return respond(400, {'error': 'no_user_info'})

        name = ' '.join(filter(None, [vk_user.get('first_name'), vk_user.get('last_name')])).strip()
        avatar = vk_user.get('avatar') or None

        with conn.cursor() as cur:
            cur.execute(
                f"SELECT user_id FROM {SCHEMA}.user_identities "
                f"WHERE provider = 'vk' AND provider_user_id = {q(vk_id)}"
            )
            found = cur.fetchone()

            if found:
                user_id = found[0]
                cur.execute(
                    f"UPDATE {SCHEMA}.users SET last_login_at = now(), "
                    f"display_name = {q(name or 'Пользователь')}, avatar_url = {q(avatar)} "
                    f"WHERE id = {q(user_id)} AND status = 'active' RETURNING id"
                )
                if not cur.fetchone():
                    write_log(cur, user_id, 'vk', 'login', False, 'blocked', ip, ua)
                    conn.commit()
                    return respond(403, {'error': 'account_blocked'})
                is_new = False
            else:
                cur.execute(
                    f"INSERT INTO {SCHEMA}.users (display_name, avatar_url, role, last_login_at) "
                    f"VALUES ({q(name or 'Пользователь')}, {q(avatar)}, 'buyer', now()) RETURNING id"
                )
                user_id = cur.fetchone()[0]
                cur.execute(
                    f"INSERT INTO {SCHEMA}.user_identities (user_id, provider, provider_user_id) "
                    f"VALUES ({q(user_id)}, 'vk', {q(vk_id)})"
                )
                cur.execute(
                    f"INSERT INTO {SCHEMA}.consents (user_id, document, version, ip) "
                    f"VALUES ({q(user_id)}, 'privacy_policy', {q(POLICY_VERSION)}, {q(ip)})"
                )
                is_new = True

            session_token = random_token()
            expires = now() + timedelta(days=SESSION_DAYS)
            cur.execute(
                f"INSERT INTO {SCHEMA}.sessions (user_id, token_hash, user_agent, ip, expires_at) "
                f"VALUES ({q(user_id)}, {q(sha256(session_token))}, {q(ua)}, {q(ip)}, {q(expires.isoformat())})"
            )
            write_log(cur, user_id, 'vk', 'login', True, 'ok', ip, ua)
            cur.execute(
                f"SELECT display_name, avatar_url, role FROM {SCHEMA}.users WHERE id = {q(user_id)}"
            )
            display_name, avatar_url, role = cur.fetchone()
        conn.commit()
    finally:
        conn.close()

    return respond(200, {
        'token': session_token,
        'is_new': is_new,
        'user': {
            'id': user_id,
            'name': display_name,
            'avatar': avatar_url,
            'role': role,
        },
    })


def current_user(conn, token, ip, ua):
    if not token:
        return None
    with conn.cursor() as cur:
        cur.execute(
            f"SELECT s.id, u.id, u.display_name, u.avatar_url, u.role "
            f"FROM {SCHEMA}.sessions s JOIN {SCHEMA}.users u ON u.id = s.user_id "
            f"WHERE s.token_hash = {q(sha256(token))} AND s.revoked_at IS NULL "
            f"AND s.expires_at > now() AND u.status = 'active'"
        )
        row = cur.fetchone()
        if not row:
            return None
        cur.execute(
            f"UPDATE {SCHEMA}.sessions SET last_seen_at = now(), ip = {q(ip)}, "
            f"user_agent = {q(ua)} WHERE id = {q(row[0])}"
        )
    conn.commit()
    return {'session_id': row[0], 'id': row[1], 'name': row[2], 'avatar': row[3], 'role': row[4]}


def action_me(event):
    conn = db()
    try:
        user = current_user(conn, auth_token(event), client_ip(event), user_agent(event))
        if not user:
            return respond(401, {'error': 'unauthorized'})
        with conn.cursor() as cur:
            cur.execute(
                f"SELECT id, user_agent, ip, created_at, last_seen_at "
                f"FROM {SCHEMA}.sessions WHERE user_id = {q(user['id'])} "
                f"AND revoked_at IS NULL AND expires_at > now() ORDER BY last_seen_at DESC LIMIT 20"
            )
            sessions = [{
                'id': r[0],
                'device': r[1],
                'ip': r[2],
                'created_at': r[3].isoformat(),
                'last_seen_at': r[4].isoformat(),
                'current': r[0] == user['session_id'],
            } for r in cur.fetchall()]
            cur.execute(
                f"SELECT provider, created_at FROM {SCHEMA}.user_identities "
                f"WHERE user_id = {q(user['id'])} ORDER BY created_at"
            )
            identities = [{'provider': r[0], 'created_at': r[1].isoformat()} for r in cur.fetchall()]
    finally:
        conn.close()

    return respond(200, {
        'user': {'id': user['id'], 'name': user['name'], 'avatar': user['avatar'], 'role': user['role']},
        'sessions': sessions,
        'identities': identities,
    })


def action_logout(event):
    body = json.loads(event.get('body') or '{}')
    everywhere = bool(body.get('everywhere'))
    conn = db()
    try:
        user = current_user(conn, auth_token(event), client_ip(event), user_agent(event))
        if not user:
            return respond(401, {'error': 'unauthorized'})
        with conn.cursor() as cur:
            if everywhere:
                cur.execute(
                    f"UPDATE {SCHEMA}.sessions SET revoked_at = now() "
                    f"WHERE user_id = {q(user['id'])} AND revoked_at IS NULL"
                )
            else:
                cur.execute(
                    f"UPDATE {SCHEMA}.sessions SET revoked_at = now() WHERE id = {q(user['session_id'])}"
                )
            write_log(cur, user['id'], None, 'logout', True, 'everywhere' if everywhere else 'single',
                      client_ip(event), user_agent(event))
        conn.commit()
    finally:
        conn.close()
    return respond(200, {'ok': True})


def action_delete_account(event):
    conn = db()
    try:
        user = current_user(conn, auth_token(event), client_ip(event), user_agent(event))
        if not user:
            return respond(401, {'error': 'unauthorized'})
        with conn.cursor() as cur:
            cur.execute(
                f"UPDATE {SCHEMA}.users SET status = 'deleted', display_name = 'Удалённый аккаунт', "
                f"avatar_url = NULL WHERE id = {q(user['id'])}"
            )
            cur.execute(
                f"UPDATE {SCHEMA}.sessions SET revoked_at = now() "
                f"WHERE user_id = {q(user['id'])} AND revoked_at IS NULL"
            )
            write_log(cur, user['id'], None, 'delete_account', True, 'ok',
                      client_ip(event), user_agent(event))
        conn.commit()
    finally:
        conn.close()
    return respond(200, {'ok': True})


def handler(event: dict, context) -> dict:
    """Вход через ВКонтакте, проверка сессии, выход и удаление аккаунта."""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'isBase64Encoded': False, 'body': ''}

    params = event.get('queryStringParameters') or {}
    action = params.get('action') or 'me'

    if action == 'health':
        return respond(200, {'status': 'ok', 'vk_configured': bool(os.environ.get('VK_APP_ID'))})
    if action == 'start' and method == 'GET':
        return action_start(event)
    if action == 'callback' and method == 'POST':
        return action_callback(event)
    if action == 'me' and method == 'GET':
        return action_me(event)
    if action == 'logout' and method == 'POST':
        return action_logout(event)
    if action == 'delete' and method == 'POST':
        return action_delete_account(event)

    return respond(404, {'error': 'unknown_action'})