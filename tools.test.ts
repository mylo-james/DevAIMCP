/**
 * Tools module tests
 */

import { describe, it, expect } from 'vitest';
import {
  tools,
  bmadTools,
  getToolsByAgent,
  getAllToolNames,
  findToolByName,
  validateToolInput,
  type BMADAgent,
  type ProjectType,
  type TestScope,
  BMAD_AGENTS,
  PROJECT_TYPES,
  TEST_SCOPES,
} from './tools.js';

describe('Tools Module', () => {
  describe('Constants', () => {
    it('should have correct BMAD_AGENTS', () => {
      expect(BMAD_AGENTS).toEqual(['po', 'sm', 'dev', 'architect', 'qa']);
    });

    it('should have correct PROJECT_TYPES', () => {
      expect(PROJECT_TYPES).toEqual(['greenfield', 'brownfield']);
    });

    it('should have correct TEST_SCOPES', () => {
      expect(TEST_SCOPES).toEqual(['unit', 'integration', 'all']);
    });
  });

  describe('Type definitions', () => {
    it('should have correct BMADAgent type', () => {
      const validAgents: BMADAgent[] = ['po', 'sm', 'dev', 'architect', 'qa'];
      expect(validAgents).toHaveLength(5);
    });

    it('should have correct ProjectType type', () => {
      const validTypes: ProjectType[] = ['greenfield', 'brownfield'];
      expect(validTypes).toHaveLength(2);
    });

    it('should have correct TestScope type', () => {
      const validScopes: TestScope[] = ['unit', 'integration', 'all'];
      expect(validScopes).toHaveLength(3);
    });
  });

  describe('bmadTools object', () => {
    it('should have all agent categories', () => {
      expect(bmadTools).toHaveProperty('productOwner');
      expect(bmadTools).toHaveProperty('scrumMaster');
      expect(bmadTools).toHaveProperty('developer');
      expect(bmadTools).toHaveProperty('architect');
      expect(bmadTools).toHaveProperty('qa');
      expect(bmadTools).toHaveProperty('common');
    });

    it('should have product owner tools', () => {
      expect(bmadTools.productOwner).toHaveLength(4);
      expect(bmadTools.productOwner.every(tool => tool.name.startsWith('bmad_po_'))).toBe(true);
    });

    it('should have scrum master tools', () => {
      expect(bmadTools.scrumMaster).toHaveLength(2);
      expect(bmadTools.scrumMaster.every(tool => tool.name.startsWith('bmad_sm_'))).toBe(true);
    });

    it('should have developer tools', () => {
      expect(bmadTools.developer).toHaveLength(3);
      expect(bmadTools.developer.every(tool => tool.name.startsWith('bmad_dev_'))).toBe(true);
    });

    it('should have architect tools', () => {
      expect(bmadTools.architect).toHaveLength(1);
      expect(bmadTools.architect.every(tool => tool.name.startsWith('bmad_architect_'))).toBe(true);
    });

    it('should have qa tools', () => {
      expect(bmadTools.qa).toHaveLength(1);
      expect(bmadTools.qa.every(tool => tool.name.startsWith('bmad_qa_'))).toBe(true);
    });

    it('should have common tools', () => {
      expect(bmadTools.common).toHaveLength(2);
      expect(bmadTools.common.every(tool => tool.name.startsWith('bmad_'))).toBe(true);
    });
  });

  describe('tools array', () => {
    it('should contain all tools from all categories', () => {
      const expectedLength =
        bmadTools.productOwner.length +
        bmadTools.scrumMaster.length +
        bmadTools.developer.length +
        bmadTools.architect.length +
        bmadTools.qa.length +
        bmadTools.common.length +
        3; // DevAI notification tools

      expect(tools).toHaveLength(expectedLength);
    });

    it('should have unique tool names', () => {
      const toolNames = tools.map(tool => tool.name);
      const uniqueNames = new Set(toolNames);
      expect(toolNames).toHaveLength(uniqueNames.size);
    });

    it('should have valid tool structure', () => {
      tools.forEach(tool => {
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('inputSchema');
        expect(typeof tool.name).toBe('string');
        expect(typeof tool.description).toBe('string');
        expect(tool.inputSchema).toBeDefined();
      });
    });
  });

  describe('getToolsByAgent', () => {
    it('should return product owner tools for po agent', () => {
      const poTools = getToolsByAgent('po');
      expect(poTools).toEqual(bmadTools.productOwner);
    });

    it('should return scrum master tools for sm agent', () => {
      const smTools = getToolsByAgent('sm');
      expect(smTools).toEqual(bmadTools.scrumMaster);
    });

    it('should return developer tools for dev agent', () => {
      const devTools = getToolsByAgent('dev');
      expect(devTools).toEqual(bmadTools.developer);
    });

    it('should return architect tools for architect agent', () => {
      const architectTools = getToolsByAgent('architect');
      expect(architectTools).toEqual(bmadTools.architect);
    });

    it('should return qa tools for qa agent', () => {
      const qaTools = getToolsByAgent('qa');
      expect(qaTools).toEqual(bmadTools.qa);
    });

    it('should return empty array for invalid agent', () => {
      const invalidTools = getToolsByAgent('invalid' as BMADAgent);
      expect(invalidTools).toEqual([]);
    });
  });

  describe('getAllToolNames', () => {
    it('should return all tool names', () => {
      const toolNames = getAllToolNames();
      expect(toolNames).toHaveLength(tools.length);
      expect(toolNames).toEqual(tools.map(tool => tool.name));
    });

    it('should return unique names', () => {
      const toolNames = getAllToolNames();
      const uniqueNames = new Set(toolNames);
      expect(toolNames).toHaveLength(uniqueNames.size);
    });
  });

  describe('findToolByName', () => {
    it('should find existing tool', () => {
      const tool = findToolByName('bmad_po_create_epic');
      expect(tool).toBeDefined();
      expect(tool?.name).toBe('bmad_po_create_epic');
    });

    it('should return undefined for non-existent tool', () => {
      const tool = findToolByName('non_existent_tool');
      expect(tool).toBeUndefined();
    });

    it('should find all tools by name', () => {
      tools.forEach(tool => {
        const found = findToolByName(tool.name);
        expect(found).toBeDefined();
        expect(found?.name).toBe(tool.name);
      });
    });
  });

  describe('validateToolInput', () => {
    it('should validate correct input for bmad_po_create_epic', () => {
      const input = {
        projectId: 1,
        context: 'Test context',
        existingSystemInfo: 'Test system info',
      };
      expect(validateToolInput('bmad_po_create_epic', input)).toBe(true);
    });

    it('should validate correct input for bmad_po_create_story', () => {
      const input = {
        projectId: 1,
        requirements: 'Test requirements',
        epicId: 2,
      };
      expect(validateToolInput('bmad_po_create_story', input)).toBe(true);
    });

    it('should validate correct input for bmad_dev_run_tests', () => {
      const input = {
        projectId: 1,
        testScope: 'unit' as TestScope,
      };
      expect(validateToolInput('bmad_dev_run_tests', input)).toBe(true);
    });

    it('should validate correct input for bmad_architect_design', () => {
      const input = {
        projectId: 1,
        requirements: 'Test requirements',
        projectType: 'greenfield' as ProjectType,
      };
      expect(validateToolInput('bmad_architect_design', input)).toBe(true);
    });

    it('should validate correct input for bmad_correct_course', () => {
      const input = {
        projectId: 1,
        agent: 'po' as BMADAgent,
        issue: 'Test issue',
      };
      expect(validateToolInput('bmad_correct_course', input)).toBe(true);
    });

    it('should reject invalid input for bmad_po_create_epic', () => {
      const input = {
        projectId: 'invalid', // should be number
        context: 'Test context',
      };
      expect(validateToolInput('bmad_po_create_epic', input)).toBe(false);
    });

    it('should reject input with missing required fields', () => {
      const input = {
        projectId: 1,
        // missing required fields
      };
      expect(validateToolInput('bmad_po_create_story', input)).toBe(false);
    });

    it('should reject input with invalid enum values', () => {
      const input = {
        projectId: 1,
        agent: 'invalid_agent',
        issue: 'Test issue',
      };
      expect(validateToolInput('bmad_correct_course', input)).toBe(false);
    });

    it('should return false for non-existent tool', () => {
      const input = { projectId: 1 };
      expect(validateToolInput('non_existent_tool', input)).toBe(false);
    });

    it('should handle optional fields correctly', () => {
      const input = {
        projectId: 1,
        requirements: 'Test requirements',
        // epicId is optional, so this should be valid
      };
      expect(validateToolInput('bmad_po_create_story', input)).toBe(true);
    });
  });

  describe('Tool schemas', () => {
    it('should have correct schema for bmad_po_create_epic', () => {
      const tool = findToolByName('bmad_po_create_epic');
      expect(tool).toBeDefined();

      const validInput = {
        projectId: 1,
        context: 'Test context',
        existingSystemInfo: 'Test system info',
      };

      expect(() => tool?.inputSchema.parse(validInput)).not.toThrow();
    });

    it('should have correct schema for bmad_dev_run_tests', () => {
      const tool = findToolByName('bmad_dev_run_tests');
      expect(tool).toBeDefined();

      const validInput = {
        projectId: 1,
        testScope: 'unit',
      };

      expect(() => tool?.inputSchema.parse(validInput)).not.toThrow();
    });

    it('should have correct schema for bmad_architect_design', () => {
      const tool = findToolByName('bmad_architect_design');
      expect(tool).toBeDefined();

      const validInput = {
        projectId: 1,
        requirements: 'Test requirements',
        projectType: 'greenfield',
      };

      expect(() => tool?.inputSchema.parse(validInput)).not.toThrow();
    });
  });

  describe('Tool descriptions', () => {
    it('should have meaningful descriptions', () => {
      tools.forEach(tool => {
        expect(tool.description).toBeTruthy();
        expect(tool.description.length).toBeGreaterThan(10);
        // Allow both BMAD and DevAI tools
        expect(tool.description).toMatch(/BMAD|methodology|notification|DevAI/);
      });
    });
  });

  describe('Tool naming convention', () => {
    it('should follow naming convention', () => {
      tools.forEach(tool => {
        // Allow both BMAD and DevAI naming conventions
        expect(tool.name).toMatch(/^(bmad|devai)_[a-z_]+$/);
      });
    });
  });
});
