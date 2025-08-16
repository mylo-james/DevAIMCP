import { describe, it, expect } from 'vitest';
import { generateEmbedding } from '../lib/database.ts';

describe('Embeddings API', () => {
	it('passes vectors to DB client (mock)', async () => {
		const fake = {
			embeddings: {
				create: async () => ({ data: [{ embedding: [0.1, 0.2, 0.3] }] }),
			},
		};
		const vec = await generateEmbedding('hello', fake as any);
		expect(Array.isArray(vec)).toBe(true);
		expect(vec.length).toBe(3);
	});
});