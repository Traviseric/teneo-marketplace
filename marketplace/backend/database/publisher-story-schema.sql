-- Publisher Story System Schema
-- Stories and notes that publishers add to their books

CREATE TABLE IF NOT EXISTS publisher_stories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    published_book_id INTEGER NOT NULL,
    story_type TEXT NOT NULL CHECK (story_type IN ('origin', 'process', 'marketing', 'results', 'tips')),
    title TEXT NOT NULL,
    content TEXT NOT NULL, -- Markdown content
    helpful_count INTEGER DEFAULT 0,
    views INTEGER DEFAULT 0,
    featured BOOLEAN DEFAULT FALSE,
    published BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (published_book_id) REFERENCES published_books(id)
);

-- Story votes (helpful/not helpful)
CREATE TABLE IF NOT EXISTS story_votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    story_id INTEGER NOT NULL,
    voter_email TEXT NOT NULL,
    vote_type TEXT NOT NULL CHECK (vote_type IN ('helpful', 'not_helpful')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (story_id) REFERENCES publisher_stories(id),
    UNIQUE(story_id, voter_email)
);

-- Story comments
CREATE TABLE IF NOT EXISTS story_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    story_id INTEGER NOT NULL,
    commenter_name TEXT NOT NULL,
    commenter_email TEXT NOT NULL,
    comment TEXT NOT NULL,
    approved BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (story_id) REFERENCES publisher_stories(id)
);

-- Publishing tips extracted from stories
CREATE TABLE IF NOT EXISTS publishing_tips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL CHECK (category IN ('cover_design', 'title_optimization', 'description_writing', 'marketing', 'pricing', 'keywords')),
    tip_text TEXT NOT NULL,
    source_story_id INTEGER,
    publisher_name TEXT,
    helpful_count INTEGER DEFAULT 0,
    featured BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (source_story_id) REFERENCES publisher_stories(id)
);

-- Marketplace waitlist and claims
CREATE TABLE IF NOT EXISTS marketplace_waitlist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    publisher_email TEXT UNIQUE NOT NULL,
    publisher_name TEXT NOT NULL,
    books_published INTEGER DEFAULT 0,
    status TEXT DEFAULT 'waitlist' CHECK (status IN ('waitlist', 'claimed', 'founding_member')),
    referral_code TEXT UNIQUE,
    referred_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Publisher referrals
CREATE TABLE IF NOT EXISTS publisher_referrals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    referrer_email TEXT NOT NULL,
    referred_email TEXT NOT NULL,
    referral_code TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rewarded')),
    reward_type TEXT,
    reward_amount INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME
);

-- Publisher collaboration requests
CREATE TABLE IF NOT EXISTS collaboration_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    published_book_id INTEGER NOT NULL,
    request_type TEXT NOT NULL CHECK (request_type IN ('review_request', 'marketing_help', 'cover_feedback', 'collaboration')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'closed')),
    created_by_email TEXT NOT NULL,
    assigned_to_email TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (published_book_id) REFERENCES published_books(id)
);

-- Success stories for featured showcase
CREATE TABLE IF NOT EXISTS success_stories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    publisher_name TEXT NOT NULL,
    publisher_email TEXT NOT NULL,
    story_category TEXT NOT NULL CHECK (story_category IN ('first_time', 'genre_domination', 'rapid_growth', 'international', 'niche_market')),
    headline TEXT NOT NULL, -- "From 0 to 50 books in 90 days"
    quote TEXT NOT NULL,
    revenue_highlight TEXT, -- "Made $10K in first month"
    review_highlight TEXT,  -- "Average 4.8 stars across 25 books"
    books_count INTEGER DEFAULT 0,
    days_to_achievement INTEGER,
    avatar_url TEXT,
    featured BOOLEAN DEFAULT FALSE,
    featured_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Network visualization data
CREATE TABLE IF NOT EXISTS publisher_connections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    publisher_a_email TEXT NOT NULL,
    publisher_b_email TEXT NOT NULL,
    connection_type TEXT NOT NULL CHECK (connection_type IN ('referral', 'collaboration', 'helped', 'mentorship')),
    connection_strength INTEGER DEFAULT 1, -- For sizing connections in visualization
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(publisher_a_email, publisher_b_email, connection_type)
);

-- Marketplace launch tracking
CREATE TABLE IF NOT EXISTS marketplace_milestones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    milestone_type TEXT NOT NULL CHECK (milestone_type IN ('book_count', 'publisher_count', 'launch_ready')),
    current_value INTEGER NOT NULL,
    target_value INTEGER NOT NULL,
    percentage DECIMAL(5,2) NOT NULL,
    estimated_completion DATE,
    achieved BOOLEAN DEFAULT FALSE,
    achieved_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_publisher_stories_book ON publisher_stories(published_book_id);
CREATE INDEX IF NOT EXISTS idx_publisher_stories_type ON publisher_stories(story_type);
CREATE INDEX IF NOT EXISTS idx_publisher_stories_featured ON publisher_stories(featured);
CREATE INDEX IF NOT EXISTS idx_story_votes_story ON story_votes(story_id);
CREATE INDEX IF NOT EXISTS idx_story_comments_story ON story_comments(story_id);
CREATE INDEX IF NOT EXISTS idx_publishing_tips_category ON publishing_tips(category);
CREATE INDEX IF NOT EXISTS idx_marketplace_waitlist_email ON marketplace_waitlist(publisher_email);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON publisher_referrals(referrer_email);
CREATE INDEX IF NOT EXISTS idx_collaboration_book ON collaboration_requests(published_book_id);
CREATE INDEX IF NOT EXISTS idx_success_stories_category ON success_stories(story_category);
CREATE INDEX IF NOT EXISTS idx_success_stories_featured ON success_stories(featured);
CREATE INDEX IF NOT EXISTS idx_connections_publisher_a ON publisher_connections(publisher_a_email);