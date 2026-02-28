-- User Authentication Schema
-- Supports both local auth (magic links) and TENEO Auth (OAuth 2.0) integration

-- Users table (primary user accounts)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, -- UUID
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,

    -- Authentication provider tracking
    auth_provider TEXT DEFAULT 'local', -- 'local', 'teneo-auth', or 'nostr'
    teneo_user_id TEXT UNIQUE, -- For TENEO Auth SSO users
    nostr_pubkey TEXT UNIQUE,  -- For Nostr NIP-07 users (32-byte hex pubkey)

    -- Profile data
    avatar_url TEXT,
    bio TEXT,

    -- Credits (for local auth users - TENEO Auth users get credits from central system)
    credits INTEGER DEFAULT 0,
    lifetime_spending DECIMAL(12,2) DEFAULT 0,

    -- Account status
    email_verified BOOLEAN DEFAULT 0,
    account_status TEXT DEFAULT 'active', -- 'active', 'suspended', 'deleted'

    -- Timestamps
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME,

    -- Metadata
    signup_source TEXT, -- 'web', 'api', 'migration'
    metadata TEXT -- JSON for additional data
);

-- Magic link tokens (for local auth)
CREATE TABLE IF NOT EXISTS magic_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT UNIQUE NOT NULL,
    user_id TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    used BOOLEAN DEFAULT 0,
    used_at DATETIME,
    ip_address TEXT,
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- OAuth tokens (for TENEO Auth integration)
CREATE TABLE IF NOT EXISTS oauth_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_type TEXT DEFAULT 'Bearer',
    expires_at DATETIME,
    scope TEXT, -- Space-separated scopes

    -- Provider info
    provider TEXT DEFAULT 'teneo-auth',
    provider_user_id TEXT, -- User ID from provider

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, provider)
);

-- User sessions
CREATE TABLE IF NOT EXISTS user_sessions (
    id TEXT PRIMARY KEY, -- Session ID
    user_id TEXT NOT NULL,

    -- Session data
    session_data TEXT, -- JSON session storage

    -- Security tracking
    ip_address TEXT,
    user_agent TEXT,

    -- Timestamps
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Email verification tokens
CREATE TABLE IF NOT EXISTS email_verifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at DATETIME NOT NULL,
    verified BOOLEAN DEFAULT 0,
    verified_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Auth audit log
CREATE TABLE IF NOT EXISTS auth_audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    event_type TEXT NOT NULL, -- 'login', 'logout', 'register', 'token_refresh', 'password_reset'
    auth_provider TEXT, -- 'local', 'teneo-auth'

    -- Security tracking
    ip_address TEXT,
    user_agent TEXT,
    success BOOLEAN DEFAULT 1,
    failure_reason TEXT,

    -- Additional data
    metadata TEXT, -- JSON

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_teneo_id ON users(teneo_user_id);
CREATE INDEX IF NOT EXISTS idx_users_nostr_pubkey ON users(nostr_pubkey);
CREATE INDEX IF NOT EXISTS idx_users_provider ON users(auth_provider);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(account_status);

CREATE INDEX IF NOT EXISTS idx_magic_links_token ON magic_links(token);
CREATE INDEX IF NOT EXISTS idx_magic_links_user ON magic_links(user_id);
CREATE INDEX IF NOT EXISTS idx_magic_links_expires ON magic_links(expires_at);
CREATE INDEX IF NOT EXISTS idx_magic_links_used ON magic_links(used);

CREATE INDEX IF NOT EXISTS idx_oauth_tokens_user ON oauth_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_provider ON oauth_tokens(provider, provider_user_id);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON user_sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_email_verif_token ON email_verifications(token);
CREATE INDEX IF NOT EXISTS idx_email_verif_user ON email_verifications(user_id);

CREATE INDEX IF NOT EXISTS idx_auth_audit_user ON auth_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_audit_type ON auth_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_auth_audit_created ON auth_audit_log(created_at);

-- Clean up expired tokens (run periodically)
-- DELETE FROM magic_links WHERE expires_at < datetime('now') AND used = 1;
-- DELETE FROM email_verifications WHERE expires_at < datetime('now') AND verified = 1;
-- DELETE FROM user_sessions WHERE expires_at < datetime('now');
