export async function executeWorkflow(workflowType, projectId, steps) {
    return { content: [{ type: 'text', text: `workflow:${workflowType}:${projectId}` }] };
}
