import { validateAction } from '../lib/policy-engine.js';
import { switchAgent, listAvailableAgents } from '../lib/agent-context.js';
import { shardDocument } from '../tools/shard-doc.js';
import { manageStory } from '../tools/story-manager.js';
import { executeWorkflow } from '../tools/workflow-executor.js';
import { executeGitWorkflow } from '../tools/git-workflow.js';
import { runTests } from '../tools/test-runner.js';
import { manageVectorStore } from '../tools/vector-store-manager.js';

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
  handler: (args: any) => Promise<any>;
}

export const tools: MCPTool[] = [
  {
    name: 'devai_policy_validate',
    description: 'Validate actions against DevAI policy before execution',
    inputSchema: {
      type: 'object',
      properties: {
        actionType: {
          type: 'string',
          enum: ['plan', 'code', 'test', 'refactor', 'review', 'doc'],
        },
        files: {
          type: 'array',
          items: { type: 'string' },
        },
        branch: { type: 'string' },
        testsPlanned: { type: 'boolean' },
        storyId: { type: 'string' },
      },
      required: ['actionType'],
    },
    handler: async (args) => {
      return await validateAction(args);
    },
  },

  {
    name: 'devai_agent_switch',
    description: 'Switch between DevAI agents (SM, Dev, QA, etc.)',
    inputSchema: {
      type: 'object',
      properties: {
        agent: {
          type: 'string',
          enum: [
            'sm',
            'dev',
            'qa',
            'pm',
            'architect',
            'po',
            'analyst',
            'ux-expert',
          ],
        },
        context: { type: 'string' },
        storyId: { type: 'string' },
      },
      required: ['agent'],
    },
    handler: async (args) => {
      return await switchAgent(args);
    },
  },

  {
    name: 'devai_agent_list',
    description: 'List available DevAI agents',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    handler: async () => {
      return await listAvailableAgents();
    },
  },

  {
    name: 'devai_shard_doc',
    description: 'Shard large documents into manageable pieces',
    inputSchema: {
      type: 'object',
      properties: {
        inPath: { type: 'string' },
        outDir: { type: 'string' },
        agent: { type: 'string' },
      },
      required: ['inPath', 'outDir'],
    },
    handler: async (args) => {
      return await shardDocument(args);
    },
  },

  {
    name: 'devai_story_manage',
    description: 'Create, update, and track story status',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['create', 'update', 'status', 'list'],
        },
        epic: { type: 'string' },
        storyId: { type: 'string' },
        status: {
          type: 'string',
          enum: ['Draft', 'Approved', 'InProgress', 'Done'],
        },
        agent: { type: 'string' },
      },
      required: ['action'],
    },
    handler: async (args) => {
      return await manageStory(args);
    },
  },

  {
    name: 'devai_workflow_execute',
    description: 'Execute predefined DevAI workflows',
    inputSchema: {
      type: 'object',
      properties: {
        workflow: { type: 'string' },
        phase: {
          type: 'string',
          enum: ['planning', 'development', 'testing'],
        },
        agent: { type: 'string' },
        options: { type: 'object' },
      },
      required: ['workflow', 'phase'],
    },
    handler: async (args) => {
      return await executeWorkflow(args);
    },
  },

  {
    name: 'devai_git_workflow',
    description: 'Execute DevAI git workflow (pull main, create branch, etc.)',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['setup', 'commit', 'pr', 'status'],
        },
        branch: { type: 'string' },
        message: { type: 'string' },
        files: {
          type: 'array',
          items: { type: 'string' },
        },
        agent: { type: 'string' },
      },
      required: ['action'],
    },
    handler: async (args) => {
      return await executeGitWorkflow(args);
    },
  },

  {
    name: 'devai_test_execute',
    description: 'Run tests following DevAI TDD principles',
    inputSchema: {
      type: 'object',
      properties: {
        testType: {
          type: 'string',
          enum: ['unit', 'integration', 'e2e'],
        },
        pattern: { type: 'string' },
        watch: { type: 'boolean' },
        files: {
          type: 'array',
          items: { type: 'string' },
        },
        agent: { type: 'string' },
      },
      required: ['testType'],
    },
    handler: async (args) => {
      return await runTests(args);
    },
  },

  {
    name: 'devai_vector_index',
    description: 'Index a project into the vector store for semantic search',
    inputSchema: {
      type: 'object',
      properties: {
        projectPath: { type: 'string' },
        projectName: { type: 'string' },
        agent: { type: 'string' },
      },
      required: ['projectPath', 'projectName'],
    },
    handler: async (args) => {
      return await manageVectorStore({
        action: 'index',
        projectPath: args.projectPath,
        projectName: args.projectName,
        agent: args.agent || 'dev',
      });
    },
  },

  {
    name: 'devai_vector_search',
    description: 'Search project data in the vector store',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        project: { type: 'string' },
        type: { type: 'string' },
        tags: {
          type: 'array',
          items: { type: 'string' },
        },
        agent: { type: 'string' },
      },
      required: ['query'],
    },
    handler: async (args) => {
      return await manageVectorStore({
        action: 'search',
        query: args.query,
        filters: {
          project: args.project,
          type: args.type,
          tags: args.tags,
        },
        agent: args.agent || 'dev',
      });
    },
  },

  {
    name: 'devai_vector_context',
    description: 'Get project context from the vector store',
    inputSchema: {
      type: 'object',
      properties: {
        projectName: { type: 'string' },
        query: { type: 'string' },
        agent: { type: 'string' },
      },
      required: ['projectName'],
    },
    handler: async (args) => {
      return await manageVectorStore({
        action: 'context',
        projectName: args.projectName,
        query: args.query,
        agent: args.agent || 'dev',
      });
    },
  },

  {
    name: 'devai_vector_add',
    description: 'Add new data to the vector store',
    inputSchema: {
      type: 'object',
      properties: {
        projectName: { type: 'string' },
        content: { type: 'string' },
        type: { type: 'string' },
        file: { type: 'string' },
        section: { type: 'string' },
        tags: {
          type: 'array',
          items: { type: 'string' },
        },
        agent: { type: 'string' },
      },
      required: ['projectName', 'content', 'type'],
    },
    handler: async (args) => {
      return await manageVectorStore({
        action: 'add',
        projectName: args.projectName,
        data: {
          content: args.content,
          type: args.type,
          file: args.file,
          section: args.section,
          tags: args.tags,
        },
        agent: args.agent || 'dev',
      });
    },
  },
];
