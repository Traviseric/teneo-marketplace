-- Manual Book Enhancement System
-- Smart backup for when Amazon API/scraping fails

-- Table to store manually enhanced book data
CREATE TABLE IF NOT EXISTS manual_book_enhancements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asin VARCHAR(20) NOT NULL,
    
    -- Enhanced book data (manually entered or from alternative sources)
    actual_title TEXT,
    actual_author TEXT,
    description TEXT,
    
    -- Amazon ranking and performance data
    bestseller_rank INTEGER,
    category_rank INTEGER,
    primary_category TEXT,
    
    -- Pricing data
    current_price DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Review and rating data  
    rating_average DECIMAL(2,1),
    rating_count INTEGER,
    review_count INTEGER,
    
    -- Book metadata
    cover_image_url TEXT,
    publication_date DATE,
    page_count INTEGER,
    language VARCHAR(10) DEFAULT 'en',
    
    -- Enhancement metadata
    source VARCHAR(50) DEFAULT 'manual_entry', -- manual_entry, amazon_search, third_party, etc.
    notes TEXT,
    
    -- Timestamps
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME,
    
    -- Ensure one record per ASIN (latest wins)
    UNIQUE(asin)
);

-- Index for fast ASIN lookups
CREATE INDEX IF NOT EXISTS idx_manual_enhancements_asin ON manual_book_enhancements(asin);
CREATE INDEX IF NOT EXISTS idx_manual_enhancements_source ON manual_book_enhancements(source);
CREATE INDEX IF NOT EXISTS idx_manual_enhancements_updated ON manual_book_enhancements(updated_at);

-- Table to store Amazon search results (backup data collection)
CREATE TABLE IF NOT EXISTS amazon_search_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asin VARCHAR(20) NOT NULL,
    search_query TEXT,
    
    -- Basic data from search results
    title TEXT,
    author TEXT,
    price TEXT,
    rating TEXT,
    rating_count TEXT,
    image_url TEXT,
    
    -- Search metadata
    search_source VARCHAR(50), -- amazon_search, google_search, etc.
    search_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(asin, search_source)
);

-- Index for search cache
CREATE INDEX IF NOT EXISTS idx_search_cache_asin ON amazon_search_cache(asin);
CREATE INDEX IF NOT EXISTS idx_search_cache_timestamp ON amazon_search_cache(search_timestamp);

-- View to combine manual enhancements with published books
CREATE VIEW IF NOT EXISTS enhanced_published_books AS
SELECT 
    pb.id,
    pb.teneo_book_id,
    pb.amazon_asin,
    pb.amazon_url,
    
    -- Use manual enhancement data when available, fallback to original
    COALESCE(me.actual_title, pb.title) as title,
    COALESCE(me.actual_author, pb.author) as author,
    COALESCE(me.description, pb.description) as description,
    COALESCE(me.cover_image_url, pb.cover_image_url) as cover_image_url,
    
    -- Enhanced performance data
    COALESCE(me.bestseller_rank, pb.bestseller_rank) as bestseller_rank,
    COALESCE(me.category_rank, pb.category_rank) as category_rank,
    COALESCE(me.current_price, pb.current_price) as current_price,
    COALESCE(me.rating_average, pb.rating_average) as rating_average,
    COALESCE(me.rating_count, pb.rating_count) as rating_count,
    COALESCE(me.review_count, pb.review_count) as review_count,
    
    -- Metadata
    pb.verification_status,
    pb.created_at,
    pb.teneo_user_id,
    me.source as enhancement_source,
    me.updated_at as enhancement_updated_at,
    
    -- Quality indicators
    CASE 
        WHEN me.id IS NOT NULL THEN 'enhanced'
        ELSE 'basic'
    END as data_quality
    
FROM published_books pb
LEFT JOIN manual_book_enhancements me ON pb.amazon_asin = me.asin;

-- Insert sample data for Travis's books
INSERT OR REPLACE INTO manual_book_enhancements (
    asin, actual_title, actual_author, bestseller_rank, current_price,
    rating_average, rating_count, review_count, source, notes
) VALUES 
(
    'B0FHF78VGF', 
    'The Hidden Triggers of Elite Habits', 
    'Travis Eric',
    1637, 
    9.99,
    4.2, 
    23, 
    23,
    'author_manual_entry',
    'Real data from Travis Eric - actual published book performance'
),
(
    'B0FHFTYS7D',
    'Mastering Micro-Habits', 
    'Travis Eric',
    2851, 
    9.99,
    4.1, 
    15, 
    15,
    'author_manual_entry',
    'Real data from Travis Eric - actual published book performance'
);

-- Function to get enhanced book data (prioritizing manual enhancements)
-- This would be used by the marketplace API to serve better data