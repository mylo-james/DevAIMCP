import { readFile } from 'fs/promises';
import path from 'path';
export const resources = [
    {
        uri: 'devai://policy',
        name: 'DevAI Policy',
        description: 'Core DevAI policy document that must be followed',
        mimeType: 'text/markdown',
        handler: async () => {
            const policyPath = path.resolve(process.cwd(), 'policy.md');
            return await readFile(policyPath, 'utf8');
        },
    },
    {
        uri: 'devai://knowledge-base',
        name: 'DevAI Knowledge Base',
        description: 'Comprehensive DevAI knowledge base and documentation',
        mimeType: 'text/markdown',
        handler: async () => {
            const kbPath = path.resolve(process.cwd(), 'data', 'kb.md');
            return await readFile(kbPath, 'utf8');
        },
    },
    {
        uri: 'devai://core-config',
        name: 'DevAI Core Configuration',
        description: 'Core configuration for DevAI project structure',
        mimeType: 'text/yaml',
        handler: async () => {
            const configPath = path.resolve(process.cwd(), 'core-config.yaml');
            return await readFile(configPath, 'utf8');
        },
    },
    {
        uri: 'devai://templates',
        name: 'DevAI Templates',
        description: 'Collection of DevAI templates for document creation',
        mimeType: 'text/yaml',
        handler: async () => {
            const templatesDir = path.resolve(process.cwd(), 'templates');
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
            const workflowsDir = path.resolve(process.cwd(), 'workflows');
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
            const agentsDir = path.resolve(process.cwd(), 'agents');
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
            const tasksDir = path.resolve(process.cwd(), 'tasks');
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
            const checklistsDir = path.resolve(process.cwd(), 'checklists');
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
            const prefsPath = path.resolve(process.cwd(), 'data', 'technical-preferences.md');
            return await readFile(prefsPath, 'utf8');
        },
    },
    {
        uri: 'devai://manifest',
        name: 'DevAI Tools Manifest',
        description: 'Manifest of available DevAI tools',
        mimeType: 'application/json',
        handler: async () => {
            const manifestPath = path.resolve(process.cwd(), 'tools', 'manifest.json');
            return await readFile(manifestPath, 'utf8');
        },
    },
];
