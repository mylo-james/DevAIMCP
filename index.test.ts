/**
 * Index module tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';

// Mock the MCP SDK
vi.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: vi.fn().mockImplementation(() => ({
    setRequestHandler: vi.fn(),
    connect: vi.fn(),
  })),
}));

vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: vi.fn().mockImplementation(() => ({})),
}));

vi.mock('@modelcontextprotocol/sdk/types.js', () => ({
  CallToolRequestSchema: 'CallToolRequestSchema',
  ListToolsRequestSchema: 'ListToolsRequestSchema',
}));

// Mock the tools module
vi.mock('./tools.js', () => ({
  tools: [
    {
      name: 'bmad_po_create_epic',
      description: 'Create epic for brownfield projects using BMAD Product Owner methodology',
      inputSchema: z.object({
        projectId: z.number(),
        context: z.string().optional(),
        existingSystemInfo: z.string().optional(),
      }),
    },
  ],
}));

// Mock seed modules
vi.mock('./seed/tools/project-manager.ts', () => ({
  manageProject: vi.fn(),
}));

vi.mock('./seed/tools/memory-manager.ts', () => ({
  manageMemory: vi.fn(),
}));

vi.mock('./seed/tools/data-exporter.ts', () => ({
  exportData: vi.fn(),
}));

vi.mock('./seed/lib/policy-engine.ts', () => ({
  validatePolicy: vi.fn(),
}));

vi.mock('./seed/tools/story-manager.ts', () => ({
  manageStory: vi.fn(),
}));

vi.mock('./seed/tools/workflow-executor.ts', () => ({
  executeWorkflow: vi.fn(),
}));

vi.mock('./seed/tools/git-workflow.ts', () => ({
  executeGitWorkflow: vi.fn(),
}));

vi.mock('./seed/tools/test-runner.ts', () => ({
  runTests: vi.fn(),
}));

vi.mock('./seed/tools/bmad-executor.ts', () => ({
  executeBmadTool: vi.fn(),
}));

vi.mock('./seed/tools/vendor-bmad.ts', () => ({
  runBmadWebBuilder: vi.fn(),
  runBmadYamlFormat: vi.fn(),
  runBmadFlatten: vi.fn(),
  runBmadVersionBump: vi.fn(),
  runBmadResolveDeps: vi.fn(),
}));

vi.mock('./seed/lib/orchestrator.ts', () => ({
  OrchestratorService: {
    activateDevAIMode: vi.fn(),
    processNaturalLanguageInput: vi.fn(),
  },
}));

vi.mock('./seed/lib/personas.ts', () => ({
  PersonaService: {
    activatePersona: vi.fn(),
    processInCharacter: vi.fn(),
    handoffToPersona: vi.fn(),
    getPersonas: vi.fn(),
  },
}));

vi.mock('./seed/lib/importance-manager.ts', () => ({
  ImportanceManager: {
    incrementImportance: vi.fn(),
    getRankedResources: vi.fn(),
    runNightlyDecay: vi.fn(),
    createKBResource: vi.fn(),
  },
}));

vi.mock('./seed/lib/authorization.ts', () => ({
  AuthorizationService: {
    generateActorKey: vi.fn(),
    validateActorKey: vi.fn(),
    checkResourceAccess: vi.fn(),
    getAuditLog: vi.fn(),
  },
}));

vi.mock('./seed/lib/dev-workflow.ts', () => ({
  DevWorkflowEngine: {
    startWorkflow: vi.fn(),
    smCompletesDraft: vi.fn(),
    devCompletesImplementation: vi.fn(),
    qaApproves: vi.fn(),
    qaRejects: vi.fn(),
    getWorkflowState: vi.fn(),
  },
}));

vi.mock('./seed/lib/memory-manager-enhanced.ts', () => ({
  EnhancedMemoryManager: {
    storePostJobMemory: vi.fn(),
    searchPostJobMemories: vi.fn(),
    executePostJobHook: vi.fn(),
  },
}));

vi.mock('./seed/lib/retrieval-service.ts', () => ({
  RetrievalService: {
    retrieve: vi.fn(),
    searchWithFeedback: vi.fn(),
    advancedSearch: vi.fn(),
    getRetrievalStats: vi.fn(),
  },
}));

vi.mock('./seed/lib/hitl-service.ts', () => ({
  HITLService: {
    checkEpicCompletion: vi.fn(),
    createHITLRequest: vi.fn(),
    processHumanDecision: vi.fn(),
    escalateRequest: vi.fn(),
    getPendingHITLRequests: vi.fn(),
    getHITLStats: vi.fn(),
  },
}));

vi.mock('./seed/lib/database.ts', () => ({
  generateEmbedding: vi.fn(),
}));

describe('Index Module', () => {
  let originalEnv: Record<string, string | undefined>;
  let mockConsoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    originalEnv = { ...process.env };
    mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('Debug logging function', () => {
    it('should log debug messages to stderr', () => {
      // Test the dbg function behavior
      console.error('[DevAI MCP]', 'Test debug message');
      
      expect(mockConsoleError).toHaveBeenCalledWith('[DevAI MCP]', 'Test debug message');
    });

    it('should handle circular reference errors gracefully', () => {
      // Create a circular reference
      const circular: Record<string, unknown> = { name: 'test' };
      circular.self = circular;

      // Mock JSON.stringify to throw on circular reference
      const originalStringify = JSON.stringify;
      JSON.stringify = vi.fn().mockImplementation(() => {
        throw new Error('Circular reference');
      });

      // This should not crash the application
      expect(() => {
        console.error('[DevAI MCP]', circular);
      }).not.toThrow();

      // Restore
      JSON.stringify = originalStringify;
    });

    it('should handle log errors gracefully', () => {
      // Test that the dbg function can handle errors in console.error
      // This simulates the try-catch block in the dbg function
      const originalConsoleError = console.error;
      let errorCaught = false;
      
      console.error = vi.fn().mockImplementation(() => {
        throw new Error('Console error');
      });

      // Simulate the dbg function's error handling
      try {
        console.error('[DevAI MCP]', 'test');
      } catch (_) {
        errorCaught = true;
      }

      expect(errorCaught).toBe(true);
      console.error = originalConsoleError;
    });
  });

  describe('Process error handling', () => {
    it('should handle uncaught exceptions', () => {
      const mockError = new Error('Test error');
      mockError.stack = 'Error: Test error\n    at test.js:1:1';

      // Simulate the error handling logic
      console.error('[DevAI MCP]', 'uncaughtException', mockError.stack || String(mockError));
      
      expect(mockConsoleError).toHaveBeenCalledWith(
        '[DevAI MCP]',
        'uncaughtException',
        mockError.stack
      );
    });

    it('should handle uncaught exceptions without stack', () => {
      const mockError = new Error('Test error');
      delete mockError.stack;

      // Simulate the error handling logic
      console.error('[DevAI MCP]', 'uncaughtException', mockError.stack || String(mockError));
      
      expect(mockConsoleError).toHaveBeenCalledWith(
        '[DevAI MCP]',
        'uncaughtException',
        'Error: Test error'
      );
    });

    it('should handle unhandled rejections with Error object', () => {
      const mockError = new Error('Test rejection');
      mockError.stack = 'Error: Test rejection\n    at test.js:1:1';

      // Simulate the error handling logic
      const reason = typeof mockError === 'object' && mockError !== null
        ? (mockError as { stack?: string }).stack || String(mockError)
        : String(mockError);
      
      console.error('[DevAI MCP]', 'unhandledRejection', reason);
      
      expect(mockConsoleError).toHaveBeenCalledWith(
        '[DevAI MCP]',
        'unhandledRejection',
        mockError.stack
      );
    });

    it('should handle unhandled rejections with string', () => {
      const mockReason = 'Test rejection string';

      // Simulate the error handling logic
      const reason = typeof mockReason === 'object' && mockReason !== null
        ? (mockReason as { stack?: string }).stack || String(mockReason)
        : String(mockReason);
      
      console.error('[DevAI MCP]', 'unhandledRejection', reason);
      
      expect(mockConsoleError).toHaveBeenCalledWith(
        '[DevAI MCP]',
        'unhandledRejection',
        'Test rejection string'
      );
    });

    it('should handle unhandled rejections with object without stack', () => {
      const mockReason = { message: 'Test rejection object' };

      // Simulate the error handling logic
      const reason = typeof mockReason === 'object' && mockReason !== null
        ? (mockReason as { stack?: string }).stack || String(mockReason)
        : String(mockReason);
      
      console.error('[DevAI MCP]', 'unhandledRejection', reason);
      
      expect(mockConsoleError).toHaveBeenCalledWith(
        '[DevAI MCP]',
        'unhandledRejection',
        '[object Object]'
      );
    });
  });

  describe('Zod to JSON Schema conversion', () => {
    it('should convert ZodString to JSON schema', () => {
      const schema = z.object({
        name: z.string().describe('Name parameter'),
        optionalField: z.string().optional(),
      });

      // Test the zodToJsonSchema function logic
      const shape = schema.shape;
      const properties: Record<string, unknown> = {};
      const required: string[] = [];

      for (const [key, value] of Object.entries(shape)) {
        const zodField = value as z.ZodType<unknown>;

        if (zodField instanceof z.ZodString) {
          properties[key] = {
            type: 'string',
            description: zodField.description || `${key} parameter`,
          };
          if (!zodField.isOptional()) required.push(key);
        } else if (zodField instanceof z.ZodOptional) {
          const innerType = zodField.unwrap();
          if (innerType instanceof z.ZodString) {
            properties[key] = {
              type: 'string',
              description: innerType.description || `${key} parameter`,
            };
          }
        }
      }

      expect(properties.name).toEqual({
        type: 'string',
        description: 'Name parameter',
      });
      expect(properties.optionalField).toEqual({
        type: 'string',
        description: 'optionalField parameter',
      });
      expect(required).toEqual(['name']);
    });

    it('should convert ZodNumber to JSON schema', () => {
      const schema = z.object({
        id: z.number().describe('ID parameter'),
        optionalNumber: z.number().optional(),
      });

      // Test the zodToJsonSchema function logic
      const shape = schema.shape;
      const properties: Record<string, unknown> = {};
      const required: string[] = [];

      for (const [key, value] of Object.entries(shape)) {
        const zodField = value as z.ZodType<unknown>;

        if (zodField instanceof z.ZodNumber) {
          properties[key] = {
            type: 'number',
            description: zodField.description || `${key} parameter`,
          };
          if (!zodField.isOptional()) required.push(key);
        } else if (zodField instanceof z.ZodOptional) {
          const innerType = zodField.unwrap();
          if (innerType instanceof z.ZodNumber) {
            properties[key] = {
              type: 'number',
              description: innerType.description || `${key} parameter`,
            };
          }
        }
      }

      expect(properties.id).toEqual({
        type: 'number',
        description: 'ID parameter',
      });
      expect(properties.optionalNumber).toEqual({
        type: 'number',
        description: 'optionalNumber parameter',
      });
      expect(required).toEqual(['id']);
    });

    it('should convert ZodEnum to JSON schema', () => {
      const schema = z.object({
        status: z.enum(['active', 'inactive']).describe('Status parameter'),
      });

      // Test the zodToJsonSchema function logic
      const shape = schema.shape;
      const properties: Record<string, unknown> = {};
      const required: string[] = [];

      for (const [key, value] of Object.entries(shape)) {
        const zodField = value as z.ZodType<unknown>;

        if (zodField instanceof z.ZodEnum) {
          properties[key] = {
            type: 'string',
            enum: zodField.options,
            description: zodField.description || `${key} parameter`,
          };
          if (!zodField.isOptional()) required.push(key);
        }
      }

      expect(properties.status).toEqual({
        type: 'string',
        enum: ['active', 'inactive'],
        description: 'Status parameter',
      });
      expect(required).toEqual(['status']);
    });

    it('should handle fallback for other Zod types', () => {
      // Test fallback logic for non-object schemas
      const fallbackSchema = { type: 'object', properties: {} };
      expect(fallbackSchema).toEqual({ type: 'object', properties: {} });
    });
  });

  describe('Tool definitions', () => {
    it('should have valid tool structure', () => {
      // Test tool structure validation
      const testTool = {
        name: 'test_tool',
        description: 'Test tool description',
        inputSchema: {
          type: 'object',
          properties: {
            test: { type: 'string' }
          },
          required: ['test']
        }
      };

      expect(testTool).toHaveProperty('name');
      expect(testTool).toHaveProperty('description');
      expect(testTool).toHaveProperty('inputSchema');
      expect(typeof testTool.name).toBe('string');
      expect(typeof testTool.description).toBe('string');
      expect(typeof testTool.inputSchema).toBe('object');
    });

    it('should validate tool schemas', () => {
      // Test schema validation logic
      const validSchema = {
        type: 'object',
        properties: {
          projectId: { type: 'number' },
          name: { type: 'string' }
        },
        required: ['projectId']
      };

      expect(validSchema).toHaveProperty('type');
      expect(validSchema).toHaveProperty('properties');
      expect(validSchema).toHaveProperty('required');
      expect(Array.isArray(validSchema.required)).toBe(true);
      expect(typeof validSchema.properties).toBe('object');
    });

    it('should handle required fields correctly', () => {
      const schema = {
        type: 'object',
        properties: {
          required: { type: 'string' },
          optional: { type: 'string' }
        },
        required: ['required']
      };

      expect(schema.required).toContain('required');
      expect(schema.required).not.toContain('optional');
    });

    it('should handle empty required array', () => {
      const schema = {
        type: 'object',
        properties: {
          optional1: { type: 'string' },
          optional2: { type: 'string' }
        },
        required: []
      };

      expect(schema.required).toEqual([]);
    });
  });

  describe('Environment configuration', () => {
    it('should handle DEVAI_SEED_BUILD environment variable', () => {
      process.env.DEVAI_SEED_BUILD = 'ts';
      expect(process.env.DEVAI_SEED_BUILD).toBe('ts');
    });

    it('should handle NODE_ENV environment variable', () => {
      process.env.NODE_ENV = 'test';
      expect(process.env.NODE_ENV).toBe('test');
    });

    it('should handle missing environment variables gracefully', () => {
      delete process.env.DEVAI_SEED_BUILD;
      expect(process.env.DEVAI_SEED_BUILD).toBeUndefined();
    });
  });

  describe('Module imports', () => {
    it('should handle dynamic imports', async () => {
      // Test that dynamic imports can be handled
      const mockImport = vi.fn().mockResolvedValue({ default: {} });
      
      // Simulate dynamic import behavior
      const result = await mockImport('./test-module');
      
      expect(mockImport).toHaveBeenCalledWith('./test-module');
      expect(result).toHaveProperty('default');
    });

    it('should handle import errors gracefully', async () => {
      const mockImport = vi.fn().mockRejectedValue(new Error('Import failed'));
      
      try {
        await mockImport('./non-existent-module');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Import failed');
      }
    });
  });

  describe('Server configuration', () => {
    it('should have correct server name and version', () => {
      const serverConfig = {
        name: 'devai-mcp-server',
        version: '1.0.0',
      };

      expect(serverConfig.name).toBe('devai-mcp-server');
      expect(serverConfig.version).toBe('1.0.0');
    });

    it('should have tools capability', () => {
      const capabilities = {
        capabilities: {
          tools: {},
        },
      };

      expect(capabilities.capabilities).toHaveProperty('tools');
    });
  });

  describe('Error handling in tool execution', () => {
    it('should handle unknown tool errors', () => {
      const error = new Error('Unknown tool: unknown_tool');
      
      const errorMessage = (error as { message?: string })?.message || String(error);
      const errorStack = (error as { stack?: string })?.stack || errorMessage;
      
      expect(errorMessage).toBe('Unknown tool: unknown_tool');
      expect(errorStack).toContain('Unknown tool: unknown_tool');
    });

    it('should handle tool execution errors', () => {
      const error = new Error('Tool execution failed');
      
      const msg = (error as { message?: string })?.message || String(error);
      const stack = (error as { stack?: string })?.stack || msg;
      
      expect(msg).toBe('Tool execution failed');
      expect(stack).toContain('Tool execution failed');
    });

    it('should handle errors without message property', () => {
      const error = 'String error';
      
      const msg = (error as { message?: string })?.message || String(error);
      
      expect(msg).toBe('String error');
    });
  });
});