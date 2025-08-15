export async function executeWorkflow(workflowType: string, projectId: number, steps?: any[]) {
	return { content: [{ type: 'text', text: `workflow:${workflowType}:${projectId}` }] };
}