const db = require('../config/database');
const { extractHashtags, extractMentions } = require('../utils/textParser');
const { validatePostContent, validateId, validatePagination, ValidationError } = require('../utils/validators');

const POST_MAX_LENGTH = 280;

async function createPost(userId, content) {
  const validUserId = validateId(userId, 'userId');
  const validContent = validatePostContent(content);

  const hashtags = extractHashtags(validContent);
  const mentions = extractMentions(validContent);

  const result = await db.query(
    `INSERT INTO posts (user_id, content, hashtags, mentions, created_at)
     VALUES ($1, $2, $3, $4, NOW())
     RETURNING id, user_id, content, hashtags, mentions, like_count, created_at`,
    [validUserId, validContent, JSON.stringify(hashtags), JSON.stringify(mentions)]
  );

  return result.rows[0];
}

async function getPostById(postId) {
  const validPostId = validateId(postId, 'postId');

  const result = await db.query(
    `SELECT p.*, u.username, u.display_name, u.avatar_url
     FROM posts p
     JOIN users u ON p.user_id = u.id
     WHERE p.id = $1 AND p.deleted_at IS NULL`,
    [validPostId]
  );

  return result.rows[0] || null;
}

async function getUserPosts(userId, options = {}) {
  const validUserId = validateId(userId, 'userId');
  const { limit, offset } = validatePagination(options.page, options.limit);

  const result = await db.query(
    `SELECT p.*, u.username, u.display_name, u.avatar_url
     FROM posts p
     JOIN users u ON p.user_id = u.id
     WHERE p.user_id = $1 AND p.deleted_at IS NULL
     ORDER BY p.created_at DESC
     LIMIT $2 OFFSET $3`,
    [validUserId, limit, offset]
  );

  return result.rows;
}

async function deletePost(postId, userId) {
  const validPostId = validateId(postId, 'postId');
  const validUserId = validateId(userId, 'userId');

  const result = await db.query(
    `UPDATE posts 
     SET deleted_at = NOW()
     WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
     RETURNING id`,
    [validPostId, validUserId]
  );

  if (result.rows.length === 0) {
    throw new ValidationError('Post not found or already deleted', 'postId');
  }

  return { success: true, postId: validPostId };
}

async function getPostsByHashtag(hashtag, options = {}) {
  if (!hashtag || typeof hashtag !== 'string') {
    throw new ValidationError('Hashtag is required', 'hashtag');
  }

  const { limit, offset } = validatePagination(options.page, options.limit);
  const normalizedTag = hashtag.toLowerCase().replace(/^#/, '');

  const result = await db.query(
    `SELECT p.*, u.username, u.display_name, u.avatar_url
     FROM posts p
     JOIN users u ON p.user_id = u.id
     WHERE p.hashtags::jsonb ? $1 AND p.deleted_at IS NULL
     ORDER BY p.created_at DESC
     LIMIT $2 OFFSET $3`,
    [normalizedTag, limit, offset]
  );

  return result.rows;
}

async function getTrendingPosts(options = {}) {
  const { limit, offset } = validatePagination(options.page, options.limit);
  const hoursAgo = options.hours || 24;

  const result = await db.query(
    `SELECT p.*, u.username, u.display_name, u.avatar_url,
            (p.like_count * 2 + p.reply_count) AS engagement_score
     FROM posts p
     JOIN users u ON p.user_id = u.id
     WHERE p.created_at > NOW() - INTERVAL '${hoursAgo} hours'
       AND p.deleted_at IS NULL
     ORDER BY engagement_score DESC, p.created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  return result.rows;
}

async function incrementLikeCount(postId, increment = 1) {
  const validPostId = validateId(postId, 'postId');

  const result = await db.query(
    `UPDATE posts 
     SET like_count = GREATEST(0, like_count + $2)
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING like_count`,
    [validPostId, increment]
  );

  return result.rows[0]?.like_count || 0;
}

module.exports = {
  createPost,
  getPostById,
  getUserPosts,
  deletePost,
  getPostsByHashtag,
  getTrendingPosts,
  incrementLikeCount,
  POST_MAX_LENGTH
};