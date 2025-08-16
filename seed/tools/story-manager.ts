// Story type defined for reference but not used in this file

import { createStory, getStoryById, listStories, updateStory } from '../lib/database.ts';

export async function manageStory(args: any) {
  switch (args.action) {
    case 'create': {
      const s = await createStory({
        id: 0 as any,
        project_id: Number(args.projectId),
        title: args.title,
        description: args.description,
        acceptance_criteria: args.acceptance_criteria,
        story_points: args.story_points,
        priority: args.priority,
        status: 'todo',
        created_at: '' as any,
        updated_at: '' as any,
      });
      return { content: [{ type: 'text', text: JSON.stringify(s) }] };
    }
    case 'update': {
      const id = Number(args.id);
      const s = await updateStory(id, {
        title: args.title,
        description: args.description,
        acceptance_criteria: args.acceptance_criteria,
        story_points: args.story_points,
        priority: args.priority,
        status: args.status,
      });
      if (!s) return { content: [{ type: 'text', text: 'Not found' }] };
      return { content: [{ type: 'text', text: JSON.stringify(s) }] };
    }
    case 'list': {
      const list = await listStories(Number(args.projectId));
      return { content: [{ type: 'text', text: JSON.stringify(list) }] };
    }
    case 'get': {
      const s = await getStoryById(Number(args.id));
      return { content: [{ type: 'text', text: JSON.stringify(s || null) }] };
    }
    default:
      return { content: [{ type: 'text', text: 'Unknown action' }] };
  }
}
