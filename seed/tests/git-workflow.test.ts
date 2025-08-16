import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeGitWorkflow } from '../tools/git-workflow.ts';

describe('Git workflow', () => {
	it('creates branch with name (simulated in test env)', async () => {
		const res = await executeGitWorkflow('branch', { branch_name: 'feat/x' });
		expect(res.content[0].text).toBe('branch:feat/x');
	});

	it('commits with message (simulated in test env)', async () => {
		const res = await executeGitWorkflow('commit', { message: 'msg' });
		expect(res.content[0].text).toBe('commit:msg');
	});
});