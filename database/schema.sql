-- Ethos Network Database Schema
-- This database will store all user profiles, activities, and analytics data

-- Users/Profiles table
CREATE TABLE IF NOT EXISTS profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id INTEGER UNIQUE NOT NULL,
    username TEXT,
    display_name TEXT,
    avatar_url TEXT,
    description TEXT,
    score INTEGER DEFAULT 0,
    xp_total INTEGER DEFAULT 0,
    xp_streak_days INTEGER DEFAULT 0,
    status TEXT DEFAULT 'ACTIVE',
    primary_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_synced DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User keys (addresses, social accounts, etc.)
CREATE TABLE IF NOT EXISTS user_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id INTEGER NOT NULL,
    key_type TEXT NOT NULL, -- 'address', 'service:x.com', 'service:discord', etc.
    key_value TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (profile_id) REFERENCES profiles(profile_id),
    UNIQUE(profile_id, key_type, key_value)
);

-- Reviews and vouches
CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reviewer_profile_id INTEGER NOT NULL,
    target_profile_id INTEGER NOT NULL,
    review_type TEXT NOT NULL, -- 'positive', 'negative', 'neutral', 'vouch'
    comment TEXT,
    score_impact INTEGER DEFAULT 0,
    transaction_hash TEXT,
    block_number INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reviewer_profile_id) REFERENCES profiles(profile_id),
    FOREIGN KEY (target_profile_id) REFERENCES profiles(profile_id)
);

-- User statistics (aggregated data)
CREATE TABLE IF NOT EXISTS user_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id INTEGER UNIQUE NOT NULL,
    reviews_given INTEGER DEFAULT 0,
    reviews_received INTEGER DEFAULT 0,
    vouches_given INTEGER DEFAULT 0,
    vouches_received INTEGER DEFAULT 0,
    positive_received INTEGER DEFAULT 0,
    negative_received INTEGER DEFAULT 0,
    neutral_received INTEGER DEFAULT 0,
    positive_given INTEGER DEFAULT 0,
    negative_given INTEGER DEFAULT 0,
    neutral_given INTEGER DEFAULT 0,
    credibility_score INTEGER DEFAULT 0,
    reciprocity_ratio REAL DEFAULT 0,
    vouch_reciprocity_ratio REAL DEFAULT 0,
    positive_ratio REAL DEFAULT 0,
    negative_ratio REAL DEFAULT 0,
    neutral_ratio REAL DEFAULT 0,
    calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (profile_id) REFERENCES profiles(profile_id)
);

-- R4R (Review for Review) analysis cache
CREATE TABLE IF NOT EXISTS r4r_analysis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id INTEGER UNIQUE NOT NULL,
    analysis_data TEXT, -- JSON blob of the complete analysis
    risk_score REAL DEFAULT 0,
    reciprocity_ratio REAL DEFAULT 0,
    reviewer_reputation REAL DEFAULT 0,
    total_activity INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (profile_id) REFERENCES profiles(profile_id)
);

-- Sync logs to track data synchronization
CREATE TABLE IF NOT EXISTS sync_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sync_type TEXT NOT NULL, -- 'profiles', 'reviews', 'stats', 'r4r'
    status TEXT NOT NULL, -- 'started', 'completed', 'failed'
    records_processed INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    records_created INTEGER DEFAULT 0,
    error_message TEXT,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    duration_ms INTEGER
);

-- ETH price tracking
CREATE TABLE IF NOT EXISTS eth_prices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    price_usd REAL NOT NULL,
    recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_score ON profiles(score DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_xp_total ON profiles(xp_total DESC);
CREATE INDEX IF NOT EXISTS idx_user_keys_profile_id ON user_keys(profile_id);
CREATE INDEX IF NOT EXISTS idx_user_keys_type_value ON user_keys(key_type, key_value);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer ON reviews(reviewer_profile_id);
CREATE INDEX IF NOT EXISTS idx_reviews_target ON reviews(target_profile_id);
CREATE INDEX IF NOT EXISTS idx_reviews_type ON reviews(review_type);
CREATE INDEX IF NOT EXISTS idx_user_stats_profile_id ON user_stats(profile_id);
CREATE INDEX IF NOT EXISTS idx_r4r_profile_id ON r4r_analysis(profile_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_type_status ON sync_logs(sync_type, status);
