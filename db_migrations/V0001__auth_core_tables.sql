CREATE TABLE IF NOT EXISTS t_p96623672_socidkoyrf_new_empty.users (
    id BIGSERIAL PRIMARY KEY,
    display_name TEXT NOT NULL DEFAULT '',
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'buyer',
    status TEXT NOT NULL DEFAULT 'active',
    login TEXT,
    phone TEXT,
    email TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_login_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS users_login_uniq ON t_p96623672_socidkoyrf_new_empty.users (lower(login)) WHERE login IS NOT NULL;

CREATE TABLE IF NOT EXISTS t_p96623672_socidkoyrf_new_empty.user_identities (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES t_p96623672_socidkoyrf_new_empty.users(id),
    provider TEXT NOT NULL,
    provider_user_id TEXT NOT NULL,
    provider_login TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT user_identities_provider_uniq UNIQUE (provider, provider_user_id)
);

CREATE INDEX IF NOT EXISTS user_identities_user_idx ON t_p96623672_socidkoyrf_new_empty.user_identities (user_id);

CREATE TABLE IF NOT EXISTS t_p96623672_socidkoyrf_new_empty.sessions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES t_p96623672_socidkoyrf_new_empty.users(id),
    token_hash TEXT NOT NULL UNIQUE,
    user_agent TEXT,
    ip TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS sessions_user_idx ON t_p96623672_socidkoyrf_new_empty.sessions (user_id);

CREATE TABLE IF NOT EXISTS t_p96623672_socidkoyrf_new_empty.auth_log (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT,
    provider TEXT,
    event TEXT NOT NULL,
    success BOOLEAN NOT NULL DEFAULT false,
    reason TEXT,
    ip TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS auth_log_created_idx ON t_p96623672_socidkoyrf_new_empty.auth_log (created_at DESC);

CREATE TABLE IF NOT EXISTS t_p96623672_socidkoyrf_new_empty.consents (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES t_p96623672_socidkoyrf_new_empty.users(id),
    document TEXT NOT NULL,
    version TEXT NOT NULL,
    accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ip TEXT
);

CREATE TABLE IF NOT EXISTS t_p96623672_socidkoyrf_new_empty.auth_states (
    state TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    code_verifier TEXT,
    redirect_uri TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ
);
