import { describe, it, expect } from 'vitest';
import { getAllTools } from '../index.ts';

// These tests only validate the tool list composition and do not connect stdio
process.env.MCP_TEST = '1';

describe('DEVAI-1: MCP consolidated tools list', () => {
	it('returns a single consolidated tool list containing required tools', async () => {
		const required = new Set([
			'devai_project_create',
			'devai_memory_store',
			'devai_policy_validate',
			'devai_workflow_execute',
			'devai_story_manage',
			'devai_git_workflow',
			'devai_test_run',
			'devai_data_export',
		]);

		const names = getAllTools();
		for (const name of required) {
			expect(names).toContain(name);
		}

		// Ensure no duplicates
		expect(new Set(names).size).toBe(names.length);
	});
});