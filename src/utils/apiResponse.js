/**
 * Standardized API response helpers
 * Ensures consistent response format across all endpoints
 */

class ApiResponse {
  constructor(success, data = null, message = null, meta = null) {
    this.success = success;
    this.data = data;
    this.message = message;
    this.meta = meta;
    this.timestamp = new Date().toISOString();
  }

  toJSON() {
    const response = {
      success: this.success,
      timestamp: this.timestamp
    };

    if (this.data !== null) {
      response.data = this.data;
    }

    if (this.message !== null) {
      response.message = this.message;
    }

    if (this.meta !== null) {
      response.meta = this.meta;
    }

    return response;
  }
}

/**
 * Success response helper
 * @param {*} data - Response data
 * @param {string} message - Optional success message
 * @param {object} meta - Optional metadata (pagination, etc.)
 */
function success(data, message = null, meta = null) {
  return new ApiResponse(true, data, message, meta);
}

/**
 * Error response helper
 * @param {string} message - Error message
 * @param {number} code - Error code
 * @param {object} details - Additional error details
 */
function error(message, code = 'UNKNOWN_ERROR', details = null) {
  const response = new ApiResponse(false, null, message);
  response.error = {
    code,
    details
  };
  return response;
}

/**
 * Paginated response helper
 * @param {Array} items - Array of items
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @param {number} total - Total items count
 */
function paginated(items, page, limit, total) {
  const totalPages = Math.ceil(total / limit);
  
  return success(items, null, {
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  });
}

/**
 * Created response helper (for POST requests)
 * @param {*} data - Created resource
 * @param {string} message - Success message
 */
function created(data, message = 'Resource created successfully') {
  return new ApiResponse(true, data, message);
}

/**
 * Deleted response helper
 * @param {string} message - Success message
 */
function deleted(message = 'Resource deleted successfully') {
  return new ApiResponse(true, null, message);
}

/**
 * Not found response helper
 * @param {string} resource - Resource type that wasn't found
 */
function notFound(resource = 'Resource') {
  return error(`${resource} not found`, 'NOT_FOUND');
}

/**
 * Validation error response helper
 * @param {object} errors - Validation errors object
 */
function validationError(errors) {
  return error('Validation failed', 'VALIDATION_ERROR', errors);
}

/**
 * Unauthorized response helper
 * @param {string} message - Error message
 */
function unauthorized(message = 'Authentication required') {
  return error(message, 'UNAUTHORIZED');
}

/**
 * Forbidden response helper
 * @param {string} message - Error message
 */
function forbidden(message = 'Access denied') {
  return error(message, 'FORBIDDEN');
}

/**
 * Rate limit response helper
 * @param {number} retryAfter - Seconds until retry is allowed
 */
function rateLimited(retryAfter = 60) {
  const response = error('Rate limit exceeded', 'RATE_LIMITED');
  response.retryAfter = retryAfter;
  return response;
}

module.exports = {
  ApiResponse,
  success,
  error,
  paginated,
  created,
  deleted,
  notFound,
  validationError,
  unauthorized,
  forbidden,
  rateLimited
};
