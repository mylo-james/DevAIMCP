import { describe, it, expect } from 'vitest';
import { resources } from '../resources.ts';

process.env.MCP_TEST = '1';

describe('DEVAI-2: Resource registration', () => {
	it('lists required resource URIs', async () => {
		const uris = resources.map((r) => r.uri);
		const expected = [
			'devai://policy',
			'devai://knowledge-base',
			'devai://templates',
			'devai://workflows',
			'devai://agents',
			'devai://tasks',
			'devai://checklists',
			'devai://technical-preferences',
			'devai://manifest',
		];
		for (const uri of expected) expect(uris).toContain(uri);
	});

	it('reads each registered resource (returns text)', async () => {
		for (const r of resources) {
			const text = await r.handler();
			expect(typeof text).toBe('string');
		}
	});
});