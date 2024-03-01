const { getDb } = require('../config/database');
const logger = require('../utils/logger');
const { runQuery, getOne, getAll, runTransaction } = require('../utils/dbHelpers');

class ServiceFactory {
  constructor() {
    this.services = new Map();
    this.dependencies = {
      db: null,
      logger,
      dbHelpers: { runQuery, getOne, getAll, runTransaction }
    };
  }

  async initialize() {
    this.dependencies.db = getDb();
    logger.info('ServiceFactory initialized with database connection');
  }

  getDependencies() {
    return { ...this.dependencies };
  }

  register(name, ServiceClass) {
    if (this.services.has(name)) {
      logger.warn(`Service ${name} is being re-registered`);
    }
    this.services.set(name, {
      ServiceClass,
      instance: null
    });
    logger.debug(`Service ${name} registered`);
  }

  get(name) {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service ${name} not found`);
    }

    if (!service.instance) {
      service.instance = new service.ServiceClass(this.dependencies, this);
      logger.debug(`Service ${name} instantiated`);
    }

    return service.instance;
  }

  getAll() {
    const allServices = {};
    for (const [name] of this.services) {
      allServices[name] = this.get(name);
    }
    return allServices;
  }

  reset() {
    for (const [name, service] of this.services) {
      if (service.instance && typeof service.instance.cleanup === 'function') {
        service.instance.cleanup();
      }
      service.instance = null;
    }
    logger.info('All services reset');
  }
}

const factory = new ServiceFactory();

module.exports = factory;
