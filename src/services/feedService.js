const db = require('../config/database');
const { paginate, buildWhereClause } = require('../utils/dbHelpers');

class FeedService {
  async getHomeFeed(userId, options = {}) {
    const { page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;

    // Get posts from followed users and own posts
    const query = `
      SELECT 
        p.id,
        p.user_id,
        p.content,
        p.hashtags,
        p.engagement_score,
        p.like_count,
        p.created_at,
        u.username,
        u.display_name,
        u.avatar_url,
        CASE WHEN l.user_id IS NOT NULL THEN true ELSE false END as liked_by_user
      FROM posts p
      INNER JOIN users u ON p.user_id = u.id
      LEFT JOIN follows f ON p.user_id = f.following_id AND f.follower_id = $1
      LEFT JOIN likes l ON p.id = l.post_id AND l.user_id = $1
      WHERE (f.follower_id = $1 OR p.user_id = $1)
        AND p.deleted_at IS NULL
      ORDER BY p.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await db.query(query, [userId, limit, offset]);
    
    return result.rows.map(row => ({
      ...row,
      hashtags: row.hashtags || []
    }));
  }

  async getPublicFeed(options = {}) {
    const { page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;

    const query = `
      SELECT 
        p.id,
        p.user_id,
        p.content,
        p.hashtags,
        p.engagement_score,
        p.like_count,
        p.created_at,
        u.username,
        u.display_name,
        u.avatar_url
      FROM posts p
      INNER JOIN users u ON p.user_id = u.id
      WHERE p.deleted_at IS NULL
      ORDER BY p.created_at DESC
      LIMIT $1 OFFSET $2
    `;

    const result = await db.query(query, [limit, offset]);
    
    return result.rows.map(row => ({
      ...row,
      hashtags: row.hashtags || []
    }));
  }

  async getTrendingFeed(options = {}) {
    const { page = 1, limit = 20, timeWindow = 24 } = options;
    const offset = (page - 1) * limit;

    // Get trending posts based on engagement score within time window
    const query = `
      SELECT 
        p.id,
        p.user_id,
        p.content,
        p.hashtags,
        p.engagement_score,
        p.like_count,
        p.created_at,
        u.username,
        u.display_name,
        u.avatar_url
      FROM posts p
      INNER JOIN users u ON p.user_id = u.id
      WHERE p.deleted_at IS NULL
        AND p.created_at > NOW() - INTERVAL '${parseInt(timeWindow, 10)} hours'
      ORDER BY p.engagement_score DESC, p.created_at DESC
      LIMIT $1 OFFSET $2
    `;

    const result = await db.query(query, [limit, offset]);
    
    return result.rows.map(row => ({
      ...row,
      hashtags: row.hashtags || []
    }));
  }

  async getHashtagFeed(hashtag, options = {}) {
    const { page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;

    if (!hashtag || typeof hashtag !== 'string') {
      return [];
    }

    const normalizedHashtag = hashtag.toLowerCase().replace(/^#/, '');

    const query = `
      SELECT 
        p.id,
        p.user_id,
        p.content,
        p.hashtags,
        p.engagement_score,
        p.like_count,
        p.created_at,
        u.username,
        u.display_name,
        u.avatar_url
      FROM posts p
      INNER JOIN users u ON p.user_id = u.id
      WHERE p.deleted_at IS NULL
        AND p.hashtags IS NOT NULL
        AND $1 = ANY(p.hashtags)
      ORDER BY p.engagement_score DESC, p.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await db.query(query, [normalizedHashtag, limit, offset]);
    
    return result.rows.map(row => ({
      ...row,
      hashtags: row.hashtags || []
    }));
  }

  async getUserActivityFeed(userId, options = {}) {
    const { page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;

    // Get user's posts with engagement data
    const query = `
      SELECT 
        p.id,
        p.user_id,
        p.content,
        p.hashtags,
        p.engagement_score,
        p.like_count,
        p.created_at,
        u.username,
        u.display_name,
        u.avatar_url
      FROM posts p
      INNER JOIN users u ON p.user_id = u.id
      WHERE p.user_id = $1
        AND p.deleted_at IS NULL
      ORDER BY p.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await db.query(query, [userId, limit, offset]);
    
    return result.rows.map(row => ({
      ...row,
      hashtags: row.hashtags || []
    }));
  }

  async refreshEngagementScores() {
    // Use a transaction to prevent race conditions
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');
      
      // Lock the posts table for update
      const updateQuery = `
        UPDATE posts
        SET engagement_score = (
          like_count * 1.0 +
          COALESCE((
            SELECT COUNT(*) FROM likes 
            WHERE post_id = posts.id 
            AND created_at > NOW() - INTERVAL '1 hour'
          ), 0) * 2.0
        ),
        updated_at = NOW()
        WHERE deleted_at IS NULL
          AND created_at > NOW() - INTERVAL '7 days'
      `;

      await client.query(updateQuery);
      await client.query('COMMIT');
      
      return { success: true };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = new FeedService();
