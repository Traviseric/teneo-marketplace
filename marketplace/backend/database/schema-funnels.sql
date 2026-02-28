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
