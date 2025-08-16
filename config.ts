/**
 * DevAI MCP Server Configuration
 * Centralized configuration management with environment variable support
 */

export interface DevAIConfig {
  // Server configuration
  NODE_ENV: string;
  DEVAI_SEED_BUILD: string;
  
  // Database configuration
  DATABASE_URL?: string;
  
  // OpenAI configuration
  OPENAI_API_KEY?: string;
  
  // MCP Server configuration
  MCP_SERVER_PORT: number;
  
  // Feature flags
  ENABLE_DATABASE: boolean;
  ENABLE_OPENAI: boolean;
  
  // Logging configuration
  LOG_LEVEL: string;
  DEBUG: boolean;
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Partial<DevAIConfig> = {
  NODE_ENV: 'development',
  DEVAI_SEED_BUILD: 'ts',
  MCP_SERVER_PORT: 3000,
  LOG_LEVEL: 'info',
  DEBUG: false,
};

/**
 * Parse port number safely
 */
function parsePort(portStr: string | undefined): number {
  if (!portStr) return DEFAULT_CONFIG.MCP_SERVER_PORT!;
  const port = parseInt(portStr, 10);
  return isNaN(port) ? DEFAULT_CONFIG.MCP_SERVER_PORT! : port;
}

/**
 * Main configuration object
 */
export const config: DevAIConfig = {
  // Server configuration
  NODE_ENV: process.env.NODE_ENV || DEFAULT_CONFIG.NODE_ENV!,
  DEVAI_SEED_BUILD: process.env.DEVAI_SEED_BUILD || DEFAULT_CONFIG.DEVAI_SEED_BUILD!,
  
  // Database configuration
  DATABASE_URL: process.env.DATABASE_URL,
  
  // OpenAI configuration
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  
  // MCP Server configuration
  MCP_SERVER_PORT: parsePort(process.env.MCP_SERVER_PORT),
  
  // Feature flags
  ENABLE_DATABASE: !!process.env.DATABASE_URL,
  ENABLE_OPENAI: !!process.env.OPENAI_API_KEY,
  
  // Logging configuration
  LOG_LEVEL: process.env.LOG_LEVEL || DEFAULT_CONFIG.LOG_LEVEL!,
  DEBUG: process.env.DEBUG === 'true' || DEFAULT_CONFIG.DEBUG!,
};

/**
 * Helper function to check if database is available
 */
export function isDatabaseAvailable(): boolean {
  return config.ENABLE_DATABASE;
}

/**
 * Helper function to check if OpenAI is available
 */
export function isOpenAIAvailable(): boolean {
  return config.ENABLE_OPENAI;
}

/**
 * Helper function to check if we're in development mode
 */
export function isDevelopment(): boolean {
  return config.NODE_ENV === 'development';
}

/**
 * Helper function to check if we're in production mode
 */
export function isProduction(): boolean {
  return config.NODE_ENV === 'production';
}

/**
 * Helper function to get the current build mode
 */
export function getBuildMode(): string {
  return config.DEVAI_SEED_BUILD;
}

/**
 * Validate configuration
 */
export function validateConfig(): void {
  const errors: string[] = [];
  
  if (config.MCP_SERVER_PORT < 1 || config.MCP_SERVER_PORT > 65535) {
    errors.push('MCP_SERVER_PORT must be between 1 and 65535');
  }
  
  if (config.ENABLE_DATABASE && !config.DATABASE_URL) {
    errors.push('DATABASE_URL is required when database is enabled');
  }
  
  if (config.ENABLE_OPENAI && !config.OPENAI_API_KEY) {
    errors.push('OPENAI_API_KEY is required when OpenAI is enabled');
  }
  
  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
}

