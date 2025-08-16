export async function shardDocument(args: { inPath: string; outDir: string }) {
	return { content: [{ type: 'text', text: `sharded:${args.inPath}` }] };
}