/**
 * Resources module tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resources } from './resources.js';
import path from 'path';

// Mock fs/promises
vi.mock('fs/promises', () => ({
  readdir: vi.fn(),
  readFile: vi.fn(),
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
  let mockReaddir: any;
  let mockReadFile: any;
  let mockResolve: any;
  let mockJoin: any;

  beforeEach(async () => {
    const fsPromises = await import('fs/promises');
    mockReaddir = vi.mocked(fsPromises.readdir);
    mockReadFile = vi.mocked(fsPromises.readFile);
    mockResolve = vi.mocked(path.resolve);
    mockJoin = vi.mocked(path.join);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('resources array', () => {
    it('should contain all expected resources', () => {
      expect(resources).toHaveLength(10);
    });

    it('should have valid resource structure', () => {
      resources.forEach(resource => {
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
      const uris = resources.map(r => r.uri);
      const uniqueUris = new Set(uris);
      expect(uris).toHaveLength(uniqueUris.size);
    });
  });

  describe('DevAI Agents resource', () => {
    it('should handle agents directory listing', async () => {
      const agentsDir = '/test/agents';
      const agentFiles = ['agent1.md', 'agent2.md', 'ignore.txt'];
      const agentContent1 = '# Agent 1\n\nContent 1';
      const agentContent2 = '# Agent 2\n\nContent 2';

      mockResolve.mockReturnValue(agentsDir);
      mockReaddir.mockResolvedValue(agentFiles as any);
      mockJoin
        .mockReturnValueOnce('/test/agents/agent1.md')
        .mockReturnValueOnce('/test/agents/agent2.md');
      mockReadFile.mockResolvedValueOnce(agentContent1).mockResolvedValueOnce(agentContent2);

      const agentsResource = resources.find(r => r.uri === 'devai://agents');
      expect(agentsResource).toBeDefined();

      const result = await agentsResource!.handler();

      expect(mockResolve).toHaveBeenCalledWith(process.cwd(), 'agents');
      expect(mockReaddir).toHaveBeenCalledWith(agentsDir);
      expect(mockJoin).toHaveBeenCalledWith(agentsDir, 'agent1.md');
      expect(mockJoin).toHaveBeenCalledWith(agentsDir, 'agent2.md');
      expect(mockReadFile).toHaveBeenCalledWith('/test/agents/agent1.md', 'utf8');
      expect(mockReadFile).toHaveBeenCalledWith('/test/agents/agent2.md', 'utf8');
      expect(result).toContain('# DevAI Agents');
      expect(result).toContain('## agent1.md');
      expect(result).toContain('## agent2.md');
      expect(result).toContain('Content 1');
      expect(result).toContain('Content 2');
    });

    it('should filter out non-markdown files', async () => {
      const agentsDir = '/test/agents';
      const allFiles = ['agent1.md', 'agent2.txt', 'agent3.md', 'ignore.js'];

      mockResolve.mockReturnValue(agentsDir);
      mockReaddir.mockResolvedValue(allFiles as any);
      mockJoin.mockReturnValue('/test/agents/file.md');
      mockReadFile.mockResolvedValue('content');

      const agentsResource = resources.find(r => r.uri === 'devai://agents');
      const result = await agentsResource!.handler();

      expect(result).toContain('## agent1.md');
      expect(result).toContain('## agent3.md');
      expect(result).not.toContain('agent2.txt');
      expect(result).not.toContain('ignore.js');
    });
  });

  describe('DevAI Tasks resource', () => {
    it('should handle tasks directory listing', async () => {
      const tasksDir = '/test/tasks';
      const taskFiles = ['task1.md', 'task2.md'];
      const taskContent1 = '# Task 1\n\nTask content 1';
      const taskContent2 = '# Task 2\n\nTask content 2';

      mockResolve.mockReturnValue(tasksDir);
      mockReaddir.mockResolvedValue(taskFiles as any);
      mockJoin
        .mockReturnValueOnce('/test/tasks/task1.md')
        .mockReturnValueOnce('/test/tasks/task2.md');
      mockReadFile.mockResolvedValueOnce(taskContent1).mockResolvedValueOnce(taskContent2);

      const tasksResource = resources.find(r => r.uri === 'devai://tasks');
      expect(tasksResource).toBeDefined();

      const result = await tasksResource!.handler();

      expect(mockResolve).toHaveBeenCalledWith(process.cwd(), 'tasks');
      expect(mockReaddir).toHaveBeenCalledWith(tasksDir);
      expect(result).toContain('# DevAI Tasks');
      expect(result).toContain('## task1.md');
      expect(result).toContain('## task2.md');
      expect(result).toContain('Task content 1');
      expect(result).toContain('Task content 2');
    });
  });

  describe('DevAI Checklists resource', () => {
    it('should handle checklists directory listing', async () => {
      const checklistsDir = '/test/checklists';
      const checklistFiles = ['checklist1.md', 'checklist2.md'];
      const checklistContent1 = '# Checklist 1\n\n- Item 1\n- Item 2';
      const checklistContent2 = '# Checklist 2\n\n- Item A\n- Item B';

      mockResolve.mockReturnValue(checklistsDir);
      mockReaddir.mockResolvedValue(checklistFiles as any);
      mockJoin
        .mockReturnValueOnce('/test/checklists/checklist1.md')
        .mockReturnValueOnce('/test/checklists/checklist2.md');
      mockReadFile
        .mockResolvedValueOnce(checklistContent1)
        .mockResolvedValueOnce(checklistContent2);

      const checklistsResource = resources.find(r => r.uri === 'devai://checklists');
      expect(checklistsResource).toBeDefined();

      const result = await checklistsResource!.handler();

      expect(mockResolve).toHaveBeenCalledWith(process.cwd(), 'checklists');
      expect(mockReaddir).toHaveBeenCalledWith(checklistsDir);
      expect(result).toContain('# DevAI Checklists');
      expect(result).toContain('## checklist1.md');
      expect(result).toContain('## checklist2.md');
      expect(result).toContain('Item 1');
      expect(result).toContain('Item A');
    });
  });

  describe('DevAI Technical Preferences resource', () => {
    it('should handle technical preferences file', async () => {
      const prefsPath = '/test/data/technical-preferences.md';
      const prefsContent =
        '# Technical Preferences\n\n- Language: TypeScript\n- Framework: Node.js';

      mockResolve.mockReturnValue(prefsPath);
      mockReadFile.mockResolvedValue(prefsContent);

      const prefsResource = resources.find(r => r.uri === 'devai://technical-preferences');
      expect(prefsResource).toBeDefined();

      const result = await prefsResource!.handler();

      expect(mockResolve).toHaveBeenCalledWith(process.cwd(), 'data', 'technical-preferences.md');
      expect(mockReadFile).toHaveBeenCalledWith(prefsPath, 'utf8');
      expect(result).toBe(prefsContent);
    });
  });

  describe('DevAI Manifest resource', () => {
    it('should handle manifest file', async () => {
      const manifestPath = '/test/tools/manifest.json';
      const manifestContent = '{"tools": ["tool1", "tool2"]}';

      mockResolve.mockReturnValue(manifestPath);
      mockReadFile.mockResolvedValue(manifestContent);

      const manifestResource = resources.find(r => r.uri === 'devai://manifest');
      expect(manifestResource).toBeDefined();

      const result = await manifestResource!.handler();

      expect(mockResolve).toHaveBeenCalledWith(process.cwd(), 'tools', 'manifest.json');
      expect(mockReadFile).toHaveBeenCalledWith(manifestPath, 'utf8');
      expect(result).toBe(manifestContent);
    });
  });

  describe('error handling', () => {
    it('should handle readdir errors gracefully', async () => {
      const agentsDir = '/test/agents';
      mockResolve.mockReturnValue(agentsDir);
      mockReaddir.mockRejectedValue(new Error('Directory not found'));

      const agentsResource = resources.find(r => r.uri === 'devai://agents');

      await expect(agentsResource!.handler()).rejects.toThrow('Directory not found');
    });

    it('should handle readFile errors gracefully', async () => {
      const agentsDir = '/test/agents';
      const agentFiles = ['agent1.md'];

      mockResolve.mockReturnValue(agentsDir);
      mockReaddir.mockResolvedValue(agentFiles as any);
      mockJoin.mockReturnValue('/test/agents/agent1.md');
      mockReadFile.mockRejectedValue(new Error('File not found'));

      const agentsResource = resources.find(r => r.uri === 'devai://agents');

      await expect(agentsResource!.handler()).rejects.toThrow('File not found');
    });
  });

  describe('resource metadata', () => {
    it('should have correct MIME types', () => {
      const markdownResources = resources.filter(r => r.mimeType === 'text/markdown');
      const jsonResources = resources.filter(r => r.mimeType === 'application/json');

      expect(markdownResources.length).toBeGreaterThan(0);
      expect(jsonResources.length).toBeGreaterThan(0);
    });

    it('should have descriptive names', () => {
      resources.forEach(resource => {
        expect(resource.name.length).toBeGreaterThan(0);
        expect(resource.description.length).toBeGreaterThan(0);
      });
    });
  });
});
