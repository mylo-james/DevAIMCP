import { describe, it, expect } from 'vitest';
import { loadDatabaseConfig } from '../lib/config.ts';

describe('DEVAI-7: Env config loader', () => {
	it('uses DATABASE_URL when present', () => {
		const cfg = loadDatabaseConfig({ DATABASE_URL: 'postgresql://u:p@h:5432/db' } as any);
		expect(cfg.connectionString).toContain('postgresql://');
	});
	it('builds from DB_* when DATABASE_URL absent', () => {
		const cfg = loadDatabaseConfig({ DB_HOST: 'h', DB_PORT: '5433', DB_NAME: 'db', DB_USER: 'u', DB_PASSWORD: 'p' } as any);
		expect(cfg.connectionString).toBe('postgresql://u:p@h:5433/db');
	});
	it('throws when missing', () => {
		expect(() => loadDatabaseConfig({} as any)).toThrow();
	});
});