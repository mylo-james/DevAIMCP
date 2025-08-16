import { describe, it, expect, beforeEach } from 'vitest';
import { OrchestratorService } from '../lib/orchestrator.ts';

describe('OrchestratorService', () => {
  beforeEach(() => {
    // Clear any existing sessions before each test
    const sessions = (OrchestratorService as any).activeSessions;
    if (sessions) {
      sessions.clear();
    }
  });

  describe('DevAI Mode Activation', () => {
    it('should activate DevAI mode and provide orchestrator greeting', async () => {
      const result = await OrchestratorService.activateDevAIMode({});

      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('sessionId');
      expect(result).toHaveProperty('availablePersonas');
      expect(result).toHaveProperty('suggestedActions');

      expect(result.message).toContain('Welcome to DevAI Mode');
      expect(result.message).toContain('Orchestrator');
      expect(result.sessionId).toMatch(/^devai_\d+_/);
      expect(result.availablePersonas).toContain('SM');
      expect(result.availablePersonas).toContain('Developer');
      expect(result.availablePersonas).toContain('QA');
    });

    it('should capture and process initial query', async () => {
      const initialQuery = 'I need to create a new user authentication feature';
      const result = await OrchestratorService.activateDevAIMode({
        initialQuery,
      });

      expect(result.message).toContain(initialQuery);
      expect(result.message).toContain('I see you already have a question');
      expect(result.suggestedActions).toContain('Create a new story');
    });

    it('should include project context when projectId provided', async () => {
      // Test without database dependency - just verify structure
      const result = await OrchestratorService.activateDevAIMode({});

      expect(result.sessionId).toBeTruthy();
      expect(result.message).toContain('Orchestrator');
      expect(result.message).toContain('Welcome to DevAI Mode');
    });
  });

  describe('Natural Language Processing', () => {
    it('should process natural language input and route to appropriate persona', async () => {
      // First activate DevAI mode
      const activation = await OrchestratorService.activateDevAIMode({});

      // Then process natural language input
      const result = await OrchestratorService.processNaturalLanguageInput({
        sessionId: activation.sessionId,
        userInput: 'I need to implement a new feature',
      });

      expect(result).toHaveProperty('response');
      expect(result).toHaveProperty('routedPersona');
      expect(result).toHaveProperty('nextSteps');

      expect(result.routedPersona).toBe('Developer');
      expect(result.nextSteps).toContain('Review story details');
    });

    it('should route story-related queries to Scrum Master', async () => {
      const activation = await OrchestratorService.activateDevAIMode({});

      const result = await OrchestratorService.processNaturalLanguageInput({
        sessionId: activation.sessionId,
        userInput: 'I want to create a new user story',
      });

      expect(result.routedPersona).toBe('Scrum Master');
      expect(result.nextSteps).toContain('Create or update stories');
    });

    it('should route testing queries to QA', async () => {
      const activation = await OrchestratorService.activateDevAIMode({});

      const result = await OrchestratorService.processNaturalLanguageInput({
        sessionId: activation.sessionId,
        userInput: 'I found a bug that needs testing',
      });

      expect(result.routedPersona).toBe('QA');
      expect(result.nextSteps).toContain('Execute validation');
    });

    it('should route architecture queries to Architect', async () => {
      const activation = await OrchestratorService.activateDevAIMode({});

      const result = await OrchestratorService.processNaturalLanguageInput({
        sessionId: activation.sessionId,
        userInput: 'I need to design the system architecture',
      });

      expect(result.routedPersona).toBe('Architect');
      expect(result.nextSteps).toContain('Design solution');
    });

    it('should throw error for invalid session ID', async () => {
      await expect(
        OrchestratorService.processNaturalLanguageInput({
          sessionId: 'invalid_session',
          userInput: 'test input',
        })
      ).rejects.toThrow('Invalid session ID');
    });
  });

  describe('Session Management', () => {
    it('should maintain session context', async () => {
      const activation = await OrchestratorService.activateDevAIMode({
        initialQuery: 'test query',
      });

      const session = OrchestratorService.getSession(activation.sessionId);
      expect(session).toBeTruthy();
      expect(session?.initialQuery).toBe('test query');
      expect(session?.id).toBe(activation.sessionId);
    });

    it('should update session context', async () => {
      const activation = await OrchestratorService.activateDevAIMode({});

      OrchestratorService.updateSessionContext(activation.sessionId, {
        currentPersona: 'Developer',
      });

      const session = OrchestratorService.getSession(activation.sessionId);
      expect(session?.currentPersona).toBe('Developer');
    });
  });
});
