CREATE TABLE IF NOT EXISTS t_p96623672_socidkoyrf_new_empty.elevated_sessions (
    id BIGSERIAL PRIMARY KEY,
    session_id BIGINT NOT NULL REFERENCES t_p96623672_socidkoyrf_new_empty.sessions(id),
    user_id BIGINT NOT NULL REFERENCES t_p96623672_socidkoyrf_new_empty.users(id),
    method TEXT NOT NULL DEFAULT 'button',
    granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    ip TEXT
);

CREATE INDEX IF NOT EXISTS elevated_session_idx ON t_p96623672_socidkoyrf_new_empty.elevated_sessions (session_id);

CREATE TABLE IF NOT EXISTS t_p96623672_socidkoyrf_new_empty.owner_log (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    action TEXT NOT NULL,
    target TEXT,
    details TEXT,
    ip TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS owner_log_created_idx ON t_p96623672_socidkoyrf_new_empty.owner_log (created_at DESC);

CREATE TABLE IF NOT EXISTS t_p96623672_socidkoyrf_new_empty.activity_log (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES t_p96623672_socidkoyrf_new_empty.users(id),
    action TEXT NOT NULL,
    details TEXT,
    ip TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS activity_log_user_idx ON t_p96623672_socidkoyrf_new_empty.activity_log (user_id, created_at DESC);
