const stories = [];
let nextStoryId = 1;
export async function manageStory(args) {
  switch (args.action) {
    case 'create': {
      const s = {
        id: nextStoryId++,
        projectId: Number(args.projectId),
        title: args.title,
        description: args.description,
        acceptance_criteria: args.acceptance_criteria,
        story_points: args.story_points,
        priority: args.priority,
      };
      stories.push(s);
      return { content: [{ type: 'text', text: JSON.stringify(s) }] };
    }
    case 'update': {
      const s = stories.find(st => st.id === Number(args.id));
      if (!s) return { content: [{ type: 'text', text: 'Not found' }] };
      Object.assign(s, args);
      return { content: [{ type: 'text', text: JSON.stringify(s) }] };
    }
    case 'list': {
      const list = stories.filter(s => s.projectId === Number(args.projectId));
      return { content: [{ type: 'text', text: JSON.stringify(list) }] };
    }
    case 'get': {
      const s = stories.find(st => st.id === Number(args.id));
      return { content: [{ type: 'text', text: JSON.stringify(s || null) }] };
    }
    default:
      return { content: [{ type: 'text', text: 'Unknown action' }] };
  }
}
