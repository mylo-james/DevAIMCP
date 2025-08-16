// Memory type defined for reference but not used in this file

import { generateEmbedding, semanticSearchMemories, storeMemory } from '../lib/database.ts';

export async function manageMemory(args: any) {
	const action = args.action as string;
	switch (action) {
		case 'store': {
			const embedding = await generateEmbedding(args.content);
			await storeMemory({
				id: 0 as any,
				project_id: Number(args.projectId),
				memory_type: args.memoryType,
				content: args.content,
				context: args.context,
				reasoning: args.reasoning,
				confidence: args.confidence,
				tags: args.tags,
				embedding,
				created_at: '' as any,
				updated_at: '' as any,
			});
			return { content: [{ type: 'text', text: 'stored' }] };
		}
		case 'search': {
			const list = await semanticSearchMemories({
				queryText: String(args.query),
				projectId: args.projectId ? Number(args.projectId) : undefined,
				memoryType: args.memoryType,
				limit: args.limit ? Number(args.limit) : 10,
			});
			return { content: [{ type: 'text', text: JSON.stringify(list) }] };
		}
		default:
			return { content: [{ type: 'text', text: 'Unknown action' }] };
	}
}