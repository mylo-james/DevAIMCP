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
let orchestratorService: any;
let personaService: any;
let importanceManager: any;
let authorizationService: any;
let devWorkflowEngine: any;
let enhancedMemoryManager: any;
let retrievalService: any;
let hitlService: any;
let notificationService: any;

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
    ({ OrchestratorService: orchestratorService } = await importFrom(lib + 'orchestrator' + ext));
    ({ PersonaService: personaService } = await importFrom(lib + 'personas' + ext));
    ({ ImportanceManager: importanceManager } = await importFrom(lib + 'importance-manager' + ext));
    ({ AuthorizationService: authorizationService } = await importFrom(lib + 'authorization' + ext));
    ({ DevWorkflowEngine: devWorkflowEngine } = await importFrom(lib + 'dev-workflow' + ext));
    ({ EnhancedMemoryManager: enhancedMemoryManager } = await importFrom(lib + 'memory-manager-enhanced' + ext));
    ({ RetrievalService: retrievalService } = await importFrom(lib + 'retrieval-service' + ext));
    ({ HITLService: hitlService } = await importFrom(lib + 'hitl-service' + ext));
    ({ NotificationService: notificationService } = await importFrom(lib + 'notification-service' + ext));
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
    ({ OrchestratorService: orchestratorService } = await importFrom(lib + 'orchestrator' + ext));
    ({ PersonaService: personaService } = await importFrom(lib + 'personas' + ext));
    ({ ImportanceManager: importanceManager } = await importFrom(lib + 'importance-manager' + ext));
    ({ AuthorizationService: authorizationService } = await importFrom(lib + 'authorization' + ext));
    ({ DevWorkflowEngine: devWorkflowEngine } = await importFrom(lib + 'dev-workflow' + ext));
    ({ EnhancedMemoryManager: enhancedMemoryManager } = await importFrom(lib + 'memory-manager-enhanced' + ext));
    ({ RetrievalService: retrievalService } = await importFrom(lib + 'retrieval-service' + ext));
    ({ HITLService: hitlService } = await importFrom(lib + 'hitl-service' + ext));
    ({ NotificationService: notificationService } = await importFrom(lib + 'notification-service' + ext));
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

      // DevAI Mode and Orchestrator tools
      {
        name: 'devai_mode_activate',
        description: 'Activate DevAI mode and get orchestrator greeting',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: { type: 'number', description: 'Optional project ID for context' },
            initialQuery: { type: 'string', description: 'Optional initial user query to process' },
            userContext: { type: 'object', description: 'Optional user context information' },
          },
        },
      },
      {
        name: 'devai_orchestrator_process',
        description: 'Process natural language input through the orchestrator',
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: { type: 'string', description: 'DevAI session ID' },
            userInput: { type: 'string', description: 'Natural language user input' },
          },
          required: ['sessionId', 'userInput'],
        },
      },
      {
        name: 'devai_persona_activate',
        description: 'Activate a persona for in-character interaction',
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: { type: 'string', description: 'DevAI session ID' },
            personaId: { type: 'number', description: 'Persona ID to activate' },
          },
          required: ['sessionId', 'personaId'],
        },
      },
      {
        name: 'devai_persona_process',
        description: 'Process input with in-character behavior enforcement',
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: { type: 'string', description: 'DevAI session ID' },
            userInput: { type: 'string', description: 'User input to process' },
          },
          required: ['sessionId', 'userInput'],
        },
      },
      {
        name: 'devai_persona_handoff',
        description: 'Hand off conversation to another persona',
        inputSchema: {
          type: 'object',
          properties: {
            fromSessionId: { type: 'string', description: 'Current session ID' },
            toPersonaRole: { type: 'string', description: 'Target persona role' },
            handoffContext: { type: 'string', description: 'Context for the handoff' },
          },
          required: ['fromSessionId', 'toPersonaRole', 'handoffContext'],
        },
      },
      {
        name: 'devai_persona_list',
        description: 'List all available personas',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },

      // Importance Management tools
      {
        name: 'devai_importance_increment',
        description: 'Increment importance score for actor-resource pair on confirmed hit',
        inputSchema: {
          type: 'object',
          properties: {
            actorId: { type: 'number', description: 'Actor ID' },
            resourceId: { type: 'number', description: 'Resource ID' },
          },
          required: ['actorId', 'resourceId'],
        },
      },
      {
        name: 'devai_importance_get_ranked',
        description: 'Get resources ranked by vector similarity and actor importance',
        inputSchema: {
          type: 'object',
          properties: {
            actorId: { type: 'number', description: 'Actor ID' },
            query: { type: 'string', description: 'Search query for vector similarity' },
            projectId: { type: 'number', description: 'Optional project ID filter' },
            limit: { type: 'number', description: 'Maximum results to return' },
          },
          required: ['actorId', 'query'],
        },
      },
      {
        name: 'devai_importance_nightly_decay',
        description: 'Run nightly decay process for active actors',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'devai_kb_resource_create',
        description: 'Create a new knowledge base resource',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: { type: 'number', description: 'Project ID' },
            uri: { type: 'string', description: 'Resource URI' },
            type: { type: 'string', description: 'Resource type' },
            content: { type: 'string', description: 'Resource content' },
            accessTags: { 
              type: 'array', 
              items: { type: 'string' },
              description: 'Access control tags' 
            },
            metadata: { type: 'object', description: 'Additional metadata' },
          },
          required: ['projectId', 'uri', 'type'],
        },
      },

      // Authorization tools
      {
        name: 'devai_auth_generate_key',
        description: 'Generate a new actor key for authorization',
        inputSchema: {
          type: 'object',
          properties: {
            actorId: { type: 'number', description: 'Actor ID' },
            scopes: { 
              type: 'array', 
              items: { type: 'string' },
              description: 'Access scopes for the key' 
            },
            expiresInDays: { type: 'number', description: 'Key expiration in days' },
          },
          required: ['actorId'],
        },
      },
      {
        name: 'devai_auth_validate_key',
        description: 'Validate an actor key',
        inputSchema: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Actor key to validate' },
          },
          required: ['key'],
        },
      },
      {
        name: 'devai_auth_check_access',
        description: 'Check if actor has access to a resource',
        inputSchema: {
          type: 'object',
          properties: {
            actorId: { type: 'number', description: 'Actor ID' },
            resourceId: { type: 'number', description: 'Resource ID' },
          },
          required: ['actorId', 'resourceId'],
        },
      },
      {
        name: 'devai_auth_get_audit_log',
        description: 'Get audit log of access decisions',
        inputSchema: {
          type: 'object',
          properties: {
            actorId: { type: 'number', description: 'Filter by actor ID' },
            resourceId: { type: 'number', description: 'Filter by resource ID' },
            decision: { 
              type: 'string', 
              enum: ['allow', 'deny'],
              description: 'Filter by decision type' 
            },
            limit: { type: 'number', description: 'Maximum results to return' },
          },
        },
      },

      // Development Workflow tools
      {
        name: 'devai_workflow_start',
        description: 'Start SM→Dev→QA workflow for a story',
        inputSchema: {
          type: 'object',
          properties: {
            storyId: { type: 'number', description: 'Story ID' },
            epicId: { type: 'number', description: 'Optional epic ID' },
          },
          required: ['storyId'],
        },
      },
      {
        name: 'devai_workflow_sm_complete',
        description: 'SM completes story draft and hands off to Dev',
        inputSchema: {
          type: 'object',
          properties: {
            storyId: { type: 'number', description: 'Story ID' },
            smActorId: { type: 'number', description: 'SM Actor ID' },
          },
          required: ['storyId', 'smActorId'],
        },
      },
      {
        name: 'devai_workflow_dev_complete',
        description: 'Dev completes implementation and hands off to QA',
        inputSchema: {
          type: 'object',
          properties: {
            storyId: { type: 'number', description: 'Story ID' },
            devActorId: { type: 'number', description: 'Dev Actor ID' },
          },
          required: ['storyId', 'devActorId'],
        },
      },
      {
        name: 'devai_workflow_qa_approve',
        description: 'QA approves story and triggers auto-push',
        inputSchema: {
          type: 'object',
          properties: {
            storyId: { type: 'number', description: 'Story ID' },
            qaActorId: { type: 'number', description: 'QA Actor ID' },
          },
          required: ['storyId', 'qaActorId'],
        },
      },
      {
        name: 'devai_workflow_qa_reject',
        description: 'QA rejects story, creates defect, and triggers storification',
        inputSchema: {
          type: 'object',
          properties: {
            storyId: { type: 'number', description: 'Story ID' },
            qaActorId: { type: 'number', description: 'QA Actor ID' },
            defectTitle: { type: 'string', description: 'Defect title' },
            defectDescription: { type: 'string', description: 'Defect description' },
            severity: { 
              type: 'string', 
              enum: ['low', 'medium', 'high', 'critical'],
              description: 'Defect severity' 
            },
          },
          required: ['storyId', 'qaActorId', 'defectTitle', 'defectDescription'],
        },
      },
      {
        name: 'devai_workflow_get_state',
        description: 'Get current workflow state for a story',
        inputSchema: {
          type: 'object',
          properties: {
            storyId: { type: 'number', description: 'Story ID' },
          },
          required: ['storyId'],
        },
      },

      // Post-Job Memory tools
      {
        name: 'devai_memory_post_job_store',
        description: 'Store mandatory post-job memory with story reference and critical learnings',
        inputSchema: {
          type: 'object',
          properties: {
            actorId: { type: 'number', description: 'Actor ID' },
            storyId: { type: 'number', description: 'Story ID reference' },
            jobType: { type: 'string', description: 'Type of job completed' },
            summary: { type: 'string', description: 'Concise summary of actions' },
            criticalLearnings: { 
              type: 'array', 
              items: { type: 'string' },
              description: 'Critical learnings from the job' 
            },
            confidence: { type: 'number', description: 'Confidence level (0-1)' },
            additionalTags: { 
              type: 'array', 
              items: { type: 'string' },
              description: 'Additional tags for categorization' 
            },
          },
          required: ['actorId', 'jobType', 'summary', 'confidence'],
        },
      },
      {
        name: 'devai_memory_post_job_search',
        description: 'Search post-job memories semantically',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
            actorId: { type: 'number', description: 'Filter by actor ID' },
            storyId: { type: 'number', description: 'Filter by story ID' },
            jobType: { type: 'string', description: 'Filter by job type' },
            criticalOnly: { type: 'boolean', description: 'Only return critical memories' },
            limit: { type: 'number', description: 'Maximum results to return' },
          },
          required: ['query'],
        },
      },
      {
        name: 'devai_memory_execute_hook',
        description: 'Execute post-job memory hook for an actor',
        inputSchema: {
          type: 'object',
          properties: {
            actorId: { type: 'number', description: 'Actor ID' },
            actorRole: { type: 'string', description: 'Actor role' },
            storyId: { type: 'number', description: 'Story ID' },
            jobType: { type: 'string', description: 'Job type completed' },
            jobResult: { type: 'object', description: 'Job result data' },
            confidence: { type: 'number', description: 'Confidence level (0-1)' },
          },
          required: ['actorId', 'actorRole', 'jobType', 'jobResult', 'confidence'],
        },
      },

      // Retrieval Service tools
      {
        name: 'devai_retrieve',
        description: 'Retrieve resources using vector + importance + ACL filtering',
        inputSchema: {
          type: 'object',
          properties: {
            actorId: { type: 'number', description: 'Actor ID for importance and ACL' },
            query: { type: 'string', description: 'Search query' },
            projectId: { type: 'number', description: 'Optional project ID filter' },
            resourceTypes: { 
              type: 'array', 
              items: { type: 'string' },
              description: 'Optional resource type filters' 
            },
            limit: { type: 'number', description: 'Maximum results to return' },
            includeGlobalRecency: { type: 'boolean', description: 'Include global recency in scoring' },
          },
          required: ['actorId', 'query'],
        },
      },
      {
        name: 'devai_retrieve_with_feedback',
        description: 'Retrieve resources and increment importance for confirmed hits',
        inputSchema: {
          type: 'object',
          properties: {
            actorId: { type: 'number', description: 'Actor ID' },
            query: { type: 'string', description: 'Search query' },
            projectId: { type: 'number', description: 'Optional project ID filter' },
            confirmedResourceIds: { 
              type: 'array', 
              items: { type: 'number' },
              description: 'Resource IDs that were confirmed as helpful' 
            },
            limit: { type: 'number', description: 'Maximum results to return' },
          },
          required: ['actorId', 'query'],
        },
      },
      {
        name: 'devai_retrieve_advanced',
        description: 'Advanced retrieval with custom ranking strategies',
        inputSchema: {
          type: 'object',
          properties: {
            actorId: { type: 'number', description: 'Actor ID' },
            query: { type: 'string', description: 'Search query' },
            projectId: { type: 'number', description: 'Optional project ID filter' },
            rankingStrategy: { 
              type: 'string', 
              enum: ['vector_only', 'importance_only', 'combined', 'recency_boosted'],
              description: 'Ranking strategy to use' 
            },
            limit: { type: 'number', description: 'Maximum results to return' },
          },
          required: ['actorId', 'query'],
        },
      },
      {
        name: 'devai_retrieve_stats',
        description: 'Get retrieval statistics for an actor',
        inputSchema: {
          type: 'object',
          properties: {
            actorId: { type: 'number', description: 'Actor ID' },
          },
          required: ['actorId'],
        },
      },

      // HITL (Human-in-the-Loop) tools
      {
        name: 'devai_hitl_check_epic_completion',
        description: 'Check if epic is complete and requires HITL approval',
        inputSchema: {
          type: 'object',
          properties: {
            epicId: { type: 'number', description: 'Epic ID to check' },
          },
          required: ['epicId'],
        },
      },
      {
        name: 'devai_hitl_create_request',
        description: 'Create a HITL request for human approval',
        inputSchema: {
          type: 'object',
          properties: {
            epicId: { type: 'number', description: 'Epic ID' },
            requesterActorId: { type: 'number', description: 'Actor requesting HITL' },
            requestType: { 
              type: 'string', 
              enum: ['epic_completion', 'escalation'],
              description: 'Type of HITL request' 
            },
            title: { type: 'string', description: 'Request title' },
            description: { type: 'string', description: 'Request description' },
            context: { type: 'object', description: 'Additional context' },
            priority: { 
              type: 'string', 
              enum: ['low', 'medium', 'high', 'urgent'],
              description: 'Request priority' 
            },
          },
          required: ['epicId', 'requesterActorId', 'requestType', 'title', 'description', 'context', 'priority'],
        },
      },
      {
        name: 'devai_hitl_process_decision',
        description: 'Process human decision on HITL request',
        inputSchema: {
          type: 'object',
          properties: {
            hitlRequestId: { type: 'number', description: 'HITL request ID' },
            decision: { 
              type: 'string', 
              enum: ['approved', 'rejected'],
              description: 'Human decision' 
            },
            humanReviewer: { type: 'string', description: 'Name/ID of human reviewer' },
            reason: { type: 'string', description: 'Reason for decision' },
          },
          required: ['hitlRequestId', 'decision', 'humanReviewer', 'reason'],
        },
      },
      {
        name: 'devai_hitl_escalate',
        description: 'Escalate HITL request to next level',
        inputSchema: {
          type: 'object',
          properties: {
            hitlRequestId: { type: 'number', description: 'HITL request ID to escalate' },
            reason: { type: 'string', description: 'Reason for escalation' },
          },
          required: ['hitlRequestId', 'reason'],
        },
      },
      {
        name: 'devai_hitl_get_pending',
        description: 'Get pending HITL requests',
        inputSchema: {
          type: 'object',
          properties: {
            requestType: { 
              type: 'string', 
              enum: ['epic_completion', 'escalation'],
              description: 'Filter by request type' 
            },
            priority: { 
              type: 'string', 
              enum: ['low', 'medium', 'high', 'urgent'],
              description: 'Filter by priority' 
            },
            limit: { type: 'number', description: 'Maximum results to return' },
          },
        },
      },
      {
        name: 'devai_hitl_get_stats',
        description: 'Get HITL statistics and metrics',
        inputSchema: {
          type: 'object',
          properties: {},
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

      // DevAI Notification Tools
      {
        name: 'devai_notify_completion',
        description: 'Send notification when agent completes their work to reduce HITL times',
        inputSchema: {
          type: 'object',
          properties: {
            actorId: { type: 'number', description: 'Actor ID who completed the work' },
            actorRole: { type: 'string', description: 'Role of the actor (e.g., Scrum Master, Developer, QA)' },
            storyId: { type: 'number', description: 'Story ID that was worked on' },
            jobType: { type: 'string', description: 'Type of job completed (e.g., story_draft, implementation, validation)' },
            completionDetails: {
              type: 'object',
              properties: {
                challenges: { type: 'string', description: 'Any challenges encountered during the work' },
                nextSteps: { type: 'string', description: 'Next steps or recommendations' },
                url: { type: 'string', description: 'URL to view the completed work' },
                confidence: { type: 'number', description: 'Confidence level in the completion (0-1)' },
              },
              description: 'Additional details about the completion',
            },
          },
          required: ['actorId', 'actorRole', 'storyId', 'jobType'],
        },
      },
      {
        name: 'devai_configure_notification',
        description: 'Configure notification settings for an actor',
        inputSchema: {
          type: 'object',
          properties: {
            actorId: { type: 'number', description: 'Actor ID to configure notifications for' },
            notificationType: { 
              type: 'string', 
              enum: ['pushover', 'ifttt', 'webhook', 'email'],
              description: 'Type of notification service' 
            },
            configData: { type: 'object', description: 'Configuration data for the notification service' },
          },
          required: ['actorId', 'notificationType', 'configData'],
        },
      },
      {
        name: 'devai_test_notification',
        description: 'Test notification configuration for an actor',
        inputSchema: {
          type: 'object',
          properties: {
            actorId: { type: 'number', description: 'Actor ID to test notifications for' },
            notificationType: { type: 'string', description: 'Type of notification to test' },
          },
          required: ['actorId', 'notificationType'],
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
      // DevAI Mode and Orchestrator
      case 'devai_mode_activate':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await orchestratorService.activateDevAIMode(args)),
            },
          ],
        };

      case 'devai_orchestrator_process':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await orchestratorService.processNaturalLanguageInput(args)),
            },
          ],
        };

      // Persona management
      case 'devai_persona_activate':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await personaService.activatePersona(args.sessionId, args.personaId)),
            },
          ],
        };

      case 'devai_persona_process':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await personaService.processInCharacter(args.sessionId, args.userInput)),
            },
          ],
        };

      case 'devai_persona_handoff':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await personaService.handoffToPersona(args.fromSessionId, args.toPersonaRole, args.handoffContext)),
            },
          ],
        };

      case 'devai_persona_list':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await personaService.getPersonas()),
            },
          ],
        };

      // Importance management
      case 'devai_importance_increment':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await importanceManager.incrementImportance(args.actorId, args.resourceId)),
            },
          ],
        };

      case 'devai_importance_get_ranked':
        const { generateEmbedding } = await import('./seed/lib/database.ts');
        const queryEmbedding = await generateEmbedding(args.query);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await importanceManager.getRankedResources({
                actorId: args.actorId,
                queryEmbedding,
                projectId: args.projectId,
                limit: args.limit,
              })),
            },
          ],
        };

      case 'devai_importance_nightly_decay':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await importanceManager.runNightlyDecay()),
            },
          ],
        };

      case 'devai_kb_resource_create':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await importanceManager.createKBResource({
                project_id: args.projectId,
                uri: args.uri,
                type: args.type,
                content: args.content,
                access_tags: args.accessTags || [],
                metadata: args.metadata,
              })),
            },
          ],
        };

      // Authorization
      case 'devai_auth_generate_key':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await authorizationService.generateActorKey(
                args.actorId, 
                args.scopes, 
                args.expiresInDays
              )),
            },
          ],
        };

      case 'devai_auth_validate_key':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await authorizationService.validateActorKey(args.key)),
            },
          ],
        };

      case 'devai_auth_check_access':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await authorizationService.checkResourceAccess(args.actorId, args.resourceId)),
            },
          ],
        };

      case 'devai_auth_get_audit_log':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await authorizationService.getAuditLog(args)),
            },
          ],
        };

      // Development Workflow
      case 'devai_workflow_start':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await devWorkflowEngine.startWorkflow(args.storyId, args.epicId)),
            },
          ],
        };

      case 'devai_workflow_sm_complete':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await devWorkflowEngine.smCompletesDraft(args.storyId, args.smActorId)),
            },
          ],
        };

      case 'devai_workflow_dev_complete':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await devWorkflowEngine.devCompletesImplementation(args.storyId, args.devActorId)),
            },
          ],
        };

      case 'devai_workflow_qa_approve':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await devWorkflowEngine.qaApproves(args.storyId, args.qaActorId)),
            },
          ],
        };

      case 'devai_workflow_qa_reject':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await devWorkflowEngine.qaRejects(
                args.storyId, 
                args.qaActorId, 
                args.defectTitle, 
                args.defectDescription, 
                args.severity
              )),
            },
          ],
        };

      case 'devai_workflow_get_state':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(devWorkflowEngine.getWorkflowState(args.storyId)),
            },
          ],
        };

      // Project management
      case 'devai_project_create':
        return await manageProject({ action: 'create', ...args });

      case 'devai_project_get':
        return await manageProject({ action: 'get', ...args });

      case 'devai_project_list':
        return await manageProject({ action: 'list', ...args });

      case 'devai_project_context':
        return await manageProject({ action: 'context', ...args });

      // Post-Job Memory
      case 'devai_memory_post_job_store':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await enhancedMemoryManager.storePostJobMemory(args)),
            },
          ],
        };

      case 'devai_memory_post_job_search':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await enhancedMemoryManager.searchPostJobMemories(args)),
            },
          ],
        };

      case 'devai_memory_execute_hook':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await enhancedMemoryManager.executePostJobHook(args)),
            },
          ],
        };

      // Retrieval Service
      case 'devai_retrieve':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await retrievalService.retrieve(args)),
            },
          ],
        };

      case 'devai_retrieve_with_feedback':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await retrievalService.searchWithFeedback(args)),
            },
          ],
        };

      case 'devai_retrieve_advanced':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await retrievalService.advancedSearch(args)),
            },
          ],
        };

      case 'devai_retrieve_stats':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await retrievalService.getRetrievalStats(args.actorId)),
            },
          ],
        };

      // HITL (Human-in-the-Loop)
      case 'devai_hitl_check_epic_completion':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await hitlService.checkEpicCompletion(args.epicId)),
            },
          ],
        };

      case 'devai_hitl_create_request':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await hitlService.createHITLRequest({
                epic_id: args.epicId,
                requester_actor_id: args.requesterActorId,
                request_type: args.requestType,
                title: args.title,
                description: args.description,
                context: args.context,
                priority: args.priority,
              })),
            },
          ],
        };

      case 'devai_hitl_process_decision':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await hitlService.processHumanDecision(
                args.hitlRequestId,
                args.decision,
                args.humanReviewer,
                args.reason
              )),
            },
          ],
        };

      case 'devai_hitl_escalate':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await hitlService.escalateRequest(args.hitlRequestId, args.reason)),
            },
          ],
        };

      case 'devai_hitl_get_pending':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await hitlService.getPendingHITLRequests(args)),
            },
          ],
        };

      case 'devai_hitl_get_stats':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await hitlService.getHITLStats()),
            },
          ],
        };

      // Notification Service
      case 'devai_notify_completion':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await notificationService.getInstance().notifyAgentCompletion(
                args.actorId,
                args.actorRole,
                args.storyId,
                args.jobType,
                args.completionDetails
              )),
            },
          ],
        };

      case 'devai_configure_notification':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await notificationService.getInstance().configureNotification(
                args.actorId,
                args.notificationType,
                args.configData
              )),
            },
          ],
        };

      case 'devai_test_notification':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await notificationService.getInstance().testNotification(
                args.actorId,
                args.notificationType
              )),
            },
          ],
        };

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
