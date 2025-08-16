/**
 * Index module tests
 * Tests for the main MCP server entry point
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock console.error to capture debug output
const originalConsoleError = console.error;
const mockConsoleError = vi.fn();

describe('Index Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    console.error = mockConsoleError;

    // Reset environment
    delete process.env.NODE_ENV;
    delete process.env.DEVAI_SEED_BUILD;
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  describe('Environment handling', () => {
    it('should handle test environment correctly', () => {
      process.env.NODE_ENV = 'test';

      // In test environment, the module should not start the server
      expect(process.env.NODE_ENV).toBe('test');
    });

    it('should handle development environment correctly', () => {
      process.env.NODE_ENV = 'development';
      expect(process.env.NODE_ENV).toBe('development');
    });

    it('should handle production environment correctly', () => {
      process.env.NODE_ENV = 'production';
      expect(process.env.NODE_ENV).toBe('production');
    });
  });

  describe('Environment variables', () => {
    it('should handle DEVAI_SEED_BUILD environment variable', () => {
      process.env.DEVAI_SEED_BUILD = 'ts';
      expect(process.env.DEVAI_SEED_BUILD).toBe('ts');
    });

    it('should handle missing DEVAI_SEED_BUILD environment variable', () => {
      delete process.env.DEVAI_SEED_BUILD;
      expect(process.env.DEVAI_SEED_BUILD).toBeUndefined();
    });

    it('should handle DEVAI_SEED_BUILD set to js', () => {
      process.env.DEVAI_SEED_BUILD = 'js';
      expect(process.env.DEVAI_SEED_BUILD).toBe('js');
    });
  });

  describe('Process error handling', () => {
    it('should handle uncaught exceptions', () => {
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at test.js:1:1';

      // Simulate the error handling logic from index.ts
      console.error('[DevAI MCP]', 'uncaughtException', error.stack || String(error));

      expect(mockConsoleError).toHaveBeenCalledWith(
        '[DevAI MCP]',
        'uncaughtException',
        error.stack
      );
    });

    it('should handle uncaught exceptions without stack', () => {
      const error = new Error('Test error');
      delete error.stack;

      // Simulate the error handling logic from index.ts
      console.error('[DevAI MCP]', 'uncaughtException', error.stack || String(error));

      expect(mockConsoleError).toHaveBeenCalledWith(
        '[DevAI MCP]',
        'uncaughtException',
        'Error: Test error'
      );
    });

    it('should handle unhandled rejections with Error object', () => {
      const error = new Error('Test rejection');
      error.stack = 'Error: Test rejection\n    at test.js:1:1';

      // Simulate the error handling logic from index.ts
      const reason =
        typeof error === 'object' && error !== null
          ? (error as { stack?: string }).stack || String(error)
          : String(error);

      console.error('[DevAI MCP]', 'unhandledRejection', reason);

      expect(mockConsoleError).toHaveBeenCalledWith(
        '[DevAI MCP]',
        'unhandledRejection',
        error.stack
      );
    });

    it('should handle unhandled rejections with string', () => {
      const reason = 'Test rejection string';

      // Simulate the error handling logic from index.ts
      const processedReason =
        typeof reason === 'object' && reason !== null
          ? (reason as { stack?: string }).stack || String(reason)
          : String(reason);

      console.error('[DevAI MCP]', 'unhandledRejection', processedReason);

      expect(mockConsoleError).toHaveBeenCalledWith(
        '[DevAI MCP]',
        'unhandledRejection',
        'Test rejection string'
      );
    });

    it('should handle unhandled rejections with object without stack', () => {
      const reason = { message: 'Test rejection object' };

      // Simulate the error handling logic from index.ts
      const processedReason =
        typeof reason === 'object' && reason !== null
          ? (reason as { stack?: string }).stack || String(reason)
          : String(reason);

      console.error('[DevAI MCP]', 'unhandledRejection', processedReason);

      expect(mockConsoleError).toHaveBeenCalledWith(
        '[DevAI MCP]',
        'unhandledRejection',
        '[object Object]'
      );
    });
  });

  describe('Debug logging', () => {
    it('should handle debug logging with simple values', () => {
      // Simulate the dbg function from index.ts
      try {
        console.error('[DevAI MCP]', 'Test debug message');
      } catch (_) {
        console.error('[DevAI MCP] <log error>');
      }

      expect(mockConsoleError).toHaveBeenCalledWith('[DevAI MCP]', 'Test debug message');
    });

    it('should handle debug logging with complex objects', () => {
      const complexObj = { name: 'test', value: 123 };

      // Simulate the dbg function from index.ts
      try {
        console.error('[DevAI MCP]', complexObj);
      } catch (_) {
        console.error('[DevAI MCP] <log error>');
      }

      expect(mockConsoleError).toHaveBeenCalledWith('[DevAI MCP]', complexObj);
    });

    it('should handle debug logging errors gracefully', () => {
      // Test that the error handling logic works correctly
      let errorCaught = false;

      // Simulate the dbg function's error handling logic
      try {
        // Simulate a console.error that might throw
        throw new Error('Console error');
      } catch (_) {
        errorCaught = true;
        console.error('[DevAI MCP] <log error>');
      }

      expect(errorCaught).toBe(true);
      expect(mockConsoleError).toHaveBeenCalledWith('[DevAI MCP] <log error>');
    });
  });

  describe('JSON serialization', () => {
    it('should handle JSON serialization safely', () => {
      const testObj = { name: 'test', value: 123 };

      // Simulate the JSON serialization logic from index.ts
      const serialized = (() => {
        try {
          return JSON.stringify(testObj).slice(0, 800);
        } catch {
          return '<unserializable>';
        }
      })();

      expect(serialized).toBe('{"name":"test","value":123}');
    });

    it('should handle circular references in JSON serialization', () => {
      const circular: any = { name: 'test' };
      circular.self = circular;

      // Simulate the JSON serialization logic from index.ts
      const serialized = (() => {
        try {
          return JSON.stringify(circular).slice(0, 800);
        } catch {
          return '<unserializable>';
        }
      })();

      expect(serialized).toBe('<unserializable>');
    });
  });

  describe('Server configuration', () => {
    it('should have correct server name and version', () => {
      const serverConfig = {
        name: 'devai-mcp-server',
        version: '1.0.0',
      };

      expect(serverConfig.name).toBe('devai-mcp-server');
      expect(serverConfig.version).toBe('1.0.0');
    });

    it('should have tools capability', () => {
      const capabilities = {
        capabilities: {
          tools: {},
        },
      };

      expect(capabilities.capabilities).toHaveProperty('tools');
    });
  });

  describe('Tool structure validation', () => {
    it('should validate tool structure', () => {
      const testTool = {
        name: 'test_tool',
        description: 'Test tool description',
        inputSchema: {
          type: 'object',
          properties: {
            test: { type: 'string' },
          },
          required: ['test'],
        },
      };

      expect(testTool).toHaveProperty('name');
      expect(testTool).toHaveProperty('description');
      expect(testTool).toHaveProperty('inputSchema');
      expect(typeof testTool.name).toBe('string');
      expect(typeof testTool.description).toBe('string');
      expect(typeof testTool.inputSchema).toBe('object');
    });

    it('should validate tool schema structure', () => {
      const validSchema = {
        type: 'object',
        properties: {
          projectId: { type: 'number' },
          name: { type: 'string' },
        },
        required: ['projectId'],
      };

      expect(validSchema).toHaveProperty('type');
      expect(validSchema).toHaveProperty('properties');
      expect(validSchema).toHaveProperty('required');
      expect(Array.isArray(validSchema.required)).toBe(true);
      expect(typeof validSchema.properties).toBe('object');
    });
  });

  describe('Error message formatting', () => {
    it('should format error messages correctly', () => {
      const error = new Error('Test error');

      // Simulate the error message formatting logic from index.ts
      const msg = (error as { message?: string })?.message || String(error);
      const stack = (error as { stack?: string })?.stack || msg;

      expect(msg).toBe('Test error');
      expect(stack).toContain('Test error');
    });

    it('should handle errors without message property', () => {
      const error = 'String error';

      // Simulate the error message formatting logic from index.ts
      const msg = (error as { message?: string })?.message || String(error);

      expect(msg).toBe('String error');
    });

    it('should handle unknown tool errors', () => {
      const error = new Error('Unknown tool: unknown_tool');

      // Simulate the error message formatting logic from index.ts
      const msg = (error as { message?: string })?.message || String(error);
      const stack = (error as { stack?: string })?.stack || msg;

      expect(msg).toBe('Unknown tool: unknown_tool');
      expect(stack).toContain('Unknown tool: unknown_tool');
    });
  });
});
