import { describe, it, expect } from 'vitest';

describe('Imports wiring', () => {
	it('server can import seed modules with .ts extensions', async () => {
		const imports = [
			() => import('../tools/project-manager.ts'),
			() => import('../tools/memory-manager.ts'),
			() => import('../tools/data-exporter.ts'),
			() => import('../lib/policy-engine.ts'),
			() => import('../lib/agent-context.ts'),
			() => import('../tools/shard-doc.ts'),
			() => import('../tools/story-manager.ts'),
			() => import('../tools/workflow-executor.ts'),
			() => import('../tools/git-workflow.ts'),
			() => import('../tools/test-runner.ts'),
			() => import('../lib/database.ts'),
		];
		for (const fn of imports) {
			const mod = await fn();
			expect(mod).toBeTruthy();
		}
	});
});