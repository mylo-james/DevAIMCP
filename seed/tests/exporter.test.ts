import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as db from '../lib/database.ts';
import { exportData } from '../tools/data-exporter.ts';

describe('Data exporter', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('summary returns project count', async () => {
    vi.spyOn(db, 'listProjects').mockResolvedValue([{} as any, {} as any]);
    const res = await exportData({ action: 'summary' });
    expect(JSON.parse(res.content[0].text).projects).toBe(2);
  });

  it('memories export supports csv and markdown', async () => {
    vi.spyOn(db, 'query').mockResolvedValue({ rows: [{ id: 1, content: 'x' }] } as any);
    const csv = await exportData({ action: 'memories', projectId: 1, format: 'csv' });
    expect(csv.content[0].text).toMatch(/id,content/);
    const md = await exportData({ action: 'memories', projectId: 1, format: 'markdown' });
    expect(md.content[0].text).toMatch(/\| id \| content \|/);
  });
});
