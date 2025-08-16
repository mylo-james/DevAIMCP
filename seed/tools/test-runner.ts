import { exec as _exec } from 'child_process';
import { promisify } from 'util';
const exec = promisify(_exec);

export async function runTests(test_type?: string, pattern?: string, watch?: boolean) {
  const args = ['vitest'];
  if (!watch) args.push('run');
  if (pattern) args.push(pattern);
  const cmd = args.join(' ');
  if (process.env.NODE_ENV === 'test') {
    return { content: [{ type: 'text', text: `SIMULATED:${cmd}` }] };
  }
  try {
    const { stdout } = await exec(cmd);
    return { content: [{ type: 'text', text: stdout }] };
  } catch (e: any) {
    return { content: [{ type: 'text', text: e?.stdout || String(e) }] };
  }
}
