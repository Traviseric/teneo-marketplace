-- AI Store Builder: stores and products tables (SQLite)

CREATE TABLE IF NOT EXISTS stores (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    slug TEXT UNIQUE NOT NULL,
    config TEXT NOT NULL,
    html TEXT,
    status TEXT DEFAULT 'draft',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS store_products (
    id TEXT PRIMARY KEY,
    store_id TEXT REFERENCES stores(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    description TEXT,
    type TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_stores_user ON stores(user_id);
CREATE INDEX IF NOT EXISTS idx_stores_slug ON stores(slug);
CREATE INDEX IF NOT EXISTS idx_store_products_store ON store_products(store_id);

-- Email capture for store visitor sign-ups
CREATE TABLE IF NOT EXISTS store_subscribers (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT,
    source TEXT DEFAULT 'storefront',
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(store_id, email)
);

CREATE INDEX IF NOT EXISTS idx_store_subscribers_store ON store_subscribers(store_id);
CREATE INDEX IF NOT EXISTS idx_store_subscribers_email ON store_subscribers(email);
