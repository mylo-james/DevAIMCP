export async function shardDocument(..._args: any[]) {
	return { content: [{ type: 'text', text: 'shard-doc stub' }] } as any;
}