export async function validatePolicy(..._args: any[]) {
	return { content: [{ type: 'text', text: 'policy ok' }] } as any;
}