import { describe, it, expect } from 'vitest';
import { handleCallTool } from '../index.ts';

process.env.MCP_TEST = '1';

describe('DEVAI-8: CallTool routing', () => {
	it('routes project create', async () => {
		const res = await handleCallTool('devai_project_create', { name: 'Demo' });
		expect(res).toHaveProperty('content');
	});
	it('routes memory store', async () => {
		const res = await handleCallTool('devai_memory_store', { projectId: 1, memoryType: 'decision', content: 'x' });
		expect(res).toHaveProperty('content');
	});
	it('returns error on unknown tool', async () => {
		await expect(handleCallTool('unknown_tool', {})).rejects.toThrow();
	});
});