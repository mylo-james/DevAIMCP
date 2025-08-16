export async function executeGitWorkflow(action, args) {
    return { content: [{ type: 'text', text: `git:${action}` }] };
}
