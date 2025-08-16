type Project = {
	id: number;
	name: string;
	description?: string;
	repository_url?: string;
	language?: string;
	framework?: string;
	metadata?: Record<string, unknown>;
};

const projects: Project[] = [];
let nextId = 1;

export async function manageProject(args: any) {
	const action = args.action as string;
	switch (action) {
		case 'create': {
			const project: Project = {
				id: nextId++,
				name: args.name,
				description: args.description,
				repository_url: args.repository_url,
				language: args.language,
				framework: args.framework,
				metadata: args.metadata,
			};
			projects.push(project);
			return { content: [{ type: 'text', text: JSON.stringify(project) }] };
		}
		case 'get': {
			const project = projects.find((p) => p.id === Number(args.projectId));
			if (!project) return { content: [{ type: 'text', text: 'Not found' }] };
			return { content: [{ type: 'text', text: JSON.stringify(project) }] };
		}
		case 'list': {
			return { content: [{ type: 'text', text: JSON.stringify(projects) }] };
		}
		case 'context': {
			const project = projects.find((p) => p.id === Number(args.projectId));
			const context = project ? `Context for ${project.name}` : '';
			return { content: [{ type: 'text', text: context }] };
		}
		default:
			return { content: [{ type: 'text', text: 'Unknown action' }] };
	}
}