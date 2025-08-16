import { PersonaService, DEFAULT_PERSONAS } from '../lib/personas';

export async function seedDefaultPersonas() {
  console.log('Seeding default personas...');

  try {
    const existingPersonas = await PersonaService.getPersonas();

    for (const defaultPersona of DEFAULT_PERSONAS) {
      // Check if persona already exists
      const existing = existingPersonas.find(
        p => p.name === defaultPersona.name && p.role === defaultPersona.role
      );

      if (!existing) {
        console.log(`Creating persona: ${defaultPersona.name} (${defaultPersona.role})`);
        await PersonaService.createPersona(defaultPersona);
      } else {
        console.log(`Persona already exists: ${defaultPersona.name} (${defaultPersona.role})`);
      }
    }

    console.log('Default personas seeding completed successfully!');
    return { content: [{ type: 'text', text: 'Default personas seeded successfully' }] };
  } catch (error) {
    console.error('Error seeding personas:', error);
    return { content: [{ type: 'text', text: `Error seeding personas: ${error}` }] };
  }
}
