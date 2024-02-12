const db = require('../config/database');
const {
  validateUsername,
  validateEmail,
  validateBio,
  validateAvatarUrl,
  validateId,
  validatePagination,
  ValidationError
} = require('../utils/validators');

async function createUser(userData) {
  const username = validateUsername(userData.username);
  const email = validateEmail(userData.email);
  const displayName = userData.displayName?.trim() || username;
  const bio = validateBio(userData.bio);
  const avatarUrl = validateAvatarUrl(userData.avatarUrl);

  // Check for existing username or email
  const existing = await db.query(
    'SELECT id FROM users WHERE username = $1 OR email = $2',
    [username, email]
  );

  if (existing.rows.length > 0) {
    throw new ValidationError('Username or email already exists', 'username');
  }

  const result = await db.query(
    `INSERT INTO users (username, email, display_name, bio, avatar_url, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     RETURNING id, username, email, display_name, bio, avatar_url, created_at`,
    [username, email, displayName, bio, avatarUrl]
  );

  return result.rows[0];
}

async function getUserById(userId) {
  const validId = validateId(userId, 'userId');

  const result = await db.query(
    `SELECT id, username, email, display_name, bio, avatar_url, 
            follower_count, following_count, post_count, created_at
     FROM users 
     WHERE id = $1`,
    [validId]
  );

  return result.rows[0] || null;
}

async function getUserByUsername(username) {
  const validUsername = validateUsername(username);

  const result = await db.query(
    `SELECT id, username, email, display_name, bio, avatar_url,
            follower_count, following_count, post_count, created_at
     FROM users 
     WHERE username = $1`,
    [validUsername]
  );

  return result.rows[0] || null;
}

async function updateUser(userId, updates) {
  const validId = validateId(userId, 'userId');
  const fields = [];
  const values = [];
  let paramIndex = 1;

  if (updates.displayName !== undefined) {
    const displayName = updates.displayName?.trim();
    if (displayName && displayName.length > 0) {
      fields.push(`display_name = $${paramIndex++}`);
      values.push(displayName);
    }
  }

  if (updates.bio !== undefined) {
    const bio = validateBio(updates.bio);
    fields.push(`bio = $${paramIndex++}`);
    values.push(bio);
  }

  if (updates.avatarUrl !== undefined) {
    const avatarUrl = validateAvatarUrl(updates.avatarUrl);
    fields.push(`avatar_url = $${paramIndex++}`);
    values.push(avatarUrl);
  }

  if (fields.length === 0) {
    throw new ValidationError('No valid fields to update', 'updates');
  }

  fields.push(`updated_at = NOW()`);
  values.push(validId);

  const result = await db.query(
    `UPDATE users 
     SET ${fields.join(', ')}
     WHERE id = $${paramIndex}
     RETURNING id, username, display_name, bio, avatar_url, updated_at`,
    values
  );

  if (result.rows.length === 0) {
    throw new ValidationError('User not found', 'userId');
  }

  return result.rows[0];
}

async function searchUsers(query, options = {}) {
  if (!query || typeof query !== 'string' || query.trim().length < 2) {
    throw new ValidationError('Search query must be at least 2 characters', 'query');
  }

  const { limit, offset } = validatePagination(options.page, options.limit);
  const searchTerm = `%${query.trim().toLowerCase()}%`;

  const result = await db.query(
    `SELECT id, username, display_name, bio, avatar_url, follower_count
     FROM users
     WHERE LOWER(username) LIKE $1 OR LOWER(display_name) LIKE $1
     ORDER BY follower_count DESC, username ASC
     LIMIT $2 OFFSET $3`,
    [searchTerm, limit, offset]
  );

  return result.rows;
}

async function updateFollowerCount(userId, increment = 1) {
  const validId = validateId(userId, 'userId');

  const result = await db.query(
    `UPDATE users 
     SET follower_count = GREATEST(0, follower_count + $2)
     WHERE id = $1
     RETURNING follower_count`,
    [validId, increment]
  );

  return result.rows[0]?.follower_count || 0;
}

async function updateFollowingCount(userId, increment = 1) {
  const validId = validateId(userId, 'userId');

  const result = await db.query(
    `UPDATE users 
     SET following_count = GREATEST(0, following_count + $2)
     WHERE id = $1
     RETURNING following_count`,
    [validId, increment]
  );

  return result.rows[0]?.following_count || 0;
}

async function incrementPostCount(userId, increment = 1) {
  const validId = validateId(userId, 'userId');

  const result = await db.query(
    `UPDATE users 
     SET post_count = GREATEST(0, post_count + $2)
     WHERE id = $1
     RETURNING post_count`,
    [validId, increment]
  );

  return result.rows[0]?.post_count || 0;
}

module.exports = {
  createUser,
  getUserById,
  getUserByUsername,
  updateUser,
  searchUsers,
  updateFollowerCount,
  updateFollowingCount,
  incrementPostCount
};