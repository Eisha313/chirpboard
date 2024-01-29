-- Optional: Materialized views for heavy leaderboard queries
-- Can be refreshed periodically for better performance

-- Top liked users materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_top_liked_users AS
SELECT 
    u.id,
    u.username,
    u.display_name,
    u.avatar_url,
    u.bio,
    COUNT(DISTINCT p.id) as post_count,
    COALESCE(SUM(p.like_count), 0) as total_likes,
    COALESCE(AVG(p.like_count), 0) as avg_likes_per_post,
    RANK() OVER (ORDER BY COALESCE(SUM(p.like_count), 0) DESC) as likes_rank
FROM users u
LEFT JOIN posts p ON u.id = p.user_id
WHERE u.is_active = true
GROUP BY u.id, u.username, u.display_name, u.avatar_url, u.bio
HAVING COUNT(p.id) > 0
ORDER BY total_likes DESC;

-- Index for fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_top_liked_users_id ON mv_top_liked_users(id);

-- Most active users in last 30 days
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_most_active_users AS
SELECT 
    u.id,
    u.username,
    u.display_name,
    u.avatar_url,
    u.bio,
    COUNT(DISTINCT p.id) as posts_count,
    COUNT(DISTINCT r.id) as reactions_count,
    (COUNT(DISTINCT p.id) * 2 + COUNT(DISTINCT r.id)) as activity_score,
    RANK() OVER (ORDER BY (COUNT(DISTINCT p.id) * 2 + COUNT(DISTINCT r.id)) DESC) as activity_rank
FROM users u
LEFT JOIN posts p ON u.id = p.user_id AND p.created_at > NOW() - INTERVAL '30 days'
LEFT JOIN reactions r ON u.id = r.user_id AND r.created_at > NOW() - INTERVAL '30 days'
WHERE u.is_active = true
GROUP BY u.id, u.username, u.display_name, u.avatar_url, u.bio
HAVING (COUNT(DISTINCT p.id) + COUNT(DISTINCT r.id)) > 0
ORDER BY activity_score DESC;

-- Index for fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_most_active_users_id ON mv_most_active_users(id);

-- Function to refresh leaderboard views
CREATE OR REPLACE FUNCTION refresh_leaderboard_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_top_liked_users;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_most_active_users;
END;
$$ LANGUAGE plpgsql;

-- Comment for documentation
COMMENT ON MATERIALIZED VIEW mv_top_liked_users IS 'Cached leaderboard of users ranked by total likes received';
COMMENT ON MATERIALIZED VIEW mv_most_active_users IS 'Cached leaderboard of most active users in last 30 days';
