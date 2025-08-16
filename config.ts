// DevAI MCP Server Configuration
export const config = {
  // Server configuration
  NODE_ENV: process.env.NODE_ENV || 'development',
  DEVAI_SEED_BUILD: process.env.DEVAI_SEED_BUILD || 'ts',
  
  // Database configuration (optional)
  DATABASE_URL: process.env.DATABASE_URL,
  
  // OpenAI configuration (optional)
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  
  // MCP Server configuration
  MCP_SERVER_PORT: process.env.MCP_SERVER_PORT || 3000,
  
  // Feature flags
  ENABLE_DATABASE: !!process.env.DATABASE_URL,
  ENABLE_OPENAI: !!process.env.OPENAI_API_KEY,
};

// Helper function to check if database is available
export function isDatabaseAvailable(): boolean {
  return config.ENABLE_DATABASE;
}

// Helper function to check if OpenAI is available
export function isOpenAIAvailable(): boolean {
  return config.ENABLE_OPENAI;
}

