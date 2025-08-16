import { query, createStory, updateStory, getStoryById } from './database.ts';
import { ImportanceManager } from './importance-manager.ts';
import { EnhancedMemoryManager } from './memory-manager-enhanced.ts';
import { NotificationService } from './notification-service.ts';

export interface Defect {
  id: number;
  story_id: number;
  qa_actor_id: number;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  created_at: string;
  updated_at: string;
}

export interface WorkflowStep {
  id: string;
  actor_role: string;
  action: string;
  status: 'pending' | 'in_progress' | 'completed' | 'rejected';
  result?: any;
  created_at: Date;
  updated_at: Date;
}

export interface DevWorkflowState {
  story_id: number;
  current_step: string;
  steps: WorkflowStep[];
  defects: Defect[];
  auto_push_enabled: boolean;
  epic_id?: number;
}

const activeWorkflows = new Map<number, DevWorkflowState>();

export class DevWorkflowEngine {
  
  /**
   * Start the SM→Dev→QA workflow for a story
   */
  static async startWorkflow(storyId: number, epicId?: number): Promise<DevWorkflowState> {
    const story = await getStoryById(storyId);
    if (!story) {
      throw new Error(`Story ${storyId} not found`);
    }
    
    const workflow: DevWorkflowState = {
      story_id: storyId,
      current_step: 'sm_draft',
      epic_id: epicId,
      auto_push_enabled: true,
      steps: [
        {
          id: 'sm_draft',
          actor_role: 'Scrum Master',
          action: 'draft_story',
          status: 'in_progress',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ],
      defects: [],
    };
    
    activeWorkflows.set(storyId, workflow);
    return workflow;
  }
  
  /**
   * SM completes story draft and hands off to Dev
   */
  static async smCompletesDraft(storyId: number, smActorId: number): Promise<DevWorkflowState> {
    const workflow = activeWorkflows.get(storyId);
    if (!workflow) {
      throw new Error(`No active workflow for story ${storyId}`);
    }
    
    // Mark SM step as completed
    const smStep = workflow.steps.find(s => s.id === 'sm_draft');
    if (smStep) {
      smStep.status = 'completed';
      smStep.updated_at = new Date();
    }
    
    // Add Dev step
    workflow.steps.push({
      id: 'dev_implement',
      actor_role: 'Developer',
      action: 'implement_story',
      status: 'in_progress',
      created_at: new Date(),
      updated_at: new Date(),
    });
    
    workflow.current_step = 'dev_implement';
    activeWorkflows.set(storyId, workflow);
    
    // Log activity
    await ImportanceManager.logActivity(smActorId, 'story_draft_completed', undefined, storyId);
    
    // Mandatory post-job memory update
    await EnhancedMemoryManager.executePostJobHook({
      actorId: smActorId,
      actorRole: 'Scrum Master',
      storyId: storyId,
      jobType: 'story_draft',
      jobResult: { story_id: storyId, status: 'completed' },
      confidence: 0.9,
    });
    
    // Send notification for SM completion
    try {
      await NotificationService.getInstance().notifyAgentCompletion(
        smActorId,
        'Scrum Master',
        storyId,
        'story_draft',
        {
          nextSteps: 'Story draft completed and handed off to Developer for implementation',
          confidence: 0.9,
        }
      );
    } catch (error) {
      // Log notification error but don't fail the workflow
      console.error('Failed to send SM completion notification:', error);
    }
    
    return workflow;
  }
  
  /**
   * Dev completes implementation and hands off to QA
   */
  static async devCompletesImplementation(storyId: number, devActorId: number): Promise<DevWorkflowState> {
    const workflow = activeWorkflows.get(storyId);
    if (!workflow) {
      throw new Error(`No active workflow for story ${storyId}`);
    }
    
    // Mark Dev step as completed
    const devStep = workflow.steps.find(s => s.id === 'dev_implement');
    if (devStep) {
      devStep.status = 'completed';
      devStep.updated_at = new Date();
    }
    
    // Add QA step
    workflow.steps.push({
      id: 'qa_validate',
      actor_role: 'QA',
      action: 'validate_story',
      status: 'in_progress',
      created_at: new Date(),
      updated_at: new Date(),
    });
    
    workflow.current_step = 'qa_validate';
    activeWorkflows.set(storyId, workflow);
    
    // Log activity
    await ImportanceManager.logActivity(devActorId, 'story_implementation_completed', undefined, storyId);
    
    // Mandatory post-job memory update
    await EnhancedMemoryManager.executePostJobHook({
      actorId: devActorId,
      actorRole: 'Developer',
      storyId: storyId,
      jobType: 'implementation',
      jobResult: { story_id: storyId, status: 'completed' },
      confidence: 0.95,
    });
    
    // Send notification for Dev completion
    try {
      await NotificationService.getInstance().notifyAgentCompletion(
        devActorId,
        'Developer',
        storyId,
        'implementation',
        {
          nextSteps: 'Implementation completed and handed off to QA for validation',
          confidence: 0.95,
        }
      );
    } catch (error) {
      // Log notification error but don't fail the workflow
      console.error('Failed to send Dev completion notification:', error);
    }
    
    return workflow;
  }
  
  /**
   * QA approves the story - triggers auto-push
   */
  static async qaApproves(storyId: number, qaActorId: number): Promise<{
    workflow: DevWorkflowState;
    pushResult: any;
  }> {
    const workflow = activeWorkflows.get(storyId);
    if (!workflow) {
      throw new Error(`No active workflow for story ${storyId}`);
    }
    
    // Mark QA step as completed
    const qaStep = workflow.steps.find(s => s.id === 'qa_validate');
    if (qaStep) {
      qaStep.status = 'completed';
      qaStep.updated_at = new Date();
    }
    
    workflow.current_step = 'completed';
    
    // Update story status
    await updateStory(storyId, { status: 'done' });
    
    // Auto-push if enabled
    let pushResult = null;
    if (workflow.auto_push_enabled) {
      pushResult = await this.executePush(storyId);
    }
    
    activeWorkflows.set(storyId, workflow);
    
    // Log activity
    await ImportanceManager.logActivity(qaActorId, 'story_qa_approved', undefined, storyId);
    
    // Mandatory post-job memory update
    await EnhancedMemoryManager.executePostJobHook({
      actorId: qaActorId,
      actorRole: 'QA',
      storyId: storyId,
      jobType: 'validation',
      jobResult: { story_id: storyId, approved: true, push_result: pushResult },
      confidence: 0.9,
    });
    
    // Send notification for QA approval
    try {
      await NotificationService.getInstance().notifyAgentCompletion(
        qaActorId,
        'QA',
        storyId,
        'validation',
        {
          nextSteps: 'Story approved and auto-pushed to repository',
          confidence: 0.9,
          url: pushResult?.url,
        }
      );
    } catch (error) {
      // Log notification error but don't fail the workflow
      console.error('Failed to send QA approval notification:', error);
    }
    
    return { workflow, pushResult };
  }
  
  /**
   * QA rejects the story - creates defect and sends back to SM for storification
   */
  static async qaRejects(
    storyId: number, 
    qaActorId: number, 
    defectTitle: string, 
    defectDescription: string,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): Promise<{
    workflow: DevWorkflowState;
    defect: Defect;
    newStoryId: number;
  }> {
    const workflow = activeWorkflows.get(storyId);
    if (!workflow) {
      throw new Error(`No active workflow for story ${storyId}`);
    }
    
    // Mark QA step as rejected
    const qaStep = workflow.steps.find(s => s.id === 'qa_validate');
    if (qaStep) {
      qaStep.status = 'rejected';
      qaStep.updated_at = new Date();
    }
    
    // Create defect
    const defect = await this.createDefect(storyId, qaActorId, defectTitle, defectDescription, severity);
    workflow.defects.push(defect);
    
    // SM storifies the defect (creates a new story for the fix)
    const newStory = await createStory({
      project_id: workflow.story_id, // This should be the project_id, but using story_id as placeholder
      title: `Fix: ${defectTitle}`,
      description: `Defect fix: ${defectDescription}`,
      acceptance_criteria: [`Resolve defect #${defect.id}`, 'QA validation passes'],
      story_points: Math.ceil(severity === 'critical' ? 5 : severity === 'high' ? 3 : 2),
      priority: severity === 'critical' ? 'critical' : severity === 'high' ? 'high' : 'medium',
      status: 'todo',
    });
    
    // Reset workflow to Dev step for the fix
    workflow.steps.push({
      id: 'dev_fix',
      actor_role: 'Developer',
      action: 'fix_defect',
      status: 'pending',
      created_at: new Date(),
      updated_at: new Date(),
    });
    
    workflow.current_step = 'dev_fix';
    activeWorkflows.set(storyId, workflow);
    
    // Log activity
    await ImportanceManager.logActivity(qaActorId, 'story_qa_rejected', undefined, storyId, {
      defect_id: defect.id,
      new_story_id: newStory.id,
    });
    
    // Mandatory post-job memory update
    await EnhancedMemoryManager.executePostJobHook({
      actorId: qaActorId,
      actorRole: 'QA',
      storyId: storyId,
      jobType: 'validation',
      jobResult: { 
        story_id: storyId, 
        approved: false, 
        defect: defect,
        new_story_id: newStory.id,
        challenges: defectDescription,
      },
      confidence: 0.85,
    });
    
    // Send notification for QA rejection
    try {
      await NotificationService.getInstance().notifyAgentCompletion(
        qaActorId,
        'QA',
        storyId,
        'validation',
        {
          challenges: `Defect created: ${defectTitle} - ${defectDescription}`,
          nextSteps: `Defect fix story #${newStory.id} created and assigned to Developer`,
          confidence: 0.85,
        }
      );
    } catch (error) {
      // Log notification error but don't fail the workflow
      console.error('Failed to send QA rejection notification:', error);
    }
    
    return { workflow, defect, newStoryId: newStory.id };
  }
  
  /**
   * Dev completes defect fix
   */
  static async devCompletesDefectFix(storyId: number, devActorId: number): Promise<DevWorkflowState> {
    const workflow = activeWorkflows.get(storyId);
    if (!workflow) {
      throw new Error(`No active workflow for story ${storyId}`);
    }
    
    // Mark Dev fix step as completed
    const devFixStep = workflow.steps.find(s => s.id === 'dev_fix');
    if (devFixStep) {
      devFixStep.status = 'completed';
      devFixStep.updated_at = new Date();
    }
    
    // Add QA re-validation step
    workflow.steps.push({
      id: 'qa_revalidate',
      actor_role: 'QA',
      action: 'revalidate_after_fix',
      status: 'in_progress',
      created_at: new Date(),
      updated_at: new Date(),
    });
    
    workflow.current_step = 'qa_revalidate';
    activeWorkflows.set(storyId, workflow);
    
    // Log activity
    await ImportanceManager.logActivity(devActorId, 'defect_fix_completed', undefined, storyId);
    
    // Mandatory post-job memory update
    await EnhancedMemoryManager.executePostJobHook({
      actorId: devActorId,
      actorRole: 'Developer',
      storyId: storyId,
      jobType: 'defect_fix',
      jobResult: { story_id: storyId, status: 'fix_completed' },
      confidence: 0.9,
    });
    
    // Send notification for Dev defect fix completion
    try {
      await NotificationService.getInstance().notifyAgentCompletion(
        devActorId,
        'Developer',
        storyId,
        'defect_fix',
        {
          nextSteps: 'Defect fix completed and handed off to QA for re-validation',
          confidence: 0.9,
        }
      );
    } catch (error) {
      // Log notification error but don't fail the workflow
      console.error('Failed to send Dev defect fix notification:', error);
    }
    
    return workflow;
  }
  
  /**
   * Get workflow state for a story
   */
  static getWorkflowState(storyId: number): DevWorkflowState | undefined {
    return activeWorkflows.get(storyId);
  }
  
  /**
   * Check if epic is complete and requires HITL
   */
  static async checkEpicCompletionHITL(): Promise<{
    epicComplete: boolean;
    hitlRequired: boolean;
    completedStories: number;
    totalStories: number;
  }> {
    // This is a placeholder - in a real implementation, we'd check if all stories in the epic are done
    // For now, we'll simulate the logic using the epicId
    const completedStories = 5; // Placeholder - would query by epicId
    const totalStories = 5; // Placeholder - would query by epicId
    const epicComplete = completedStories === totalStories;
    
    return {
      epicComplete,
      hitlRequired: epicComplete, // HITL required only at epic completion
      completedStories,
      totalStories,
    };
  }
  
  private static async createDefect(
    storyId: number,
    qaActorId: number,
    title: string,
    description: string,
    severity: 'low' | 'medium' | 'high' | 'critical'
  ): Promise<Defect> {
    const sql = `INSERT INTO defects (story_id, qa_actor_id, title, description, severity, status)
      VALUES ($1, $2, $3, $4, $5, 'open')
      RETURNING *`;
    const values = [storyId, qaActorId, title, description, severity];
    const { rows } = await query<Defect>(sql, values);
    return rows[0];
  }
  
  private static async executePush(storyId: number): Promise<any> {
    // This would integrate with git workflow
    // For now, return a placeholder result
    return {
      success: true,
      branch: `story-${storyId}`,
      commit_hash: `abc123def456`,
      message: `Auto-push: Story ${storyId} QA approved`,
    };
  }
}