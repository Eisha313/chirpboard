const db = require('../config/database');
const { dbAll, dbGet, dbRun } = require('../utils/dbHelpers');
const { logger } = require('../utils/logger');
const { POST_LIMITS } = require('../constants');

const log = logger.child('PostService');

/**
 * Create a new post
 * @param {string} userId - The user's ID
 * @param {string} content - The post content
 * @returns {Promise<object>} The created post
 */
async function createPost(userId, content) {
  if (!content || content.length === 0) {
    throw new Error('Post content cannot be empty');
  }

  if (content.length > POST_LIMITS.MAX_CONTENT_LENGTH) {
    throw new Error(`Post content exceeds maximum length of ${POST_LIMITS.MAX_CONTENT_LENGTH} characters`);
  }

  const id = generatePostId();
  const createdAt = new Date().toISOString();

  log.debug('Creating new post', { userId, contentLength: content.length });

  await dbRun(
    db,
    `INSERT INTO posts (id, user_id, content, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`,
    [id, userId, content, createdAt, createdAt]
  );

  log.info('Post created successfully', { postId: id, userId });

  return getPostById(id);
}

/**
 * Get a post by ID
 * @param {string} postId - The post ID
 * @returns {Promise<object|null>} The post or null
 */
async function getPostById(postId) {
  const post = await dbGet(
    db,
    `SELECT p.*, u.username, u.display_name, u.avatar_url,
            (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
            (SELECT COUNT(*) FROM posts WHERE reply_to_id = p.id) as reply_count
     FROM posts p
     JOIN users u ON p.user_id = u.id
     WHERE p.id = ?`,
    [postId]
  );

  return post || null;
}

/**
 * Get posts by user ID with pagination
 * @param {string} userId - The user's ID
 * @param {object} options - Pagination options
 * @returns {Promise<object[]>} Array of posts
 */
async function getPostsByUserId(userId, options = {}) {
  const { limit = 20, offset = 0, includeReplies = false } = options;

  let query = `
    SELECT p.*, u.username, u.display_name, u.avatar_url,
           (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
           (SELECT COUNT(*) FROM posts WHERE reply_to_id = p.id) as reply_count
    FROM posts p
    JOIN users u ON p.user_id = u.id
    WHERE p.user_id = ?
  `;

  if (!includeReplies) {
    query += ' AND p.reply_to_id IS NULL';
  }

  query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';

  log.debug('Fetching posts by user', { userId, limit, offset });

  return dbAll(db, query, [userId, limit, offset]);
}

/**
 * Delete a post
 * @param {string} postId - The post ID
 * @param {string} userId - The user ID (for authorization)
 * @returns {Promise<boolean>} Success status
 */
async function deletePost(postId, userId) {
  const post = await getPostById(postId);

  if (!post) {
    throw new Error('Post not found');
  }

  if (post.user_id !== userId) {
    throw new Error('Unauthorized to delete this post');
  }

  await dbRun(db, 'DELETE FROM posts WHERE id = ?', [postId]);
  
  log.info('Post deleted', { postId, userId });

  return true;
}

/**
 * Search posts by content
 * @param {string} query - Search query
 * @param {object} options - Search options
 * @returns {Promise<object[]>} Array of matching posts
 */
async function searchPosts(query, options = {}) {
  const { limit = 20, offset = 0 } = options;

  log.debug('Searching posts', { query, limit, offset });

  return dbAll(
    db,
    `SELECT p.*, u.username, u.display_name, u.avatar_url,
            (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
            (SELECT COUNT(*) FROM posts WHERE reply_to_id = p.id) as reply_count
     FROM posts p
     JOIN users u ON p.user_id = u.id
     WHERE p.content LIKE ?
     ORDER BY p.created_at DESC
     LIMIT ? OFFSET ?`,
    [`%${query}%`, limit, offset]
  );
}

/**
 * Get trending posts
 * @param {object} options - Options for trending algorithm
 * @returns {Promise<object[]>} Array of trending posts
 */
async function getTrendingPosts(options = {}) {
  const { limit = 10, hoursAgo = 24 } = options;
  const cutoffDate = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();

  log.debug('Fetching trending posts', { limit, hoursAgo });

  return dbAll(
    db,
    `SELECT p.*, u.username, u.display_name, u.avatar_url,
            (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
            (SELECT COUNT(*) FROM posts WHERE reply_to_id = p.id) as reply_count,
            (SELECT COUNT(*) FROM likes WHERE post_id = p.id AND created_at > ?) as recent_likes
     FROM posts p
     JOIN users u ON p.user_id = u.id
     WHERE p.created_at > ?
     ORDER BY recent_likes DESC, p.created_at DESC
     LIMIT ?`,
    [cutoffDate, cutoffDate, limit]
  );
}

/**
 * Generate a unique post ID
 * @returns {string} Unique post ID
 */
function generatePostId() {
  return `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

module.exports = {
  createPost,
  getPostById,
  getPostsByUserId,
  deletePost,
  searchPosts,
  getTrendingPosts
};
