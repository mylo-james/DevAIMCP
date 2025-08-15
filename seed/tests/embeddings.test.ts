import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('openai', () => {
	return {
		default: class MockOpenAI {
			public embeddings = { create: async () => ({ data: [{ embedding: [0.1, 0.2] }] }) };
			constructor(_: any) {}
		}
	};
});

import { createEmbedding } from '../lib/database.ts';

describe('DEVAI-6: Embeddings API', () => {
	it('createEmbedding throws when key missing', async () => {
		await expect(createEmbedding('x', '')).rejects.toThrow();
	});
	it('createEmbedding returns vector', async () => {
		const vec = await createEmbedding('hello', 'sk-test');
		expect(Array.isArray(vec)).toBe(true);
		expect(vec.length).toBe(2);
	});
});