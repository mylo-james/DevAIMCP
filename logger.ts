/**
 * DevAI MCP Server Logger
 * Structured logging with configurable levels and error handling
 */

import { config } from './config.js';

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

     export interface LogMeta {
       [key: string]: unknown;
     }

export interface Logger {
  error(message: string, meta?: LogMeta): void;
  warn(message: string, meta?: LogMeta): void;
  info(message: string, meta?: LogMeta): void;
  debug(message: string, meta?: LogMeta): void;
}

/**
 * Get log level from string
 */
function getLogLevel(level: string): LogLevel {
  switch (level.toLowerCase()) {
    case 'error':
      return LogLevel.ERROR;
    case 'warn':
      return LogLevel.WARN;
    case 'info':
      return LogLevel.INFO;
    case 'debug':
      return LogLevel.DEBUG;
    default:
      return LogLevel.INFO;
  }
}

/**
 * Safe JSON stringify that handles circular references
 */
     function safeStringify(obj: unknown): string {
  try {
    return JSON.stringify(obj);
  } catch (error) {
    return '[Circular or non-serializable object]';
  }
}

/**
 * Format log message with timestamp and level
 */
function formatMessage(level: string, message: string, meta?: LogMeta): string {
  const timestamp = new Date().toISOString();
  const metaStr = meta ? ` ${safeStringify(meta)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] [DevAI MCP] ${message}${metaStr}`;
}

/**
 * Main logger implementation
 */
export class DevAILogger implements Logger {
  private currentLevel: LogLevel;

  constructor() {
    this.currentLevel = getLogLevel(config.LOG_LEVEL);
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.currentLevel;
  }

  private log(level: LogLevel, levelName: string, message: string, meta?: LogMeta): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const formattedMessage = formatMessage(levelName, message, meta);
    
    switch (level) {
      case LogLevel.ERROR:
        console.error(formattedMessage);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage);
        break;
      case LogLevel.INFO:
        console.log(formattedMessage);
        break;
      case LogLevel.DEBUG:
        console.log(formattedMessage);
        break;
    }
  }

  error(message: string, meta?: LogMeta): void {
    this.log(LogLevel.ERROR, 'ERROR', message, meta);
  }

  warn(message: string, meta?: LogMeta): void {
    this.log(LogLevel.WARN, 'WARN', message, meta);
  }

  info(message: string, meta?: LogMeta): void {
    this.log(LogLevel.INFO, 'INFO', message, meta);
  }

  debug(message: string, meta?: LogMeta): void {
    this.log(LogLevel.DEBUG, 'DEBUG', message, meta);
  }

  /**
   * Log error with stack trace
   */
  errorWithStack(message: string, error: Error, meta?: LogMeta): void {
    const errorMeta = {
      ...meta,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
    };
    this.error(message, errorMeta);
  }

  /**
   * Log performance metrics
   */
  performance(operation: string, duration: number, meta?: LogMeta): void {
    const performanceMeta = {
      ...meta,
      operation,
      duration: `${duration}ms`,
    };
    this.info(`Performance: ${operation} completed in ${duration}ms`, performanceMeta);
  }

  /**
   * Log database operations
   */
  database(operation: string, table?: string, meta?: LogMeta): void {
    const dbMeta = {
      ...meta,
      operation,
      table,
      type: 'database',
    };
    this.debug(`Database: ${operation}${table ? ` on ${table}` : ''}`, dbMeta);
  }

  /**
   * Log MCP operations
   */
  mcp(operation: string, tool?: string, meta?: LogMeta): void {
    const mcpMeta = {
      ...meta,
      operation,
      tool,
      type: 'mcp',
    };
    this.info(`MCP: ${operation}${tool ? ` (${tool})` : ''}`, mcpMeta);
  }
}

/**
 * Export singleton logger instance
 */
export const logger = new DevAILogger();

/**
 * Create a child logger with additional context
 */
export function createChildLogger(context: LogMeta): Logger {
  return {
    error: (message: string, meta?: LogMeta) => 
      logger.error(message, { ...context, ...meta }),
    warn: (message: string, meta?: LogMeta) => 
      logger.warn(message, { ...context, ...meta }),
    info: (message: string, meta?: LogMeta) => 
      logger.info(message, { ...context, ...meta }),
    debug: (message: string, meta?: LogMeta) => 
      logger.debug(message, { ...context, ...meta }),
  };
}
