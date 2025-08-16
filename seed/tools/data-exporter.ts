import { listProjects, query } from '../lib/database.ts';

export async function exportData(args: any) {
	const action = String(args.action || 'summary');
	switch (action) {
		case 'summary': {
			const projects = await listProjects();
			const summary = { projects: projects.length };
			return { content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }] };
		}
		case 'project': {
			const id = Number(args.projectId);
			const res = await query('SELECT * FROM projects WHERE id = $1', [id]);
			return { content: [{ type: 'text', text: JSON.stringify(res.rows[0] || null, null, 2) }] };
		}
		case 'memories': {
			const id = Number(args.projectId);
			const res = await query('SELECT id, project_id, memory_type, content, context, reasoning, confidence, tags, created_at FROM memories WHERE project_id = $1 ORDER BY id ASC', [id]);
			return { content: [{ type: 'text', text: JSON.stringify(res.rows, null, 2) }] };
		}
		default:
			return { content: [{ type: 'text', text: 'Unknown action' }] };
	}
}