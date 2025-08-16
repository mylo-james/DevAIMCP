import { query } from './database.ts';

type Policy = {
	id: number;
	name: string;
	description?: string | null;
	rules: any;
	active: boolean;
};

function evaluateRules(rules: any, input: { action: string; context?: string; agent?: string }): { allowed: boolean; reasons: string[] } {
	const reasons: string[] = [];
	let allowed = true;
	if (Array.isArray(rules?.deny_actions)) {
		if (rules.deny_actions.includes(input.action)) {
			allowed = false;
			reasons.push(`action '${input.action}' is denied`);
		}
	}
	if (Array.isArray(rules?.allow_agents)) {
		if (input.agent && !rules.allow_agents.includes(input.agent)) {
			allowed = false;
			reasons.push(`agent '${input.agent}' not allowed`);
		}
	}
	if (typeof rules?.context_required === 'boolean' && rules.context_required) {
		if (!input.context || input.context.trim().length === 0) {
			allowed = false;
			reasons.push('context is required');
		}
	}
	return { allowed, reasons };
}

export async function validatePolicy(action: string, context?: string, agent?: string) {
	const { rows } = await query<Policy>('SELECT * FROM policies WHERE active = TRUE');
	let decision = { allowed: true, reasons: [] as string[] };
	for (const p of rows) {
		const r = evaluateRules(p.rules, { action, context, agent });
		if (!r.allowed) {
			decision.allowed = false;
			decision.reasons.push(`${p.name}: ${r.reasons.join('; ')}`);
		}
	}
	return {
		content: [
			{
				type: 'text',
				text: decision.allowed ? 'allowed' : `denied: ${decision.reasons.join(' | ')}`,
			},
		],
	};
}

export async function upsertPolicy(name: string, rules: any, description?: string) {
	const existing = await query<Policy>('SELECT * FROM policies WHERE name = $1', [name]);
	if (existing.rows[0]) {
		const upd = await query<Policy>('UPDATE policies SET rules = $1, description = $2, active = TRUE WHERE name = $3 RETURNING *', [rules, description ?? null, name]);
		return upd.rows[0];
	}
	const ins = await query<Policy>('INSERT INTO policies (name, description, rules, active) VALUES ($1, $2, $3, TRUE) RETURNING *', [name, description ?? null, rules]);
	return ins.rows[0];
}

export async function listPolicies() {
	const { rows } = await query<Policy>('SELECT * FROM policies ORDER BY id ASC');
	return rows;
}