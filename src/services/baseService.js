const { ERRORS } = require('../constants');

class BaseService {
  constructor(dependencies, factory) {
    this.db = dependencies.db;
    this.logger = dependencies.logger;
    this.dbHelpers = dependencies.dbHelpers;
    this.factory = factory;
  }

  getService(name) {
    if (!this.factory) {
      throw new Error('Service factory not available');
    }
    return this.factory.get(name);
  }

  async executeQuery(query, params = []) {
    try {
      return await this.dbHelpers.runQuery(query, params);
    } catch (error) {
      this.logger.error('Query execution failed', { query, error: error.message });
      throw error;
    }
  }

  async findOne(query, params = []) {
    try {
      return await this.dbHelpers.getOne(query, params);
    } catch (error) {
      this.logger.error('FindOne failed', { query, error: error.message });
      throw error;
    }
  }

  async findAll(query, params = []) {
    try {
      return await this.dbHelpers.getAll(query, params);
    } catch (error) {
      this.logger.error('FindAll failed', { query, error: error.message });
      throw error;
    }
  }

  async withTransaction(callback) {
    return await this.dbHelpers.runTransaction(callback);
  }

  validateRequired(data, fields) {
    const missing = fields.filter(field => !data[field]);
    if (missing.length > 0) {
      throw new Error(`${ERRORS.VALIDATION_ERROR}: Missing required fields: ${missing.join(', ')}`);
    }
  }

  paginate(page = 1, limit = 20) {
    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (safePage - 1) * safeLimit;
    return { limit: safeLimit, offset, page: safePage };
  }

  formatPaginatedResponse(items, total, page, limit) {
    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    };
  }

  cleanup() {
    this.logger.debug(`${this.constructor.name} cleanup called`);
  }
}

module.exports = BaseService;
