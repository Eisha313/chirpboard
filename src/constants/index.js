/**
 * Application constants
 */

// Post limits
export const POST_MAX_LENGTH = 280;
export const POST_MIN_LENGTH = 1;
export const HASHTAG_MAX_LENGTH = 50;
export const MAX_HASHTAGS_PER_POST = 10;

// User limits
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 30;
export const BIO_MAX_LENGTH = 160;
export const DISPLAY_NAME_MAX_LENGTH = 50;

// Pagination defaults
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
export const DEFAULT_PAGE = 1;

// Feed settings
export const FEED_DEFAULT_LIMIT = 50;
export const FEED_MAX_LIMIT = 100;

// Leaderboard settings
export const LEADERBOARD_CACHE_TTL = 3600; // 1 hour in seconds
export const LEADERBOARD_DEFAULT_LIMIT = 10;
export const LEADERBOARD_MAX_LIMIT = 50;

// Trending settings
export const TRENDING_WINDOW_HOURS = 24;
export const TRENDING_MIN_ENGAGEMENT = 5;
export const TRENDING_HASHTAGS_LIMIT = 10;

// Reaction types
export const REACTION_TYPES = {
  LIKE: 'like',
  LOVE: 'love',
  LAUGH: 'laugh',
  WOW: 'wow',
  SAD: 'sad',
  ANGRY: 'angry'
};

export const VALID_REACTION_TYPES = Object.values(REACTION_TYPES);

// Activity types
export const ACTIVITY_TYPES = {
  POST: 'post',
  LIKE: 'like',
  FOLLOW: 'follow',
  REPLY: 'reply'
};

// Leaderboard types
export const LEADERBOARD_TYPES = {
  MOST_POSTS: 'most_posts',
  MOST_LIKED: 'most_liked',
  MOST_FOLLOWERS: 'most_followers',
  MOST_ACTIVE: 'most_active'
};

// Time periods for analytics
export const TIME_PERIODS = {
  DAY: 'day',
  WEEK: 'week',
  MONTH: 'month',
  ALL_TIME: 'all_time'
};

// HTTP status codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500
};

// Error messages
export const ERROR_MESSAGES = {
  POST_NOT_FOUND: 'Post not found',
  USER_NOT_FOUND: 'User not found',
  UNAUTHORIZED: 'Authentication required',
  FORBIDDEN: 'Access denied',
  INVALID_INPUT: 'Invalid input provided',
  POST_TOO_LONG: `Post exceeds maximum length of ${POST_MAX_LENGTH} characters`,
  POST_EMPTY: 'Post content cannot be empty',
  ALREADY_LIKED: 'You have already liked this post',
  NOT_LIKED: 'You have not liked this post',
  ALREADY_FOLLOWING: 'You are already following this user',
  NOT_FOLLOWING: 'You are not following this user',
  CANNOT_FOLLOW_SELF: 'You cannot follow yourself',
  RATE_LIMIT_EXCEEDED: 'Rate limit exceeded, please try again later'
};

export default {
  POST_MAX_LENGTH,
  POST_MIN_LENGTH,
  HASHTAG_MAX_LENGTH,
  MAX_HASHTAGS_PER_POST,
  USERNAME_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  BIO_MAX_LENGTH,
  DISPLAY_NAME_MAX_LENGTH,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  DEFAULT_PAGE,
  FEED_DEFAULT_LIMIT,
  FEED_MAX_LIMIT,
  LEADERBOARD_CACHE_TTL,
  LEADERBOARD_DEFAULT_LIMIT,
  LEADERBOARD_MAX_LIMIT,
  TRENDING_WINDOW_HOURS,
  TRENDING_MIN_ENGAGEMENT,
  TRENDING_HASHTAGS_LIMIT,
  REACTION_TYPES,
  VALID_REACTION_TYPES,
  ACTIVITY_TYPES,
  LEADERBOARD_TYPES,
  TIME_PERIODS,
  HTTP_STATUS,
  ERROR_MESSAGES
};
