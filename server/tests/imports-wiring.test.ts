import { describe, it, expect } from 'vitest';

process.env.MCP_TEST = '1';

describe('DEVAI-3: Import wiring between server and seed', () => {
	it('imports server index without throwing (seed ts imports resolve)', async () => {
		await import('../index.ts');
		expect(true).toBe(true);
	});
});