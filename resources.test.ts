/**
 * Resources module tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFile, readdir } from 'fs/promises';
import path from 'path';
import { resources, type MCPResource } from './resources.js';

// Mock fs/promises
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  readdir: vi.fn(),
}));

// Mock path
vi.mock('path', () => ({
  default: {
    resolve: vi.fn(),
    join: vi.fn(),
  },
  resolve: vi.fn(),
  join: vi.fn(),
}));

describe('Resources Module', () => {
  const mockReadFile = readFile as vi.MockedFunction<typeof readFile>;
  const mockReaddir = readdir as vi.MockedFunction<typeof readdir>;
  const mockPathResolve = path.resolve as vi.MockedFunction<typeof path.resolve>;
  const mockPathJoin = path.join as vi.MockedFunction<typeof path.join>;

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock process.cwd to return a predictable value
    vi.spyOn(process, 'cwd').mockReturnValue('/workspace');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('MCPResource interface', () => {
    it('should have correct structure', () => {
      const resource: MCPResource = {
        uri: 'test://uri',
        name: 'Test Resource',
        description: 'Test description',
        mimeType: 'text/plain',
        handler: async () => 'test content',
      };

      expect(resource).toBeDefined();
      expect(typeof resource.uri).toBe('string');
      expect(typeof resource.name).toBe('string');
      expect(typeof resource.description).toBe('string');
      expect(typeof resource.mimeType).toBe('string');
      expect(typeof resource.handler).toBe('function');
    });
  });

  describe('resources array', () => {
    it('should contain all expected resources', () => {
      const expectedUris = [
        'devai://policy',
        'devai://knowledge-base',
        'devai://core-config',
        'devai://templates',
        'devai://workflows',
        'devai://agents',
        'devai://tasks',
        'devai://checklists',
        'devai://technical-preferences',
        'devai://manifest',
      ];

      expect(resources).toHaveLength(expectedUris.length);
      resources.forEach((resource, index) => {
        expect(resource.uri).toBe(expectedUris[index]);
      });
    });

    it('should have valid resource structure', () => {
      resources.forEach((resource) => {
        expect(resource).toHaveProperty('uri');
        expect(resource).toHaveProperty('name');
        expect(resource).toHaveProperty('description');
        expect(resource).toHaveProperty('mimeType');
        expect(resource).toHaveProperty('handler');
        expect(typeof resource.uri).toBe('string');
        expect(typeof resource.name).toBe('string');
        expect(typeof resource.description).toBe('string');
        expect(typeof resource.mimeType).toBe('string');
        expect(typeof resource.handler).toBe('function');
      });
    });

    it('should have unique URIs', () => {
      const uris = resources.map((r) => r.uri);
      const uniqueUris = new Set(uris);
      expect(uris).toHaveLength(uniqueUris.size);
    });
  });

  describe('policy resource', () => {
    it('should have correct configuration', () => {
      const policyResource = resources.find((r) => r.uri === 'devai://policy');
      expect(policyResource).toBeDefined();
      expect(policyResource?.name).toBe('DevAI Policy');
      expect(policyResource?.description).toBe('Core DevAI policy document that must be followed');
      expect(policyResource?.mimeType).toBe('text/markdown');
    });

    it('should read policy file correctly', async () => {
      const policyResource = resources.find((r) => r.uri === 'devai://policy');
      expect(policyResource).toBeDefined();

      const mockContent = '# DevAI Policy\n\nThis is the policy content.';
      mockReadFile.mockResolvedValue(mockContent);
      mockPathResolve.mockReturnValue('/workspace/policy.md');

      const result = await policyResource?.handler();
      expect(result).toBeDefined();

      expect(mockPathResolve).toHaveBeenCalledWith('/workspace', 'policy.md');
      expect(mockReadFile).toHaveBeenCalledWith('/workspace/policy.md', 'utf8');
      expect(result).toBe(mockContent);
    });
  });

  describe('knowledge-base resource', () => {
    it('should have correct configuration', () => {
      const kbResource = resources.find((r) => r.uri === 'devai://knowledge-base');
      expect(kbResource).toBeDefined();
      expect(kbResource?.name).toBe('DevAI Knowledge Base');
      expect(kbResource?.description).toBe('Comprehensive DevAI knowledge base and documentation');
      expect(kbResource?.mimeType).toBe('text/markdown');
    });

    it('should read knowledge base file correctly', async () => {
      const kbResource = resources.find((r) => r.uri === 'devai://knowledge-base');
      expect(kbResource).toBeDefined();

      const mockContent = '# DevAI Knowledge Base\n\nThis is the KB content.';
      mockReadFile.mockResolvedValue(mockContent);
      mockPathResolve.mockReturnValue('/workspace/data/kb.md');

      const result = await kbResource?.handler();
      expect(result).toBeDefined();

      expect(mockPathResolve).toHaveBeenCalledWith('/workspace', 'data', 'kb.md');
      expect(mockReadFile).toHaveBeenCalledWith('/workspace/data/kb.md', 'utf8');
      expect(result).toBe(mockContent);
    });
  });

  describe('core-config resource', () => {
    it('should have correct configuration', () => {
      const configResource = resources.find((r) => r.uri === 'devai://core-config');
      expect(configResource).toBeDefined();
      expect(configResource?.name).toBe('DevAI Core Configuration');
      expect(configResource?.description).toBe('Core configuration for DevAI project structure');
      expect(configResource?.mimeType).toBe('text/yaml');
    });

    it('should read core config file correctly', async () => {
      const configResource = resources.find((r) => r.uri === 'devai://core-config');
      expect(configResource).toBeDefined();

      const mockContent = 'config:\n  version: 1.0';
      mockReadFile.mockResolvedValue(mockContent);
      mockPathResolve.mockReturnValue('/workspace/core-config.yaml');

      const result = await configResource?.handler();
      expect(result).toBeDefined();

      expect(mockPathResolve).toHaveBeenCalledWith('/workspace', 'core-config.yaml');
      expect(mockReadFile).toHaveBeenCalledWith('/workspace/core-config.yaml', 'utf8');
      expect(result).toBe(mockContent);
    });
  });

  describe('templates resource', () => {
    it('should have correct configuration', () => {
      const templatesResource = resources.find((r) => r.uri === 'devai://templates');
      expect(templatesResource).toBeDefined();
      expect(templatesResource?.name).toBe('DevAI Templates');
      expect(templatesResource?.description).toBe('Collection of DevAI templates for document creation');
      expect(templatesResource?.mimeType).toBe('text/yaml');
    });

    it('should read templates directory and files correctly', async () => {
      const templatesResource = resources.find((r) => r.uri === 'devai://templates');
      expect(templatesResource).toBeDefined();

      const mockFiles = ['template1.yaml', 'template2.yaml', 'readme.md'];
      const mockTemplate1Content = 'template1:\n  name: Test Template 1';
      const mockTemplate2Content = 'template2:\n  name: Test Template 2';

      mockReaddir.mockResolvedValue(mockFiles);
      mockPathResolve.mockReturnValue('/workspace/templates');
      mockPathJoin
        .mockReturnValueOnce('/workspace/templates/template1.yaml')
        .mockReturnValueOnce('/workspace/templates/template2.yaml');
             mockReadFile
         .mockResolvedValueOnce(mockTemplate1Content)
         .mockResolvedValueOnce(mockTemplate2Content);

       const result = await templatesResource?.handler();
       expect(result).toBeDefined();

      expect(mockPathResolve).toHaveBeenCalledWith('/workspace', 'templates');
      expect(mockReaddir).toHaveBeenCalledWith('/workspace/templates');
      expect(mockPathJoin).toHaveBeenCalledWith('/workspace/templates', 'template1.yaml');
      expect(mockPathJoin).toHaveBeenCalledWith('/workspace/templates', 'template2.yaml');
      expect(mockReadFile).toHaveBeenCalledWith('/workspace/templates/template1.yaml', 'utf8');
      expect(mockReadFile).toHaveBeenCalledWith('/workspace/templates/template2.yaml', 'utf8');

      expect(result).toContain('# DevAI Templates');
      expect(result).toContain('## template1.yaml');
      expect(result).toContain('## template2.yaml');
      expect(result).toContain('template1:\n  name: Test Template 1');
      expect(result).toContain('template2:\n  name: Test Template 2');
      expect(result).not.toContain('readme.md'); // Should filter out non-yaml files
    });

    it('should handle empty templates directory', async () => {
      const templatesResource = resources.find((r) => r.uri === 'devai://templates');
      expect(templatesResource).toBeDefined();

      mockReaddir.mockResolvedValue([]);
      mockPathResolve.mockReturnValue('/workspace/templates');

             const result = await templatesResource?.handler();
       expect(result).toBeDefined();

       expect(result).toBe('# DevAI Templates\n\n');
    });

    it('should filter out non-yaml files', async () => {
      const templatesResource = resources.find((r) => r.uri === 'devai://templates');
      expect(templatesResource).toBeDefined();

      const mockFiles = ['template.yaml', 'readme.md', 'config.json'];
      mockReaddir.mockResolvedValue(mockFiles);
      mockPathResolve.mockReturnValue('/workspace/templates');
      mockPathJoin.mockReturnValue('/workspace/templates/template.yaml');
      mockReadFile.mockResolvedValue('template content');

             const result = await templatesResource?.handler();
       expect(result).toBeDefined();

      expect(mockPathJoin).toHaveBeenCalledTimes(1); // Only for template.yaml
      expect(mockReadFile).toHaveBeenCalledTimes(1); // Only for template.yaml
      expect(result).toContain('## template.yaml');
      expect(result).not.toContain('readme.md');
      expect(result).not.toContain('config.json');
    });
  });

  describe('workflows resource', () => {
    it('should have correct configuration', () => {
      const workflowsResource = resources.find((r) => r.uri === 'devai://workflows');
      expect(workflowsResource).toBeDefined();
      expect(workflowsResource?.name).toBe('DevAI Workflows');
      expect(workflowsResource?.description).toBe('Collection of DevAI workflow definitions');
      expect(workflowsResource?.mimeType).toBe('text/yaml');
    });

    it('should read workflows directory and files correctly', async () => {
      const workflowsResource = resources.find((r) => r.uri === 'devai://workflows');
      expect(workflowsResource).toBeDefined();

      const mockFiles = ['workflow1.yaml', 'workflow2.yaml', 'readme.md'];
      const mockWorkflow1Content = 'workflow1:\n  steps: []';
      const mockWorkflow2Content = 'workflow2:\n  steps: []';

      mockReaddir.mockResolvedValue(mockFiles);
      mockPathResolve.mockReturnValue('/workspace/workflows');
      mockPathJoin
        .mockReturnValueOnce('/workspace/workflows/workflow1.yaml')
        .mockReturnValueOnce('/workspace/workflows/workflow2.yaml');
             mockReadFile
         .mockResolvedValueOnce(mockWorkflow1Content)
         .mockResolvedValueOnce(mockWorkflow2Content);

       const result = await workflowsResource?.handler();
       expect(result).toBeDefined();

      expect(mockPathResolve).toHaveBeenCalledWith('/workspace', 'workflows');
      expect(mockReaddir).toHaveBeenCalledWith('/workspace/workflows');
      expect(mockPathJoin).toHaveBeenCalledWith('/workspace/workflows', 'workflow1.yaml');
      expect(mockPathJoin).toHaveBeenCalledWith('/workspace/workflows', 'workflow2.yaml');
      expect(mockReadFile).toHaveBeenCalledWith('/workspace/workflows/workflow1.yaml', 'utf8');
      expect(mockReadFile).toHaveBeenCalledWith('/workspace/workflows/workflow2.yaml', 'utf8');

      expect(result).toContain('# DevAI Workflows');
      expect(result).toContain('## workflow1.yaml');
      expect(result).toContain('## workflow2.yaml');
      expect(result).toContain('workflow1:\n  steps: []');
      expect(result).toContain('workflow2:\n  steps: []');
      expect(result).not.toContain('readme.md'); // Should filter out non-yaml files
    });

    it('should handle empty workflows directory', async () => {
      const workflowsResource = resources.find((r) => r.uri === 'devai://workflows');
      expect(workflowsResource).toBeDefined();

      mockReaddir.mockResolvedValue([]);
      mockPathResolve.mockReturnValue('/workspace/workflows');

             const result = await workflowsResource?.handler();
       expect(result).toBeDefined();

       expect(result).toBe('# DevAI Workflows\n\n');
    });
  });

  describe('agents resource', () => {
    it('should have correct configuration', () => {
      const agentsResource = resources.find((r) => r.uri === 'devai://agents');
      expect(agentsResource).toBeDefined();
      expect(agentsResource?.name).toBe('DevAI Agents');
      expect(agentsResource?.description).toBe('Collection of DevAI agent definitions');
      expect(agentsResource?.mimeType).toBe('text/markdown');
    });

    it('should read agents directory and files correctly', async () => {
      const agentsResource = resources.find((r) => r.uri === 'devai://agents');
      expect(agentsResource).toBeDefined();

      const mockFiles = ['agent1.md', 'agent2.md', 'config.json'];
      const mockAgent1Content = '# Agent 1\n\nThis is agent 1.';
      const mockAgent2Content = '# Agent 2\n\nThis is agent 2.';

      mockReaddir.mockResolvedValue(mockFiles);
      mockPathResolve.mockReturnValue('/workspace/agents');
      mockPathJoin
        .mockReturnValueOnce('/workspace/agents/agent1.md')
        .mockReturnValueOnce('/workspace/agents/agent2.md');
             mockReadFile
         .mockResolvedValueOnce(mockAgent1Content)
         .mockResolvedValueOnce(mockAgent2Content);

       const result = await agentsResource?.handler();
       expect(result).toBeDefined();

      expect(mockPathResolve).toHaveBeenCalledWith('/workspace', 'agents');
      expect(mockReaddir).toHaveBeenCalledWith('/workspace/agents');
      expect(mockPathJoin).toHaveBeenCalledWith('/workspace/agents', 'agent1.md');
      expect(mockPathJoin).toHaveBeenCalledWith('/workspace/agents', 'agent2.md');
      expect(mockReadFile).toHaveBeenCalledWith('/workspace/agents/agent1.md', 'utf8');
      expect(mockReadFile).toHaveBeenCalledWith('/workspace/agents/agent2.md', 'utf8');

      expect(result).toContain('# DevAI Agents');
      expect(result).toContain('## agent1.md');
      expect(result).toContain('## agent2.md');
      expect(result).toContain('# Agent 1\n\nThis is agent 1.');
      expect(result).toContain('# Agent 2\n\nThis is agent 2.');
      expect(result).not.toContain('config.json'); // Should filter out non-md files
    });

    it('should handle empty agents directory', async () => {
      const agentsResource = resources.find((r) => r.uri === 'devai://agents');
      expect(agentsResource).toBeDefined();

      mockReaddir.mockResolvedValue([]);
      mockPathResolve.mockReturnValue('/workspace/agents');

             const result = await agentsResource?.handler();
       expect(result).toBeDefined();

       expect(result).toBe('# DevAI Agents\n\n');
    });

    it('should filter out non-markdown files', async () => {
      const agentsResource = resources.find((r) => r.uri === 'devai://agents');
      expect(agentsResource).toBeDefined();

      const mockFiles = ['agent.md', 'readme.txt', 'config.json'];
      mockReaddir.mockResolvedValue(mockFiles);
      mockPathResolve.mockReturnValue('/workspace/agents');
      mockPathJoin.mockReturnValue('/workspace/agents/agent.md');
      mockReadFile.mockResolvedValue('agent content');

             const result = await agentsResource?.handler();
       expect(result).toBeDefined();

      expect(mockPathJoin).toHaveBeenCalledTimes(1); // Only for agent.md
      expect(mockReadFile).toHaveBeenCalledTimes(1); // Only for agent.md
      expect(result).toContain('## agent.md');
      expect(result).not.toContain('readme.txt');
      expect(result).not.toContain('config.json');
    });
  });

  describe('error handling', () => {
    it('should handle file read errors gracefully', async () => {
      const policyResource = resources.find((r) => r.uri === 'devai://policy');
      expect(policyResource).toBeDefined();

      const mockError = new Error('File not found');
      mockReadFile.mockRejectedValue(mockError);
      mockPathResolve.mockReturnValue('/workspace/policy.md');

             expect(policyResource).toBeDefined();
       await expect(policyResource?.handler()).rejects.toThrow('File not found');
    });

    it('should handle directory read errors gracefully', async () => {
      const templatesResource = resources.find((r) => r.uri === 'devai://templates');
      expect(templatesResource).toBeDefined();

      const mockError = new Error('Directory not found');
      mockReaddir.mockRejectedValue(mockError);
      mockPathResolve.mockReturnValue('/workspace/templates');

             expect(templatesResource).toBeDefined();
       await expect(templatesResource?.handler()).rejects.toThrow('Directory not found');
    });
  });
});