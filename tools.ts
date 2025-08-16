/**
 * DevAI MCP Server Tools
 * BMAD methodology tools organized by agent type
 */

import { z } from 'zod';

/**
 * Tool interface for type safety
 */
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: z.ZodSchema;
}

/**
 * BMAD Agent types
 */
export const BMAD_AGENTS = ['po', 'sm', 'dev', 'architect', 'qa'] as const;
export type BMADAgent = (typeof BMAD_AGENTS)[number];

/**
 * Project types
 */
export const PROJECT_TYPES = ['greenfield', 'brownfield'] as const;
export type ProjectType = (typeof PROJECT_TYPES)[number];

/**
 * Test scope options
 */
export const TEST_SCOPES = ['unit', 'integration', 'all'] as const;
export type TestScope = (typeof TEST_SCOPES)[number];

/**
 * Common schemas
 */
const commonSchemas = {
  projectId: z.number().describe('Project ID'),
  storyId: z.number().describe('Story ID'),
  epicId: z.number().optional().describe('Parent epic ID'),
  context: z.string().optional().describe('Project context or requirements'),
  requirements: z.string().describe('Requirements or description'),
  issue: z.string().describe('Issue or problem description'),
  agent: z.enum(BMAD_AGENTS).describe('BMAD agent type'),
  projectType: z.enum(PROJECT_TYPES).describe('Project type'),
  testScope: z.enum(TEST_SCOPES).optional().describe('Scope of tests to run'),
  checklistType: z.string().describe('Specific checklist to execute'),
  documentPath: z.string().describe('Path to document'),
  destinationPath: z.string().describe('Destination directory'),
  existingSystemInfo: z.string().optional().describe('Information about existing system'),
  previousStoryId: z.number().optional().describe('Previous story ID for context'),
} as const;

/**
 * BMAD Product Owner Tools
 */
const productOwnerTools: MCPTool[] = [
  {
    name: 'bmad_po_create_epic',
    description: 'Create epic for brownfield projects using BMAD Product Owner methodology',
    inputSchema: z.object({
      projectId: commonSchemas.projectId,
      context: commonSchemas.context,
      existingSystemInfo: commonSchemas.existingSystemInfo,
    }),
  },
  {
    name: 'bmad_po_create_story',
    description: 'Create user story from requirements using BMAD Product Owner methodology',
    inputSchema: z.object({
      projectId: commonSchemas.projectId,
      requirements: commonSchemas.requirements,
      epicId: commonSchemas.epicId,
    }),
  },
  {
    name: 'bmad_po_shard_doc',
    description: 'Break large documents into manageable chunks using BMAD methodology',
    inputSchema: z.object({
      projectId: commonSchemas.projectId,
      documentPath: commonSchemas.documentPath,
      destinationPath: commonSchemas.destinationPath,
    }),
  },
  {
    name: 'bmad_po_validate_story',
    description: 'Validate story draft using BMAD Product Owner checklist',
    inputSchema: z.object({
      projectId: commonSchemas.projectId,
      storyId: commonSchemas.storyId,
    }),
  },
];

/**
 * BMAD Scrum Master Tools
 */
const scrumMasterTools: MCPTool[] = [
  {
    name: 'bmad_sm_draft',
    description: 'Create next story using BMAD Scrum Master methodology',
    inputSchema: z.object({
      projectId: commonSchemas.projectId,
      epicId: commonSchemas.epicId,
      previousStoryId: commonSchemas.previousStoryId,
    }),
  },
  {
    name: 'bmad_sm_story_checklist',
    description: 'Execute story draft checklist using BMAD Scrum Master methodology',
    inputSchema: z.object({
      projectId: commonSchemas.projectId,
      storyId: commonSchemas.storyId,
    }),
  },
];

/**
 * BMAD Developer Tools
 */
const developerTools: MCPTool[] = [
  {
    name: 'bmad_dev_develop_story',
    description: 'Implement story using BMAD Developer methodology and workflow',
    inputSchema: z.object({
      projectId: commonSchemas.projectId,
      storyId: commonSchemas.storyId,
    }),
  },
  {
    name: 'bmad_dev_run_tests',
    description: 'Execute linting and tests using BMAD Developer standards',
    inputSchema: z.object({
      projectId: commonSchemas.projectId,
      testScope: commonSchemas.testScope,
    }),
  },
  {
    name: 'bmad_dev_explain',
    description:
      'Explain recent development work for learning purposes using BMAD Developer methodology',
    inputSchema: z.object({
      projectId: commonSchemas.projectId,
      context: z.string().describe('What to explain (recent changes, decisions, etc.)'),
    }),
  },
];

/**
 * BMAD Architect Tools
 */
const architectTools: MCPTool[] = [
  {
    name: 'bmad_architect_design',
    description: 'Create system architecture using BMAD Architect methodology',
    inputSchema: z.object({
      projectId: commonSchemas.projectId,
      requirements: commonSchemas.requirements,
      projectType: commonSchemas.projectType,
    }),
  },
];

/**
 * BMAD QA Tools
 */
const qaTools: MCPTool[] = [
  {
    name: 'bmad_qa_review_story',
    description: 'Review and validate story implementation using BMAD QA methodology',
    inputSchema: z.object({
      projectId: commonSchemas.projectId,
      storyId: commonSchemas.storyId,
    }),
  },
];

/**
 * BMAD Common Tools
 */
const commonTools: MCPTool[] = [
  {
    name: 'bmad_correct_course',
    description: 'Execute course correction workflow for any BMAD agent',
    inputSchema: z.object({
      projectId: commonSchemas.projectId,
      agent: commonSchemas.agent,
      issue: commonSchemas.issue,
    }),
  },
  {
    name: 'bmad_execute_checklist',
    description: 'Execute agent-specific checklist from BMAD methodology',
    inputSchema: z.object({
      projectId: commonSchemas.projectId,
      agent: commonSchemas.agent,
      checklistType: commonSchemas.checklistType,
    }),
  },
];

/**
 * All BMAD tools organized by category
 */
export const bmadTools = {
  productOwner: productOwnerTools,
  scrumMaster: scrumMasterTools,
  developer: developerTools,
  architect: architectTools,
  qa: qaTools,
  common: commonTools,
} as const;

/**
 * Flattened array of all tools for MCP server
 */

/**
 * Get tools by agent type
 */
export function getToolsByAgent(agent: BMADAgent): MCPTool[] {
  switch (agent) {
    case 'po':
      return bmadTools.productOwner;
    case 'sm':
      return bmadTools.scrumMaster;
    case 'dev':
      return bmadTools.developer;
    case 'architect':
      return bmadTools.architect;
    case 'qa':
      return bmadTools.qa;
    default:
      return [];
  }
}

/**
 * Get all tool names
 */
export function getAllToolNames(): string[] {
  return tools.map(tool => tool.name);
}

/**
 * Find tool by name
 */
export function findToolByName(name: string): MCPTool | undefined {
  return tools.find(tool => tool.name === name);
}

/**
 * Validate tool input against schema
 */
export function validateToolInput(toolName: string, input: unknown): boolean {
  const tool = findToolByName(toolName);
  if (!tool) {
    return false;
  }

  try {
    tool.inputSchema.parse(input);
    return true;
  } catch {
    return false;
  }
}

// BMAD Product Owner Tools - TODO: Implement these tools
// const bmadPoCreateEpic = {
//   name: 'bmad_po_create_epic',
//   description: 'Create epic for brownfield projects using BMAD Product Owner methodology',
//   inputSchema: z.object({
//     projectId: z.number().describe('Project ID'),
//     context: z.string().optional().describe('Project context or requirements'),
//     existingSystemInfo: z.string().optional().describe('Information about existing system'),
//   }),
// };

// const bmadPoCreateStory = {
//   name: 'bmad_po_create_story',
//   description: 'Create user story from requirements using BMAD Product Owner methodology',
//   inputSchema: z.object({
//     projectId: z.number().describe('Project ID'),
//     requirements: z.string().describe('Story requirements or description'),
//     epicId: z.number().optional().describe('Parent epic ID'),
//   }),
// };

// const bmadPoShardDoc = {
//   name: 'bmad_po_shard_doc',
//   description: 'Break large documents into manageable chunks using BMAD methodology',
//   inputSchema: z.object({
//     projectId: z.number().describe('Project ID'),
//     documentPath: z.string().describe('Path to document to shard'),
//     destinationPath: z.string().describe('Destination directory for sharded files'),
//   }),
// };

// const bmadPoValidateStory = {
//   name: 'bmad_po_validate_story',
//   description: 'Validate story draft using BMAD Product Owner checklist',
//   inputSchema: z.object({
//     projectId: z.number().describe('Project ID'),
//     storyId: z.number().describe('Story ID to validate'),
//   }),
// };

// BMAD Scrum Master Tools - TODO: Implement these tools
// const bmadSmDraft = {
//   name: 'bmad_sm_draft',
//   description: 'Create next story using BMAD Scrum Master methodology',
//   inputSchema: z.object({
//     projectId: z.number().describe('Project ID'),
//     epicId: z.number().optional().describe('Parent epic ID'),
//     previousStoryId: z.number().optional().describe('Previous story ID for context'),
//   }),
// };

// const bmadSmStoryChecklist = {
//   name: 'bmad_sm_story_checklist',
//   description: 'Execute story draft checklist using BMAD Scrum Master methodology',
//   inputSchema: z.object({
//     projectId: z.number().describe('Project ID'),
//     storyId: z.number().describe('Story ID to check'),
//   }),
// };

// BMAD Developer Tools - TODO: Implement these tools
// const bmadDevDevelopStory = {
//   name: 'bmad_dev_develop_story',
//   description: 'Implement story using BMAD Developer methodology and workflow',
//   inputSchema: z.object({
//     projectId: z.number().describe('Project ID'),
//     storyId: z.number().describe('Story ID to implement'),
//   }),
// };

// const bmadDevRunTests = {
//   name: 'bmad_dev_run_tests',
//   description: 'Execute linting and tests using BMAD Developer standards',
//   inputSchema: z.object({
//     projectId: z.number().describe('Project ID'),
//     testScope: z.string().optional().describe('Scope of tests to run (unit, integration, all)'),
//   }),
// };

// const bmadDevExplain = {
//   name: 'bmad_dev_explain',
//   description: 'Explain recent development work for learning purposes',
//   inputSchema: z.object({
//     projectId: z.number().describe('Project ID'),
//     context: z.string().describe('What to explain (recent changes, decisions, etc.)'),
//   }),
// };

// BMAD Architect Tools - TODO: Implement these tools
// const bmadArchitectDesign = {
//   name: 'bmad_architect_design',
//   description: 'Create system architecture using BMAD Architect methodology',
//   inputSchema: z.object({
//     projectId: z.number().describe('Project ID'),
//     requirements: z.string().describe('Architecture requirements'),
//     projectType: z.enum(['greenfield', 'brownfield']).describe('Project type'),
//   }),
// };

// BMAD QA Tools - TODO: Implement these tools
// const bmadQaReviewStory = {
//   name: 'bmad_qa_review_story',
//   description: 'Review and validate story implementation using BMAD QA methodology',
//   inputSchema: z.object({
//     projectId: z.number().describe('Project ID'),
//     storyId: z.number().describe('Story ID to review'),
//   }),
// };

// BMAD Common Tools - TODO: Implement these tools
// const bmadCorrectCourse = {
//   name: 'bmad_correct_course',
//   description: 'Execute course correction workflow for any BMAD agent',
//   inputSchema: z.object({
//     projectId: z.number().describe('Project ID'),
//     agent: z
//       .enum(['po', 'sm', 'dev', 'architect', 'qa'])
//       .describe('Agent requesting course correction'),
//     issue: z.string().describe('Issue or problem requiring course correction'),
//   }),
// };

// const bmadExecuteChecklist = {
//   name: 'bmad_execute_checklist',
//   description: 'Execute agent-specific checklist from BMAD methodology',
//   inputSchema: z.object({
//     projectId: z.number().describe('Project ID'),
//     agent: z.enum(['po', 'sm', 'dev', 'architect', 'qa']).describe('Agent type'),
//     checklistType: z.string().describe('Specific checklist to execute'),
//   }),
// };

// DevAI Notification Tools
const devaiNotifyCompletion = {
  name: 'devai_notify_completion',
  description: 'Send notification when agent completes their work to reduce HITL times',
  inputSchema: z.object({
    actorId: z.number().describe('Actor ID who completed the work'),
    actorRole: z.string().describe('Role of the actor (e.g., Scrum Master, Developer, QA)'),
    storyId: z.number().describe('Story ID that was worked on'),
    jobType: z
      .string()
      .describe('Type of job completed (e.g., story_draft, implementation, validation)'),
    completionDetails: z
      .object({
        challenges: z.string().optional().describe('Any challenges encountered during the work'),
        nextSteps: z.string().optional().describe('Next steps or recommendations'),
        url: z.string().optional().describe('URL to view the completed work'),
        confidence: z.number().optional().describe('Confidence level in the completion (0-1)'),
      })
      .optional()
      .describe('Additional details about the completion'),
  }),
};

const devaiConfigureNotification = {
  name: 'devai_configure_notification',
  description: 'Configure notification settings for an actor',
  inputSchema: z.object({
    actorId: z.number().describe('Actor ID to configure notifications for'),
    notificationType: z
      .enum(['pushover', 'ifttt', 'webhook', 'email'])
      .describe('Type of notification service'),
    configData: z.record(z.any()).describe('Configuration data for the notification service'),
  }),
};

const devaiTestNotification = {
  name: 'devai_test_notification',
  description: 'Test notification configuration for an actor',
  inputSchema: z.object({
    actorId: z.number().describe('Actor ID to test notifications for'),
    notificationType: z.string().describe('Type of notification to test'),
  }),
};

/**
 * Flattened array of all tools for MCP server
 */
export const tools: MCPTool[] = [
  ...productOwnerTools,
  ...scrumMasterTools,
  ...developerTools,
  ...architectTools,
  ...qaTools,
  ...commonTools,
  devaiNotifyCompletion,
  devaiConfigureNotification,
  devaiTestNotification,
];
