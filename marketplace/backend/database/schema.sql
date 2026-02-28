-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT UNIQUE NOT NULL,
    stripe_session_id TEXT UNIQUE,
    stripe_payment_intent_id TEXT,
    customer_email TEXT NOT NULL,
    customer_name TEXT,
    book_id TEXT NOT NULL,
    book_title TEXT NOT NULL,
    book_author TEXT NOT NULL,
    format TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'USD',
    status TEXT NOT NULL DEFAULT 'pending',
    payment_status TEXT DEFAULT 'pending',
    fulfillment_status TEXT DEFAULT 'pending',
    download_token TEXT,
    download_count INTEGER DEFAULT 0,
    download_expiry DATETIME,
    refund_status TEXT,
    refund_amount DECIMAL(10,2),
    refund_reason TEXT,
    metadata TEXT,
    abandonment_email_sent_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    refunded_at DATETIME
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

-- Download logs table
CREATE TABLE IF NOT EXISTS download_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT NOT NULL,
    download_token TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    download_status TEXT NOT NULL,
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(order_id)
);

-- Payment events table (for webhook history)
CREATE TABLE IF NOT EXISTS payment_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stripe_event_id TEXT UNIQUE NOT NULL,
    event_type TEXT NOT NULL,
    order_id TEXT,
    payload TEXT NOT NULL,
    processed BOOLEAN DEFAULT 0,
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    processed_at DATETIME
);

-- Refunds table
CREATE TABLE IF NOT EXISTS refunds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    refund_id TEXT UNIQUE NOT NULL,
    order_id TEXT NOT NULL,
    stripe_refund_id TEXT,
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'USD',
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    metadata TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    FOREIGN KEY (order_id) REFERENCES orders(order_id)
);

-- Email logs table
CREATE TABLE IF NOT EXISTS email_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT NOT NULL,
    email_type TEXT NOT NULL,
    recipient_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    status TEXT NOT NULL,
    error_message TEXT,
    message_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    sent_at DATETIME,
    FOREIGN KEY (order_id) REFERENCES orders(order_id)
);

-- Published books tracking table
CREATE TABLE IF NOT EXISTS published_books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    teneo_book_id TEXT NOT NULL,
    teneo_user_id TEXT NOT NULL,
    amazon_asin TEXT NOT NULL,
    amazon_url TEXT NOT NULL,
    
    -- Book metadata from Amazon API
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    description TEXT,
    cover_image_url TEXT,
    publication_date DATE,
    page_count INTEGER,
    language TEXT DEFAULT 'en',
    
    -- Pricing and sales data
    current_price DECIMAL(10,2),
    currency TEXT DEFAULT 'USD',
    bestseller_rank INTEGER,
    category_rank INTEGER,
    primary_category TEXT,
    
    -- Review and rating data
    rating_average DECIMAL(3,2),
    rating_count INTEGER DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    
    -- Status tracking
    verification_status TEXT NOT NULL DEFAULT 'pending',
    publication_status TEXT NOT NULL DEFAULT 'active',
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_data_fetch DATETIME,
    
    -- Metadata
    submission_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    UNIQUE(teneo_book_id, teneo_user_id),
    UNIQUE(amazon_asin)
);

-- Indexes for published books
CREATE INDEX IF NOT EXISTS idx_published_books_user ON published_books(teneo_user_id);
CREATE INDEX IF NOT EXISTS idx_published_books_status ON published_books(verification_status);
CREATE INDEX IF NOT EXISTS idx_published_books_created ON published_books(created_at);
CREATE INDEX IF NOT EXISTS idx_published_books_rank ON published_books(bestseller_rank);
CREATE INDEX IF NOT EXISTS idx_published_books_rating ON published_books(rating_average);

-- Book ranking history table
CREATE TABLE IF NOT EXISTS book_ranking_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    published_book_id INTEGER NOT NULL,
    bestseller_rank INTEGER,
    category_rank INTEGER,
    rating_average DECIMAL(3,2),
    rating_count INTEGER,
    review_count INTEGER,
    price DECIMAL(10,2),
    recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (published_book_id) REFERENCES published_books(id)
);

-- Index for ranking history
CREATE INDEX IF NOT EXISTS idx_ranking_history_book_date ON book_ranking_history(published_book_id, recorded_at);

-- User authentication tokens for Teneo validation
CREATE TABLE IF NOT EXISTS teneo_auth_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_expiry DATETIME,
    scope TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Progress tracking table for milestone goals
CREATE TABLE IF NOT EXISTS publication_milestones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    milestone_name TEXT NOT NULL,
    target_count INTEGER NOT NULL,
    current_count INTEGER DEFAULT 0,
    description TEXT,
    reward_description TEXT,
    achieved_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert initial milestone for 10,000 books
INSERT OR IGNORE INTO publication_milestones (milestone_name, target_count, description, reward_description) 
VALUES ('10K_BOOKS_GOAL', 10000, 'Community goal to publish 10,000 books on Amazon', 'Full marketplace network launch');

-- Cron execution log table
CREATE TABLE IF NOT EXISTS cron_execution_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_name TEXT NOT NULL,
    success BOOLEAN NOT NULL,
    message TEXT,
    executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index for cron log
CREATE INDEX IF NOT EXISTS idx_cron_log_job_date ON cron_execution_log(job_name, executed_at);

-- Enhanced Amazon data table
CREATE TABLE IF NOT EXISTS book_amazon_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    published_book_id INTEGER NOT NULL,
    
    -- Format and availability data
    formats_available TEXT, -- JSON: ["kindle", "paperback", "hardcover"]
    kindle_price DECIMAL(10,2),
    paperback_price DECIMAL(10,2),
    hardcover_price DECIMAL(10,2),
    
    -- Category rankings (JSON array)
    category_rankings TEXT, -- JSON: [{"category": "Business", "rank": 1234}, ...]
    
    -- Content analysis
    keywords_detected TEXT, -- JSON array of extracted keywords
    has_a_plus_content BOOLEAN DEFAULT 0,
    description_length INTEGER,
    
    -- Related products
    also_bought_asins TEXT, -- JSON array of related ASINs
    
    -- Review analysis
    review_sentiment_positive INTEGER DEFAULT 0,
    review_sentiment_negative INTEGER DEFAULT 0,
    review_keywords TEXT, -- JSON: {"positive": [...], "negative": [...]}
    
    -- Performance estimates
    estimated_daily_sales INTEGER,
    estimated_monthly_revenue DECIMAL(10,2),
    
    -- Tracking metadata
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    data_quality_score INTEGER DEFAULT 0, -- 0-100 based on data completeness
    
    FOREIGN KEY (published_book_id) REFERENCES published_books(id),
    UNIQUE(published_book_id)
);

-- Enhanced ranking history with categories
CREATE TABLE IF NOT EXISTS book_category_rankings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    published_book_id INTEGER NOT NULL,
    category_name TEXT NOT NULL,
    category_rank INTEGER NOT NULL,
    recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (published_book_id) REFERENCES published_books(id)
);

-- Price history tracking
CREATE TABLE IF NOT EXISTS book_price_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    published_book_id INTEGER NOT NULL,
    format TEXT NOT NULL, -- 'kindle', 'paperback', 'hardcover'
    price DECIMAL(10,2) NOT NULL,
    recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (published_book_id) REFERENCES published_books(id)
);

-- Publisher notes for books
CREATE TABLE IF NOT EXISTS book_publisher_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    published_book_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    notes_markdown TEXT,
    publishing_tips TEXT,
    marketing_tactics TEXT,
    teneo_modifications TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (published_book_id) REFERENCES published_books(id),
    UNIQUE(published_book_id, user_id)
);

-- Performance alerts
CREATE TABLE IF NOT EXISTS performance_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    published_book_id INTEGER NOT NULL,
    alert_type TEXT NOT NULL, -- 'bsr_improvement', 'new_review', 'best_rank', 'top_10k'
    alert_message TEXT NOT NULL,
    trigger_value TEXT, -- Store the specific value that triggered alert
    acknowledged BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (published_book_id) REFERENCES published_books(id)
);

-- Daily performance digest data
CREATE TABLE IF NOT EXISTS daily_performance_digest (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    digest_date DATE NOT NULL UNIQUE,
    
    -- Book of the day
    book_of_day_id INTEGER,
    book_of_day_improvement INTEGER,
    
    -- Mover and shaker
    mover_shaker_id INTEGER,
    mover_volatility DECIMAL(10,2),
    
    -- Review champion
    review_champion_id INTEGER,
    new_reviews_count INTEGER,
    
    -- Rising category
    rising_category TEXT,
    category_book_count INTEGER,
    
    -- Community stats
    total_books_published INTEGER,
    estimated_total_revenue DECIMAL(12,2),
    total_reviews INTEGER,
    average_rating DECIMAL(3,2),
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (book_of_day_id) REFERENCES published_books(id),
    FOREIGN KEY (mover_shaker_id) REFERENCES published_books(id),
    FOREIGN KEY (review_champion_id) REFERENCES published_books(id)
);

-- Book insights generated by AI analysis
CREATE TABLE IF NOT EXISTS book_insights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    published_book_id INTEGER NOT NULL,
    insight_type TEXT NOT NULL, -- 'pattern', 'comparison', 'optimization', 'trend'
    insight_title TEXT NOT NULL,
    insight_description TEXT NOT NULL,
    confidence_score DECIMAL(3,2), -- 0.0-1.0
    data_points TEXT, -- JSON with supporting data
    is_active BOOLEAN DEFAULT 1,
    generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (published_book_id) REFERENCES published_books(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_amazon_data_book ON book_amazon_data(published_book_id);
CREATE INDEX IF NOT EXISTS idx_category_rankings_book_date ON book_category_rankings(published_book_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_price_history_book_date ON book_price_history(published_book_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_alerts_user_ack ON performance_alerts(user_id, acknowledged);
CREATE INDEX IF NOT EXISTS idx_insights_book_active ON book_insights(published_book_id, is_active);

-- Publisher stats table
CREATE TABLE IF NOT EXISTS publisher_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL UNIQUE,
    username TEXT,
    display_name TEXT,
    profile_bio TEXT,
    profile_image_url TEXT,
    social_twitter TEXT,
    social_linkedin TEXT,
    social_website TEXT,
    
    -- Publishing stats
    total_books INTEGER DEFAULT 0,
    verified_books INTEGER DEFAULT 0,
    best_bsr INTEGER,
    avg_bsr DECIMAL(12,2),
    total_reviews INTEGER DEFAULT 0,
    total_revenue DECIMAL(12,2) DEFAULT 0,
    avg_rating DECIMAL(3,2),
    
    -- Milestone tracking
    badges_earned TEXT, -- JSON array of badge IDs
    current_milestone INTEGER DEFAULT 5,
    next_milestone_progress INTEGER DEFAULT 0,
    rewards_earned INTEGER DEFAULT 0,
    free_generations_available INTEGER DEFAULT 0,
    
    -- Publishing velocity
    books_last_30_days INTEGER DEFAULT 0,
    books_last_7_days INTEGER DEFAULT 0,
    first_book_date DATE,
    last_book_date DATE,
    
    -- Profile settings
    profile_visibility TEXT DEFAULT 'public',
    show_stats BOOLEAN DEFAULT 1,
    show_books BOOLEAN DEFAULT 1,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for publisher stats
CREATE INDEX IF NOT EXISTS idx_publisher_stats_user ON publisher_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_publisher_stats_books ON publisher_stats(total_books DESC);
CREATE INDEX IF NOT EXISTS idx_publisher_stats_bsr ON publisher_stats(best_bsr ASC);
CREATE INDEX IF NOT EXISTS idx_publisher_stats_reviews ON publisher_stats(total_reviews DESC);

-- Publisher milestones table
CREATE TABLE IF NOT EXISTS publisher_milestones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    milestone_type TEXT NOT NULL, -- '5', '10', '25', '50', '100', '250', '500'
    milestone_category TEXT DEFAULT 'books_published', -- 'books_published', 'reviews_earned', 'bsr_achieved'
    target_value INTEGER NOT NULL,
    current_value INTEGER DEFAULT 0,
    achieved_date DATETIME,
    reward_status TEXT DEFAULT 'pending', -- 'pending', 'granted', 'claimed'
    reward_description TEXT,
    badge_id TEXT,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, milestone_type, milestone_category),
    FOREIGN KEY (user_id) REFERENCES publisher_stats(user_id)
);

-- Index for milestones
CREATE INDEX IF NOT EXISTS idx_milestones_user_achieved ON publisher_milestones(user_id, achieved_date);
CREATE INDEX IF NOT EXISTS idx_milestones_type ON publisher_milestones(milestone_type, achieved_date);

-- Leaderboard cache table
CREATE TABLE IF NOT EXISTS leaderboard_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    leaderboard_type TEXT NOT NULL, -- 'most_published', 'rising_stars', 'best_sellers', 'most_reviewed', 'velocity_leaders'
    user_id TEXT NOT NULL,
    username TEXT,
    display_name TEXT,
    rank INTEGER NOT NULL,
    value DECIMAL(12,2) NOT NULL,
    secondary_value DECIMAL(12,2), -- For additional display info
    badge_display TEXT, -- JSON of badges to show
    
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(leaderboard_type, user_id)
);

-- Indexes for leaderboard cache
CREATE INDEX IF NOT EXISTS idx_leaderboard_type_rank ON leaderboard_cache(leaderboard_type, rank);
CREATE INDEX IF NOT EXISTS idx_leaderboard_updated ON leaderboard_cache(last_updated);

-- Publisher rewards tracking
CREATE TABLE IF NOT EXISTS publisher_rewards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    reward_type TEXT NOT NULL, -- 'free_generation', 'badge', 'milestone_bonus'
    reward_value INTEGER DEFAULT 1,
    earned_for TEXT, -- Description of what earned this reward
    milestone_achieved TEXT, -- Which milestone triggered this
    
    status TEXT DEFAULT 'available', -- 'available', 'claimed', 'expired'
    earned_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    claimed_date DATETIME,
    expires_date DATETIME,
    
    FOREIGN KEY (user_id) REFERENCES publisher_stats(user_id)
);

-- Index for rewards
CREATE INDEX IF NOT EXISTS idx_rewards_user_status ON publisher_rewards(user_id, status);

-- Insert default milestones for new publishers
INSERT OR IGNORE INTO publisher_milestones (user_id, milestone_type, milestone_category, target_value, reward_description, badge_id) 
VALUES 
('default', '5', 'books_published', 5, '1 free book generation', 'bronze_book'),
('default', '10', 'books_published', 10, '2 free book generations', 'silver_stack'),
('default', '25', 'books_published', 25, '5 free book generations', 'gold_trophy'),
('default', '50', 'books_published', 50, '10 free book generations', 'diamond'),
('default', '100', 'books_published', 100, '20 free book generations', 'crown'),
('default', '250', 'books_published', 250, '50 free book generations', 'rocket'),
('default', '500', 'books_published', 500, '100 free book generations', 'star');