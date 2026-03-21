// runtime/logger.js
// Configurable logging system for Nova64.
// Replaces scattered console.log calls with leveled, history-tracked output.
// In production builds the level is automatically raised to WARN.

export const LogLevel = Object.freeze({ DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3, NONE: 4 });

class Logger {
  constructor(initialLevel = LogLevel.INFO) {
    this.level = initialLevel;
    this.history = [];
    this.maxHistory = 200;
  }

  _record(level, args) {
    this.history.push({ level, args, ts: Date.now() });
    if (this.history.length > this.maxHistory) this.history.shift();
  }

  debug(...args) {
    if (this.level > LogLevel.DEBUG) return;
    console.log('[Nova64:DEBUG]', ...args);
    this._record('DEBUG', args);
  }

  info(...args) {
    if (this.level > LogLevel.INFO) return;
    console.log('[Nova64:INFO]', ...args);
    this._record('INFO', args);
  }

  warn(...args) {
    if (this.level > LogLevel.WARN) return;
    console.warn('[Nova64:WARN]', ...args);
    this._record('WARN', args);
  }

  error(...args) {
    if (this.level > LogLevel.ERROR) return;
    console.error('[Nova64:ERROR]', ...args);
    this._record('ERROR', args);
  }

  setLevel(level) {
    this.level = level;
  }
  getHistory() {
    return [...this.history];
  }
  clearHistory() {
    this.history = [];
  }
}

export const logger = new Logger(
  // Raise to WARN in production so debug noise is suppressed
  typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.PROD
    ? LogLevel.WARN
    : LogLevel.INFO
);
