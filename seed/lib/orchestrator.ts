import { getProjectById } from './database.ts';

export interface DevAISession {
  id: string;
  projectId?: number;
  initialQuery?: string;
  currentPersona?: string;
  sessionContext: Record<string, any>;
  createdAt: Date;
}

export interface OrchestratorGreeting {
  message: string;
  sessionId: string;
  availablePersonas: string[];
  suggestedActions: string[];
}

const activeSessions = new Map<string, DevAISession>();

export class OrchestratorService {
  /**
   * Activate DevAI mode and create a new session with orchestrator greeting
   */
  static async activateDevAIMode(params: {
    projectId?: number;
    initialQuery?: string;
    userContext?: Record<string, any>;
  }): Promise<OrchestratorGreeting> {
    const sessionId = generateSessionId();

    // Create session
    const session: DevAISession = {
      id: sessionId,
      projectId: params.projectId,
      initialQuery: params.initialQuery,
      sessionContext: params.userContext || {},
      createdAt: new Date(),
    };

    activeSessions.set(sessionId, session);

    // Get project context if available
    let projectContext = '';
    if (params.projectId) {
      const project = await getProjectById(params.projectId);
      if (project) {
        projectContext = ` for project "${project.name}"`;
      }
    }

    // Generate greeting message
    const greeting = this.generateGreeting(session, projectContext);

    return {
      message: greeting,
      sessionId,
      availablePersonas: ['SM', 'Developer', 'QA', 'Architect', 'Product Owner'],
      suggestedActions: this.getSuggestedActions(params.initialQuery),
    };
  }

  /**
   * Process natural language input and route to appropriate persona
   */
  static async processNaturalLanguageInput(params: {
    sessionId: string;
    userInput: string;
  }): Promise<{
    response: string;
    routedPersona?: string;
    nextSteps: string[];
  }> {
    const session = activeSessions.get(params.sessionId);
    if (!session) {
      throw new Error('Invalid session ID');
    }

    // Analyze input and determine best persona
    const routedPersona = await this.routeToPersona(params.userInput);

    // Update session context
    session.currentPersona = routedPersona;
    activeSessions.set(params.sessionId, session);

    return {
      response: `I understand you want to ${params.userInput}. Let me connect you with our ${routedPersona} who specializes in this area.`,
      routedPersona,
      nextSteps: this.getNextSteps(routedPersona),
    };
  }

  /**
   * Get session information
   */
  static getSession(sessionId: string): DevAISession | undefined {
    return activeSessions.get(sessionId);
  }

  /**
   * Update session context
   */
  static updateSessionContext(sessionId: string, updates: Partial<DevAISession>): void {
    const session = activeSessions.get(sessionId);
    if (session) {
      Object.assign(session, updates);
      activeSessions.set(sessionId, session);
    }
  }

  private static generateGreeting(session: DevAISession, projectContext: string): string {
    const baseGreeting = `🚀 Welcome to DevAI Mode! I'm your Orchestrator${projectContext}.`;

    if (session.initialQuery) {
      return `${baseGreeting}\n\nI see you already have a question: "${session.initialQuery}"\n\nLet me analyze this and connect you with the right specialist to help you. No need for @commands - just tell me what you want to accomplish in natural language!`;
    }

    return `${baseGreeting}\n\nI'm here to help coordinate your development work. Just tell me what you want to accomplish in natural language - no @commands needed! I'll route you to the right specialist and keep track of everything.`;
  }

  private static getSuggestedActions(initialQuery?: string): string[] {
    if (initialQuery) {
      // Analyze the query and suggest relevant actions
      const lowerQuery = initialQuery.toLowerCase();
      if (lowerQuery.includes('story') || lowerQuery.includes('feature')) {
        return ['Create a new story', 'Review existing stories', 'Plan development approach'];
      }
      if (lowerQuery.includes('test') || lowerQuery.includes('bug')) {
        return ['Run tests', 'Review code quality', 'Debug issues'];
      }
      if (lowerQuery.includes('deploy') || lowerQuery.includes('release')) {
        return ['Review deployment status', 'Plan release', 'Check system health'];
      }
    }

    return [
      'Create a new story or epic',
      'Review project status',
      'Plan development work',
      'Run tests and quality checks',
      'Deploy or release features',
    ];
  }

  private static async routeToPersona(userInput: string): Promise<string> {
    const input = userInput.toLowerCase();

    // Simple routing logic based on keywords - can be enhanced with ML later
    if (input.includes('story') || input.includes('requirement') || input.includes('epic')) {
      return 'Scrum Master';
    }
    if (input.includes('code') || input.includes('implement') || input.includes('develop')) {
      return 'Developer';
    }
    if (input.includes('test') || input.includes('quality') || input.includes('bug')) {
      return 'QA';
    }
    if (input.includes('architecture') || input.includes('design') || input.includes('system')) {
      return 'Architect';
    }
    if (input.includes('feature') || input.includes('user') || input.includes('product')) {
      return 'Product Owner';
    }

    // Default to Scrum Master for coordination
    return 'Scrum Master';
  }

  private static getNextSteps(persona: string): string[] {
    switch (persona) {
      case 'Scrum Master':
        return ['Analyze requirements', 'Create or update stories', 'Plan sprint work'];
      case 'Developer':
        return ['Review story details', 'Plan implementation', 'Write and test code'];
      case 'QA':
        return ['Review acceptance criteria', 'Plan test strategy', 'Execute validation'];
      case 'Architect':
        return ['Analyze system requirements', 'Design solution', 'Document architecture'];
      case 'Product Owner':
        return ['Define requirements', 'Prioritize features', 'Validate business value'];
      default:
        return ['Analyze request', 'Plan approach', 'Execute solution'];
    }
  }
}

function generateSessionId(): string {
  return `devai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
