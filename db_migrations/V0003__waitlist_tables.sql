CREATE TABLE IF NOT EXISTS waitlist (
    id SERIAL PRIMARY KEY,
    provider VARCHAR(32) NOT NULL DEFAULT 'vk',
    provider_user_id VARCHAR(64) NOT NULL,
    name VARCHAR(255),
    avatar_url TEXT,
    ip VARCHAR(64),
    user_agent TEXT,
    notified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (provider, provider_user_id)
);

CREATE TABLE IF NOT EXISTS waitlist_passes (
    id SERIAL PRIMARY KEY,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    provider VARCHAR(32) NOT NULL DEFAULT 'vk',
    provider_user_id VARCHAR(64) NOT NULL,
    name VARCHAR(255),
    avatar_url TEXT,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_waitlist_created ON waitlist (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_waitlist_passes_expires ON waitlist_passes (expires_at);
