/**
 * Lightweight logging utility for ChirpBoard
 * Provides structured logging with different levels and formatting
 */

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

const LEVEL_COLORS = {
  ERROR: '\x1b[31m',
  WARN: '\x1b[33m',
  INFO: '\x1b[36m',
  DEBUG: '\x1b[90m'
};

const RESET_COLOR = '\x1b[0m';

class Logger {
  constructor(options = {}) {
    this.level = LOG_LEVELS[options.level?.toUpperCase()] ?? LOG_LEVELS.INFO;
    this.prefix = options.prefix || 'ChirpBoard';
    this.colorize = options.colorize !== false;
    this.includeTimestamp = options.includeTimestamp !== false;
  }

  formatTimestamp() {
    return new Date().toISOString();
  }

  formatMessage(level, message, meta = {}) {
    const parts = [];

    if (this.includeTimestamp) {
      parts.push(`[${this.formatTimestamp()}]`);
    }

    parts.push(`[${this.prefix}]`);
    parts.push(`[${level}]`);
    parts.push(message);

    if (Object.keys(meta).length > 0) {
      parts.push(JSON.stringify(meta));
    }

    const logMessage = parts.join(' ');

    if (this.colorize && LEVEL_COLORS[level]) {
      return `${LEVEL_COLORS[level]}${logMessage}${RESET_COLOR}`;
    }

    return logMessage;
  }

  log(level, message, meta) {
    if (LOG_LEVELS[level] <= this.level) {
      const formattedMessage = this.formatMessage(level, message, meta);
      
      if (level === 'ERROR') {
        console.error(formattedMessage);
      } else if (level === 'WARN') {
        console.warn(formattedMessage);
      } else {
        console.log(formattedMessage);
      }
    }
  }

  error(message, meta) {
    this.log('ERROR', message, meta);
  }

  warn(message, meta) {
    this.log('WARN', message, meta);
  }

  info(message, meta) {
    this.log('INFO', message, meta);
  }

  debug(message, meta) {
    this.log('DEBUG', message, meta);
  }

  child(prefix) {
    return new Logger({
      level: Object.keys(LOG_LEVELS).find(key => LOG_LEVELS[key] === this.level),
      prefix: `${this.prefix}:${prefix}`,
      colorize: this.colorize,
      includeTimestamp: this.includeTimestamp
    });
  }
}

// Default logger instance
const defaultLogger = new Logger({
  level: process.env.LOG_LEVEL || 'INFO',
  colorize: process.env.NODE_ENV !== 'production'
});

module.exports = {
  Logger,
  logger: defaultLogger,
  LOG_LEVELS
};
