import { describe, it, expect, beforeEach } from 'vitest';
import { PersonaService, DEFAULT_PERSONAS } from '../lib/personas.ts';

describe('PersonaService', () => {
  beforeEach(() => {
    // Clear any existing persona contexts before each test
    const contexts = (PersonaService as any).activePersonaContexts;
    if (contexts) {
      contexts.clear();
    }
  });

  describe('Persona Management', () => {
    it('should have default personas defined', () => {
      expect(DEFAULT_PERSONAS).toHaveLength(5);
      expect(DEFAULT_PERSONAS.find(p => p.role === 'Scrum Master')).toBeTruthy();
      expect(DEFAULT_PERSONAS.find(p => p.role === 'Developer')).toBeTruthy();
      expect(DEFAULT_PERSONAS.find(p => p.role === 'QA')).toBeTruthy();
      expect(DEFAULT_PERSONAS.find(p => p.role === 'Architect')).toBeTruthy();
      expect(DEFAULT_PERSONAS.find(p => p.role === 'Product Owner')).toBeTruthy();
    });

    it('should have personas with required fields', () => {
      for (const persona of DEFAULT_PERSONAS) {
        expect(persona.name).toBeTruthy();
        expect(persona.role).toBeTruthy();
        expect(persona.biography).toBeTruthy();
        expect(persona.specialties).toBeInstanceOf(Array);
        expect(persona.preferences).toBeTypeOf('object');
        expect(persona.style).toBeTruthy();
        expect(persona.procedures).toBeInstanceOf(Array);
        expect(persona.checklists).toBeInstanceOf(Array);
      }
    });
  });

  describe('In-Character Behavior', () => {
    it('should generate personality-driven responses', () => {
      const alexPersona = DEFAULT_PERSONAS.find(p => p.name === 'Alex')!;
      const response = (PersonaService as any).generateInCharacterResponse(
        alexPersona,
        'I need help with a story'
      );

      expect(response).toContain('Alex');
      expect(response).toContain('systematic approach');
      expect(response).toContain('organize this work');
    });

    it('should select relevant procedures based on input', () => {
      const alexPersona = DEFAULT_PERSONAS.find(p => p.name === 'Alex')!;
      const procedures = (PersonaService as any).selectRelevantProcedures(
        alexPersona,
        'I need to create a story'
      );

      expect(procedures).toContain('story-draft-checklist');
    });

    it('should select relevant checklists based on input', () => {
      const alexPersona = DEFAULT_PERSONAS.find(p => p.name === 'Alex')!;
      const checklists = (PersonaService as any).selectRelevantChecklists(
        alexPersona,
        'I need to review changes'
      );

      expect(checklists).toContain('change-checklist');
    });
  });

  describe('Role-Specific Responses', () => {
    it('should generate role-specific responses for Scrum Master', () => {
      const response = (PersonaService as any).getRoleSpecificResponse(
        'Scrum Master',
        'test input'
      );
      expect(response).toContain('organize this work');
      expect(response).toContain('stories');
    });

    it('should generate role-specific responses for Developer', () => {
      const response = (PersonaService as any).getRoleSpecificResponse('Developer', 'test input');
      expect(response).toContain('technical requirements');
      expect(response).toContain('implementation');
    });

    it('should generate role-specific responses for QA', () => {
      const response = (PersonaService as any).getRoleSpecificResponse('QA', 'test input');
      expect(response).toContain('test coverage');
      expect(response).toContain('quality validation');
    });

    it('should generate role-specific responses for Architect', () => {
      const response = (PersonaService as any).getRoleSpecificResponse('Architect', 'test input');
      expect(response).toContain('system design');
      expect(response).toContain('architectural');
    });

    it('should generate role-specific responses for Product Owner', () => {
      const response = (PersonaService as any).getRoleSpecificResponse(
        'Product Owner',
        'test input'
      );
      expect(response).toContain('business value');
      expect(response).toContain('requirements');
    });
  });

  describe('Handoff Functionality', () => {
    it('should generate proper handoff messages', () => {
      const alexPersona = DEFAULT_PERSONAS.find(p => p.name === 'Alex')!;
      const jordanPersona = DEFAULT_PERSONAS.find(p => p.name === 'Jordan')!;

      const message = (PersonaService as any).generateHandoffMessage(
        alexPersona,
        jordanPersona,
        'Story is ready for implementation'
      );

      expect(message).toContain('Alex');
      expect(message).toContain('Scrum Master');
      expect(message).toContain('Jordan');
      expect(message).toContain('Developer');
      expect(message).toContain('Story is ready for implementation');
    });
  });

  describe('Personality Styles', () => {
    it('should generate different personality prefixes for different styles', () => {
      const analyticalPersona = { ...DEFAULT_PERSONAS[0], style: 'analytical' };
      const collaborativePersona = { ...DEFAULT_PERSONAS[0], style: 'collaborative' };
      const methodicalPersona = { ...DEFAULT_PERSONAS[0], style: 'methodical' };
      const innovativePersona = { ...DEFAULT_PERSONAS[0], style: 'innovative' };

      const analyticalPrefix = (PersonaService as any).getPersonalityPrefix(analyticalPersona);
      const collaborativePrefix = (PersonaService as any).getPersonalityPrefix(
        collaborativePersona
      );
      const methodicalPrefix = (PersonaService as any).getPersonalityPrefix(methodicalPersona);
      const innovativePrefix = (PersonaService as any).getPersonalityPrefix(innovativePersona);

      expect(analyticalPrefix).toContain('diving deep into details');
      expect(collaborativePrefix).toContain('work together');
      expect(methodicalPrefix).toContain('systematic approach');
      expect(innovativePrefix).toContain('think outside the box');
    });
  });
});
