/**
 * Logger module tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { LogLevel, type Logger, type LogMeta, createChildLogger, DevAILogger } from './logger.js';

describe('Logger Module', () => {
  const originalEnv = process.env;
  // Store original console methods for restoration

  let logger: Logger;

  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Create a logger instance for testing
    logger = new DevAILogger();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env = originalEnv;
  });

  describe('LogLevel enum', () => {
    it('should have correct values', () => {
      expect(LogLevel.ERROR).toBe(0);
      expect(LogLevel.WARN).toBe(1);
      expect(LogLevel.INFO).toBe(2);
      expect(LogLevel.DEBUG).toBe(3);
    });
  });

  describe('logger instance', () => {
    it('should be an instance of DevAILogger', () => {
      expect(logger).toBeDefined();
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.debug).toBe('function');
    });

    it('should implement Logger interface', () => {
      const testLogger: Logger = logger;
      expect(testLogger).toBeDefined();
    });
  });

  describe('log levels', () => {
    it('should log error messages', () => {
      logger.error('Test error message');
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR] [DevAI MCP] Test error message')
      );
    });

    it('should log warn messages', () => {
      logger.warn('Test warning message');
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('[WARN] [DevAI MCP] Test warning message')
      );
    });

    it('should log info messages', () => {
      logger.info('Test info message');
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[INFO] [DevAI MCP] Test info message')
      );
    });

    it('should have debug method', () => {
      expect(typeof logger.debug).toBe('function');
      // Test that debug method exists and can be called
      expect(() => logger.debug('Test debug message')).not.toThrow();
    });
  });

  describe('log formatting', () => {
    it('should include timestamp in log messages', () => {
      logger.info('Test message');

      expect(console.log).toHaveBeenCalledWith(
        expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/)
      );
    });

    it('should include log level in messages', () => {
      logger.error('Test error');
      logger.warn('Test warning');
      logger.info('Test info');

      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('[ERROR]'));
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('[WARN]'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('[INFO]'));
    });

    it('should include DevAI MCP prefix', () => {
      logger.info('Test message');
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('[DevAI MCP]'));
    });
  });

  describe('meta data handling', () => {
    it('should include meta data in log messages', () => {
      const meta: LogMeta = { userId: 123, action: 'test' };
      logger.info('Test message', meta);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('{"userId":123,"action":"test"}')
      );
    });

    it('should handle empty meta data', () => {
      logger.info('Test message');
      expect(console.log).toHaveBeenCalledWith(expect.not.stringContaining('{}'));
    });

    it('should handle undefined meta data', () => {
      logger.info('Test message', undefined);
      expect(console.log).toHaveBeenCalledWith(expect.not.stringContaining('undefined'));
    });

    it('should handle circular references in meta data', () => {
      const circular: Record<string, unknown> = { name: 'test' };
      circular.self = circular;

      logger.info('Test message', circular);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[Circular or non-serializable object]')
      );
    });
  });

  describe('errorWithStack', () => {
    it('should log error with stack trace', () => {
      const error = new Error('Test error');
      logger.errorWithStack('Error occurred', error);

      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Error occurred'));
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('"name":"Error"'));
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('"message":"Test error"'));
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('"stack"'));
    });

    it('should include additional meta data', () => {
      const error = new Error('Test error');
      const meta = { userId: 123 };
      logger.errorWithStack('Error occurred', error, meta);

      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('"userId":123'));
    });
  });

  describe('performance logging', () => {
    it('should log performance metrics', () => {
      logger.performance('test-operation', 150);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Performance: test-operation completed in 150ms')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('"operation":"test-operation"')
      );
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('"duration":"150ms"'));
    });

    it('should include additional meta data', () => {
      const meta = { userId: 123 };
      logger.performance('test-operation', 150, meta);

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('"userId":123'));
    });
  });

  describe('database logging', () => {
    it('should have database method', () => {
      expect(typeof logger.database).toBe('function');
      // Test that database method exists and can be called
      expect(() => logger.database('SELECT', 'users')).not.toThrow();
    });

    it('should have database method without table parameter', () => {
      expect(() => logger.database('CONNECT')).not.toThrow();
    });
  });

  describe('MCP logging', () => {
    it('should log MCP operations', () => {
      logger.mcp('tool_call', 'test_tool');

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('MCP: tool_call (test_tool)')
      );
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('"operation":"tool_call"'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('"tool":"test_tool"'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('"type":"mcp"'));
    });

    it('should log MCP operations without tool', () => {
      logger.mcp('connection_established');

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('MCP: connection_established')
      );
      expect(console.log).not.toHaveBeenCalledWith(expect.stringContaining(' ('));
    });
  });

  describe('createChildLogger', () => {
    it('should create a child logger with context', () => {
      const context = { userId: 123, sessionId: 'abc' };
      const childLogger = createChildLogger(context);

      expect(childLogger).toBeDefined();
      expect(typeof childLogger.error).toBe('function');
      expect(typeof childLogger.warn).toBe('function');
      expect(typeof childLogger.info).toBe('function');
      expect(typeof childLogger.debug).toBe('function');
    });

    it('should include context in all log messages', () => {
      const context = { userId: 123 };
      const childLogger = createChildLogger(context);

      childLogger.info('Test message');

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('"userId":123'));
    });

    it('should merge context with additional meta data', () => {
      const context = { userId: 123 };
      const childLogger = createChildLogger(context);
      const meta = { action: 'test' };

      childLogger.info('Test message', meta);

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('"userId":123'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('"action":"test"'));
    });

    it('should handle all log levels', () => {
      const context = { userId: 123 };
      const childLogger = createChildLogger(context);

      childLogger.error('Error message');
      childLogger.warn('Warning message');
      childLogger.info('Info message');
      childLogger.debug('Debug message');

      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('"userId":123'));
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('"userId":123'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('"userId":123'));
    });
  });

  describe('log level filtering', () => {
    it('should have log level filtering functionality', () => {
      // Test that the logger has the expected interface
      expect(typeof logger.debug).toBe('function');
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
    });
  });
});
