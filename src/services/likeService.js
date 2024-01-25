const db = require('../config/database');

class LikeService {
  constructor() {
    this.reactionTypes = ['like', 'love', 'laugh', 'wow', 'sad'];
    this.trendingWeights = {
      like: 1,
      love: 2,
      laugh: 1.5,
      wow: 1.5,
      sad: 0.5
    };
  }

  async addReaction(postId, userId, reactionType = 'like') {
    if (!this.reactionTypes.includes(reactionType)) {
      throw new Error(`Invalid reaction type: ${reactionType}`);
    }

    const existingReaction = await this.getUserReaction(postId, userId);
    
    if (existingReaction) {
      if (existingReaction.reaction_type === reactionType) {
        return this.removeReaction(postId, userId);
      }
      return this.updateReaction(postId, userId, reactionType);
    }

    const query = `
      INSERT INTO reactions (post_id, user_id, reaction_type, created_at)
      VALUES ($1, $2, $3, NOW())
      RETURNING *
    `;
    
    const result = await db.query(query, [postId, userId, reactionType]);
    await this.updatePostEngagement(postId);
    
    return {
      ...result.rows[0],
      animated: true,
      animationType: this.getAnimationType(reactionType)
    };
  }

  async removeReaction(postId, userId) {
    const query = `
      DELETE FROM reactions
      WHERE post_id = $1 AND user_id = $2
      RETURNING *
    `;
    
    const result = await db.query(query, [postId, userId]);
    await this.updatePostEngagement(postId);
    
    return { removed: true, reaction: result.rows[0] };
  }

  async updateReaction(postId, userId, newReactionType) {
    const query = `
      UPDATE reactions
      SET reaction_type = $3, created_at = NOW()
      WHERE post_id = $1 AND user_id = $2
      RETURNING *
    `;
    
    const result = await db.query(query, [postId, userId, newReactionType]);
    await this.updatePostEngagement(postId);
    
    return {
      ...result.rows[0],
      animated: true,
      animationType: this.getAnimationType(newReactionType)
    };
  }

  async getUserReaction(postId, userId) {
    const query = `
      SELECT * FROM reactions
      WHERE post_id = $1 AND user_id = $2
    `;
    
    const result = await db.query(query, [postId, userId]);
    return result.rows[0] || null;
  }

  async getPostReactions(postId) {
    const query = `
      SELECT 
        reaction_type,
        COUNT(*) as count,
        array_agg(user_id) as user_ids
      FROM reactions
      WHERE post_id = $1
      GROUP BY reaction_type
    `;
    
    const result = await db.query(query, [postId]);
    
    const reactionSummary = {};
    let totalCount = 0;
    
    result.rows.forEach(row => {
      reactionSummary[row.reaction_type] = {
        count: parseInt(row.count),
        userIds: row.user_ids
      };
      totalCount += parseInt(row.count);
    });
    
    return {
      postId,
      totalCount,
      reactions: reactionSummary
    };
  }

  async updatePostEngagement(postId) {
    const reactions = await this.getPostReactions(postId);
    
    let engagementScore = 0;
    Object.entries(reactions.reactions).forEach(([type, data]) => {
      engagementScore += data.count * (this.trendingWeights[type] || 1);
    });

    const query = `
      UPDATE posts
      SET engagement_score = $2, updated_at = NOW()
      WHERE id = $1
    `;
    
    await db.query(query, [postId, engagementScore]);
    return engagementScore;
  }

  async getTrendingPosts(limit = 10, timeWindowHours = 24) {
    const query = `
      SELECT 
        p.*,
        u.username,
        u.avatar_url,
        COUNT(r.id) as reaction_count,
        p.engagement_score,
        (
          p.engagement_score * 
          EXP(-EXTRACT(EPOCH FROM (NOW() - p.created_at)) / (3600 * $2))
        ) as trending_score
      FROM posts p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN reactions r ON p.id = r.post_id
      WHERE p.created_at > NOW() - INTERVAL '${timeWindowHours} hours'
      GROUP BY p.id, u.id
      ORDER BY trending_score DESC
      LIMIT $1
    `;
    
    const result = await db.query(query, [limit, timeWindowHours]);
    return result.rows;
  }

  getAnimationType(reactionType) {
    const animations = {
      like: 'pulse',
      love: 'heartbeat',
      laugh: 'bounce',
      wow: 'shake',
      sad: 'fade'
    };
    return animations[reactionType] || 'pulse';
  }

  async getReactionAnimation(reactionType) {
    return {
      type: reactionType,
      animation: this.getAnimationType(reactionType),
      duration: 300,
      easing: 'ease-out',
      emoji: this.getReactionEmoji(reactionType)
    };
  }

  getReactionEmoji(reactionType) {
    const emojis = {
      like: '👍',
      love: '❤️',
      laugh: '😂',
      wow: '😮',
      sad: '😢'
    };
    return emojis[reactionType] || '👍';
  }
}

module.exports = new LikeService();
