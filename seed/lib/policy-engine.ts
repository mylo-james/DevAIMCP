export async function validatePolicy(action: string, context?: string, agent?: string) {
	const ok = Boolean(action);
	return {
		content: [{ type: 'text', text: ok ? 'allowed' : 'denied' }],
	};
}