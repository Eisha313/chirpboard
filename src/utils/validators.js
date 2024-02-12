/**
 * Validation utilities for Chirpboard
 */

const POST_MAX_LENGTH = 280;
const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 30;
const BIO_MAX_LENGTH = 160;
const HASHTAG_MAX_LENGTH = 50;

class ValidationError extends Error {
  constructor(message, field = null) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.statusCode = 400;
  }
}

function validatePostContent(content) {
  if (!content || typeof content !== 'string') {
    throw new ValidationError('Post content is required', 'content');
  }

  const trimmed = content.trim();

  if (trimmed.length === 0) {
    throw new ValidationError('Post content cannot be empty', 'content');
  }

  if (trimmed.length > POST_MAX_LENGTH) {
    throw new ValidationError(
      `Post content exceeds maximum length of ${POST_MAX_LENGTH} characters`,
      'content'
    );
  }

  return trimmed;
}

function validateUsername(username) {
  if (!username || typeof username !== 'string') {
    throw new ValidationError('Username is required', 'username');
  }

  const trimmed = username.trim().toLowerCase();

  if (trimmed.length < USERNAME_MIN_LENGTH) {
    throw new ValidationError(
      `Username must be at least ${USERNAME_MIN_LENGTH} characters`,
      'username'
    );
  }

  if (trimmed.length > USERNAME_MAX_LENGTH) {
    throw new ValidationError(
      `Username cannot exceed ${USERNAME_MAX_LENGTH} characters`,
      'username'
    );
  }

  if (!/^[a-z0-9_]+$/.test(trimmed)) {
    throw new ValidationError(
      'Username can only contain lowercase letters, numbers, and underscores',
      'username'
    );
  }

  return trimmed;
}

function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    throw new ValidationError('Email is required', 'email');
  }

  const trimmed = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(trimmed)) {
    throw new ValidationError('Invalid email format', 'email');
  }

  return trimmed;
}

function validateBio(bio) {
  if (bio === null || bio === undefined) {
    return '';
  }

  if (typeof bio !== 'string') {
    throw new ValidationError('Bio must be a string', 'bio');
  }

  const trimmed = bio.trim();

  if (trimmed.length > BIO_MAX_LENGTH) {
    throw new ValidationError(
      `Bio cannot exceed ${BIO_MAX_LENGTH} characters`,
      'bio'
    );
  }

  return trimmed;
}

function validateHashtag(tag) {
  if (!tag || typeof tag !== 'string') {
    throw new ValidationError('Hashtag is required', 'hashtag');
  }

  let cleaned = tag.trim().toLowerCase();
  
  // Remove leading # if present
  if (cleaned.startsWith('#')) {
    cleaned = cleaned.slice(1);
  }

  if (cleaned.length === 0) {
    throw new ValidationError('Hashtag cannot be empty', 'hashtag');
  }

  if (cleaned.length > HASHTAG_MAX_LENGTH) {
    throw new ValidationError(
      `Hashtag cannot exceed ${HASHTAG_MAX_LENGTH} characters`,
      'hashtag'
    );
  }

  if (!/^[a-z0-9_]+$/.test(cleaned)) {
    throw new ValidationError(
      'Hashtag can only contain letters, numbers, and underscores',
      'hashtag'
    );
  }

  return cleaned;
}

function validateId(id, fieldName = 'id') {
  const numId = parseInt(id, 10);

  if (isNaN(numId) || numId <= 0) {
    throw new ValidationError(`Invalid ${fieldName}`, fieldName);
  }

  return numId;
}

function validatePagination(page = 1, limit = 20) {
  const validPage = Math.max(1, parseInt(page, 10) || 1);
  const validLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (validPage - 1) * validLimit;

  return { page: validPage, limit: validLimit, offset };
}

function validateReactionType(type) {
  const validTypes = ['like', 'love', 'laugh', 'wow', 'sad', 'angry'];

  if (!type || typeof type !== 'string') {
    throw new ValidationError('Reaction type is required', 'type');
  }

  const normalized = type.trim().toLowerCase();

  if (!validTypes.includes(normalized)) {
    throw new ValidationError(
      `Invalid reaction type. Must be one of: ${validTypes.join(', ')}`,
      'type'
    );
  }

  return normalized;
}

function validateAvatarUrl(url) {
  if (!url) {
    return null;
  }

  if (typeof url !== 'string') {
    throw new ValidationError('Avatar URL must be a string', 'avatar_url');
  }

  const trimmed = url.trim();

  if (trimmed.length === 0) {
    return null;
  }

  try {
    new URL(trimmed);
  } catch {
    throw new ValidationError('Invalid avatar URL format', 'avatar_url');
  }

  return trimmed;
}

module.exports = {
  ValidationError,
  validatePostContent,
  validateUsername,
  validateEmail,
  validateBio,
  validateHashtag,
  validateId,
  validatePagination,
  validateReactionType,
  validateAvatarUrl,
  POST_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  BIO_MAX_LENGTH,
  HASHTAG_MAX_LENGTH
};