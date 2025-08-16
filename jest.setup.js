// Jest setup file
import { config } from 'dotenv';

// Load environment variables for tests
config({ path: '.env.test' });

// Set test environment variables if not already set
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test_db';

// Global test timeout
setTimeout(() => {}, 10000);

// Suppress console.log during tests unless explicitly needed
const originalConsoleLog = console.log;
beforeAll(() => {
  console.log = jest.fn();
});

afterAll(() => {
  console.log = originalConsoleLog;
});
