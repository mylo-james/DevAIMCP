type Memory = {
	projectId: number;
	memoryType: string;
	content: string;
	context?: string;
	reasoning?: string;
	confidence?: number;
	tags?: string[];
	createdAt: string;
};

const memories: Memory[] = [];

export async function manageMemory(args: any) {
	const action = args.action as string;
	switch (action) {
		case 'store': {
			const m: Memory = {
				projectId: Number(args.projectId),
				memoryType: args.memoryType,
				content: args.content,
				context: args.context,
				reasoning: args.reasoning,
				confidence: args.confidence,
				tags: args.tags,
				createdAt: new Date().toISOString(),
			};
			memories.push(m);
			return { content: [{ type: 'text', text: 'stored' }] };
		}
		case 'search': {
			const q = (args.query as string).toLowerCase();
			const projectId = args.projectId ? Number(args.projectId) : undefined;
			const filtered = memories.filter((m) => {
				const inProject = projectId ? m.projectId === projectId : true;
				return inProject && (m.content.toLowerCase().includes(q) || (m.context || '').toLowerCase().includes(q));
			});
			return { content: [{ type: 'text', text: JSON.stringify(filtered) }] };
		}
		default:
			return { content: [{ type: 'text', text: 'Unknown action' }] };
	}
}