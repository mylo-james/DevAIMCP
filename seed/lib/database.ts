import OpenAI from 'openai';
import { Pool } from 'pg';
import { loadDatabaseConfig } from './config.ts';

export async function createEmbedding(text: string, apiKey = process.env.OPENAI_API_KEY): Promise<number[]> {
	if (!apiKey) throw new Error('OPENAI_API_KEY missing');
	const client = new OpenAI({ apiKey });
	const resp = await client.embeddings.create({ model: 'text-embedding-3-small', input: text });
	const vec = resp.data?.[0]?.embedding;
	if (!vec) throw new Error('No embedding returned');
	return vec as number[];
}

export class DatabaseManager {
	private pool: Pool;
	constructor() {
		const cfg = loadDatabaseConfig();
		this.pool = new Pool({ connectionString: cfg.connectionString });
	}
	async storeMemory(projectId: number, content: string) {
		const embedding = await createEmbedding(content);
		// Example insert demonstrating vector usage; assumes pgvector extension
		await this.pool.query('INSERT INTO memories(project_id, content, embedding) VALUES($1,$2,$3)', [projectId, content, embedding]);
		return { projectId, content, embeddingLength: embedding.length };
	}
	async close() { await this.pool.end(); }
}