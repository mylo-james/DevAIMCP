#!/usr/bin/env tsx
import 'dotenv/config';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
	CallToolRequestSchema,
	ListToolsRequestSchema,
	ListResourcesRequestSchema,
	ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

// Local resources
import { resources } from './resources.ts';

// Seed imports (dev mode wiring)
import { manageProject } from '../seed/tools/project-manager.ts';
import { manageMemory } from '../seed/tools/memory-manager.ts';
import { exportData } from '../seed/tools/data-exporter.ts';
import { validatePolicy } from '../seed/lib/policy-engine.ts';
import { switchAgent } from '../seed/lib/agent-context.ts';
import { shardDocument } from '../seed/tools/shard-doc.ts';
import { manageStory } from '../seed/tools/story-manager.ts';
import { executeWorkflow } from '../seed/tools/workflow-executor.ts';
import { executeGitWorkflow } from '../seed/tools/git-workflow.ts';
import { runTests } from '../seed/tools/test-runner.ts';

// Initialize the MCP server
const server = new Server(
	{
		name: 'devai-mcp-server',
		version: '1.0.0',
	},
	{
		capabilities: {
			tools: {},
			resources: {},
		},
	}
);

// ----------------------------------------------------------------------------
// Consolidated tool list
// ----------------------------------------------------------------------------

const combinedTools = [
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
	{
		name: 'devai_memory_store',
		description: 'Store AI memory or learning',
		inputSchema: {
			type: 'object',
			properties: {
				projectId: { type: 'number', description: 'Project ID' },
				memoryType: {
					type: 'string',
					enum: ['decision', 'pattern', 'learning', 'preference', 'insight'],
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
				projectId: { type: 'number', description: 'Project ID to search within' },
				memoryType: { type: 'string', description: 'Filter by memory type' },
				limit: { type: 'number', description: 'Maximum results to return' },
			},
			required: ['query'],
		},
	},
	{
		name: 'devai_policy_validate',
		description: 'Validate actions against DevAI policy',
		inputSchema: {
			type: 'object',
			properties: {
				action: { type: 'string', description: 'Action to validate' },
				context: { type: 'string', description: 'Context of the action' },
				agent: { type: 'string', description: 'Agent performing the action' },
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
				test_type: { type: 'string', enum: ['unit', 'integration', 'e2e'] },
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
					enum: ['export', 'summary', 'project', 'memories', 'documents', 'tools'],
					description: 'Type of export to perform',
				},
				format: {
					type: 'string',
					enum: ['json', 'markdown', 'csv', 'html'],
					description: 'Output format',
				},
				projectId: { type: 'number', description: 'Project ID for specific exports' },
				outputPath: { type: 'string', description: 'Output file path' },
				includeEmbeddings: { type: 'boolean', description: 'Include vector embeddings in export' },
			},
			required: ['action'],
		},
	},
];

server.setRequestHandler(ListToolsRequestSchema, async () => {
	// Deduplicate by name just in case
	const seen = new Set<string>();
	const tools = combinedTools.filter((t) => {
		if (seen.has(t.name)) return false;
		seen.add(t.name);
		return true;
	});
	return { tools };
});

// ----------------------------------------------------------------------------
// Tool execution routing
// ----------------------------------------------------------------------------

const PolicySchema = z.object({ action: z.string(), context: z.string(), agent: z.string().optional() });
const WorkflowSchema = z.object({ workflowType: z.string(), projectId: z.number(), steps: z.array(z.any()).optional() });
const StorySchema = z.object({ action: z.enum(['create','update','list','get']), projectId: z.number() }).passthrough();
const GitSchema = z.object({ action: z.enum(['commit','branch','merge','pr']) }).passthrough();
const TestSchema = z.object({ test_type: z.enum(['unit','integration','e2e']).optional(), pattern: z.string().optional(), watch: z.boolean().optional() });
const DataExportSchema = z.object({ action: z.string(), format: z.string().optional(), projectId: z.number().optional(), outputPath: z.string().optional(), includeEmbeddings: z.boolean().optional() }).passthrough();
const ProjectCreateSchema = z.object({ name: z.string() }).passthrough();
const ProjectGetSchema = z.object({ projectId: z.number() });
const ProjectListSchema = z.object({}).passthrough();
const ProjectContextSchema = z.object({ projectId: z.number(), query: z.string().optional() });
const MemoryStoreSchema = z.object({ projectId: z.number(), memoryType: z.string(), content: z.string() }).passthrough();
const MemorySearchSchema = z.object({ query: z.string(), projectId: z.number().optional(), memoryType: z.string().optional(), limit: z.number().optional() });

export async function handleCallTool(name: string, args: any) {
	switch (name) {
		case 'devai_project_create':
			ProjectCreateSchema.parse(args);
			return await manageProject({ action: 'create', ...args });
		case 'devai_project_get':
			return await manageProject({ action: 'get', ...ProjectGetSchema.parse(args) });
		case 'devai_project_list':
			ProjectListSchema.parse(args);
			return await manageProject({ action: 'list', ...args });
		case 'devai_project_context':
			return await manageProject({ action: 'context', ...ProjectContextSchema.parse(args) });
		case 'devai_memory_store':
			return await manageMemory({ action: 'store', ...MemoryStoreSchema.parse(args) });
		case 'devai_memory_search':
			return await manageMemory({ action: 'search', ...MemorySearchSchema.parse(args) });
		case 'devai_policy_validate':
			return await validatePolicy(...Object.values(PolicySchema.parse(args)));
		case 'devai_workflow_execute':
			{
				const parsed = WorkflowSchema.parse(args);
				return await executeWorkflow(parsed.workflowType, parsed.projectId, parsed.steps);
			}
		case 'devai_story_manage':
			return await manageStory(StorySchema.parse(args));
		case 'devai_git_workflow':
			return await executeGitWorkflow(GitSchema.parse(args));
		case 'devai_test_run':
			return await runTests(...Object.values(TestSchema.parse(args)) as any);
		case 'devai_data_export':
			return await exportData(DataExportSchema.parse(args));
		default:
			throw new Error(`Unknown tool: ${name}`);
	}
}

server.setRequestHandler(CallToolRequestSchema, async (request) => {
	const { name, arguments: args } = request.params;
	try {
		return await handleCallTool(name, args);
	} catch (error) {
		return { content: [{ type: 'text', text: `Error executing tool ${name}: ${(error as Error).message}` }] };
	}
});

// ----------------------------------------------------------------------------
// Resources: list and read
// ----------------------------------------------------------------------------

server.setRequestHandler(ListResourcesRequestSchema, async () => {
	return {
		resources: resources.map((r) => ({
			uri: r.uri,
			name: r.name,
			description: r.description,
			mimeType: r.mimeType,
		})),
	};
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
	const { uri } = request.params;
	const resource = resources.find((r) => r.uri === uri);
	if (!resource) {
		return { contents: [] };
	}
	try {
		const textContent = await resource.handler();
		return {
			contents: [
				{
					uri: resource.uri,
					mimeType: resource.mimeType,
					type: 'text',
					text: textContent,
				},
			],
		};
	} catch (error) {
		return {
			contents: [
				{
					uri: resource.uri,
					mimeType: 'text/plain',
					type: 'text',
					text: `Error reading resource: ${(error as Error).message}`,
				},
			],
		};
	}
});

// ----------------------------------------------------------------------------
// Start server
// ----------------------------------------------------------------------------

async function main() {
	const transport = new StdioServerTransport();
	await server.connect(transport);
	console.error('DevAI MCP Server started');
}

// Export helpers for tests
export function createServer() {
	return server;
}
export function getAllTools() {
	return combinedTools.map((t) => t.name);
}

if (process.env.MCP_TEST !== '1') {
	main().catch((error) => {
		console.error('Failed to start server:', error);
		process.exit(1);
	});
}
