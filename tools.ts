import { z } from 'zod';

// BMAD Product Owner Tools
const bmadPoCreateEpic = {
  name: 'bmad_po_create_epic',
  description:
    'Create epic for brownfield projects using BMAD Product Owner methodology',
  inputSchema: z.object({
    projectId: z.number().describe('Project ID'),
    context: z.string().optional().describe('Project context or requirements'),
    existingSystemInfo: z
      .string()
      .optional()
      .describe('Information about existing system'),
  }),
};

const bmadPoCreateStory = {
  name: 'bmad_po_create_story',
  description:
    'Create user story from requirements using BMAD Product Owner methodology',
  inputSchema: z.object({
    projectId: z.number().describe('Project ID'),
    requirements: z.string().describe('Story requirements or description'),
    epicId: z.number().optional().describe('Parent epic ID'),
  }),
};

const bmadPoShardDoc = {
  name: 'bmad_po_shard_doc',
  description:
    'Break large documents into manageable chunks using BMAD methodology',
  inputSchema: z.object({
    projectId: z.number().describe('Project ID'),
    documentPath: z.string().describe('Path to document to shard'),
    destinationPath: z
      .string()
      .describe('Destination directory for sharded files'),
  }),
};

const bmadPoValidateStory = {
  name: 'bmad_po_validate_story',
  description: 'Validate story draft using BMAD Product Owner checklist',
  inputSchema: z.object({
    projectId: z.number().describe('Project ID'),
    storyId: z.number().describe('Story ID to validate'),
  }),
};

// BMAD Scrum Master Tools
const bmadSmDraft = {
  name: 'bmad_sm_draft',
  description: 'Create next story using BMAD Scrum Master methodology',
  inputSchema: z.object({
    projectId: z.number().describe('Project ID'),
    epicId: z.number().optional().describe('Parent epic ID'),
    previousStoryId: z
      .number()
      .optional()
      .describe('Previous story ID for context'),
  }),
};

const bmadSmStoryChecklist = {
  name: 'bmad_sm_story_checklist',
  description:
    'Execute story draft checklist using BMAD Scrum Master methodology',
  inputSchema: z.object({
    projectId: z.number().describe('Project ID'),
    storyId: z.number().describe('Story ID to check'),
  }),
};

// BMAD Developer Tools
const bmadDevDevelopStory = {
  name: 'bmad_dev_develop_story',
  description: 'Implement story using BMAD Developer methodology and workflow',
  inputSchema: z.object({
    projectId: z.number().describe('Project ID'),
    storyId: z.number().describe('Story ID to implement'),
  }),
};

const bmadDevRunTests = {
  name: 'bmad_dev_run_tests',
  description: 'Execute linting and tests using BMAD Developer standards',
  inputSchema: z.object({
    projectId: z.number().describe('Project ID'),
    testScope: z
      .string()
      .optional()
      .describe('Scope of tests to run (unit, integration, all)'),
  }),
};

const bmadDevExplain = {
  name: 'bmad_dev_explain',
  description: 'Explain recent development work for learning purposes',
  inputSchema: z.object({
    projectId: z.number().describe('Project ID'),
    context: z
      .string()
      .describe('What to explain (recent changes, decisions, etc.)'),
  }),
};

// BMAD Architect Tools
const bmadArchitectDesign = {
  name: 'bmad_architect_design',
  description: 'Create system architecture using BMAD Architect methodology',
  inputSchema: z.object({
    projectId: z.number().describe('Project ID'),
    requirements: z.string().describe('Architecture requirements'),
    projectType: z.enum(['greenfield', 'brownfield']).describe('Project type'),
  }),
};

// BMAD QA Tools
const bmadQaReviewStory = {
  name: 'bmad_qa_review_story',
  description:
    'Review and validate story implementation using BMAD QA methodology',
  inputSchema: z.object({
    projectId: z.number().describe('Project ID'),
    storyId: z.number().describe('Story ID to review'),
  }),
};

// BMAD Common Tools
const bmadCorrectCourse = {
  name: 'bmad_correct_course',
  description: 'Execute course correction workflow for any BMAD agent',
  inputSchema: z.object({
    projectId: z.number().describe('Project ID'),
    agent: z
      .enum(['po', 'sm', 'dev', 'architect', 'qa'])
      .describe('Agent requesting course correction'),
    issue: z.string().describe('Issue or problem requiring course correction'),
  }),
};

const bmadExecuteChecklist = {
  name: 'bmad_execute_checklist',
  description: 'Execute agent-specific checklist from BMAD methodology',
  inputSchema: z.object({
    projectId: z.number().describe('Project ID'),
    agent: z
      .enum(['po', 'sm', 'dev', 'architect', 'qa'])
      .describe('Agent type'),
    checklistType: z.string().describe('Specific checklist to execute'),
  }),
};

// DevAI Notification Tools
const devaiNotifyCompletion = {
  name: 'devai_notify_completion',
  description: 'Send notification when agent completes their work to reduce HITL times',
  inputSchema: z.object({
    actorId: z.number().describe('Actor ID who completed the work'),
    actorRole: z.string().describe('Role of the actor (e.g., Scrum Master, Developer, QA)'),
    storyId: z.number().describe('Story ID that was worked on'),
    jobType: z.string().describe('Type of job completed (e.g., story_draft, implementation, validation)'),
    completionDetails: z.object({
      challenges: z.string().optional().describe('Any challenges encountered during the work'),
      nextSteps: z.string().optional().describe('Next steps or recommendations'),
      url: z.string().optional().describe('URL to view the completed work'),
      confidence: z.number().optional().describe('Confidence level in the completion (0-1)'),
    }).optional().describe('Additional details about the completion'),
  }),
};

const devaiConfigureNotification = {
  name: 'devai_configure_notification',
  description: 'Configure notification settings for an actor',
  inputSchema: z.object({
    actorId: z.number().describe('Actor ID to configure notifications for'),
    notificationType: z.enum(['pushover', 'ifttt', 'webhook', 'email']).describe('Type of notification service'),
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

export const tools = [
  // Product Owner Tools
  bmadPoCreateEpic,
  bmadPoCreateStory,
  bmadPoShardDoc,
  bmadPoValidateStory,

  // Scrum Master Tools
  bmadSmDraft,
  bmadSmStoryChecklist,

  // Developer Tools
  bmadDevDevelopStory,
  bmadDevRunTests,
  bmadDevExplain,

  // Architect Tools
  bmadArchitectDesign,

  // QA Tools
  bmadQaReviewStory,

  // Common Tools
  bmadCorrectCourse,
  bmadExecuteChecklist,

  // DevAI Notification Tools
  devaiNotifyCompletion,
  devaiConfigureNotification,
  devaiTestNotification,
] as const;
