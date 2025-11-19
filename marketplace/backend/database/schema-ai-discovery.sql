-- AI Discovery Engine Database Schema
-- Revolutionary features for semantic search, knowledge graphs, and reading paths

-- Book embeddings table (for semantic search)
CREATE TABLE IF NOT EXISTS book_embeddings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id TEXT NOT NULL UNIQUE,
    brand TEXT NOT NULL,

    -- Book metadata (denormalized for faster queries)
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    description TEXT,
    long_description TEXT,
    category TEXT,

    -- OpenAI embeddings (stored as JSON array)
    embedding_vector TEXT NOT NULL, -- JSON array of 1536 floats
    embedding_model TEXT DEFAULT 'text-embedding-3-small',

    -- Controversy and suppression metadata
    controversy_score INTEGER DEFAULT 0, -- 0-100
    suppression_level INTEGER DEFAULT 0, -- 0-100 (higher = more suppressed)
    danger_index INTEGER DEFAULT 0, -- 0-100 (composite risk score)

    -- Search optimization
    search_weight DECIMAL(3,2) DEFAULT 1.0, -- Boost factor for search results
    is_suppressed BOOLEAN DEFAULT 0,
    is_controversial BOOLEAN DEFAULT 0,

    generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for embeddings
CREATE INDEX IF NOT EXISTS idx_embeddings_book_id ON book_embeddings(book_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_brand ON book_embeddings(brand);
CREATE INDEX IF NOT EXISTS idx_embeddings_controversy ON book_embeddings(controversy_score DESC);
CREATE INDEX IF NOT EXISTS idx_embeddings_suppression ON book_embeddings(suppression_level DESC);
CREATE INDEX IF NOT EXISTS idx_embeddings_danger ON book_embeddings(danger_index DESC);

-- Citation and relationship network
CREATE TABLE IF NOT EXISTS citation_network (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_book_id TEXT NOT NULL,
    cited_book_id TEXT NOT NULL,

    -- Relationship type
    relationship_type TEXT NOT NULL, -- 'supports', 'refutes', 'extends', 'prerequisite', 'similar_topic'
    relationship_strength DECIMAL(3,2) DEFAULT 0.5, -- 0.0-1.0 confidence

    -- Metadata
    citation_context TEXT, -- Why these books are related
    detected_by TEXT, -- 'manual', 'ai', 'similarity'

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(source_book_id, cited_book_id, relationship_type)
);

-- Indexes for citations
CREATE INDEX IF NOT EXISTS idx_citations_source ON citation_network(source_book_id);
CREATE INDEX IF NOT EXISTS idx_citations_cited ON citation_network(cited_book_id);
CREATE INDEX IF NOT EXISTS idx_citations_type ON citation_network(relationship_type);

-- Reading paths (curated learning journeys)
CREATE TABLE IF NOT EXISTS reading_paths (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    path_id TEXT UNIQUE NOT NULL,

    name TEXT NOT NULL,
    description TEXT,
    topic TEXT NOT NULL,

    -- Path metadata
    difficulty_level TEXT DEFAULT 'beginner', -- 'beginner', 'intermediate', 'advanced', 'expert'
    estimated_hours INTEGER, -- Total reading time
    book_sequence TEXT NOT NULL, -- JSON array of book IDs in order

    -- Goals and outcomes
    learning_goals TEXT, -- JSON array of learning objectives
    prerequisites TEXT, -- JSON array of prerequisite knowledge

    -- Popularity and quality
    completion_count INTEGER DEFAULT 0,
    average_rating DECIMAL(3,2),
    popularity_score INTEGER DEFAULT 0,

    -- Attribution
    created_by TEXT, -- 'ai', 'curator', or user_id
    is_featured BOOLEAN DEFAULT 0,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for reading paths
CREATE INDEX IF NOT EXISTS idx_paths_topic ON reading_paths(topic);
CREATE INDEX IF NOT EXISTS idx_paths_difficulty ON reading_paths(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_paths_popularity ON reading_paths(popularity_score DESC);
CREATE INDEX IF NOT EXISTS idx_paths_featured ON reading_paths(is_featured, popularity_score DESC);

-- User reading path progress
CREATE TABLE IF NOT EXISTS reading_path_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email TEXT NOT NULL,
    path_id TEXT NOT NULL,

    -- Progress tracking
    current_position INTEGER DEFAULT 0, -- Index in book_sequence
    completed_books TEXT, -- JSON array of completed book IDs
    progress_percentage INTEGER DEFAULT 0,

    -- Engagement
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,

    -- Rating
    user_rating INTEGER, -- 1-5 stars
    user_review TEXT,

    UNIQUE(user_email, path_id)
);

-- Indexes for progress
CREATE INDEX IF NOT EXISTS idx_progress_user ON reading_path_progress(user_email);
CREATE INDEX IF NOT EXISTS idx_progress_path ON reading_path_progress(path_id);

-- Censorship and suppression tracking
CREATE TABLE IF NOT EXISTS book_suppression_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id TEXT NOT NULL,

    -- Event details
    platform TEXT NOT NULL, -- 'amazon', 'goodreads', 'google', 'government'
    event_type TEXT NOT NULL, -- 'removed', 'shadowbanned', 'search_suppressed', 'delisted', 'banned'

    -- Detection
    detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    verified BOOLEAN DEFAULT 0,
    verification_method TEXT, -- 'manual', 'scraper', 'api', 'user_report'

    -- Impact
    impact_score INTEGER DEFAULT 0, -- 0-100, severity of suppression
    media_coverage TEXT, -- JSON array of news article URLs
    archived_url TEXT, -- Wayback Machine snapshot

    -- Evidence
    evidence TEXT, -- JSON: screenshots, API responses, etc.
    removal_reason TEXT,
    platform_statement TEXT,

    -- Status
    is_active BOOLEAN DEFAULT 1, -- Is the suppression still in effect?
    restored_at DATETIME,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for suppression events
CREATE INDEX IF NOT EXISTS idx_suppression_book ON book_suppression_events(book_id);
CREATE INDEX IF NOT EXISTS idx_suppression_platform ON book_suppression_events(platform);
CREATE INDEX IF NOT EXISTS idx_suppression_type ON book_suppression_events(event_type);
CREATE INDEX IF NOT EXISTS idx_suppression_active ON book_suppression_events(is_active, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_suppression_impact ON book_suppression_events(impact_score DESC);

-- Ban risk prediction scores
CREATE TABLE IF NOT EXISTS book_ban_risk_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id TEXT NOT NULL,

    -- Risk assessment
    risk_score DECIMAL(3,2) NOT NULL, -- 0.0-1.0 probability of future ban
    risk_level TEXT, -- 'low', 'medium', 'high', 'critical'

    -- Risk factors (JSON)
    risk_factors TEXT, -- JSON: {"controversial_topic": 0.8, "author_history": 0.3, ...}

    -- Prediction metadata
    model_version TEXT,
    confidence_score DECIMAL(3,2),

    calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME, -- Predictions expire after 30 days

    UNIQUE(book_id)
);

-- Indexes for ban risk
CREATE INDEX IF NOT EXISTS idx_ban_risk_book ON book_ban_risk_scores(book_id);
CREATE INDEX IF NOT EXISTS idx_ban_risk_level ON book_ban_risk_scores(risk_level, risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_ban_risk_score ON book_ban_risk_scores(risk_score DESC);

-- Semantic search history and analytics
CREATE TABLE IF NOT EXISTS semantic_search_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Query details
    search_query TEXT NOT NULL,
    query_intent TEXT, -- AI-detected intent: 'discovery', 'controversy', 'learning_path'

    -- Results
    results_count INTEGER,
    top_result_book_id TEXT,

    -- User interaction
    user_email TEXT,
    clicked_book_ids TEXT, -- JSON array of books user clicked
    purchased_book_ids TEXT, -- JSON array of books user bought from this search

    -- Performance
    search_duration_ms INTEGER,
    embedding_used BOOLEAN DEFAULT 1,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for search log
CREATE INDEX IF NOT EXISTS idx_search_log_query ON semantic_search_log(search_query);
CREATE INDEX IF NOT EXISTS idx_search_log_user ON semantic_search_log(user_email);
CREATE INDEX IF NOT EXISTS idx_search_log_date ON semantic_search_log(created_at DESC);

-- Controversy metrics (real-time tracking)
CREATE TABLE IF NOT EXISTS book_controversy_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id TEXT NOT NULL,
    date DATE NOT NULL,

    -- Social signals
    social_mentions INTEGER DEFAULT 0,
    negative_sentiment_count INTEGER DEFAULT 0,
    positive_sentiment_count INTEGER DEFAULT 0,

    -- Media coverage
    media_articles INTEGER DEFAULT 0,
    media_attacks INTEGER DEFAULT 0,
    media_defenses INTEGER DEFAULT 0,

    -- Platform actions
    platform_warnings INTEGER DEFAULT 0,
    content_flags INTEGER DEFAULT 0,

    -- Government/institutional
    government_inquiries INTEGER DEFAULT 0,
    institutional_challenges INTEGER DEFAULT 0,

    -- Composite scores
    daily_controversy_score INTEGER DEFAULT 0, -- 0-100
    trend_direction TEXT, -- 'rising', 'falling', 'stable'

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(book_id, date)
);

-- Indexes for controversy metrics
CREATE INDEX IF NOT EXISTS idx_controversy_book_date ON book_controversy_metrics(book_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_controversy_score ON book_controversy_metrics(daily_controversy_score DESC);
CREATE INDEX IF NOT EXISTS idx_controversy_trending ON book_controversy_metrics(trend_direction, daily_controversy_score DESC);

-- AI-generated book insights and recommendations
CREATE TABLE IF NOT EXISTS ai_book_insights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id TEXT NOT NULL,

    -- Insight details
    insight_type TEXT NOT NULL, -- 'suppression_alert', 'trending_topic', 'reading_path', 'similar_books'
    insight_title TEXT NOT NULL,
    insight_description TEXT NOT NULL,

    -- Supporting data
    confidence_score DECIMAL(3,2),
    data_points TEXT, -- JSON with supporting evidence

    -- Related books
    related_book_ids TEXT, -- JSON array

    -- Display priority
    priority INTEGER DEFAULT 0, -- Higher = more important
    is_active BOOLEAN DEFAULT 1,

    generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME
);

-- Indexes for insights
CREATE INDEX IF NOT EXISTS idx_insights_book ON ai_book_insights(book_id);
CREATE INDEX IF NOT EXISTS idx_insights_type ON ai_book_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_insights_active ON ai_book_insights(is_active, priority DESC);

-- Book topic tags (for better categorization)
CREATE TABLE IF NOT EXISTS book_topic_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id TEXT NOT NULL,

    -- Topic information
    topic_tag TEXT NOT NULL,
    topic_category TEXT, -- 'political', 'economic', 'scientific', 'philosophical', 'controversial'

    -- Confidence
    confidence_score DECIMAL(3,2) DEFAULT 1.0,
    detected_by TEXT, -- 'manual', 'ai', 'category'

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(book_id, topic_tag)
);

-- Indexes for topic tags
CREATE INDEX IF NOT EXISTS idx_topics_book ON book_topic_tags(book_id);
CREATE INDEX IF NOT EXISTS idx_topics_tag ON book_topic_tags(topic_tag);
CREATE INDEX IF NOT EXISTS idx_topics_category ON book_topic_tags(topic_category);

-- Embedding generation queue (for batch processing)
CREATE TABLE IF NOT EXISTS embedding_generation_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id TEXT NOT NULL UNIQUE,
    brand TEXT NOT NULL,

    -- Book data to embed
    content_to_embed TEXT NOT NULL, -- Combined title, author, description

    -- Processing status
    status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    retry_count INTEGER DEFAULT 0,
    error_message TEXT,

    -- Timestamps
    queued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    processed_at DATETIME
);

-- Index for queue
CREATE INDEX IF NOT EXISTS idx_embedding_queue_status ON embedding_generation_queue(status, queued_at);
