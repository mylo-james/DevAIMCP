import { listProjects, query } from '../lib/database.ts';

function toCSV(rows: any[]): string {
	if (rows.length === 0) return '';
	const headers = Object.keys(rows[0]);
	const escape = (v: any) => {
		const s = typeof v === 'string' ? v : JSON.stringify(v ?? '');
		return '"' + s.replace(/"/g, '""') + '"';
	};
	return [headers.join(','), ...rows.map((r) => headers.map((h) => escape((r as any)[h])).join(','))].join('\n');
}

function toMarkdown(rows: any[]): string {
	if (rows.length === 0) return '';
	const headers = Object.keys(rows[0]);
	const headerRow = `| ${headers.join(' | ')} |`;
	const sep = `| ${headers.map(() => '---').join(' | ')} |`;
	const body = rows
		.map((r) => `| ${headers.map((h) => String((r as any)[h] ?? '')).join(' | ')} |`)
		.join('\n');
	return `${headerRow}\n${sep}\n${body}`;
}

function wrapHtml(body: string): string {
	return `<!doctype html><html><head><meta charset=\"utf-8\"><title>DevAI Export</title><style>table{border-collapse:collapse}td,th{border:1px solid #ccc;padding:4px 8px}</style></head><body>${body}</body></html>`;
}

export async function exportData(args: any) {
	const action = String(args.action || 'summary');
	const format = String(args.format || 'json');
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
			const rows = res.rows;
			if (format === 'json') return { content: [{ type: 'text', text: JSON.stringify(rows, null, 2) }] };
			if (format === 'csv') return { content: [{ type: 'text', text: toCSV(rows) }] };
			if (format === 'markdown') return { content: [{ type: 'text', text: toMarkdown(rows) }] };
			if (format === 'html') return { content: [{ type: 'text', text: wrapHtml(`<h1>Memories</h1><pre>${toMarkdown(rows)}</pre>`) }] };
			return { content: [{ type: 'text', text: JSON.stringify(rows, null, 2) }] };
		}
		default:
			return { content: [{ type: 'text', text: 'Unknown action' }] };
	}
}