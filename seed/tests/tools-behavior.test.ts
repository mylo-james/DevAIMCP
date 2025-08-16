import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as db from '../lib/database.ts';
import { manageProject } from '../tools/project-manager.ts';
import { manageMemory } from '../tools/memory-manager.ts';
import { manageStory } from '../tools/story-manager.ts';

describe('Tool behaviors (unit, mocked DB)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('project create returns JSON', async () => {
    vi.spyOn(db, 'createProject').mockResolvedValue({
      id: 123,
      name: 'Test',
      description: null as any,
      repository_url: null as any,
      language: null as any,
      framework: null as any,
      metadata: null as any,
      created_at: '' as any,
      updated_at: '' as any,
    });
    const res = await manageProject({ action: 'create', name: 'Test' });
    expect(JSON.parse(res.content[0].text).name).toBe('Test');
  });

  it('memory store uses embeddings client and persists', async () => {
    const fakeEmbedding = new Array(1536).fill(0);
    vi.spyOn(db, 'generateEmbedding').mockResolvedValue(fakeEmbedding);
    vi.spyOn(db, 'storeMemory').mockResolvedValue({
      id: 1,
      project_id: 1,
      memory_type: 'insight',
      content: 'abc',
      context: null,
      reasoning: null,
      confidence: null,
      tags: null,
      embedding: fakeEmbedding,
      created_at: '' as any,
      updated_at: '' as any,
    });
    const res = await manageMemory({
      action: 'store',
      projectId: 1,
      memoryType: 'insight',
      content: 'abc',
    });
    expect(res.content[0].text).toBe('stored');
  });

  it('story create returns JSON', async () => {
    vi.spyOn(db, 'createStory').mockResolvedValue({
      id: 5,
      project_id: 1,
      title: 'S',
      description: null as any,
      acceptance_criteria: null as any,
      story_points: null as any,
      priority: null as any,
      status: 'todo',
      created_at: '' as any,
      updated_at: '' as any,
    });
    const res = await manageStory({
      action: 'create',
      projectId: 1,
      title: 'S',
    });
    expect(JSON.parse(res.content[0].text).title).toBe('S');
  });
});
