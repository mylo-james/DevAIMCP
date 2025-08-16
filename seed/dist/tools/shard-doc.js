export async function shardDocument(args) {
    return { content: [{ type: 'text', text: `sharded:${args.inPath}` }] };
}
