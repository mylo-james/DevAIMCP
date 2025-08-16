import OpenAI from 'openai';
import { Pool, PoolClient, QueryResult } from 'pg';
import { getDatabaseUrl } from './config.ts';

export type EmbeddingVector = number[];

export interface EmbeddingsClientLike {
  embeddings: {
    create: (args: {
      model: string;
      input: string;
    }) => Promise<{ data: Array<{ embedding: number[] }> }>;
  };
}

let cachedClient: OpenAI | null = null;
let pool: Pool | null = null;

export function getEmbeddingsClient(custom?: EmbeddingsClientLike): EmbeddingsClientLike {
  if (custom) return custom;
  if (!cachedClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is required to use embeddings');
    }
    cachedClient = new OpenAI({ apiKey });
  }
  return cachedClient as unknown as EmbeddingsClientLike;
}

export async function generateEmbedding(
  text: string,
  client?: EmbeddingsClientLike
): Promise<EmbeddingVector> {
  const c = getEmbeddingsClient(client);
  const { data } = await c.embeddings.create({ model: 'text-embedding-3-small', input: text });
  return data[0].embedding;
}

export function getDbPool(): Pool {
  if (!pool) {
    const connectionString = getDatabaseUrl();
    pool = new Pool({ connectionString, max: 10 });
  }
  return pool;
}

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const p = getDbPool();
  const client = await p.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function query<T = any>(text: string, params: any[] = []): Promise<QueryResult<T>> {
  return await getDbPool().query<T>(text, params);
}

// Repositories
export type Project = {
  id: number;
  name: string;
  description?: string | null;
  repository_url?: string | null;
  language?: string | null;
  framework?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export async function createProject(
  input: Omit<Project, 'id' | 'created_at' | 'updated_at'>
): Promise<Project> {
  const sql = `INSERT INTO projects (name, description, repository_url, language, framework, metadata)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, name, description, repository_url, language, framework, metadata, created_at, updated_at`;
  const values = [
    input.name,
    input.description ?? null,
    input.repository_url ?? null,
    input.language ?? null,
    input.framework ?? null,
    input.metadata ?? null,
  ];
  const { rows } = await query<Project>(sql, values);
  return rows[0];
}

export async function getProjectById(id: number): Promise<Project | null> {
  const { rows } = await query<Project>('SELECT * FROM projects WHERE id = $1', [id]);
  return rows[0] || null;
}

export async function listProjects(): Promise<Project[]> {
  const { rows } = await query<Project>('SELECT * FROM projects ORDER BY id ASC');
  return rows;
}

export type Memory = {
  id: number;
  project_id: number;
  memory_type: string;
  content: string;
  context?: string | null;
  reasoning?: string | null;
  confidence?: number | null;
  tags?: string[] | null;
  embedding?: EmbeddingVector | null;
  created_at: string;
  updated_at: string;
};

export async function storeMemory(
  input: Omit<Memory, 'id' | 'created_at' | 'updated_at'>
): Promise<Memory> {
  const sql = `INSERT INTO memories (project_id, memory_type, content, context, reasoning, confidence, tags, embedding)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, project_id, memory_type, content, context, reasoning, confidence, tags, embedding, created_at, updated_at`;
  const values = [
    input.project_id,
    input.memory_type,
    input.content,
    input.context ?? null,
    input.reasoning ?? null,
    input.confidence ?? null,
    input.tags ?? null,
    input.embedding ?? null,
  ];
  const { rows } = await query<Memory>(sql, values);
  return rows[0];
}

export async function semanticSearchMemories(params: {
  queryText: string;
  projectId?: number;
  memoryType?: string;
  limit?: number;
  embedding?: EmbeddingVector;
}): Promise<Array<{ memory: Memory; score: number }>> {
  const limit = params.limit ?? 10;
  const embedding = params.embedding ?? (await generateEmbedding(params.queryText));
  const filters: string[] = [];
  const values: any[] = [embedding, limit];
  if (params.projectId) {
    filters.push('project_id = $' + (values.length + 1));
    values.push(params.projectId);
  }
  if (params.memoryType) {
    filters.push('memory_type = $' + (values.length + 1));
    values.push(params.memoryType);
  }
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const sql = `
		SELECT m.*, 1 - (m.embedding <=> $1) AS score
		FROM memories m
		${where}
		ORDER BY m.embedding <=> $1 ASC
		LIMIT $2
	`;
  const { rows } = await query<any>(sql, values);
  return rows.map(r => ({
    memory: {
      id: r.id,
      project_id: r.project_id,
      memory_type: r.memory_type,
      content: r.content,
      context: r.context,
      reasoning: r.reasoning,
      confidence: r.confidence,
      tags: r.tags,
      embedding: r.embedding,
      created_at: r.created_at,
      updated_at: r.updated_at,
    },
    score: Number(r.score),
  }));
}

export type Story = {
  id: number;
  project_id: number;
  title?: string | null;
  description?: string | null;
  acceptance_criteria?: string[] | null;
  story_points?: number | null;
  priority?: string | null;
  status?: string | null;
  created_at: string;
  updated_at: string;
};

export async function createStory(
  input: Omit<Story, 'id' | 'created_at' | 'updated_at'>
): Promise<Story> {
  const sql = `INSERT INTO stories (project_id, title, description, acceptance_criteria, story_points, priority, status)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING *`;
  const values = [
    input.project_id,
    input.title ?? null,
    input.description ?? null,
    input.acceptance_criteria ? JSON.stringify(input.acceptance_criteria) : null,
    input.story_points ?? null,
    input.priority ?? null,
    input.status ?? 'todo',
  ];
  const { rows } = await query<Story>(sql, values);
  return rows[0];
}

export async function updateStory(
  id: number,
  patch: Partial<Omit<Story, 'id' | 'created_at' | 'updated_at'>>
): Promise<Story | null> {
  const fields = Object.keys(patch);
  if (fields.length === 0) return await getStoryById(id);
  const sets = fields.map((k, i) => `${k} = $${i + 1}`).join(', ');
  const values = fields.map(k => (patch as any)[k]);
  values.push(id);
  const sql = `UPDATE stories SET ${sets} WHERE id = $${fields.length + 1} RETURNING *`;
  const { rows } = await query<Story>(sql, values);
  return rows[0] || null;
}

export async function listStories(projectId: number): Promise<Story[]> {
  const { rows } = await query<Story>(
    'SELECT * FROM stories WHERE project_id = $1 ORDER BY id ASC',
    [projectId]
  );
  return rows;
}

export async function getStoryById(id: number): Promise<Story | null> {
  const { rows } = await query<Story>('SELECT * FROM stories WHERE id = $1', [id]);
  return rows[0] || null;
}
