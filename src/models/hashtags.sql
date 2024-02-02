-- Hashtags table for tracking hashtag usage and trends
CREATE TABLE IF NOT EXISTS hashtags (
    id SERIAL PRIMARY KEY,
    tag VARCHAR(100) NOT NULL UNIQUE,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Junction table for post-hashtag relationships
CREATE TABLE IF NOT EXISTS post_hashtags (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    hashtag_id INTEGER NOT NULL REFERENCES hashtags(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(post_id, hashtag_id)
);

-- Index for efficient hashtag lookups
CREATE INDEX IF NOT EXISTS idx_hashtags_tag ON hashtags(tag);
CREATE INDEX IF NOT EXISTS idx_hashtags_usage ON hashtags(usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_post_hashtags_post ON post_hashtags(post_id);
CREATE INDEX IF NOT EXISTS idx_post_hashtags_hashtag ON post_hashtags(hashtag_id);
CREATE INDEX IF NOT EXISTS idx_post_hashtags_created ON post_hashtags(created_at DESC);
