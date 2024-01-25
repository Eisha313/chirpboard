-- Reactions table for storing user reactions on posts
CREATE TABLE IF NOT EXISTS reactions (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reaction_type VARCHAR(20) NOT NULL DEFAULT 'like',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure one reaction per user per post
  UNIQUE(post_id, user_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_reactions_post_id ON reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_reactions_user_id ON reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_reactions_type ON reactions(reaction_type);

-- Add engagement_score column to posts table if not exists
ALTER TABLE posts ADD COLUMN IF NOT EXISTS engagement_score DECIMAL(10, 2) DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_posts_engagement ON posts(engagement_score DESC);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);

-- Composite index for trending queries
CREATE INDEX IF NOT EXISTS idx_posts_trending ON posts(engagement_score DESC, created_at DESC);
