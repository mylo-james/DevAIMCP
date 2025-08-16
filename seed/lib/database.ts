import OpenAI from 'openai';

export type EmbeddingVector = number[];

export interface EmbeddingsClientLike {
  embeddings: {
    create: (args: { model: string; input: string }) => Promise<{ data: Array<{ embedding: number[] }> }>;
  };
}

let cachedClient: OpenAI | null = null;

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

export async function generateEmbedding(text: string, client?: EmbeddingsClientLike): Promise<EmbeddingVector> {
  const c = getEmbeddingsClient(client);
  const { data } = await c.embeddings.create({ model: 'text-embedding-3-small', input: text });
  return data[0].embedding;
}