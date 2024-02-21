/**
 * Input validation utilities
 */

import {
  POST_MAX_LENGTH,
  POST_MIN_LENGTH,
  USERNAME_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  BIO_MAX_LENGTH,
  DISPLAY_NAME_MAX_LENGTH,
  HASHTAG_MAX_LENGTH,
  VALID_REACTION_TYPES
} from '../constants/index.js';

/**
 * Validate post content
 * @param {string} content - Post content
 * @returns {{ valid: boolean, error?: string }}
 */
export function validatePostContent(content) {
  if (!content || typeof content !== 'string') {
    return { valid: false, error: 'Post content is required' };
  }

  const trimmed = content.trim();

  if (trimmed.length < POST_MIN_LENGTH) {
    return { valid: false, error: 'Post content cannot be empty' };
  }

  if (trimmed.length > POST_MAX_LENGTH) {
    return { 
      valid: false, 
      error: `Post exceeds maximum length of ${POST_MAX_LENGTH} characters` 
    };
  }

  return { valid: true };
}

/**
 * Validate username format
 * @param {string} username - Username to validate
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateUsername(username) {
  if (!username || typeof username !== 'string') {
    return { valid: false, error: 'Username is required' };
  }

  const trimmed = username.trim();

  if (trimmed.length < USERNAME_MIN_LENGTH) {
    return { 
      valid: false, 
      error: `Username must be at least ${USERNAME_MIN_LENGTH} characters` 
    };
  }

  if (trimmed.length > USERNAME_MAX_LENGTH) {
    return { 
      valid: false, 
      error: `Username cannot exceed ${USERNAME_MAX_LENGTH} characters` 
    };
  }

  // Only alphanumeric and underscores
  const usernameRegex = /^[a-zA-Z0-9_]+$/;
  if (!usernameRegex.test(trimmed)) {
    return { 
      valid: false, 
      error: 'Username can only contain letters, numbers, and underscores' 
    };
  }

  return { valid: true };
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return { valid: false, error: 'Invalid email format' };
  }

  return { valid: true };
}

/**
 * Validate bio content
 * @param {string} bio - Bio content
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateBio(bio) {
  if (bio === null || bio === undefined) {
    return { valid: true }; // Bio is optional
  }

  if (typeof bio !== 'string') {
    return { valid: false, error: 'Bio must be a string' };
  }

  if (bio.length > BIO_MAX_LENGTH) {
    return { 
      valid: false, 
      error: `Bio cannot exceed ${BIO_MAX_LENGTH} characters` 
    };
  }

  return { valid: true };
}

/**
 * Validate display name
 * @param {string} displayName - Display name
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateDisplayName(displayName) {
  if (displayName === null || displayName === undefined) {
    return { valid: true }; // Display name is optional
  }

  if (typeof displayName !== 'string') {
    return { valid: false, error: 'Display name must be a string' };
  }

  if (displayName.length > DISPLAY_NAME_MAX_LENGTH) {
    return { 
      valid: false, 
      error: `Display name cannot exceed ${DISPLAY_NAME_MAX_LENGTH} characters` 
    };
  }

  return { valid: true };
}

/**
 * Validate hashtag format
 * @param {string} hashtag - Hashtag to validate
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateHashtag(hashtag) {
  if (!hashtag || typeof hashtag !== 'string') {
    return { valid: false, error: 'Hashtag is required' };
  }

  const cleaned = hashtag.replace(/^#/, '').trim();

  if (cleaned.length === 0) {
    return { valid: false, error: 'Hashtag cannot be empty' };
  }

  if (cleaned.length > HASHTAG_MAX_LENGTH) {
    return { 
      valid: false, 
      error: `Hashtag cannot exceed ${HASHTAG_MAX_LENGTH} characters` 
    };
  }

  const hashtagRegex = /^[a-zA-Z0-9_]+$/;
  if (!hashtagRegex.test(cleaned)) {
    return { 
      valid: false, 
      error: 'Hashtag can only contain letters, numbers, and underscores' 
    };
  }

  return { valid: true };
}

/**
 * Validate reaction type
 * @param {string} reactionType - Reaction type
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateReactionType(reactionType) {
  if (!reactionType || typeof reactionType !== 'string') {
    return { valid: false, error: 'Reaction type is required' };
  }

  if (!VALID_REACTION_TYPES.includes(reactionType.toLowerCase())) {
    return { 
      valid: false, 
      error: `Invalid reaction type. Must be one of: ${VALID_REACTION_TYPES.join(', ')}` 
    };
  }

  return { valid: true };
}

/**
 * Validate UUID format
 * @param {string} uuid - UUID to validate
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateUUID(uuid) {
  if (!uuid || typeof uuid !== 'string') {
    return { valid: false, error: 'ID is required' };
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(uuid)) {
    return { valid: false, error: 'Invalid ID format' };
  }

  return { valid: true };
}

/**
 * Validate pagination parameters
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {{ valid: boolean, error?: string }}
 */
export function validatePagination(page, limit) {
  if (page !== undefined && (typeof page !== 'number' || page < 1)) {
    return { valid: false, error: 'Page must be a positive number' };
  }

  if (limit !== undefined && (typeof limit !== 'number' || limit < 1 || limit > 100)) {
    return { valid: false, error: 'Limit must be between 1 and 100' };
  }

  return { valid: true };
}

export default {
  validatePostContent,
  validateUsername,
  validateEmail,
  validateBio,
  validateDisplayName,
  validateHashtag,
  validateReactionType,
  validateUUID,
  validatePagination
};
