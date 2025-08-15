import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export interface MCPResource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
  handler: () => Promise<string>;
}

function resolveFirstExisting(...candidates: string[]): string {
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  // Return first candidate to produce a helpful error if none exist
  return candidates[0];
}

function resolveDirFirstExisting(...dirs: string[]): string {
  return resolveFirstExisting(...dirs);
}

const serverRoot = process.cwd();
const seedRoot = path.resolve(serverRoot, '..', 'seed');

export const resources: MCPResource[] = [
  {
    uri: 'devai://policy',
    name: 'DevAI Policy',
    description: 'Core DevAI policy document that must be followed',
    mimeType: 'text/markdown',
    handler: async () => {
      const policyPath = resolveFirstExisting(
        path.resolve(serverRoot, 'policy.md'),
        path.resolve(seedRoot, 'policy.md')
      );
      return await readFile(policyPath, 'utf8');
    },
  },

  {
    uri: 'devai://knowledge-base',
    name: 'DevAI Knowledge Base',
    description: 'Comprehensive DevAI knowledge base and documentation',
    mimeType: 'text/markdown',
    handler: async () => {
      const kbPath = resolveFirstExisting(
        path.resolve(serverRoot, 'data', 'kb.md'),
        path.resolve(seedRoot, 'data', 'kb.md')
      );
      return await readFile(kbPath, 'utf8');
    },
  },

  {
    uri: 'devai://core-config',
    name: 'DevAI Core Configuration',
    description: 'Core configuration for DevAI project structure',
    mimeType: 'text/yaml',
    handler: async () => {
      const configPath = resolveFirstExisting(
        path.resolve(serverRoot, 'core-config.yaml'),
        path.resolve(seedRoot, 'core-config.yaml')
      );
      return await readFile(configPath, 'utf8');
    },
  },

  {
    uri: 'devai://templates',
    name: 'DevAI Templates',
    description: 'Collection of DevAI templates for document creation',
    mimeType: 'text/yaml',
    handler: async () => {
      const templatesDir = resolveDirFirstExisting(
        path.resolve(serverRoot, 'templates'),
        path.resolve(seedRoot, 'templates')
      );
      const { readdir } = await import('fs/promises');
      const files = await readdir(templatesDir);
      const templateFiles = files.filter((f) => f.endsWith('.yaml'));

      let content = '# DevAI Templates\n\n';
      for (const file of templateFiles) {
        const templatePath = path.join(templatesDir, file);
        const templateContent = await readFile(templatePath, 'utf8');
        content += `## ${file}\n\n\`\`\`yaml\n${templateContent}\n\`\`\`\n\n`;
      }

      return content;
    },
  },

  {
    uri: 'devai://workflows',
    name: 'DevAI Workflows',
    description: 'Collection of DevAI workflow definitions',
    mimeType: 'text/yaml',
    handler: async () => {
      const workflowsDir = resolveDirFirstExisting(
        path.resolve(serverRoot, 'workflows'),
        path.resolve(seedRoot, 'workflows')
      );
      const { readdir } = await import('fs/promises');
      const files = await readdir(workflowsDir);
      const workflowFiles = files.filter((f) => f.endsWith('.yaml'));

      let content = '# DevAI Workflows\n\n';
      for (const file of workflowFiles) {
        const workflowPath = path.join(workflowsDir, file);
        const workflowContent = await readFile(workflowPath, 'utf8');
        content += `## ${file}\n\n\`\`\`yaml\n${workflowContent}\n\`\`\`\n\n`;
      }

      return content;
    },
  },

  {
    uri: 'devai://agents',
    name: 'DevAI Agents',
    description: 'Collection of DevAI agent definitions',
    mimeType: 'text/markdown',
    handler: async () => {
      const agentsDir = resolveDirFirstExisting(
        path.resolve(serverRoot, 'agents'),
        path.resolve(seedRoot, 'agents')
      );
      const { readdir } = await import('fs/promises');
      const files = await readdir(agentsDir);
      const agentFiles = files.filter((f) => f.endsWith('.md'));

      let content = '# DevAI Agents\n\n';
      for (const file of agentFiles) {
        const agentPath = path.join(agentsDir, file);
        const agentContent = await readFile(agentPath, 'utf8');
        content += `## ${file}\n\n${agentContent}\n\n---\n\n`;
      }

      return content;
    },
  },

  {
    uri: 'devai://tasks',
    name: 'DevAI Tasks',
    description: 'Collection of DevAI task definitions',
    mimeType: 'text/markdown',
    handler: async () => {
      const tasksDir = resolveDirFirstExisting(
        path.resolve(serverRoot, 'tasks'),
        path.resolve(seedRoot, 'tasks')
      );
      const { readdir } = await import('fs/promises');
      const files = await readdir(tasksDir);
      const taskFiles = files.filter((f) => f.endsWith('.md'));

      let content = '# DevAI Tasks\n\n';
      for (const file of taskFiles) {
        const taskPath = path.join(tasksDir, file);
        const taskContent = await readFile(taskPath, 'utf8');
        content += `## ${file}\n\n${taskContent}\n\n---\n\n`;
      }

      return content;
    },
  },

  {
    uri: 'devai://checklists',
    name: 'DevAI Checklists',
    description: 'Collection of DevAI quality assurance checklists',
    mimeType: 'text/markdown',
    handler: async () => {
      const checklistsDir = resolveDirFirstExisting(
        path.resolve(serverRoot, 'checklists'),
        path.resolve(seedRoot, 'checklists')
      );
      const { readdir } = await import('fs/promises');
      const files = await readdir(checklistsDir);
      const checklistFiles = files.filter((f) => f.endsWith('.md'));

      let content = '# DevAI Checklists\n\n';
      for (const file of checklistFiles) {
        const checklistPath = path.join(checklistsDir, file);
        const checklistContent = await readFile(checklistPath, 'utf8');
        content += `## ${file}\n\n${checklistContent}\n\n---\n\n`;
      }

      return content;
    },
  },

  {
    uri: 'devai://technical-preferences',
    name: 'DevAI Technical Preferences',
    description: 'Technical preferences and standards for DevAI projects',
    mimeType: 'text/markdown',
    handler: async () => {
      const prefsPath = resolveFirstExisting(
        path.resolve(serverRoot, 'data', 'technical-preferences.md'),
        path.resolve(seedRoot, 'data', 'technical-preferences.md')
      );
      return await readFile(prefsPath, 'utf8');
    },
  },

  {
    uri: 'devai://manifest',
    name: 'DevAI Tools Manifest',
    description: 'Manifest of available DevAI tools',
    mimeType: 'application/json',
    handler: async () => {
      const manifestPath = resolveFirstExisting(
        path.resolve(serverRoot, 'tools', 'manifest.json'),
        path.resolve(seedRoot, 'tools', 'manifest.json')
      );
      return await readFile(manifestPath, 'utf8');
    },
  },
];
