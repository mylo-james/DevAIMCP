#!/usr/bin/env tsx
import 'dotenv/config';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, } from '@modelcontextprotocol/sdk/types.js';
// Dynamic import loader for seed tools to support dev (.ts via tsx) and prod (dist/.js)
let manageProject;
let manageMemory;
let exportData;
let validatePolicy;
let switchAgent;
let manageStory;
let executeWorkflow;
let executeGitWorkflow;
let runTests;
let seedLoaded = false;
async function ensureSeedLoaded() {
    if (seedLoaded)
        return;
    const build = process.env.DEVAI_SEED_BUILD || 'ts';
    const importFrom = async (p) => (await import(p));
    if (build === 'ts') {
        const base = '../seed/';
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
    }
    else {
        const base = '../seed/dist/';
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
    }
    seedLoaded = true;
}
// Initialize the MCP server
const server = new Server({
    name: 'devai-mcp-server',
    version: '1.0.0',
    capabilities: {
        tools: {},
        resources: {},
    },
});
// ============================================================================
// PROJECT MANAGEMENT TOOLS
// ============================================================================
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
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
        ],
    };
});
// ============================================================================
// MEMORY MANAGEMENT TOOLS
// ============================================================================
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
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
        ],
    };
});
// ============================================================================
// DEVELOPMENT TOOLS
// ============================================================================
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
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
        ],
    };
});
// ============================================================================
// TOOL HANDLERS
// ============================================================================
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    await ensureSeedLoaded();
    const name = request.params.name;
    const args = (request.params.arguments || {});
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
                return await executeWorkflow(args.workflowType, args.projectId, args.steps);
            case 'devai_story_manage':
                return await manageStory({ action: args.action, ...args });
            case 'devai_git_workflow':
                return await executeGitWorkflow(args.action, args);
            case 'devai_test_run':
                return await runTests(args.test_type, args.pattern, args.watch);
            case 'devai_data_export':
                return await exportData(args);
            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    }
    catch (error) {
        const msg = error?.message || String(error);
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
    if (process.env.NODE_ENV === 'test')
        return; // avoid starting transport during tests
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
