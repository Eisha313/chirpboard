const db = require('../config/database');
const { dbAll, dbGet, dbRun } = require('../utils/dbHelpers');
const { logger } = require('../utils/logger');
const { USER_LIMITS } = require('../constants');

const log = logger.child('UserService');

/**
 * Create a new user
 * @param {object} userData - User data
 * @returns {Promise<object>} The created user
 */
async function createUser(userData) {
  const { username, email, displayName, bio = '', avatarUrl = null } = userData;

  if (!username || !email) {
    throw new Error('Username and email are required');
  }

  if (username.length > USER_LIMITS.MAX_USERNAME_LENGTH) {
    throw new Error(`Username exceeds maximum length of ${USER_LIMITS.MAX_USERNAME_LENGTH}`);
  }

  if (bio && bio.length > USER_LIMITS.MAX_BIO_LENGTH) {
    throw new Error(`Bio exceeds maximum length of ${USER_LIMITS.MAX_BIO_LENGTH}`);
  }

  const existingUser = await getUserByUsername(username);
  if (existingUser) {
    throw new Error('Username already exists');
  }

  const id = generateUserId();
  const createdAt = new Date().toISOString();

  log.debug('Creating new user', { username, email });

  await dbRun(
    db,
    `INSERT INTO users (id, username, email, display_name, bio, avatar_url, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, username, email, displayName || username, bio, avatarUrl, createdAt, createdAt]
  );

  log.info('User created successfully', { userId: id, username });

  return getUserById(id);
}

/**
 * Get a user by ID
 * @param {string} userId - The user's ID
 * @returns {Promise<object|null>} The user or null
 */
async function getUserById(userId) {
  const user = await dbGet(
    db,
    `SELECT u.*,
            (SELECT COUNT(*) FROM posts WHERE user_id = u.id) as post_count,
            (SELECT COUNT(*) FROM follows WHERE following_id = u.id) as follower_count,
            (SELECT COUNT(*) FROM follows WHERE follower_id = u.id) as following_count
     FROM users u
     WHERE u.id = ?`,
    [userId]
  );

  if (user) {
    delete user.password_hash;
  }

  return user || null;
}

/**
 * Get a user by username
 * @param {string} username - The username
 * @returns {Promise<object|null>} The user or null
 */
async function getUserByUsername(username) {
  const user = await dbGet(
    db,
    `SELECT u.*,
            (SELECT COUNT(*) FROM posts WHERE user_id = u.id) as post_count,
            (SELECT COUNT(*) FROM follows WHERE following_id = u.id) as follower_count,
            (SELECT COUNT(*) FROM follows WHERE follower_id = u.id) as following_count
     FROM users u
     WHERE u.username = ?`,
    [username]
  );

  if (user) {
    delete user.password_hash;
  }

  return user || null;
}

/**
 * Update user profile
 * @param {string} userId - The user's ID
 * @param {object} updates - Fields to update
 * @returns {Promise<object>} The updated user
 */
async function updateUser(userId, updates) {
  const allowedFields = ['display_name', 'bio', 'avatar_url'];
  const updateFields = [];
  const updateValues = [];

  for (const [key, value] of Object.entries(updates)) {
    const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    if (allowedFields.includes(dbField)) {
      updateFields.push(`${dbField} = ?`);
      updateValues.push(value);
    }
  }

  if (updateFields.length === 0) {
    throw new Error('No valid fields to update');
  }

  updateFields.push('updated_at = ?');
  updateValues.push(new Date().toISOString());
  updateValues.push(userId);

  log.debug('Updating user profile', { userId, fields: updateFields });

  await dbRun(
    db,
    `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
    updateValues
  );

  log.info('User profile updated', { userId });

  return getUserById(userId);
}

/**
 * Search users by username or display name
 * @param {string} query - Search query
 * @param {object} options - Search options
 * @returns {Promise<object[]>} Array of matching users
 */
async function searchUsers(query, options = {}) {
  const { limit = 20, offset = 0 } = options;

  log.debug('Searching users', { query, limit, offset });

  const users = await dbAll(
    db,
    `SELECT u.id, u.username, u.display_name, u.avatar_url, u.bio,
            (SELECT COUNT(*) FROM follows WHERE following_id = u.id) as follower_count
     FROM users u
     WHERE u.username LIKE ? OR u.display_name LIKE ?
     ORDER BY follower_count DESC
     LIMIT ? OFFSET ?`,
    [`%${query}%`, `%${query}%`, limit, offset]
  );

  return users;
}

/**
 * Get user activity feed
 * @param {string} userId - The user's ID
 * @param {object} options - Pagination options
 * @returns {Promise<object[]>} Array of activity items
 */
async function getUserActivity(userId, options = {}) {
  const { limit = 20, offset = 0 } = options;

  log.debug('Fetching user activity', { userId, limit, offset });

  return dbAll(
    db,
    `SELECT 'post' as type, p.id, p.content, p.created_at
     FROM posts p
     WHERE p.user_id = ?
     UNION ALL
     SELECT 'like' as type, l.post_id as id, NULL as content, l.created_at
     FROM likes l
     WHERE l.user_id = ?
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [userId, userId, limit, offset]
  );
}

/**
 * Delete a user account
 * @param {string} userId - The user's ID
 * @returns {Promise<boolean>} Success status
 */
async function deleteUser(userId) {
  log.warn('Deleting user account', { userId });

  await dbRun(db, 'DELETE FROM likes WHERE user_id = ?', [userId]);
  await dbRun(db, 'DELETE FROM follows WHERE follower_id = ? OR following_id = ?', [userId, userId]);
  await dbRun(db, 'DELETE FROM posts WHERE user_id = ?', [userId]);
  await dbRun(db, 'DELETE FROM users WHERE id = ?', [userId]);

  log.info('User account deleted', { userId });

  return true;
}

/**
 * Generate a unique user ID
 * @returns {string} Unique user ID
 */
function generateUserId() {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

module.exports = {
  createUser,
  getUserById,
  getUserByUsername,
  updateUser,
  searchUsers,
  getUserActivity,
  deleteUser
};
