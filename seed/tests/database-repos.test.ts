import { describe, it, expect, beforeAll } from 'vitest';
import { createProject, getProjectById, listProjects, storeMemory, semanticSearchMemories, createStory, listStories, updateStory, getStoryById } from '../lib/database.ts';

const run = process.env.INTEGRATION === 'true';

describe('Database repositories (integration)', () => {
	let projectId = 0;

	beforeAll(async () => {
		if (!run) return;
		const p = await createProject({ id: 0 as any, name: 'T', description: 'D', repository_url: null as any, language: null as any, framework: null as any, metadata: null as any, created_at: '' as any, updated_at: '' as any });
		projectId = p.id;
	});

	it('creates and lists projects', async () => {
		if (!run) return;
		const list = await listProjects();
		expect(Array.isArray(list)).toBe(true);
		expect(list.some((p) => p.id === projectId)).toBe(true);
		const fetched = await getProjectById(projectId);
		expect(fetched?.name).toBe('T');
	});

	it('stores memory and finds via semantic search', async () => {
		if (!run) return;
		const text = 'semantic memory test';
		const fakeEmbedding = new Array(1536).fill(0).map((_, i) => (i % 2 === 0 ? 0.1 : 0.2));
		await storeMemory({ id: 0 as any, project_id: projectId, memory_type: 'insight', content: text, context: 'ctx', reasoning: 'r', confidence: 0.9, tags: ['t'], embedding: fakeEmbedding, created_at: '' as any, updated_at: '' as any });
		const res = await semanticSearchMemories({ queryText: text, projectId, embedding: fakeEmbedding });
		expect(res.length).toBeGreaterThan(0);
		expect(res[0].memory.content).toContain('semantic');
	});

	it('creates and updates stories', async () => {
		if (!run) return;
		const s = await createStory({ id: 0 as any, project_id: projectId, title: 'A', description: 'B', acceptance_criteria: ['ok'], story_points: 3, priority: 'medium', status: 'todo', created_at: '' as any, updated_at: '' as any });
		expect(s.id).toBeTruthy();
		const up = await updateStory(s.id, { status: 'done' });
		expect(up?.status).toBe('done');
		const list = await listStories(projectId);
		expect(list.some((x) => x.id === s.id)).toBe(true);
		const got = await getStoryById(s.id);
		expect(got?.id).toBe(s.id);
	});
});