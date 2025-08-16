import { query } from '../lib/database.js';
import { manageMemory } from './memory-manager.js';
import { manageStory } from './story-manager.js';

// Main BMAD tool executor
export async function executeBmadTool(
  agent: string,
  command: string,
  args: any
) {
  try {
    console.log(`[BMAD] Executing ${agent} ${command}`, args);

    // Get agent definition from memories
    const agentDef = await getBmadAgent(agent);
    if (!agentDef) {
      throw new Error(`BMAD agent '${agent}' not found in knowledge base`);
    }

    // Execute command based on agent and command type
    switch (`${agent}_${command}`) {
      // Product Owner Commands
      case 'po_create-epic':
        return await executePoCreateEpic(args, agentDef);
      case 'po_create-story':
        return await executePoCreateStory(args, agentDef);
      case 'po_shard-doc':
        return await executePoShardDoc(args, agentDef);
      case 'po_validate-story':
        return await executePoValidateStory(args, agentDef);

      // Scrum Master Commands
      case 'sm_draft':
        return await executeSmDraft(args, agentDef);
      case 'sm_story-checklist':
        return await executeSmStoryChecklist(args, agentDef);

      // Developer Commands
      case 'dev_develop-story':
        return await executeDevDevelopStory(args, agentDef);
      case 'dev_run-tests':
        return await executeDevRunTests(args, agentDef);
      case 'dev_explain':
        return await executeDevExplain(args, agentDef);

      // Architect Commands
      case 'architect_design':
        return await executeArchitectDesign(args, agentDef);

      // QA Commands
      case 'qa_review-story':
        return await executeQaReviewStory(args, agentDef);

      // Common Commands
      case 'po_correct-course':
      case 'sm_correct-course':
      case 'dev_correct-course':
      case 'architect_correct-course':
      case 'qa_correct-course':
        return await executeCorrectCourse(agent, args, agentDef);

      case 'po_execute-checklist':
      case 'sm_execute-checklist':
      case 'dev_execute-checklist':
      case 'architect_execute-checklist':
      case 'qa_execute-checklist':
        return await executeChecklist(agent, args, agentDef);

      default:
        throw new Error(
          `BMAD command '${command}' not supported for agent '${agent}'`
        );
    }
  } catch (error: any) {
    console.error('[BMAD] Error executing tool:', error);
    return {
      content: [
        {
          type: 'text',
          text: `BMAD Error: ${error.message}`,
        },
      ],
    };
  }
}

// Get BMAD agent definition from memories
async function getBmadAgent(agent: string): Promise<any> {
  const result = await query(
    `SELECT content FROM memories 
     WHERE content LIKE '%Path: bmad-core/agents/${agent}.md%' 
     LIMIT 1`,
    []
  );

  if (result.rows.length === 0) {
    return null;
  }

  return parseBmadAgent(result.rows[0].content);
}

// Parse BMAD agent definition from content
function parseBmadAgent(content: string): any {
  // Extract YAML block from the agent content
  const yamlMatch = content.match(/```yaml([\s\S]*?)```/);
  if (!yamlMatch) {
    throw new Error('No YAML configuration found in agent definition');
  }

  // Simple YAML parser for BMAD agent structure
  const yamlContent = yamlMatch[1];
  const lines = yamlContent.split('\n').filter((line) => line.trim());

  const agent: any = {
    commands: [],
    dependencies: { tasks: [], templates: [], checklists: [] },
  };

  let currentSection = '';
  let currentSubsection = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    if (trimmed.includes(':') && !trimmed.startsWith('-')) {
      if (trimmed.startsWith('commands:')) {
        currentSection = 'commands';
      } else if (trimmed.startsWith('dependencies:')) {
        currentSection = 'dependencies';
      } else if (trimmed.startsWith('tasks:')) {
        currentSubsection = 'tasks';
      } else if (trimmed.startsWith('templates:')) {
        currentSubsection = 'templates';
      } else if (trimmed.startsWith('checklists:')) {
        currentSubsection = 'checklists';
      }
    } else if (trimmed.startsWith('-')) {
      if (currentSection === 'commands') {
        const commandMatch = trimmed.match(/- ([^:]+):/);
        if (commandMatch) {
          agent.commands.push(commandMatch[1]);
        }
      } else if (currentSection === 'dependencies' && currentSubsection) {
        const item = trimmed.replace('- ', '').replace('.md', '');
        agent.dependencies[currentSubsection].push(item);
      }
    }
  }

  return agent;
}

// Get BMAD task from memories
async function getBmadTask(taskName: string): Promise<string | null> {
  const result = await query(
    `SELECT content FROM memories 
     WHERE content LIKE '%Path: %tasks/${taskName}.md%' 
     OR content LIKE '%Path: bmad-core/tasks/${taskName}.md%'
     OR content LIKE '%Path: common/tasks/${taskName}.md%'
     LIMIT 1`,
    []
  );

  return result.rows.length > 0 ? result.rows[0].content : null;
}

// Get BMAD template from memories
async function getBmadTemplate(templateName: string): Promise<string | null> {
  const result = await query(
    `SELECT content FROM memories 
     WHERE content LIKE '%Path: %templates/${templateName}%' 
     OR content LIKE '%Path: bmad-core/templates/${templateName}%'
     LIMIT 1`,
    []
  );

  return result.rows.length > 0 ? result.rows[0].content : null;
}

// Product Owner Command Implementations
async function executePoCreateEpic(args: any, agentDef: any) {
  const task = await getBmadTask('brownfield-create-epic');
  if (!task) {
    throw new Error('BMAD task brownfield-create-epic not found');
  }

  // Store memory about epic creation initiation
  await manageMemory({
    action: 'store',
    projectId: args.projectId,
    content: `Product Owner initiated epic creation for brownfield project. Context: ${
      args.context || 'Not provided'
    }`,
    memoryType: 'decision',
    context: 'BMAD PO Epic Creation',
    reasoning: 'Following BMAD methodology for structured epic creation',
    confidence: 0.9,
    tags: ['bmad', 'po', 'epic', 'brownfield'],
  });

  return {
    content: [
      {
        type: 'text',
        text: `🎯 BMAD Product Owner - Epic Creation Initiated
        
**Project ID:** ${args.projectId}
**Context:** ${args.context || 'Not provided'}
**Existing System Info:** ${args.existingSystemInfo || 'Not provided'}

**Next Steps:**
1. Following BMAD brownfield epic creation methodology
2. Analyzing existing system constraints and integration points
3. Defining epic scope with user acceptance criteria
4. Breaking down into implementable user stories

**BMAD Task:** brownfield-create-epic
**Status:** Epic creation workflow initiated - manual completion required

*Note: This is a structured workflow that requires human collaboration for requirements elicitation and validation.*`,
      },
    ],
  };
}

async function executePoCreateStory(args: any, agentDef: any) {
  const task = await getBmadTask('brownfield-create-story');
  if (!task) {
    throw new Error('BMAD task brownfield-create-story not found');
  }

  // Create the story using the story manager
  const storyResult = await manageStory({
    action: 'create',
    projectId: args.projectId,
    title: `User Story: ${args.requirements.substring(0, 50)}...`,
    description: args.requirements,
    acceptance_criteria: [
      'Story created via BMAD PO methodology',
      'Requires detailed acceptance criteria definition',
      'Needs story point estimation',
    ],
    story_points: 0, // To be estimated
    priority: 'medium',
  });

  // Store memory about story creation
  await manageMemory({
    action: 'store',
    projectId: args.projectId,
    content: `Product Owner created user story using BMAD methodology. Requirements: ${args.requirements}`,
    memoryType: 'decision',
    context: 'BMAD PO Story Creation',
    reasoning: 'Following BMAD structured story creation process',
    confidence: 0.85,
    tags: ['bmad', 'po', 'story', 'requirements'],
  });

  return {
    content: [
      {
        type: 'text',
        text: `📝 BMAD Product Owner - Story Created
        
${storyResult.content[0].text}

**BMAD Methodology Applied:**
- Structured requirements analysis
- Story template adherence
- Acceptance criteria framework
- Integration with existing system considerations

**Next Steps:**
1. Refine acceptance criteria with stakeholders
2. Estimate story points with development team
3. Validate story against epic objectives
4. Schedule for sprint planning`,
      },
    ],
  };
}

async function executePoShardDoc(args: any, agentDef: any) {
  const task = await getBmadTask('shard-doc');
  if (!task) {
    throw new Error('BMAD task shard-doc not found');
  }

  return {
    content: [
      {
        type: 'text',
        text: `📄 BMAD Product Owner - Document Sharding
        
**Document:** ${args.documentPath}
**Destination:** ${args.destinationPath}
**Project ID:** ${args.projectId}

**BMAD Document Sharding Process:**
1. Parse document structure and level 2 headings
2. Create manageable chunks for development team consumption
3. Maintain cross-references and dependencies
4. Generate index file for navigation

**Status:** Sharding process initiated
*Note: This requires file system access to complete the sharding operation.*

**Recommended Next Steps:**
1. Verify document exists at specified path
2. Create destination directory structure
3. Execute sharding with proper naming conventions
4. Update project documentation index`,
      },
    ],
  };
}

async function executePoValidateStory(args: any, agentDef: any) {
  const task = await getBmadTask('validate-next-story');
  if (!task) {
    throw new Error('BMAD task validate-next-story not found');
  }

  return {
    content: [
      {
        type: 'text',
        text: `✅ BMAD Product Owner - Story Validation
        
**Story ID:** ${args.storyId}
**Project ID:** ${args.projectId}

**BMAD Story Validation Checklist:**
- [ ] Story follows BMAD story template structure
- [ ] Acceptance criteria are testable and specific
- [ ] Story aligns with epic objectives
- [ ] Dependencies are identified and documented
- [ ] Story size is appropriate for single sprint
- [ ] User value is clearly articulated

**Status:** Validation initiated
*Manual review and checklist completion required*

**Next Steps:**
1. Review story against PO master checklist
2. Validate acceptance criteria completeness
3. Confirm story priority and sequencing
4. Approve for development or request revisions`,
      },
    ],
  };
}

// Scrum Master Command Implementations
async function executeSmDraft(args: any, agentDef: any) {
  const task = await getBmadTask('create-next-story');
  if (!task) {
    throw new Error('BMAD task create-next-story not found');
  }

  return {
    content: [
      {
        type: 'text',
        text: `📋 BMAD Scrum Master - Story Drafting
        
**Project ID:** ${args.projectId}
**Epic ID:** ${args.epicId || 'Not specified'}
**Previous Story ID:** ${args.previousStoryId || 'Not specified'}

**BMAD Story Creation Workflow:**
1. Analyze epic requirements and current progress
2. Identify next logical story in sequence
3. Draft story using BMAD story template
4. Define tasks and subtasks breakdown
5. Estimate effort and identify dependencies

**Status:** Story drafting initiated
*Following BMAD systematic story creation methodology*

**Next Steps:**
1. Review epic progress and remaining scope
2. Create detailed story draft with acceptance criteria
3. Break down into implementable tasks
4. Validate with Product Owner before development`,
      },
    ],
  };
}

async function executeSmStoryChecklist(args: any, agentDef: any) {
  return {
    content: [
      {
        type: 'text',
        text: `✅ BMAD Scrum Master - Story Checklist Review
        
**Story ID:** ${args.storyId}
**Project ID:** ${args.projectId}

**BMAD Story Draft Checklist:**
- [ ] Story title is clear and descriptive
- [ ] User story follows "As a... I want... So that..." format
- [ ] Acceptance criteria are specific and testable
- [ ] Tasks are broken down into <8 hour increments
- [ ] Dependencies are identified and documented
- [ ] Story points estimated by development team
- [ ] Definition of Done criteria included
- [ ] Risk assessment completed

**Checklist Status:** Initiated
*Manual completion required for each checklist item*

**Next Steps:**
1. Work through each checklist item systematically
2. Address any gaps or missing information
3. Get stakeholder validation on story completeness
4. Move story to "Ready for Development" when complete`,
      },
    ],
  };
}

// Developer Command Implementations (simplified - would need full implementation)
async function executeDevDevelopStory(args: any, agentDef: any) {
  return {
    content: [
      {
        type: 'text',
        text: `⚙️ BMAD Developer - Story Implementation
        
**Story ID:** ${args.storyId}
**Project ID:** ${args.projectId}

**BMAD Development Workflow:**
1. Read story requirements and acceptance criteria
2. Implement tasks and subtasks in sequence
3. Write tests for each implemented feature
4. Execute validations and ensure all tests pass
5. Update story progress and file list
6. Mark tasks complete only when fully validated

**Status:** Development workflow initiated
*Following BMAD systematic development methodology*

**Critical Rules:**
- Only update authorized story sections
- Mark tasks [x] only when complete and tested
- Update File List with all changes
- Execute full regression testing
- Set story status to "Ready for Review" when complete

**Next Steps:**
1. Begin with first uncompleted task
2. Implement following TDD principles
3. Update progress continuously
4. Request QA review when ready`,
      },
    ],
  };
}

async function executeDevRunTests(args: any, agentDef: any) {
  return {
    content: [
      {
        type: 'text',
        text: `🧪 BMAD Developer - Test Execution
        
**Project ID:** ${args.projectId}
**Test Scope:** ${args.testScope || 'all'}

**BMAD Testing Standards:**
- Execute linting and code quality checks
- Run unit tests with >80% coverage requirement
- Execute integration tests for affected components
- Validate all acceptance criteria are met
- Check regression tests pass

**Status:** Test execution initiated
*Following BMAD testing methodology and standards*

**Test Types:**
- Static analysis and linting
- Unit test suite
- Integration test suite  
- End-to-end validation
- Performance regression checks

**Next Steps:**
1. Execute test suite based on scope
2. Report any failures with detailed logs
3. Fix issues and re-run tests
4. Update story with test results`,
      },
    ],
  };
}

async function executeDevExplain(args: any, agentDef: any) {
  return {
    content: [
      {
        type: 'text',
        text: `🎓 BMAD Developer - Knowledge Transfer
        
**Project ID:** ${args.projectId}
**Context:** ${args.context}

**BMAD Learning & Teaching Principles:**
Following the "explain as if training a junior engineer" approach:

1. **What was done:** Detailed description of recent changes
2. **Why it was done:** Business reasoning and technical rationale  
3. **How it works:** Technical implementation details
4. **What to watch for:** Potential issues and monitoring points
5. **Key learnings:** Insights gained during implementation

**Knowledge Transfer Topics:**
- Architecture decisions and trade-offs
- Code patterns and best practices used
- Testing strategies employed
- Integration challenges overcome
- Performance considerations

**Status:** Ready to provide detailed technical explanation
*Focused on educational value and knowledge retention*

**Next Steps:**
1. Provide comprehensive technical explanation
2. Highlight key learning points
3. Suggest areas for further study
4. Document lessons learned for team knowledge base`,
      },
    ],
  };
}

// Architect, QA, and Common Command Implementations (simplified)
async function executeArchitectDesign(args: any, agentDef: any) {
  return {
    content: [
      {
        type: 'text',
        text: `🏗️ BMAD Architect - System Design
        
**Project ID:** ${args.projectId}
**Project Type:** ${args.projectType}
**Requirements:** ${args.requirements}

**BMAD Architecture Process:**
${
  args.projectType === 'brownfield'
    ? 'Following brownfield architecture methodology'
    : 'Following greenfield architecture methodology'
}

**Status:** Architecture design initiated
*Comprehensive system design following BMAD principles*`,
      },
    ],
  };
}

async function executeQaReviewStory(args: any, agentDef: any) {
  return {
    content: [
      {
        type: 'text',
        text: `🔍 BMAD QA - Story Review
        
**Story ID:** ${args.storyId}
**Project ID:** ${args.projectId}

**BMAD QA Review Process:**
Senior developer-level code review and validation

**Status:** QA review initiated
*Following BMAD quality assurance methodology*`,
      },
    ],
  };
}

async function executeCorrectCourse(agent: string, args: any, agentDef: any) {
  const task = await getBmadTask('correct-course');

  return {
    content: [
      {
        type: 'text',
        text: `🔄 BMAD ${agent.toUpperCase()} - Course Correction
        
**Project ID:** ${args.projectId}
**Issue:** ${args.issue}

**BMAD Course Correction Process:**
Systematic problem analysis and resolution following BMAD methodology

**Status:** Course correction initiated
*Following structured problem-solving approach*`,
      },
    ],
  };
}

async function executeChecklist(agent: string, args: any, agentDef: any) {
  return {
    content: [
      {
        type: 'text',
        text: `✅ BMAD ${agent.toUpperCase()} - Checklist Execution
        
**Project ID:** ${args.projectId}
**Checklist Type:** ${args.checklistType}

**BMAD Checklist Process:**
Systematic validation following agent-specific checklist

**Status:** Checklist execution initiated
*Following BMAD quality assurance standards*`,
      },
    ],
  };
}
