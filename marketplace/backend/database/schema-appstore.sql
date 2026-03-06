-- Agent App Store schema
-- Verified tools that agents (and humans) can discover, call, and pay for

-- App registry
CREATE TABLE IF NOT EXISTS apps (
    id TEXT PRIMARY KEY,
    publisher_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    capabilities TEXT,           -- JSON array of capability strings
    endpoint_url TEXT NOT NULL,
    auth_method TEXT DEFAULT 'service_key', -- 'l402', 'service_key', 'api_key', 'free'
    pricing_model TEXT DEFAULT 'free',      -- 'per_call', 'subscription', 'free', 'freemium'
    pricing_config TEXT,         -- JSON: { per_call_sats: 300, free_tier: 100 }
    source_url TEXT,             -- GitHub repo URL
    manifest_url TEXT,           -- URL to app-manifest.json
    icon TEXT,                   -- emoji or URL
    verification_tier TEXT DEFAULT 'unverified', -- 'unverified', 'community', 'verified', 'official'
    trust_score REAL DEFAULT 0,
    avg_rating REAL DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    total_calls INTEGER DEFAULT 0,
    uptime_30d REAL DEFAULT 1.0,
    status TEXT DEFAULT 'active',   -- 'active', 'suspended', 'deprecated'
    nostr_pubkey TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_apps_category ON apps(category);
CREATE INDEX IF NOT EXISTS idx_apps_status ON apps(status);
CREATE INDEX IF NOT EXISTS idx_apps_verification ON apps(verification_tier);
CREATE INDEX IF NOT EXISTS idx_apps_trust ON apps(trust_score DESC);
CREATE INDEX IF NOT EXISTS idx_apps_rating ON apps(avg_rating DESC);

-- App capabilities (searchable index for agent discovery)
CREATE TABLE IF NOT EXISTS app_capabilities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    app_id TEXT NOT NULL,
    capability TEXT NOT NULL,    -- e.g. 'image.generate', 'seo.analyze'
    description TEXT,
    UNIQUE(app_id, capability),
    FOREIGN KEY (app_id) REFERENCES apps(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_app_cap_capability ON app_capabilities(capability);
CREATE INDEX IF NOT EXISTS idx_app_cap_app ON app_capabilities(app_id);

-- App endpoints (each app can expose multiple callable endpoints)
CREATE TABLE IF NOT EXISTS app_endpoints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    app_id TEXT NOT NULL,
    name TEXT NOT NULL,           -- e.g. 'generate', 'analyze'
    method TEXT DEFAULT 'POST',   -- HTTP method
    path TEXT NOT NULL,           -- e.g. '/api/ai-invoke/generate'
    capability TEXT,              -- which capability this fulfills
    cost_sats INTEGER DEFAULT 0,
    input_schema TEXT,            -- JSON schema for request body
    output_schema TEXT,           -- JSON schema for response
    UNIQUE(app_id, name),
    FOREIGN KEY (app_id) REFERENCES apps(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_app_endpoints_app ON app_endpoints(app_id);

-- App reviews
CREATE TABLE IF NOT EXISTS app_reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    app_id TEXT NOT NULL,
    reviewer_id TEXT NOT NULL,
    reviewer_type TEXT DEFAULT 'human', -- 'human', 'agent'
    rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
    comment TEXT,
    nostr_event_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (app_id) REFERENCES apps(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_app_reviews_app ON app_reviews(app_id);

-- App usage tracking
CREATE TABLE IF NOT EXISTS app_calls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    app_id TEXT NOT NULL,
    endpoint_name TEXT,
    caller_id TEXT,
    caller_type TEXT DEFAULT 'human', -- 'human', 'agent'
    capability_used TEXT,
    cost_sats INTEGER DEFAULT 0,
    arxmint_tx_ref TEXT,
    response_ms INTEGER,
    success BOOLEAN DEFAULT 1,
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (app_id) REFERENCES apps(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_app_calls_app ON app_calls(app_id);
CREATE INDEX IF NOT EXISTS idx_app_calls_created ON app_calls(created_at);

-- App incidents (flagging)
CREATE TABLE IF NOT EXISTS app_incidents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    app_id TEXT NOT NULL,
    reporter_id TEXT NOT NULL,
    incident_type TEXT NOT NULL,  -- 'malicious', 'downtime', 'billing', 'quality'
    description TEXT,
    status TEXT DEFAULT 'open',   -- 'open', 'investigating', 'resolved', 'dismissed'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME,
    FOREIGN KEY (app_id) REFERENCES apps(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_app_incidents_app ON app_incidents(app_id);
CREATE INDEX IF NOT EXISTS idx_app_incidents_status ON app_incidents(status);
