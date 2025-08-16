export async function runTests(test_type?: string, pattern?: string, watch?: boolean) {
	return { content: [{ type: 'text', text: `tests:${test_type || ''}:${pattern || ''}:${watch ? 'watch' : ''}` }] };
}