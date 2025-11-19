-- Proof of Read NFT Database Schema
-- Tracks book ownership NFTs and achievement badges

-- NFT mints (book ownership records)
CREATE TABLE IF NOT EXISTS nft_mints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_address TEXT NOT NULL,
    book_id TEXT NOT NULL,
    brand TEXT NOT NULL,

    -- NFT details
    token_id INTEGER NOT NULL,
    ipfs_hash TEXT NOT NULL,        -- IPFS hash of book content
    metadata_hash TEXT NOT NULL,    -- IPFS hash of metadata
    token_uri TEXT,                 -- Token metadata URI

    -- Blockchain data
    transaction_hash TEXT NOT NULL,
    block_number INTEGER,
    network TEXT DEFAULT 'polygon', -- 'polygon', 'ethereum', 'localhost'

    -- Status
    is_active BOOLEAN DEFAULT 1,
    is_transferred BOOLEAN DEFAULT 0,
    transferred_to TEXT,
    transferred_at DATETIME,

    minted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for NFT mints
CREATE INDEX IF NOT EXISTS idx_nft_user ON nft_mints(user_address);
CREATE INDEX IF NOT EXISTS idx_nft_book ON nft_mints(book_id);
CREATE INDEX IF NOT EXISTS idx_nft_token ON nft_mints(token_id, network);
CREATE INDEX IF NOT EXISTS idx_nft_tx ON nft_mints(transaction_hash);

-- Badge claims
CREATE TABLE IF NOT EXISTS badge_claims (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_address TEXT NOT NULL,
    badge_id INTEGER NOT NULL,

    -- Badge details
    badge_name TEXT,
    badge_category TEXT,             -- 'milestone', 'topic', 'controversial', 'special'

    -- Blockchain data
    transaction_hash TEXT,
    block_number INTEGER,
    network TEXT DEFAULT 'polygon',

    claimed_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(user_address, badge_id)
);

-- Indexes for badge claims
CREATE INDEX IF NOT EXISTS idx_badge_user ON badge_claims(user_address);
CREATE INDEX IF NOT EXISTS idx_badge_id ON badge_claims(badge_id);
CREATE INDEX IF NOT EXISTS idx_badge_category ON badge_claims(badge_category);

-- Badge definitions (metadata)
CREATE TABLE IF NOT EXISTS badge_definitions (
    badge_id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    requirement_type TEXT,           -- 'book_count', 'topic_count', 'danger_level', 'special'
    requirement_value INTEGER,
    requirement_condition TEXT,      -- JSON: additional conditions

    -- Display
    image_url TEXT,
    badge_color TEXT,
    rarity TEXT,                     -- 'common', 'rare', 'epic', 'legendary'

    -- Statistics
    total_earned INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT 1,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Library inheritance plans
CREATE TABLE IF NOT EXISTS library_inheritance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_address TEXT NOT NULL,

    -- Beneficiaries
    beneficiaries TEXT NOT NULL,     -- JSON array of addresses

    -- Conditions
    release_date INTEGER NOT NULL,   -- Unix timestamp
    heartbeat_interval INTEGER,      -- Seconds between required check-ins
    last_heartbeat INTEGER,          -- Unix timestamp

    -- Smart contract
    contract_address TEXT,
    transaction_hash TEXT,
    network TEXT DEFAULT 'polygon',

    -- Status
    is_active BOOLEAN DEFAULT 1,
    is_executed BOOLEAN DEFAULT 0,
    executed_at DATETIME,

    -- Message
    notes TEXT,                      -- Message to beneficiaries

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(owner_address)
);

-- Indexes for inheritance
CREATE INDEX IF NOT EXISTS idx_inheritance_owner ON library_inheritance(owner_address);
CREATE INDEX IF NOT EXISTS idx_inheritance_active ON library_inheritance(is_active, is_executed);

-- User wallet connections
CREATE TABLE IF NOT EXISTS user_wallets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email TEXT,
    wallet_address TEXT NOT NULL,

    -- Verification
    signature TEXT,
    nonce TEXT,
    verified_at DATETIME,

    -- Preferences
    is_primary BOOLEAN DEFAULT 1,
    display_name TEXT,

    -- Statistics
    total_nfts INTEGER DEFAULT 0,
    total_badges INTEGER DEFAULT 0,
    last_activity DATETIME,

    connected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(wallet_address)
);

-- Indexes for wallets
CREATE INDEX IF NOT EXISTS idx_wallet_email ON user_wallets(user_email);
CREATE INDEX IF NOT EXISTS idx_wallet_address ON user_wallets(wallet_address);

-- NFT transfer history
CREATE TABLE IF NOT EXISTS nft_transfers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token_id INTEGER NOT NULL,
    network TEXT NOT NULL,

    -- Transfer details
    from_address TEXT NOT NULL,
    to_address TEXT NOT NULL,
    transaction_hash TEXT NOT NULL,
    block_number INTEGER,

    -- Transfer type
    transfer_type TEXT,              -- 'purchase', 'gift', 'inheritance', 'sale'

    transferred_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for transfers
CREATE INDEX IF NOT EXISTS idx_transfer_token ON nft_transfers(token_id, network);
CREATE INDEX IF NOT EXISTS idx_transfer_from ON nft_transfers(from_address);
CREATE INDEX IF NOT EXISTS idx_transfer_to ON nft_transfers(to_address);

-- IPFS pin tracking
CREATE TABLE IF NOT EXISTS ipfs_pins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ipfs_hash TEXT NOT NULL UNIQUE,

    -- Content details
    content_type TEXT,               -- 'book', 'metadata', 'image'
    book_id TEXT,
    file_size INTEGER,

    -- Pin status
    pin_status TEXT DEFAULT 'pinned', -- 'pinned', 'unpinned', 'failed'
    pin_service TEXT DEFAULT 'pinata', -- 'pinata', 'web3storage', 'self'

    -- Access count
    access_count INTEGER DEFAULT 0,
    last_accessed DATETIME,

    pinned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index for IPFS pins
CREATE INDEX IF NOT EXISTS idx_ipfs_hash ON ipfs_pins(ipfs_hash);
CREATE INDEX IF NOT EXISTS idx_ipfs_book ON ipfs_pins(book_id);

-- Blockchain sync status (track contract events)
CREATE TABLE IF NOT EXISTS blockchain_sync_status (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contract_address TEXT NOT NULL,
    contract_type TEXT NOT NULL,     -- 'BookOwnership', 'KnowledgeBadges', 'Inheritance'
    network TEXT NOT NULL,

    -- Sync state
    last_synced_block INTEGER DEFAULT 0,
    last_synced_at DATETIME,

    -- Statistics
    total_events_synced INTEGER DEFAULT 0,
    last_event_type TEXT,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(contract_address, network)
);

-- Badge earning history (for analytics)
CREATE TABLE IF NOT EXISTS badge_earning_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_address TEXT NOT NULL,
    badge_id INTEGER NOT NULL,

    -- Context
    triggered_by TEXT,               -- 'book_purchase', 'milestone_reached', 'manual'
    book_id TEXT,                    -- Book that triggered badge (if applicable)

    -- Timing
    earned_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index for badge log
CREATE INDEX IF NOT EXISTS idx_badge_log_user ON badge_earning_log(user_address);
CREATE INDEX IF NOT EXISTS idx_badge_log_time ON badge_earning_log(earned_at DESC);

-- Insert initial badge definitions
INSERT OR IGNORE INTO badge_definitions (badge_id, name, description, category, requirement_type, requirement_value, rarity) VALUES
    (0, 'First Book', 'Purchased your first book', 'milestone', 'book_count', 1, 'common'),
    (1, 'Reading Habit', 'Building a library', 'milestone', 'book_count', 5, 'common'),
    (2, 'Book Collector', 'Serious reader', 'milestone', 'book_count', 10, 'rare'),
    (3, 'Library Builder', 'Growing knowledge base', 'milestone', 'book_count', 25, 'rare'),
    (4, 'Scholar', 'Dedicated to learning', 'milestone', 'book_count', 50, 'epic'),
    (5, 'Library Master', 'Extensive collection', 'milestone', 'book_count', 100, 'legendary'),
    (6, 'Censorship Survivor', 'Owner of banned knowledge', 'controversial', 'danger_level', 5, 'rare'),
    (7, 'Thought Criminal', 'Dangerous knowledge collector', 'controversial', 'danger_level', 25, 'epic'),
    (8, 'Forbidden Library', 'Master of suppressed knowledge', 'controversial', 'danger_level', 50, 'legendary'),
    (9, 'Economics Scholar', 'Master of economic theory', 'topic', 'topic_count', 10, 'rare'),
    (10, 'Philosophy Enthusiast', 'Lover of wisdom', 'topic', 'topic_count', 10, 'rare'),
    (11, 'Privacy Advocate', 'Champion of digital rights', 'topic', 'topic_count', 10, 'rare');

-- Views for quick queries
CREATE VIEW IF NOT EXISTS user_library_summary AS
SELECT
    user_address,
    COUNT(*) as total_books,
    COUNT(DISTINCT brand) as total_brands,
    MIN(minted_at) as first_purchase,
    MAX(minted_at) as latest_purchase
FROM nft_mints
WHERE is_active = 1
GROUP BY user_address;

CREATE VIEW IF NOT EXISTS badge_leaderboard AS
SELECT
    user_address,
    COUNT(*) as badge_count,
    COUNT(CASE WHEN badge_category = 'controversial' THEN 1 END) as controversial_badges,
    COUNT(CASE WHEN badge_category = 'milestone' THEN 1 END) as milestone_badges
FROM badge_claims
GROUP BY user_address
ORDER BY badge_count DESC;
