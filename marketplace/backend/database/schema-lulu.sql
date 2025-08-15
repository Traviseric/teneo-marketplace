-- Lulu Print-on-Demand Integration Schema

-- Book formats table
CREATE TABLE IF NOT EXISTS book_formats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id TEXT NOT NULL,
    format_type TEXT NOT NULL, -- 'digital_pdf', 'print_digest', 'print_trade'
    pod_package_id TEXT,
    page_count INTEGER,
    base_price DECIMAL(10,2),
    our_price DECIMAL(10,2),
    printable_id TEXT, -- Stored after first successful print
    lulu_product_url TEXT, -- Where you set it up on Lulu
    cover_url TEXT, -- URL to cover file for first-time setup
    interior_url TEXT, -- URL to interior file for first-time setup
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for book formats
CREATE INDEX IF NOT EXISTS idx_book_formats_book_id ON book_formats(book_id);
CREATE INDEX IF NOT EXISTS idx_book_formats_type ON book_formats(format_type);

-- Print jobs table
CREATE TABLE IF NOT EXISTS print_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT NOT NULL,
    book_id TEXT NOT NULL,
    format_type TEXT NOT NULL,
    lulu_print_job_id TEXT UNIQUE,
    lulu_order_id TEXT,
    status TEXT DEFAULT 'pending',
    quantity INTEGER DEFAULT 1,
    shipping_method TEXT,
    shipping_cost DECIMAL(10,2),
    tracking_url TEXT,
    tracking_id TEXT,
    error_message TEXT,
    webhook_data TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    production_started_at DATETIME,
    shipped_at DATETIME,
    delivered_at DATETIME,
    FOREIGN KEY (order_id) REFERENCES orders(order_id)
);

-- Indexes for print jobs
CREATE INDEX IF NOT EXISTS idx_print_jobs_order_id ON print_jobs(order_id);
CREATE INDEX IF NOT EXISTS idx_print_jobs_status ON print_jobs(status);
CREATE INDEX IF NOT EXISTS idx_print_jobs_lulu_id ON print_jobs(lulu_print_job_id);

-- Lulu webhook events
CREATE TABLE IF NOT EXISTS lulu_webhook_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id TEXT UNIQUE NOT NULL,
    event_type TEXT NOT NULL,
    print_job_id TEXT,
    payload TEXT NOT NULL,
    processed BOOLEAN DEFAULT 0,
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    processed_at DATETIME
);

-- Shipping options cache
CREATE TABLE IF NOT EXISTS shipping_options (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    destination_country TEXT NOT NULL,
    destination_state TEXT,
    pod_package_id TEXT NOT NULL,
    shipping_method TEXT NOT NULL, -- 'MAIL', 'GROUND', 'EXPRESS'
    shipping_cost DECIMAL(10,2),
    currency TEXT DEFAULT 'USD',
    estimated_days_min INTEGER,
    estimated_days_max INTEGER,
    cached_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME
);

-- Index for shipping options
CREATE INDEX IF NOT EXISTS idx_shipping_country_package ON shipping_options(destination_country, pod_package_id);

-- Update orders table to support mixed orders (safe column additions)
-- Note: These will silently fail if columns already exist, which is intended behavior
PRAGMA foreign_keys=off;

-- Add columns one by one with error handling
ALTER TABLE orders ADD COLUMN order_type TEXT DEFAULT 'digital'; -- 'digital', 'physical', 'mixed'
ALTER TABLE orders ADD COLUMN shipping_address TEXT;
ALTER TABLE orders ADD COLUMN shipping_method TEXT;
ALTER TABLE orders ADD COLUMN shipping_cost DECIMAL(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN contains_physical BOOLEAN DEFAULT 0;

PRAGMA foreign_keys=on;

-- Lulu API credentials (encrypted in production)
CREATE TABLE IF NOT EXISTS lulu_credentials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    environment TEXT NOT NULL, -- 'sandbox' or 'production'
    client_key TEXT NOT NULL,
    client_secret TEXT NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at DATETIME,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);