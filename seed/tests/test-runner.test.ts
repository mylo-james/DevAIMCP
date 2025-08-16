import { describe, it, expect } from 'vitest';
import { runTests } from '../tools/test-runner.ts';

describe('Test runner', () => {
  it('runs vitest run with pattern (simulated)', async () => {
    const res = await runTests('unit', 'tests/*.test.ts', false);
    expect(res.content[0].text).toContain('SIMULATED:vitest run tests/*.test.ts');
  });
});
