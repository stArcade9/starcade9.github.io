// runtime/debug-logger.js
// Environment-aware debug logging system for Nova64

/**
 * Debug logging levels
 */
export const LogLevel = {
  NONE: 0,
  ERROR: 1,
  WARN: 2,
  INFO: 3,
  DEBUG: 4,
  TRACE: 5,
};

/**
 * Environment detection
 */
function getEnvironment() {
  // Check if we're in production mode
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production') {
    return 'production';
  }
  // Check if we're in development mode
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
    return 'development';
  }
  // Check for Vite dev server
  if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
    return 'development';
  }
  if (typeof import.meta !== 'undefined' && import.meta.env?.PROD) {
    return 'production';
  }
  // Check URL params for ?debug=1
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    if (params.get('debug') === '1') return 'debug';
  }
  // Default to development if localhost
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'development';
  }
  return 'production';
}

/**
 * Get log level based on environment
 */
function getLogLevel() {
  const env = getEnvironment();

  // Check for explicit log level in URL or localStorage
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const urlLevel = params.get('logLevel');
    if (urlLevel && LogLevel[urlLevel.toUpperCase()] !== undefined) {
      return LogLevel[urlLevel.toUpperCase()];
    }

    const storedLevel = localStorage.getItem('nova64:logLevel');
    if (storedLevel && LogLevel[storedLevel.toUpperCase()] !== undefined) {
      return LogLevel[storedLevel.toUpperCase()];
    }
  }

  // Default levels per environment
  switch (env) {
    case 'production':
      return LogLevel.ERROR; // Only errors in production
    case 'development':
      return LogLevel.DEBUG; // Show debug logs in dev
    case 'debug':
      return LogLevel.TRACE; // Show everything when ?debug=1
    default:
      return LogLevel.WARN;
  }
}

/**
 * Debug logger class
 */
class DebugLogger {
  constructor(category) {
    this.category = category;
    this.logLevel = getLogLevel();
    this.environment = getEnvironment();
  }

  /**
   * Set log level at runtime
   */
  setLevel(level) {
    this.logLevel = typeof level === 'string' ? LogLevel[level.toUpperCase()] : level;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(
        'nova64:logLevel',
        Object.keys(LogLevel).find(k => LogLevel[k] === this.logLevel)
      );
    }
  }

  /**
   * Format log message with category
   */
  _format(level, message, data) {
    const prefix = `[${this.category}:${level}]`;
    if (data !== undefined) {
      return [prefix, message, data];
    }
    return [prefix, message];
  }

  /**
   * Log methods
   */
  error(message, data) {
    if (this.logLevel >= LogLevel.ERROR) {
      console.error(...this._format('ERROR', message, data));
    }
  }

  warn(message, data) {
    if (this.logLevel >= LogLevel.WARN) {
      console.warn(...this._format('WARN', message, data));
    }
  }

  info(message, data) {
    if (this.logLevel >= LogLevel.INFO) {
      console.log(...this._format('INFO', message, data));
    }
  }

  debug(message, data) {
    if (this.logLevel >= LogLevel.DEBUG) {
      console.log(...this._format('DEBUG', message, data));
    }
  }

  trace(message, data) {
    if (this.logLevel >= LogLevel.TRACE) {
      console.log(...this._format('TRACE', message, data));
    }
  }

  /**
   * Conditional logging - only logs in development/debug mode
   */
  devOnly(message, data) {
    if (this.environment === 'development' || this.environment === 'debug') {
      this.debug(message, data);
    }
  }

  /**
   * Create a scoped logger for a subsystem
   */
  scope(subsystem) {
    return new DebugLogger(`${this.category}:${subsystem}`);
  }
}

/**
 * Create a logger instance
 */
export function createLogger(category) {
  return new DebugLogger(category);
}

/**
 * Global logger instance
 */
export const logger = createLogger('Nova64');

/**
 * Expose to globalThis for runtime control
 */
if (typeof globalThis !== 'undefined') {
  globalThis.setLogLevel = level => {
    logger.setLevel(level);
    console.log(`[Nova64] Log level set to: ${level}`);
  };
}
