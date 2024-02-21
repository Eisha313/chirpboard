/**
 * Standardized API response utilities
 */

import { HTTP_STATUS } from '../constants/index.js';

/**
 * Create a success response
 * @param {any} data - Response data
 * @param {string} [message] - Optional message
 * @param {Object} [meta] - Optional metadata (pagination, etc.)
 * @returns {Object}
 */
export function success(data, message = null, meta = null) {
  const response = {
    success: true,
    data
  };

  if (message) {
    response.message = message;
  }

  if (meta) {
    response.meta = meta;
  }

  return response;
}

/**
 * Create an error response
 * @param {string} message - Error message
 * @param {number} [statusCode] - HTTP status code
 * @param {Object} [errors] - Detailed errors
 * @returns {Object}
 */
export function error(message, statusCode = HTTP_STATUS.BAD_REQUEST, errors = null) {
  const response = {
    success: false,
    error: {
      message,
      statusCode
    }
  };

  if (errors) {
    response.error.details = errors;
  }

  return response;
}

/**
 * Create a paginated response
 * @param {Array} data - Array of items
 * @param {Object} pagination - Pagination info
 * @param {number} pagination.page - Current page
 * @param {number} pagination.limit - Items per page
 * @param {number} pagination.total - Total items
 * @returns {Object}
 */
export function paginated(data, { page, limit, total }) {
  const totalPages = Math.ceil(total / limit);
  
  return success(data, null, {
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1
    }
  });
}

/**
 * Create a created response
 * @param {any} data - Created resource
 * @param {string} [message] - Optional message
 * @returns {Object}
 */
export function created(data, message = 'Resource created successfully') {
  return {
    success: true,
    message,
    data,
    statusCode: HTTP_STATUS.CREATED
  };
}

/**
 * Create a no content response
 * @param {string} [message] - Optional message
 * @returns {Object}
 */
export function noContent(message = 'Operation completed successfully') {
  return {
    success: true,
    message,
    statusCode: HTTP_STATUS.NO_CONTENT
  };
}

/**
 * Create a not found response
 * @param {string} [resource] - Resource name
 * @returns {Object}
 */
export function notFound(resource = 'Resource') {
  return error(`${resource} not found`, HTTP_STATUS.NOT_FOUND);
}

/**
 * Create an unauthorized response
 * @param {string} [message] - Optional message
 * @returns {Object}
 */
export function unauthorized(message = 'Authentication required') {
  return error(message, HTTP_STATUS.UNAUTHORIZED);
}

/**
 * Create a forbidden response
 * @param {string} [message] - Optional message
 * @returns {Object}
 */
export function forbidden(message = 'Access denied') {
  return error(message, HTTP_STATUS.FORBIDDEN);
}

/**
 * Create a validation error response
 * @param {Object|Array} errors - Validation errors
 * @returns {Object}
 */
export function validationError(errors) {
  return error('Validation failed', HTTP_STATUS.UNPROCESSABLE_ENTITY, errors);
}

/**
 * Create a conflict response
 * @param {string} [message] - Optional message
 * @returns {Object}
 */
export function conflict(message = 'Resource already exists') {
  return error(message, HTTP_STATUS.CONFLICT);
}

/**
 * Create a rate limit response
 * @param {number} [retryAfter] - Seconds until retry allowed
 * @returns {Object}
 */
export function rateLimited(retryAfter = 60) {
  const response = error(
    'Rate limit exceeded, please try again later',
    HTTP_STATUS.TOO_MANY_REQUESTS
  );
  response.error.retryAfter = retryAfter;
  return response;
}

/**
 * Create an internal server error response
 * @param {string} [message] - Optional message
 * @returns {Object}
 */
export function serverError(message = 'An unexpected error occurred') {
  return error(message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
}

export default {
  success,
  error,
  paginated,
  created,
  noContent,
  notFound,
  unauthorized,
  forbidden,
  validationError,
  conflict,
  rateLimited,
  serverError
};
