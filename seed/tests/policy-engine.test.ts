import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as db from '../lib/database.ts';
import { validatePolicy } from '../lib/policy-engine.ts';

describe('Policy engine (unit, mocked DB)', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('denies actions listed in deny_actions', async () => {
    vi.spyOn(db, 'query').mockResolvedValue({
      rows: [{ name: 'deny', rules: { deny_actions: ['delete_project'] }, active: true }],
    } as any);
    const res = await validatePolicy('delete_project', 'ctx', 'dev');
    expect(res.content[0].text).toMatch(/denied/);
  });

  it('allows actions when not denied and agent allowed', async () => {
    vi.spyOn(db, 'query').mockResolvedValue({
      rows: [{ name: 'allow-dev', rules: { allow_agents: ['dev'] }, active: true }],
    } as any);
    const res = await validatePolicy('create_project', 'ctx', 'dev');
    expect(res.content[0].text).toBe('allowed');
  });

  it('requires context when context_required is true', async () => {
    vi.spyOn(db, 'query').mockResolvedValue({
      rows: [{ name: 'require-context', rules: { context_required: true }, active: true }],
    } as any);
    const res = await validatePolicy('anything');
    expect(res.content[0].text).toMatch(/denied/);
  });
});
