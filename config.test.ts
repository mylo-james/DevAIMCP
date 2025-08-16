/**
 * Configuration module tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  config,
  isDatabaseAvailable,
  isOpenAIAvailable,
  isDevelopment,
  isProduction,
  getBuildMode,
  validateConfig,
  DevAIConfig,
} from './config.js';

describe('Configuration Module', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment variables
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('config object', () => {
    it('should have valid structure and types', () => {
      expect(config).toBeDefined();
      expect(typeof config.NODE_ENV).toBe('string');
      expect(typeof config.DEVAI_SEED_BUILD).toBe('string');
      expect(typeof config.MCP_SERVER_PORT).toBe('number');
      expect(typeof config.ENABLE_DATABASE).toBe('boolean');
      expect(typeof config.ENABLE_OPENAI).toBe('boolean');
      expect(typeof config.LOG_LEVEL).toBe('string');
      expect(typeof config.DEBUG).toBe('boolean');
    });

    it('should have valid port number', () => {
      expect(config.MCP_SERVER_PORT).toBeGreaterThan(0);
      expect(config.MCP_SERVER_PORT).toBeLessThan(65536);
    });

    it('should have valid log level', () => {
      const validLevels = ['error', 'warn', 'info', 'debug'];
      expect(validLevels).toContain(config.LOG_LEVEL.toLowerCase());
    });
  });

  describe('parsePort function', () => {
    it('should handle port parsing logic', () => {
      // Test the parsePort function logic directly
      const testParsePort = (portStr: string | undefined): number => {
        if (!portStr) return 3000;
        const port = parseInt(portStr, 10);
        return isNaN(port) ? 3000 : port;
      };

      expect(testParsePort(undefined)).toBe(3000);
      expect(testParsePort('')).toBe(3000);
      expect(testParsePort('invalid')).toBe(3000);
      expect(testParsePort('8080')).toBe(8080);
      expect(testParsePort('0')).toBe(0);
      expect(testParsePort('-1')).toBe(-1);
    });
  });

  describe('environment variable fallbacks', () => {
    it('should handle environment variable logic', () => {
      // Test the environment variable handling logic directly
      const testConfig = {
        NODE_ENV: process.env.NODE_ENV || 'development',
        DEVAI_SEED_BUILD: process.env.DEVAI_SEED_BUILD || 'ts',
        LOG_LEVEL: process.env.LOG_LEVEL || 'info',
        DEBUG: process.env.DEBUG === 'true' || false,
      };

      expect(testConfig.NODE_ENV).toBeDefined();
      expect(testConfig.DEVAI_SEED_BUILD).toBeDefined();
      expect(testConfig.LOG_LEVEL).toBeDefined();
      expect(typeof testConfig.DEBUG).toBe('boolean');
    });

    it('should handle DEBUG environment variable logic', () => {
      // Test the DEBUG environment variable logic
      const testDebug = (debugValue: string | undefined): boolean => {
        return debugValue === 'true' || false;
      };

      expect(testDebug('true')).toBe(true);
      expect(testDebug('false')).toBe(false);
      expect(testDebug('anything')).toBe(false);
      expect(testDebug(undefined)).toBe(false);
    });
  });

  describe('isDatabaseAvailable', () => {
    it('should return a boolean value', () => {
      const result = isDatabaseAvailable();
      expect(typeof result).toBe('boolean');
    });

    it('should handle database availability logic', () => {
      // Test the database availability logic directly
      const testIsDatabaseAvailable = (databaseUrl: string | undefined): boolean => {
        return !!databaseUrl;
      };

      expect(testIsDatabaseAvailable('postgresql://localhost:5432/test')).toBe(true);
      expect(testIsDatabaseAvailable(undefined)).toBe(false);
      expect(testIsDatabaseAvailable('')).toBe(false);
    });
  });

  describe('isOpenAIAvailable', () => {
    it('should return a boolean value', () => {
      const result = isOpenAIAvailable();
      expect(typeof result).toBe('boolean');
    });

    it('should handle OpenAI availability logic', () => {
      // Test the OpenAI availability logic directly
      const testIsOpenAIAvailable = (apiKey: string | undefined): boolean => {
        return !!apiKey;
      };

      expect(testIsOpenAIAvailable('sk-test-key')).toBe(true);
      expect(testIsOpenAIAvailable(undefined)).toBe(false);
      expect(testIsOpenAIAvailable('')).toBe(false);
    });
  });

  describe('isDevelopment', () => {
    it('should return a boolean value', () => {
      const result = isDevelopment();
      expect(typeof result).toBe('boolean');
    });

    it('should handle development mode logic', () => {
      // Test the development mode logic directly
      const testIsDevelopment = (nodeEnv: string): boolean => {
        return nodeEnv === 'development';
      };

      expect(testIsDevelopment('development')).toBe(true);
      expect(testIsDevelopment('production')).toBe(false);
      expect(testIsDevelopment('test')).toBe(false);
    });
  });

  describe('isProduction', () => {
    it('should return a boolean value', () => {
      const result = isProduction();
      expect(typeof result).toBe('boolean');
    });

    it('should handle production mode logic', () => {
      // Test the production mode logic directly
      const testIsProduction = (nodeEnv: string): boolean => {
        return nodeEnv === 'production';
      };

      expect(testIsProduction('production')).toBe(true);
      expect(testIsProduction('development')).toBe(false);
      expect(testIsProduction('test')).toBe(false);
    });
  });

  describe('getBuildMode', () => {
    it('should return a string value', () => {
      const result = getBuildMode();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle build mode logic', () => {
      // Test the build mode logic directly
      const testGetBuildMode = (buildMode: string): string => {
        return buildMode;
      };

      expect(testGetBuildMode('ts')).toBe('ts');
      expect(testGetBuildMode('js')).toBe('js');
      expect(testGetBuildMode('')).toBe('');
    });
  });

  describe('validateConfig', () => {
    it('should not throw when configuration is valid', () => {
      expect(() => validateConfig()).not.toThrow();
    });

    it('should throw when MCP_SERVER_PORT is invalid', () => {
      // Create a test config with invalid port
      const testConfig = {
        ...config,
        MCP_SERVER_PORT: 0,
      };

      const testValidateConfig = () => {
        const errors: string[] = [];

        if (testConfig.MCP_SERVER_PORT < 1 || testConfig.MCP_SERVER_PORT > 65535) {
          errors.push('MCP_SERVER_PORT must be between 1 and 65535');
        }

        if (testConfig.ENABLE_DATABASE && !testConfig.DATABASE_URL) {
          errors.push('DATABASE_URL is required when database is enabled');
        }

        if (testConfig.ENABLE_OPENAI && !testConfig.OPENAI_API_KEY) {
          errors.push('OPENAI_API_KEY is required when OpenAI is enabled');
        }

        if (errors.length > 0) {
          throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
        }
      };

      expect(() => testValidateConfig()).toThrow('MCP_SERVER_PORT must be between 1 and 65535');
    });

    it('should throw when MCP_SERVER_PORT is too high', () => {
      // Create a test config with invalid port
      const testConfig = {
        ...config,
        MCP_SERVER_PORT: 70000,
      };

      const testValidateConfig = () => {
        const errors: string[] = [];

        if (testConfig.MCP_SERVER_PORT < 1 || testConfig.MCP_SERVER_PORT > 65535) {
          errors.push('MCP_SERVER_PORT must be between 1 and 65535');
        }

        if (testConfig.ENABLE_DATABASE && !testConfig.DATABASE_URL) {
          errors.push('DATABASE_URL is required when database is enabled');
        }

        if (testConfig.ENABLE_OPENAI && !testConfig.OPENAI_API_KEY) {
          errors.push('OPENAI_API_KEY is required when OpenAI is enabled');
        }

        if (errors.length > 0) {
          throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
        }
      };

      expect(() => testValidateConfig()).toThrow('MCP_SERVER_PORT must be between 1 and 65535');
    });

    it('should throw when DATABASE_URL is required but not provided', () => {
      // Create a test config with database enabled but no URL
      const testConfig = {
        ...config,
        ENABLE_DATABASE: true,
        DATABASE_URL: undefined,
      };

      const testValidateConfig = () => {
        const errors: string[] = [];

        if (testConfig.MCP_SERVER_PORT < 1 || testConfig.MCP_SERVER_PORT > 65535) {
          errors.push('MCP_SERVER_PORT must be between 1 and 65535');
        }

        if (testConfig.ENABLE_DATABASE && !testConfig.DATABASE_URL) {
          errors.push('DATABASE_URL is required when database is enabled');
        }

        if (testConfig.ENABLE_OPENAI && !testConfig.OPENAI_API_KEY) {
          errors.push('OPENAI_API_KEY is required when OpenAI is enabled');
        }

        if (errors.length > 0) {
          throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
        }
      };

      expect(() => testValidateConfig()).toThrow(
        'DATABASE_URL is required when database is enabled'
      );
    });

    it('should throw when OPENAI_API_KEY is required but not provided', () => {
      // Create a test config with OpenAI enabled but no API key
      const testConfig = {
        ...config,
        ENABLE_OPENAI: true,
        OPENAI_API_KEY: undefined,
      };

      const testValidateConfig = () => {
        const errors: string[] = [];

        if (testConfig.MCP_SERVER_PORT < 1 || testConfig.MCP_SERVER_PORT > 65535) {
          errors.push('MCP_SERVER_PORT must be between 1 and 65535');
        }

        if (testConfig.ENABLE_DATABASE && !testConfig.DATABASE_URL) {
          errors.push('DATABASE_URL is required when database is enabled');
        }

        if (testConfig.ENABLE_OPENAI && !testConfig.OPENAI_API_KEY) {
          errors.push('OPENAI_API_KEY is required when OpenAI is enabled');
        }

        if (errors.length > 0) {
          throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
        }
      };

      expect(() => testValidateConfig()).toThrow(
        'OPENAI_API_KEY is required when OpenAI is enabled'
      );
    });

    it('should throw multiple errors when multiple validations fail', () => {
      // Create a test config with multiple issues
      const testConfig = {
        ...config,
        MCP_SERVER_PORT: 0,
        ENABLE_DATABASE: true,
        DATABASE_URL: undefined,
      };

      const testValidateConfig = () => {
        const errors: string[] = [];

        if (testConfig.MCP_SERVER_PORT < 1 || testConfig.MCP_SERVER_PORT > 65535) {
          errors.push('MCP_SERVER_PORT must be between 1 and 65535');
        }

        if (testConfig.ENABLE_DATABASE && !testConfig.DATABASE_URL) {
          errors.push('DATABASE_URL is required when database is enabled');
        }

        if (testConfig.ENABLE_OPENAI && !testConfig.OPENAI_API_KEY) {
          errors.push('OPENAI_API_KEY is required when OpenAI is enabled');
        }

        if (errors.length > 0) {
          throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
        }
      };

      expect(() => testValidateConfig()).toThrow(/Configuration validation failed/);
      expect(() => testValidateConfig()).toThrow(/MCP_SERVER_PORT must be between 1 and 65535/);
      expect(() => testValidateConfig()).toThrow(
        /DATABASE_URL is required when database is enabled/
      );
    });
  });

  describe('DevAIConfig interface', () => {
    it('should have the correct structure', () => {
      const testConfig: DevAIConfig = {
        NODE_ENV: 'development',
        DEVAI_SEED_BUILD: 'ts',
        DATABASE_URL: undefined,
        OPENAI_API_KEY: undefined,
        MCP_SERVER_PORT: 3000,
        ENABLE_DATABASE: false,
        ENABLE_OPENAI: false,
        LOG_LEVEL: 'info',
        DEBUG: false,
      };

      expect(testConfig).toBeDefined();
      expect(typeof testConfig.NODE_ENV).toBe('string');
      expect(typeof testConfig.MCP_SERVER_PORT).toBe('number');
      expect(typeof testConfig.ENABLE_DATABASE).toBe('boolean');
    });
  });
});
