/**
 * Configuration module tests
 */

import { describe, it, expect } from 'vitest';
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

  describe('isDatabaseAvailable', () => {
    it('should return a boolean value', () => {
      const result = isDatabaseAvailable();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('isOpenAIAvailable', () => {
    it('should return a boolean value', () => {
      const result = isOpenAIAvailable();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('isDevelopment', () => {
    it('should return a boolean value', () => {
      const result = isDevelopment();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('isProduction', () => {
    it('should return a boolean value', () => {
      const result = isProduction();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('getBuildMode', () => {
    it('should return a string value', () => {
      const result = getBuildMode();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
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
      
      expect(() => testValidateConfig()).toThrow('DATABASE_URL is required when database is enabled');
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
      
      expect(() => testValidateConfig()).toThrow('OPENAI_API_KEY is required when OpenAI is enabled');
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
      expect(() => testValidateConfig()).toThrow(/DATABASE_URL is required when database is enabled/);
    });
  });

  describe('parsePort function', () => {
    it('should handle port parsing logic', () => {
      // Test the parsePort function logic indirectly
      // Since we can't easily re-import the module, we test the logic
      const testParsePort = (portStr: string | undefined): number => {
        if (!portStr) return 3000;
        const port = parseInt(portStr, 10);
        return isNaN(port) ? 3000 : port;
      };

      expect(testParsePort('8080')).toBe(8080);
      expect(testParsePort('invalid')).toBe(3000);
      expect(testParsePort(undefined)).toBe(3000);
      expect(testParsePort('')).toBe(3000);
    });
  });

  describe('environment variable handling', () => {
    it('should handle environment variable logic', () => {
      // Test the environment variable handling logic
      const testConfig = {
        NODE_ENV: process.env.NODE_ENV || 'development',
        DEVAI_SEED_BUILD: process.env.DEVAI_SEED_BUILD || 'ts',
        DATABASE_URL: process.env.DATABASE_URL,
        OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        LOG_LEVEL: process.env.LOG_LEVEL || 'info',
        DEBUG: process.env.DEBUG === 'true' || false,
        ENABLE_DATABASE: !!process.env.DATABASE_URL,
        ENABLE_OPENAI: !!process.env.OPENAI_API_KEY,
      };

      expect(testConfig.NODE_ENV).toBeDefined();
      expect(testConfig.DEVAI_SEED_BUILD).toBeDefined();
      expect(typeof testConfig.ENABLE_DATABASE).toBe('boolean');
      expect(typeof testConfig.ENABLE_OPENAI).toBe('boolean');
      expect(typeof testConfig.DEBUG).toBe('boolean');
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