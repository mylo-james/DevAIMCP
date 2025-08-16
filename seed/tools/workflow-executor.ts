import { query } from '../lib/database.ts';

export async function executeWorkflow(workflowType: string, projectId: number, steps?: any[]) {
  const insert = await query(
    'INSERT INTO workflows (project_id, workflow_type, steps, status) VALUES ($1, $2, $3, $4) RETURNING *',
    [Number(projectId), String(workflowType), steps || [], 'completed']
  );
  return { content: [{ type: 'text', text: JSON.stringify(insert.rows[0]) }] };
}
