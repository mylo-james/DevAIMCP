import { exec as _exec } from 'child_process';
import { promisify } from 'util';
const exec = promisify(_exec);

export async function executeGitWorkflow(action: string, args: any) {
  switch (action) {
    case 'branch': {
      const name = args.branch_name || `devai/${Date.now()}`;
      if (process.env.NODE_ENV !== 'test') {
        await exec(`git checkout -b ${name}`);
      }
      return { content: [{ type: 'text', text: `branch:${name}` }] };
    }
    case 'commit': {
      const message = args.message || 'devai: automated commit';
      if (process.env.NODE_ENV !== 'test') {
        await exec('git add -A');
        await exec(`git commit -m "${message.replace(/"/g, '"')}"`);
      }
      return { content: [{ type: 'text', text: `commit:${message}` }] };
    }
    default:
      return { content: [{ type: 'text', text: `git:${action}` }] };
  }
}
