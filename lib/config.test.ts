/**
 * Lib config module tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('Lib Config Module', () => {
  let originalEnv: Record<string, string | undefined>;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getDatabaseUrl', () => {
    it('should return DATABASE_URL when provided', async () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@host:5432/db';
      
      // Import the function dynamically to test with current env
      const { getDatabaseUrl } = await import('./config.js');
      const result = getDatabaseUrl();
      
      expect(result).toBe('postgresql://user:pass@host:5432/db');
    });

    it('should return DATABASE_URL when provided with whitespace', async () => {
      process.env.DATABASE_URL = '  postgresql://user:pass@host:5432/db  ';
      
      const { getDatabaseUrl } = await import('./config.js');
      const result = getDatabaseUrl();
      
      expect(result).toBe('  postgresql://user:pass@host:5432/db  ');
    });

    it('should construct URL from individual environment variables', async () => {
      delete process.env.DATABASE_URL;
      process.env.DB_HOST = 'custom-host';
      process.env.DB_PORT = '5433';
      process.env.DB_NAME = 'custom-db';
      process.env.DB_USER = 'custom-user';
      process.env.DB_PASSWORD = 'custom-pass';
      
      const { getDatabaseUrl } = await import('./config.js');
      const result = getDatabaseUrl();
      
      expect(result).toBe('postgresql://custom-user:custom-pass@custom-host:5433/custom-db');
    });

    it('should use default values when individual variables are not set', async () => {
      delete process.env.DATABASE_URL;
      delete process.env.DB_HOST;
      delete process.env.DB_PORT;
      process.env.DB_NAME = 'test-db';
      process.env.DB_USER = 'test-user';
      process.env.DB_PASSWORD = 'test-pass';
      
      const { getDatabaseUrl } = await import('./config.js');
      const result = getDatabaseUrl();
      
      expect(result).toBe('postgresql://test-user:test-pass@localhost:5432/test-db');
    });

    it('should use POSTGRES_DB as fallback for DB_NAME', async () => {
      delete process.env.DATABASE_URL;
      delete process.env.DB_NAME;
      process.env.POSTGRES_DB = 'postgres-db';
      process.env.DB_USER = 'test-user';
      process.env.DB_PASSWORD = 'test-pass';
      
      const { getDatabaseUrl } = await import('./config.js');
      const result = getDatabaseUrl();
      
      expect(result).toBe('postgresql://test-user:test-pass@localhost:5432/postgres-db');
    });

    it('should use POSTGRES_USER as fallback for DB_USER', async () => {
      delete process.env.DATABASE_URL;
      delete process.env.DB_USER;
      process.env.DB_NAME = 'test-db';
      process.env.POSTGRES_USER = 'postgres-user';
      process.env.DB_PASSWORD = 'test-pass';
      
      const { getDatabaseUrl } = await import('./config.js');
      const result = getDatabaseUrl();
      
      expect(result).toBe('postgresql://postgres-user:test-pass@localhost:5432/test-db');
    });

    it('should use POSTGRES_PASSWORD as fallback for DB_PASSWORD', async () => {
      delete process.env.DATABASE_URL;
      delete process.env.DB_PASSWORD;
      process.env.DB_NAME = 'test-db';
      process.env.DB_USER = 'test-user';
      process.env.POSTGRES_PASSWORD = 'postgres-pass';
      
      const { getDatabaseUrl } = await import('./config.js');
      const result = getDatabaseUrl();
      
      expect(result).toBe('postgresql://test-user:postgres-pass@localhost:5432/test-db');
    });

    it('should throw error when DATABASE_URL is empty', async () => {
      process.env.DATABASE_URL = '';
      
      const { getDatabaseUrl } = await import('./config.js');
      
      expect(() => getDatabaseUrl()).toThrow('Database configuration missing');
    });

    it('should throw error when DATABASE_URL is only whitespace', async () => {
      process.env.DATABASE_URL = '   ';
      
      const { getDatabaseUrl } = await import('./config.js');
      
      expect(() => getDatabaseUrl()).toThrow('Database configuration missing');
    });

    it('should throw error when DB_NAME is missing', async () => {
      delete process.env.DATABASE_URL;
      delete process.env.DB_NAME;
      delete process.env.POSTGRES_DB;
      process.env.DB_USER = 'test-user';
      process.env.DB_PASSWORD = 'test-pass';
      
      const { getDatabaseUrl } = await import('./config.js');
      
      expect(() => getDatabaseUrl()).toThrow('Database configuration missing. Provide DATABASE_URL or DB_NAME');
    });

    it('should throw error when DB_USER is missing', async () => {
      delete process.env.DATABASE_URL;
      delete process.env.DB_USER;
      delete process.env.POSTGRES_USER;
      process.env.DB_NAME = 'test-db';
      process.env.DB_PASSWORD = 'test-pass';
      
      const { getDatabaseUrl } = await import('./config.js');
      
      expect(() => getDatabaseUrl()).toThrow('Database configuration missing. Provide DATABASE_URL or DB_USER');
    });

    it('should throw error when DB_PASSWORD is missing', async () => {
      delete process.env.DATABASE_URL;
      delete process.env.DB_PASSWORD;
      delete process.env.POSTGRES_PASSWORD;
      process.env.DB_NAME = 'test-db';
      process.env.DB_USER = 'test-user';
      
      const { getDatabaseUrl } = await import('./config.js');
      
      expect(() => getDatabaseUrl()).toThrow('Database configuration missing. Provide DATABASE_URL or DB_PASSWORD');
    });

    it('should throw error with multiple missing variables', async () => {
      delete process.env.DATABASE_URL;
      delete process.env.DB_NAME;
      delete process.env.DB_USER;
      delete process.env.DB_PASSWORD;
      delete process.env.POSTGRES_DB;
      delete process.env.POSTGRES_USER;
      delete process.env.POSTGRES_PASSWORD;
      
      const { getDatabaseUrl } = await import('./config.js');
      
      expect(() => getDatabaseUrl()).toThrow('Database configuration missing. Provide DATABASE_URL or DB_NAME, DB_USER, DB_PASSWORD');
    });

    it('should handle special characters in password', async () => {
      delete process.env.DATABASE_URL;
      process.env.DB_HOST = 'localhost';
      process.env.DB_PORT = '5432';
      process.env.DB_NAME = 'test-db';
      process.env.DB_USER = 'test-user';
      process.env.DB_PASSWORD = 'pass@word!123';
      
      const { getDatabaseUrl } = await import('./config.js');
      const result = getDatabaseUrl();
      
      expect(result).toBe('postgresql://test-user:pass@word!123@localhost:5432/test-db');
    });

    it('should handle special characters in username', async () => {
      delete process.env.DATABASE_URL;
      process.env.DB_HOST = 'localhost';
      process.env.DB_PORT = '5432';
      process.env.DB_NAME = 'test-db';
      process.env.DB_USER = 'user@domain';
      process.env.DB_PASSWORD = 'test-pass';
      
      const { getDatabaseUrl } = await import('./config.js');
      const result = getDatabaseUrl();
      
      expect(result).toBe('postgresql://user@domain:test-pass@localhost:5432/test-db');
    });

    it('should handle custom host and port', async () => {
      delete process.env.DATABASE_URL;
      process.env.DB_HOST = 'db.example.com';
      process.env.DB_PORT = '5433';
      process.env.DB_NAME = 'test-db';
      process.env.DB_USER = 'test-user';
      process.env.DB_PASSWORD = 'test-pass';
      
      const { getDatabaseUrl } = await import('./config.js');
      const result = getDatabaseUrl();
      
      expect(result).toBe('postgresql://test-user:test-pass@db.example.com:5433/test-db');
    });
  });
});