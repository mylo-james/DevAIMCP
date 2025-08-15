import { describe, it, expect } from 'vitest';
import { getDatabaseUrl } from '../lib/config.ts';

describe('Env config', () => {
	it('uses DATABASE_URL when present', () => {
		const prev = process.env.DATABASE_URL;
		process.env.DATABASE_URL = 'postgresql://u:p@h:5432/db';
		const url = getDatabaseUrl();
		expect(url).toBe('postgresql://u:p@h:5432/db');
		process.env.DATABASE_URL = prev;
	});

	it('falls back to DB_* when DATABASE_URL absent', () => {
		const prevs = {
			DATABASE_URL: process.env.DATABASE_URL,
			DB_HOST: process.env.DB_HOST,
			DB_PORT: process.env.DB_PORT,
			DB_NAME: process.env.DB_NAME,
			DB_USER: process.env.DB_USER,
			DB_PASSWORD: process.env.DB_PASSWORD,
		};
		delete process.env.DATABASE_URL;
		process.env.DB_HOST = 'localhost';
		process.env.DB_PORT = '5432';
		process.env.DB_NAME = 'db';
		process.env.DB_USER = 'u';
		process.env.DB_PASSWORD = 'p';
		const url = getDatabaseUrl();
		expect(url).toBe('postgresql://u:p@localhost:5432/db');
		Object.assign(process.env, prevs);
	});

	it('throws a clear error when missing envs', () => {
		const prevs = {
			DATABASE_URL: process.env.DATABASE_URL,
			DB_NAME: process.env.DB_NAME,
			DB_USER: process.env.DB_USER,
			DB_PASSWORD: process.env.DB_PASSWORD,
		};
		delete process.env.DATABASE_URL;
		delete process.env.DB_NAME;
		delete process.env.DB_USER;
		delete process.env.DB_PASSWORD;
		expect(() => getDatabaseUrl()).toThrowError(/Provide DATABASE_URL or/);
		Object.assign(process.env, prevs);
	});
});