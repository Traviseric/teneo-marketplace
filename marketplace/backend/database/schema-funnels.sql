-- Funnel Module Persistence Schema

CREATE TABLE IF NOT EXISTS funnels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    brand_id TEXT NOT NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    status TEXT DEFAULT 'draft',
    user_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS funnel_drafts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    funnel_id INTEGER REFERENCES funnels(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    funnel_name TEXT NOT NULL,
    template TEXT,
    variables TEXT,
    context TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, funnel_name)
);

-- Funnel conversion tracking events
CREATE TABLE IF NOT EXISTS funnel_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    funnel_id TEXT NOT NULL,
    page_slug TEXT,
    event_type TEXT NOT NULL, -- 'pageview', 'cta_click', 'checkout_start', 'purchase'
    session_id TEXT,
    metadata TEXT, -- JSON
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_funnel_events_funnel ON funnel_events(funnel_id);
CREATE INDEX IF NOT EXISTS idx_funnel_events_type ON funnel_events(funnel_id, event_type);
