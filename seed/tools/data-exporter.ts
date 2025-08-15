export async function exportData(args: any) {
	const payload = { ...args, exportedAt: new Date().toISOString() };
	return { content: [{ type: 'text', text: JSON.stringify(payload) }] };
}