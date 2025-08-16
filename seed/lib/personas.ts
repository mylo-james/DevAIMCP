import { query } from './database.ts';

export interface Persona {
  id: number;
  name: string;
  role: string;
  biography: string;
  specialties: string[];
  preferences: Record<string, any>;
  style: string;
  procedures: string[];
  checklists: string[];
  created_at: string;
  updated_at: string;
}

export interface PersonaContext {
  persona: Persona;
  sessionId: string;
  currentTask?: string;
  conversationHistory: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>;
}

const activePersonaContexts = new Map<string, PersonaContext>();

export class PersonaService {
  
  /**
   * Get all available personas
   */
  static async getPersonas(): Promise<Persona[]> {
    const { rows } = await query<Persona>('SELECT * FROM personas ORDER BY role, name');
    return rows;
  }
  
  /**
   * Get persona by ID
   */
  static async getPersonaById(id: number): Promise<Persona | null> {
    const { rows } = await query<Persona>('SELECT * FROM personas WHERE id = $1', [id]);
    return rows[0] || null;
  }
  
  /**
   * Get persona by role
   */
  static async getPersonaByRole(role: string): Promise<Persona | null> {
    const { rows } = await query<Persona>('SELECT * FROM personas WHERE role = $1 ORDER BY id LIMIT 1', [role]);
    return rows[0] || null;
  }
  
  /**
   * Create a new persona
   */
  static async createPersona(input: Omit<Persona, 'id' | 'created_at' | 'updated_at'>): Promise<Persona> {
    const sql = `INSERT INTO personas (name, role, biography, specialties, preferences, style, procedures, checklists)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`;
    const values = [
      input.name,
      input.role,
      input.biography,
      JSON.stringify(input.specialties),
      JSON.stringify(input.preferences),
      input.style,
      JSON.stringify(input.procedures),
      JSON.stringify(input.checklists),
    ];
    const { rows } = await query<Persona>(sql, values);
    return rows[0];
  }
  
  /**
   * Activate a persona for a session
   */
  static async activatePersona(sessionId: string, personaId: number): Promise<PersonaContext> {
    const persona = await this.getPersonaById(personaId);
    if (!persona) {
      throw new Error(`Persona with ID ${personaId} not found`);
    }
    
    const context: PersonaContext = {
      persona,
      sessionId,
      conversationHistory: [],
    };
    
    activePersonaContexts.set(sessionId, context);
    return context;
  }
  
  /**
   * Get active persona context for a session
   */
  static getPersonaContext(sessionId: string): PersonaContext | undefined {
    return activePersonaContexts.get(sessionId);
  }
  
  /**
   * Process input with in-character behavior enforcement
   */
  static async processInCharacter(sessionId: string, userInput: string): Promise<{
    response: string;
    inCharacterResponse: string;
    proceduresFollowed: string[];
    checklistsUsed: string[];
  }> {
    const context = activePersonaContexts.get(sessionId);
    if (!context) {
      throw new Error('No active persona context for session');
    }
    
    // Add to conversation history
    context.conversationHistory.push({
      role: 'user',
      content: userInput,
      timestamp: new Date(),
    });
    
    // Generate in-character response
    const inCharacterResponse = this.generateInCharacterResponse(context.persona);
    
    // Determine which procedures and checklists to follow
    const proceduresFollowed = this.selectRelevantProcedures(context.persona, userInput);
    const checklistsUsed = this.selectRelevantChecklists(context.persona, userInput);
    
    // Add assistant response to history
    context.conversationHistory.push({
      role: 'assistant',
      content: inCharacterResponse,
      timestamp: new Date(),
    });
    
    activePersonaContexts.set(sessionId, context);
    
    return {
      response: `${context.persona.name} (${context.persona.role}) responds:`,
      inCharacterResponse,
      proceduresFollowed,
      checklistsUsed,
    };
  }
  
  /**
   * Handle handoff to another persona
   */
  static async handoffToPersona(fromSessionId: string, toPersonaRole: string, handoffContext: string): Promise<{
    newSessionId: string;
    handoffMessage: string;
    newPersonaContext: PersonaContext;
  }> {
    const fromContext = activePersonaContexts.get(fromSessionId);
    if (!fromContext) {
      throw new Error('No active persona context for handoff source session');
    }
    
    const toPersona = await this.getPersonaByRole(toPersonaRole);
    if (!toPersona) {
      throw new Error(`No persona found for role: ${toPersonaRole}`);
    }
    
    // Generate new session ID for the receiving persona
    const newSessionId = `handoff_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create new context preserving relevant information
    const newContext: PersonaContext = {
      persona: toPersona,
      sessionId: newSessionId,
      conversationHistory: [
        {
          role: 'assistant',
          content: `Handoff received from ${fromContext.persona.name}: ${handoffContext}`,
          timestamp: new Date(),
        },
      ],
    };
    
    activePersonaContexts.set(newSessionId, newContext);
    
    const handoffMessage = this.generateHandoffMessage(fromContext.persona, toPersona, handoffContext);
    
    return {
      newSessionId,
      handoffMessage,
      newPersonaContext: newContext,
    };
  }
  
  private static generateInCharacterResponse(persona: Persona): string {
    const personalityPrefix = this.getPersonalityPrefix(persona);
    const roleSpecificResponse = this.getRoleSpecificResponse(persona.role);
    
    return `${personalityPrefix} ${roleSpecificResponse}`;
  }
  
  private static getPersonalityPrefix(persona: Persona): string {
    // Generate personality-driven opening based on persona style
    switch (persona.style) {
      case 'analytical':
        return `Hi! I'm ${persona.name}, and I love diving deep into details.`;
      case 'collaborative':
        return `Hey there! ${persona.name} here, ready to work together on this.`;
      case 'methodical':
        return `Greetings! I'm ${persona.name}, and I follow a systematic approach.`;
      case 'innovative':
        return `Hello! ${persona.name} at your service - let's think outside the box!`;
      default:
        return `Hi! I'm ${persona.name}, your ${persona.role}.`;
    }
  }
  
  private static getRoleSpecificResponse(role: string): string {
    switch (role) {
      case 'Scrum Master':
        return 'Let me help you organize this work into manageable stories and coordinate the team effort.';
      case 'Developer':
        return 'I\'ll analyze the technical requirements and plan the implementation approach.';
      case 'QA':
        return 'I\'ll ensure we have proper test coverage and quality validation for this.';
      case 'Architect':
        return 'Let me examine the system design implications and architectural considerations.';
      case 'Product Owner':
        return 'I\'ll help define the business value and user requirements for this feature.';
      default:
        return 'Let me help you with this request.';
    }
  }
  
  private static selectRelevantProcedures(persona: Persona, userInput: string): string[] {
    // Simple keyword matching - can be enhanced with ML
    const input = userInput.toLowerCase();
    const relevantProcedures: string[] = [];
    
    for (const procedure of persona.procedures) {
      if (input.includes(procedure.toLowerCase()) || 
          procedure.toLowerCase().includes('general') ||
          procedure.toLowerCase().includes('intake') ||
          (input.includes('story') && procedure.includes('story')) ||
          (input.includes('create') && procedure.includes('story'))) {
        relevantProcedures.push(procedure);
      }
    }
    
    return relevantProcedures.length > 0 ? relevantProcedures : ['general-intake'];
  }
  
  private static selectRelevantChecklists(persona: Persona, userInput: string): string[] {
    // Simple keyword matching - can be enhanced with ML
    const input = userInput.toLowerCase();
    const relevantChecklists: string[] = [];
    
    for (const checklist of persona.checklists) {
      if (input.includes(checklist.toLowerCase()) || 
          checklist.toLowerCase().includes('general') ||
          (input.includes('review') && checklist.includes('change')) ||
          (input.includes('change') && checklist.includes('change'))) {
        relevantChecklists.push(checklist);
      }
    }
    
    return relevantChecklists;
  }
  
  private static generateHandoffMessage(fromPersona: Persona, toPersona: Persona, context: string): string {
    return `${fromPersona.name} (${fromPersona.role}) is handing off to ${toPersona.name} (${toPersona.role}): ${context}`;
  }
}

// Default personas to seed the system
export const DEFAULT_PERSONAS: Omit<Persona, 'id' | 'created_at' | 'updated_at'>[] = [
  {
    name: 'Alex',
    role: 'Scrum Master',
    biography: 'An experienced Scrum Master who excels at breaking down complex requirements into manageable stories and coordinating team efforts.',
    specialties: ['story creation', 'sprint planning', 'team coordination', 'requirement analysis'],
    preferences: { communication_style: 'structured', detail_level: 'comprehensive' },
    style: 'methodical',
    procedures: ['story-draft-checklist', 'sprint-planning', 'general-intake'],
    checklists: ['story-draft-checklist', 'change-checklist'],
  },
  {
    name: 'Jordan',
    role: 'Developer',
    biography: 'A skilled full-stack developer with expertise in modern frameworks and test-driven development practices.',
    specialties: ['full-stack development', 'TDD', 'code quality', 'technical implementation'],
    preferences: { testing_approach: 'TDD', code_style: 'clean_code' },
    style: 'analytical',
    procedures: ['develop-story', 'run-tests', 'general-intake'],
    checklists: ['story-dod-checklist', 'change-checklist'],
  },
  {
    name: 'Sam',
    role: 'QA',
    biography: 'A meticulous QA engineer who ensures quality through comprehensive testing and validation processes.',
    specialties: ['test automation', 'quality validation', 'bug tracking', 'acceptance testing'],
    preferences: { test_coverage: 'comprehensive', validation_approach: 'systematic' },
    style: 'methodical',
    procedures: ['review-story', 'qa-gate', 'general-intake'],
    checklists: ['story-dod-checklist', 'change-checklist'],
  },
  {
    name: 'Taylor',
    role: 'Architect',
    biography: 'A system architect who designs scalable, maintainable solutions and ensures technical excellence.',
    specialties: ['system design', 'scalability', 'technical architecture', 'design patterns'],
    preferences: { architecture_style: 'microservices', documentation: 'comprehensive' },
    style: 'innovative',
    procedures: ['architect-design', 'general-intake'],
    checklists: ['architect-checklist', 'change-checklist'],
  },
  {
    name: 'Morgan',
    role: 'Product Owner',
    biography: 'A product-focused leader who defines requirements and ensures business value delivery.',
    specialties: ['requirement definition', 'business analysis', 'user experience', 'product strategy'],
    preferences: { user_focus: 'high', business_value: 'priority' },
    style: 'collaborative',
    procedures: ['create-epic', 'validate-story', 'general-intake'],
    checklists: ['po-master-checklist', 'change-checklist'],
  },
];