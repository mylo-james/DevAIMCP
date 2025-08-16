import 'dotenv/config';

export interface DatabaseConfig {
  url: string;
}

export function getDatabaseUrl(): string {
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0) {
    return process.env.DATABASE_URL;
  }

  const host = process.env.DB_HOST || 'localhost';
  const port = process.env.DB_PORT || '5432';
  const name = process.env.DB_NAME || process.env.POSTGRES_DB;
  const user = process.env.DB_USER || process.env.POSTGRES_USER;
  const password = process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD;

  if (!name || !user || !password) {
    const missing: string[] = [];
    if (!name) missing.push('DB_NAME');
    if (!user) missing.push('DB_USER');
    if (!password) missing.push('DB_PASSWORD');
    throw new Error(
      `Database configuration missing. Provide DATABASE_URL or ${missing.join(', ')}.`
    );
  }

  return `postgresql://${user}:${password}@${host}:${port}/${name}`;
}
