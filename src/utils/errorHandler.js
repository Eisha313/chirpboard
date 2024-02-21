/**
 * Centralized error handling utilities
 */

const apiResponse = require('./apiResponse');

/**
 * Custom application error class
 */
class AppError extends Error {
  constructor(message, code = 'INTERNAL_ERROR', statusCode = 500, details = null) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error
 */
class ValidationError extends AppError {
  constructor(errors) {
    super('Validation failed', 'VALIDATION_ERROR', 400, errors);
    this.name = 'ValidationError';
  }
}

/**
 * Not found error
 */
class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

/**
 * Authentication error
 */
class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 'UNAUTHORIZED', 401);
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization error
 */
class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 'FORBIDDEN', 403);
    this.name = 'AuthorizationError';
  }
}

/**
 * Rate limit error
 */
class RateLimitError extends AppError {
  constructor(retryAfter = 60) {
    super('Rate limit exceeded', 'RATE_LIMITED', 429);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

/**
 * Database error
 */
class DatabaseError extends AppError {
  constructor(message = 'Database operation failed') {
    super(message, 'DATABASE_ERROR', 500);
    this.name = 'DatabaseError';
  }
}

/**
 * Async handler wrapper to catch errors in async route handlers
 * @param {Function} fn - Async function to wrap
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Global error handler middleware
 */
function globalErrorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let response;

  if (err.isOperational) {
    // Operational errors - safe to send to client
    response = apiResponse.error(err.message, err.code, err.details);
    
    if (err.retryAfter) {
      res.set('Retry-After', err.retryAfter);
      response.retryAfter = err.retryAfter;
    }
  } else {
    // Programming errors - don't leak details
    console.error('Unexpected error:', err);
    
    if (process.env.NODE_ENV === 'development') {
      response = apiResponse.error(err.message, 'INTERNAL_ERROR', {
        stack: err.stack
      });
    } else {
      response = apiResponse.error('An unexpected error occurred', 'INTERNAL_ERROR');
    }
  }

  res.status(statusCode).json(response);
}

/**
 * Handle uncaught exceptions
 */
function handleUncaughtException(err) {
  console.error('UNCAUGHT EXCEPTION:', err);
  process.exit(1);
}

/**
 * Handle unhandled promise rejections
 */
function handleUnhandledRejection(reason, promise) {
  console.error('UNHANDLED REJECTION at:', promise, 'reason:', reason);
}

/**
 * Setup global error handlers
 */
function setupGlobalHandlers() {
  process.on('uncaughtException', handleUncaughtException);
  process.on('unhandledRejection', handleUnhandledRejection);
}

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  AuthenticationError,
  AuthorizationError,
  RateLimitError,
  DatabaseError,
  asyncHandler,
  globalErrorHandler,
  setupGlobalHandlers
};
