const db = require('../config/database');
const { paginate } = require('../utils/dbHelpers');

const MAX_POST_LENGTH = 280;
const HASHTAG_REGEX = /#[a-zA-Z0-9_]+/g;

class PostService {
  extractHashtags(content) {
    const matches = content.match(HASHTAG_REGEX);
    if (!matches || matches.length === 0) {
      return [];
    }
    return [...new Set(matches.map(tag => tag.toLowerCase().slice(1)))];
  }

  validatePost(content) {
    if (!content || typeof content !== 'string') {
      return { valid: false, error: 'Post content is required' };
    }
    
    const trimmed = content.trim();
    
    if (trimmed.length === 0) {
      return { valid: false, error: 'Post content cannot be empty' };
    }
    
    if (trimmed.length > MAX_POST_LENGTH) {
      return { valid: false, error: `Post exceeds maximum length of ${MAX_POST_LENGTH} characters` };
    }
    
    return { valid: true, content: trimmed };
  }

  async createPost(userId, content) {
    const validation = this.validatePost(content);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const hashtags = this.extractHashtags(validation.content);
    
    const query = `
      INSERT INTO posts (user_id, content, hashtags, engagement_score, like_count, created_at)
      VALUES ($1, $2, $3, 0, 0, NOW())
      RETURNING id, user_id, content, hashtags, engagement_score, like_count, created_at
    `;
    
    const result = await db.query(query, [
      userId, 
      validation.content, 
      hashtags.length > 0 ? hashtags : []
    ]);
    
    return {
      ...result.rows[0],
      hashtags: result.rows[0].hashtags || []
    };
  }

  async getPostById(postId) {
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
      WHERE p.id = $1 AND p.deleted_at IS NULL
    `;
    
    const result = await db.query(query, [postId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return {
      ...result.rows[0],
      hashtags: result.rows[0].hashtags || []
    };
  }

  async deletePost(postId, userId) {
    const query = `
      UPDATE posts 
      SET deleted_at = NOW()
      WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
      RETURNING id
    `;
    
    const result = await db.query(query, [postId, userId]);
    return result.rows.length > 0;
  }

  async getUserPosts(userId, options = {}) {
    const { page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;

    const query = `
      SELECT 
        id,
        user_id,
        content,
        hashtags,
        engagement_score,
        like_count,
        created_at
      FROM posts
      WHERE user_id = $1 AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;
    
    const result = await db.query(query, [userId, limit, offset]);
    
    return result.rows.map(row => ({
      ...row,
      hashtags: row.hashtags || []
    }));
  }

  async incrementLikeCount(postId) {
    const query = `
      UPDATE posts 
      SET like_count = like_count + 1,
          engagement_score = engagement_score + 1,
          updated_at = NOW()
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING like_count
    `;
    
    const result = await db.query(query, [postId]);
    return result.rows[0]?.like_count || 0;
  }

  async decrementLikeCount(postId) {
    const query = `
      UPDATE posts 
      SET like_count = GREATEST(like_count - 1, 0),
          engagement_score = GREATEST(engagement_score - 1, 0),
          updated_at = NOW()
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING like_count
    `;
    
    const result = await db.query(query, [postId]);
    return result.rows[0]?.like_count || 0;
  }
}

module.exports = new PostService();
