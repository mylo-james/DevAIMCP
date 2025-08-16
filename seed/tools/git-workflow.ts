export async function executeGitWorkflow(action: string, args: any) {
	return { content: [{ type: 'text', text: `git:${action}` }] };
}