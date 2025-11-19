-- Live Censorship Tracker Database Schema
-- Tracks book availability across platforms in real-time

-- Platform monitoring configuration
CREATE TABLE IF NOT EXISTS platform_monitors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform_name TEXT NOT NULL UNIQUE, -- 'amazon', 'goodreads', 'google_books', 'apple_books'
    base_url TEXT NOT NULL,
    is_active BOOLEAN DEFAULT 1,

    -- Scraping configuration
    scraper_type TEXT DEFAULT 'puppeteer', -- 'puppeteer', 'api', 'rss'
    rate_limit_ms INTEGER DEFAULT 3000, -- Min ms between requests
    max_retries INTEGER DEFAULT 3,
    timeout_ms INTEGER DEFAULT 30000,

    -- Credentials/API keys (if needed)
    api_key TEXT,
    api_secret TEXT,

    -- Statistics
    last_check DATETIME,
    total_checks INTEGER DEFAULT 0,
    total_books_monitored INTEGER DEFAULT 0,
    total_bans_detected INTEGER DEFAULT 0,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Books being monitored for censorship
CREATE TABLE IF NOT EXISTS monitored_books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id TEXT NOT NULL,
    brand TEXT NOT NULL,

    -- Book identifiers for different platforms
    amazon_asin TEXT,
    goodreads_id TEXT,
    google_books_id TEXT,
    apple_books_id TEXT,
    isbn TEXT,

    -- Monitoring settings
    is_active BOOLEAN DEFAULT 1,
    priority INTEGER DEFAULT 1, -- 1-5, higher = check more frequently
    check_interval_hours INTEGER DEFAULT 24,

    -- Last known status
    last_check DATETIME,
    is_currently_available BOOLEAN DEFAULT 1,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(book_id, brand)
);

-- Indexes for monitored books
CREATE INDEX IF NOT EXISTS idx_monitored_books_id ON monitored_books(book_id);
CREATE INDEX IF NOT EXISTS idx_monitored_books_active ON monitored_books(is_active, priority DESC);
CREATE INDEX IF NOT EXISTS idx_monitored_books_check ON monitored_books(last_check ASC);

-- Availability snapshots (historical record)
CREATE TABLE IF NOT EXISTS availability_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    monitored_book_id INTEGER NOT NULL,
    platform TEXT NOT NULL,

    -- Availability status
    is_available BOOLEAN NOT NULL,
    response_code INTEGER, -- HTTP response code
    response_time_ms INTEGER,

    -- Evidence
    page_title TEXT,
    page_content_hash TEXT, -- MD5 hash to detect changes
    screenshot_url TEXT,
    wayback_url TEXT,

    -- Detection details
    detection_method TEXT, -- 'scraper', 'api', 'user_report'
    confidence_score DECIMAL(3,2) DEFAULT 1.0, -- 0.0-1.0

    checked_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (monitored_book_id) REFERENCES monitored_books(id)
);

-- Indexes for snapshots
CREATE INDEX IF NOT EXISTS idx_snapshots_book ON availability_snapshots(monitored_book_id, checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_snapshots_platform ON availability_snapshots(platform, checked_at DESC);

-- Enhanced suppression events (extends AI Discovery schema)
CREATE TABLE IF NOT EXISTS censorship_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id TEXT NOT NULL,
    platform TEXT NOT NULL,

    -- Alert details
    alert_type TEXT NOT NULL, -- 'new_ban', 'restored', 'shadowban_detected', 'price_manipulation'
    severity TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'

    -- Evidence
    before_snapshot_id INTEGER,
    after_snapshot_id INTEGER,
    evidence_urls TEXT, -- JSON array

    -- Status
    is_verified BOOLEAN DEFAULT 0,
    verified_by TEXT,
    verified_at DATETIME,

    -- Actions taken
    streisand_triggered BOOLEAN DEFAULT 0,
    email_sent BOOLEAN DEFAULT 0,
    social_posted BOOLEAN DEFAULT 0,
    price_adjusted BOOLEAN DEFAULT 0,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (before_snapshot_id) REFERENCES availability_snapshots(id),
    FOREIGN KEY (after_snapshot_id) REFERENCES availability_snapshots(id)
);

-- Indexes for alerts
CREATE INDEX IF NOT EXISTS idx_alerts_book ON censorship_alerts(book_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_platform ON censorship_alerts(platform, severity);
CREATE INDEX IF NOT EXISTS idx_alerts_unverified ON censorship_alerts(is_verified, created_at DESC);

-- Wayback Machine archives
CREATE TABLE IF NOT EXISTS wayback_archives (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id TEXT NOT NULL,
    platform TEXT NOT NULL,
    original_url TEXT NOT NULL,

    -- Wayback data
    wayback_url TEXT,
    snapshot_timestamp TEXT,
    archive_status TEXT, -- 'pending', 'archived', 'failed'

    -- Metadata
    archive_reason TEXT, -- 'ban_detected', 'scheduled', 'manual'
    page_title TEXT,
    page_content_preview TEXT,

    requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    archived_at DATETIME,

    UNIQUE(original_url, snapshot_timestamp)
);

-- Indexes for archives
CREATE INDEX IF NOT EXISTS idx_archives_book ON wayback_archives(book_id);
CREATE INDEX IF NOT EXISTS idx_archives_status ON wayback_archives(archive_status, requested_at DESC);

-- Scraper health and performance
CREATE TABLE IF NOT EXISTS scraper_health (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform TEXT NOT NULL,

    -- Performance metrics
    avg_response_time_ms INTEGER,
    success_rate DECIMAL(3,2),
    errors_last_hour INTEGER DEFAULT 0,

    -- Error tracking
    last_error TEXT,
    last_error_at DATETIME,
    consecutive_failures INTEGER DEFAULT 0,

    -- Status
    is_healthy BOOLEAN DEFAULT 1,
    is_rate_limited BOOLEAN DEFAULT 0,
    rate_limit_until DATETIME,

    checked_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(platform)
);

-- Ban prediction features (for ML model)
CREATE TABLE IF NOT EXISTS ban_prediction_features (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id TEXT NOT NULL,

    -- Content features
    has_controversial_keywords BOOLEAN DEFAULT 0,
    controversial_keyword_count INTEGER DEFAULT 0,
    political_bias_score DECIMAL(3,2), -- -1.0 to 1.0 (left to right)

    -- Author features
    author_previous_bans INTEGER DEFAULT 0,
    author_controversy_score INTEGER DEFAULT 0,

    -- Topic features
    topic_ban_rate DECIMAL(3,2), -- % of similar books banned
    category_risk_level TEXT, -- 'low', 'medium', 'high'

    -- Platform signals
    search_visibility_score DECIMAL(3,2), -- 0.0-1.0
    recommendation_suppression BOOLEAN DEFAULT 0,
    price_manipulation_detected BOOLEAN DEFAULT 0,
    review_suppression BOOLEAN DEFAULT 0,

    -- Temporal features
    recent_media_mentions INTEGER DEFAULT 0,
    recent_social_controversy INTEGER DEFAULT 0,
    government_inquiry_count INTEGER DEFAULT 0,

    calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(book_id)
);

-- Email alert queue
CREATE TABLE IF NOT EXISTS email_alert_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alert_id INTEGER NOT NULL,

    -- Recipients
    recipient_email TEXT NOT NULL,
    recipient_type TEXT, -- 'subscriber', 'author', 'admin'

    -- Email details
    subject TEXT NOT NULL,
    body_html TEXT NOT NULL,
    body_text TEXT,

    -- Status
    status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'failed'
    send_after DATETIME,
    sent_at DATETIME,
    error_message TEXT,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (alert_id) REFERENCES censorship_alerts(id)
);

-- Social media post queue
CREATE TABLE IF NOT EXISTS social_post_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alert_id INTEGER NOT NULL,

    -- Post details
    platform TEXT NOT NULL, -- 'twitter', 'mastodon', 'bluesky'
    post_text TEXT NOT NULL,
    image_url TEXT,
    link_url TEXT,

    -- Hashtags and mentions
    hashtags TEXT, -- JSON array

    -- Status
    status TEXT DEFAULT 'pending',
    post_id TEXT, -- Platform's post ID after posting
    posted_at DATETIME,
    error_message TEXT,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (alert_id) REFERENCES censorship_alerts(id)
);

-- Subscriber preferences for alerts
CREATE TABLE IF NOT EXISTS alert_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,

    -- Subscription preferences
    subscribe_all_bans BOOLEAN DEFAULT 1,
    subscribe_platform TEXT, -- JSON array: ['amazon', 'goodreads']
    subscribe_topics TEXT, -- JSON array: ['politics', 'economics']
    subscribe_authors TEXT, -- JSON array of author names

    -- Alert frequency
    alert_frequency TEXT DEFAULT 'immediate', -- 'immediate', 'daily', 'weekly'

    -- Verification
    is_verified BOOLEAN DEFAULT 0,
    verification_token TEXT,
    verified_at DATETIME,

    -- Status
    is_active BOOLEAN DEFAULT 1,
    unsubscribe_token TEXT,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(email)
);

-- Indexes for subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_verified ON alert_subscriptions(is_verified, is_active);
CREATE INDEX IF NOT EXISTS idx_subscriptions_email ON alert_subscriptions(email);

-- Ban statistics by platform (for dashboard)
CREATE TABLE IF NOT EXISTS platform_ban_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform TEXT NOT NULL,
    date DATE NOT NULL,

    -- Daily statistics
    books_monitored INTEGER DEFAULT 0,
    books_available INTEGER DEFAULT 0,
    books_banned INTEGER DEFAULT 0,
    new_bans_today INTEGER DEFAULT 0,
    restored_today INTEGER DEFAULT 0,

    -- Performance
    checks_performed INTEGER DEFAULT 0,
    avg_response_time_ms INTEGER,
    error_rate DECIMAL(3,2),

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(platform, date)
);

-- Indexes for stats
CREATE INDEX IF NOT EXISTS idx_platform_stats ON platform_ban_stats(platform, date DESC);

-- Insert default platform monitors
INSERT OR IGNORE INTO platform_monitors (platform_name, base_url, scraper_type, rate_limit_ms)
VALUES
    ('amazon', 'https://www.amazon.com', 'puppeteer', 3000),
    ('goodreads', 'https://www.goodreads.com', 'puppeteer', 2000),
    ('google_books', 'https://books.google.com', 'api', 1000),
    ('apple_books', 'https://books.apple.com', 'puppeteer', 3000);

-- Create view for recent bans (useful for dashboard)
CREATE VIEW IF NOT EXISTS recent_bans AS
SELECT
    ca.id,
    ca.book_id,
    ca.platform,
    ca.alert_type,
    ca.severity,
    ca.created_at,
    ca.is_verified,
    mb.amazon_asin,
    mb.isbn,
    be.title,
    be.author,
    be.danger_index
FROM censorship_alerts ca
JOIN monitored_books mb ON ca.book_id = mb.book_id
LEFT JOIN book_embeddings be ON ca.book_id = be.book_id
WHERE ca.alert_type = 'new_ban'
ORDER BY ca.created_at DESC
LIMIT 100;
