#!/usr/bin/env tsx
import 'dotenv/config';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { tools as bmadTools } from './tools.js';

// Basic debug logger
function dbg(...args: any[]) {
  // Always log to stderr for MCP tooling visibility
  try {
    // Avoid crashing on circular
    console.error('[DevAI MCP]', ...args);
  } catch (_) {
    console.error('[DevAI MCP] <log error>');
  }
}

process.on('uncaughtException', (err) => {
  dbg('uncaughtException', err?.stack || String(err));
});
process.on('unhandledRejection', (reason) => {
  dbg(
    'unhandledRejection',
    typeof reason === 'object' && reason !== null
      ? (reason as any).stack || String(reason)
      : String(reason)
  );
});

// Dynamic import loader for seed tools to support dev (.ts via tsx) and prod (dist/.js)
let manageProject: any;
let manageMemory: any;
let exportData: any;
let validatePolicy: any;
let switchAgent: any;
let manageStory: any;
let executeWorkflow: any;
let executeGitWorkflow: any;
let runTests: any;
let bmadExecutor: any;
let vendorBmad: any;

let seedLoaded = false;
async function ensureSeedLoaded(): Promise<void> {
  if (seedLoaded) return;
  const build = process.env.DEVAI_SEED_BUILD || 'ts';
  const importFrom = async (p: string) => (await import(p as any)) as any;
  if (build === 'ts') {
    dbg('ensureSeedLoaded: loading seed in TS mode');
    const base = './seed/';
    const tools = base + 'tools/';
    const lib = base + 'lib/';
    const ext = '.ts';
    ({ manageProject } = await importFrom(tools + 'project-manager' + ext));
    ({ manageMemory } = await importFrom(tools + 'memory-manager' + ext));
    ({ exportData } = await importFrom(tools + 'data-exporter' + ext));
    ({ validatePolicy } = await importFrom(lib + 'policy-engine' + ext));
    ({ switchAgent } = await importFrom(lib + 'agent-context' + ext));
    ({ manageStory } = await importFrom(tools + 'story-manager' + ext));
    ({ executeWorkflow } = await importFrom(tools + 'workflow-executor' + ext));
    ({ executeGitWorkflow } = await importFrom(tools + 'git-workflow' + ext));
    ({ runTests } = await importFrom(tools + 'test-runner' + ext));
    ({ executeBmadTool: bmadExecutor } = await importFrom(
      tools + 'bmad-executor' + ext
    ));
    vendorBmad = await importFrom(tools + 'vendor-bmad' + ext);
  } else {
    dbg('ensureSeedLoaded: loading seed in JS (dist) mode');
    const base = './seed/dist/';
    const tools = base + 'tools/';
    const lib = base + 'lib/';
    const ext = '.js';
    ({ manageProject } = await importFrom(tools + 'project-manager' + ext));
    ({ manageMemory } = await importFrom(tools + 'memory-manager' + ext));
    ({ exportData } = await importFrom(tools + 'data-exporter' + ext));
    ({ validatePolicy } = await importFrom(lib + 'policy-engine' + ext));
    ({ switchAgent } = await importFrom(lib + 'agent-context' + ext));
    ({ manageStory } = await importFrom(tools + 'story-manager' + ext));
    ({ executeWorkflow } = await importFrom(tools + 'workflow-executor' + ext));
    ({ executeGitWorkflow } = await importFrom(tools + 'git-workflow' + ext));
    ({ runTests } = await importFrom(tools + 'test-runner' + ext));
    ({ executeBmadTool: bmadExecutor } = await importFrom(
      tools + 'bmad-executor' + ext
    ));
    vendorBmad = await importFrom(tools + 'vendor-bmad' + ext);
  }
  seedLoaded = true;
  dbg('ensureSeedLoaded: seed modules loaded');
}

// Initialize the MCP server
const server = new Server(
  {
    name: 'devai-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ============================================================================
// PROJECT MANAGEMENT TOOLS
// ============================================================================

// Note: Only ONE ListTools handler should be registered. This unified handler returns
// the complete tool list (projects, memories, development tools, exports).
server.setRequestHandler(ListToolsRequestSchema, async () => {
  dbg('ListToolsRequest received');
  return {
    tools: [
      // Project management
      {
        name: 'devai_project_create',
        description: 'Create a new project in the DevAI system',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Project name' },
            description: { type: 'string', description: 'Project description' },
            repository_url: {
              type: 'string',
              description: 'Git repository URL',
            },
            language: {
              type: 'string',
              description: 'Primary programming language',
            },
            framework: { type: 'string', description: 'Framework being used' },
            metadata: {
              type: 'object',
              description: 'Additional project metadata',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'devai_project_get',
        description: 'Get project details by ID',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: { type: 'number', description: 'Project ID' },
          },
          required: ['projectId'],
        },
      },
      {
        name: 'devai_project_list',
        description: 'List all projects',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'devai_project_context',
        description: 'Get project context and intelligence',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: { type: 'number', description: 'Project ID' },
            query: {
              type: 'string',
              description: 'Optional query for context',
            },
          },
          required: ['projectId'],
        },
      },

      // Memory tools
      {
        name: 'devai_memory_store',
        description: 'Store AI memory or learning',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: { type: 'number', description: 'Project ID' },
            memoryType: {
              type: 'string',
              enum: [
                'decision',
                'pattern',
                'learning',
                'preference',
                'insight',
              ],
              description: 'Type of memory',
            },
            content: { type: 'string', description: 'Memory content' },
            context: {
              type: 'string',
              description: 'Context that led to this memory',
            },
            reasoning: {
              type: 'string',
              description: 'Why this memory is important',
            },
            confidence: { type: 'number', description: 'AI confidence (0-1)' },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Tags for categorization',
            },
          },
          required: ['projectId', 'content', 'memoryType'],
        },
      },
      {
        name: 'devai_memory_search',
        description: 'Search AI memories semantically',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
            projectId: {
              type: 'number',
              description: 'Project ID to search within',
            },
            memoryType: {
              type: 'string',
              description: 'Filter by memory type',
            },
            limit: { type: 'number', description: 'Maximum results to return' },
          },
          required: ['query'],
        },
      },

      // Development tools
      {
        name: 'devai_policy_validate',
        description: 'Validate actions against DevAI policy',
        inputSchema: {
          type: 'object',
          properties: {
            action: { type: 'string', description: 'Action to validate' },
            context: { type: 'string', description: 'Context of the action' },
            agent: {
              type: 'string',
              description: 'Agent performing the action',
            },
          },
          required: ['action', 'context'],
        },
      },
      {
        name: 'devai_workflow_execute',
        description: 'Execute a development workflow',
        inputSchema: {
          type: 'object',
          properties: {
            workflowType: {
              type: 'string',
              enum: ['greenfield', 'brownfield', 'refactor', 'migration'],
              description: 'Type of workflow to execute',
            },
            projectId: { type: 'number', description: 'Project ID' },
            steps: {
              type: 'array',
              items: { type: 'object' },
              description: 'Workflow steps',
            },
          },
          required: ['workflowType', 'projectId'],
        },
      },
      {
        name: 'devai_story_manage',
        description: 'Manage user stories and tasks',
        inputSchema: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              enum: ['create', 'update', 'list', 'get'],
              description: 'Action to perform',
            },
            projectId: { type: 'number', description: 'Project ID' },
            title: { type: 'string', description: 'Story title' },
            description: { type: 'string', description: 'Story description' },
            acceptance_criteria: {
              type: 'array',
              items: { type: 'string' },
              description: 'Acceptance criteria',
            },
            story_points: { type: 'number', description: 'Story points' },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'critical'],
              description: 'Story priority',
            },
          },
          required: ['action', 'projectId'],
        },
      },
      {
        name: 'devai_git_workflow',
        description: 'Execute Git workflow automation',
        inputSchema: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              enum: ['commit', 'branch', 'merge', 'pr'],
              description: 'Git action to perform',
            },
            message: { type: 'string', description: 'Commit message' },
            branch_name: { type: 'string', description: 'Branch name' },
            files: {
              type: 'array',
              items: { type: 'string' },
              description: 'Files to include',
            },
          },
          required: ['action'],
        },
      },
      {
        name: 'devai_test_run',
        description: 'Run tests following TDD principles',
        inputSchema: {
          type: 'object',
          properties: {
            test_type: {
              type: 'string',
              enum: ['unit', 'integration', 'e2e'],
              description: 'Type of tests to run',
            },
            pattern: { type: 'string', description: 'Test file pattern' },
            watch: { type: 'boolean', description: 'Run in watch mode' },
          },
        },
      },
      {
        name: 'devai_data_export',
        description: 'Export DevAI data for inspection and analysis',
        inputSchema: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              enum: [
                'export',
                'summary',
                'project',
                'memories',
                'documents',
                'tools',
              ],
              description: 'Type of export to perform',
            },
            format: {
              type: 'string',
              enum: ['json', 'markdown', 'csv', 'html'],
              description: 'Output format',
            },
            projectId: {
              type: 'number',
              description: 'Project ID for specific exports',
            },
            outputPath: { type: 'string', description: 'Output file path' },
            includeEmbeddings: {
              type: 'boolean',
              description: 'Include vector embeddings in export',
            },
          },
          required: ['action'],
        },
      },

      // Vendored BMAD utility tools (optional helpers)
      {
        name: 'devai_vendor_web_builder',
        description:
          'Build a DevAI/BMAD web bundle from an agent or team id (vendored tool)',
        inputSchema: {
          type: 'object',
          properties: {
            agentOrTeam: {
              type: 'string',
              description: 'Agent or team id to build',
            },
            outDir: {
              type: 'string',
              description: 'Output directory (default: dist)',
            },
          },
          required: ['agentOrTeam'],
        },
      },
      {
        name: 'devai_vendor_yaml_format',
        description: 'Format a YAML file using vendored formatter',
        inputSchema: {
          type: 'object',
          properties: {
            filePath: {
              type: 'string',
              description: 'YAML file path to format',
            },
          },
          required: ['filePath'],
        },
      },
      {
        name: 'devai_vendor_flatten',
        description:
          'Flatten inputs using vendored flattener into an output path',
        inputSchema: {
          type: 'object',
          properties: {
            inputPath: {
              type: 'string',
              description: 'Input directory/file to flatten',
            },
            outPath: { type: 'string', description: 'Output path' },
          },
          required: ['inputPath', 'outPath'],
        },
      },
      {
        name: 'devai_vendor_version_bump',
        description:
          'Run vendored version bump helper (semantic-release advisory)',
        inputSchema: {
          type: 'object',
          properties: {
            level: {
              type: 'string',
              enum: ['patch', 'minor', 'major'],
              description: 'Version bump level (advisory)',
            },
          },
        },
      },
      {
        name: 'devai_vendor_resolve_deps',
        description: 'Resolve agent/team dependencies using vendored resolver',
        inputSchema: {
          type: 'object',
          properties: {
            agentOrTeam: {
              type: 'string',
              description: 'Agent id or team yaml id',
            },
          },
          required: ['agentOrTeam'],
        },
      },

      // BMAD Agent Tools - Convert Zod schemas to JSON schemas
      ...bmadTools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: zodToJsonSchema(tool.inputSchema),
      })),
    ],
  };
});

// Helper function to convert Zod schema to JSON Schema
function zodToJsonSchema(schema: z.ZodType<any>): any {
  // Simple conversion for our BMAD tools - extend as needed
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape;
    const properties: any = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      const zodField = value as z.ZodType<any>;

      if (zodField instanceof z.ZodString) {
        properties[key] = {
          type: 'string',
          description: zodField.description || `${key} parameter`,
        };
        if (!zodField.isOptional()) required.push(key);
      } else if (zodField instanceof z.ZodNumber) {
        properties[key] = {
          type: 'number',
          description: zodField.description || `${key} parameter`,
        };
        if (!zodField.isOptional()) required.push(key);
      } else if (zodField instanceof z.ZodEnum) {
        properties[key] = {
          type: 'string',
          enum: zodField.options,
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
        } else if (innerType instanceof z.ZodNumber) {
          properties[key] = {
            type: 'number',
            description: innerType.description || `${key} parameter`,
          };
        }
      }
    }

    return {
      type: 'object',
      properties,
      required: required.length > 0 ? required : undefined,
    };
  }

  // Fallback for other Zod types
  return { type: 'object', properties: {} };
}

// ============================================================================
// MEMORY MANAGEMENT TOOLS
// ============================================================================

// (removed duplicate ListTools handler)

// ============================================================================
// DEVELOPMENT TOOLS
// ============================================================================

// (removed duplicate ListTools handler)

// ============================================================================
// TOOL HANDLERS
// ============================================================================

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  dbg('CallToolRequest received');
  await ensureSeedLoaded();
  const name = (request.params as any).name as string;
  const args = ((request.params as any).arguments || {}) as any;
  try {
    dbg(
      'CallTool name=',
      name,
      'args=',
      (() => {
        try {
          return JSON.stringify(args).slice(0, 800);
        } catch {
          return '<unserializable>';
        }
      })()
    );
  } catch {}

  try {
    switch (name) {
      // Project management
      case 'devai_project_create':
        return await manageProject({ action: 'create', ...args });

      case 'devai_project_get':
        return await manageProject({ action: 'get', ...args });

      case 'devai_project_list':
        return await manageProject({ action: 'list', ...args });

      case 'devai_project_context':
        return await manageProject({ action: 'context', ...args });

      // Memory management
      case 'devai_memory_store':
        return await manageMemory({ action: 'store', ...args });

      case 'devai_memory_search':
        return await manageMemory({ action: 'search', ...args });

      // Development tools
      case 'devai_policy_validate':
        return await validatePolicy(args.action, args.context, args.agent);

      case 'devai_workflow_execute':
        return await executeWorkflow(
          args.workflowType,
          args.projectId,
          args.steps
        );

      case 'devai_story_manage':
        return await manageStory({ action: args.action, ...args });

      case 'devai_git_workflow':
        return await executeGitWorkflow(args.action, args);

      case 'devai_test_run':
        return await runTests(args.test_type, args.pattern, args.watch);

      case 'devai_data_export':
        return await exportData(args);

      // Vendored BMAD utility tools
      case 'devai_vendor_web_builder':
        return await vendorBmad.runBmadWebBuilder(args);
      case 'devai_vendor_yaml_format':
        return await vendorBmad.runBmadYamlFormat(args);
      case 'devai_vendor_flatten':
        return await vendorBmad.runBmadFlatten(args);
      case 'devai_vendor_version_bump':
        return await vendorBmad.runBmadVersionBump(args);
      case 'devai_vendor_resolve_deps':
        return await vendorBmad.runBmadResolveDeps(args);

      // BMAD Agent Tools
      case 'bmad_po_create_epic':
        return await bmadExecutor('po', 'create-epic', args);
      case 'bmad_po_create_story':
        return await bmadExecutor('po', 'create-story', args);
      case 'bmad_po_shard_doc':
        return await bmadExecutor('po', 'shard-doc', args);
      case 'bmad_po_validate_story':
        return await bmadExecutor('po', 'validate-story', args);

      case 'bmad_sm_draft':
        return await bmadExecutor('sm', 'draft', args);
      case 'bmad_sm_story_checklist':
        return await bmadExecutor('sm', 'story-checklist', args);

      case 'bmad_dev_develop_story':
        return await bmadExecutor('dev', 'develop-story', args);
      case 'bmad_dev_run_tests':
        return await bmadExecutor('dev', 'run-tests', args);
      case 'bmad_dev_explain':
        return await bmadExecutor('dev', 'explain', args);

      case 'bmad_architect_design':
        return await bmadExecutor('architect', 'design', args);

      case 'bmad_qa_review_story':
        return await bmadExecutor('qa', 'review-story', args);

      case 'bmad_correct_course':
        return await bmadExecutor(args.agent, 'correct-course', args);
      case 'bmad_execute_checklist':
        return await bmadExecutor(args.agent, 'execute-checklist', args);

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const msg = (error as any)?.message || String(error);
    const stack = (error as any)?.stack || msg;
    dbg('CallTool error for', name, stack);
    return {
      content: [
        {
          type: 'text',
          text: `Error executing tool ${name}: ${msg}`,
        },
      ],
    };
  }
});

// ============================================================================
// START SERVER
// ============================================================================

async function main() {
  if (process.env.NODE_ENV === 'test') return; // avoid starting transport during tests
  dbg('Starting MCP server', {
    cwd: process.cwd(),
    node: process.version,
    DEVAI_SEED_BUILD: process.env.DEVAI_SEED_BUILD,
    NODE_ENV: process.env.NODE_ENV,
  });
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('DevAI MCP Server started');
}

if (process.env.NODE_ENV !== 'test') {
  main().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}
