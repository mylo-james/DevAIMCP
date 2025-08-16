import OpenAI from 'openai';
let cachedClient = null;
export function getEmbeddingsClient(custom) {
    if (custom)
        return custom;
    if (!cachedClient) {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new Error('OPENAI_API_KEY is required to use embeddings');
        }
        cachedClient = new OpenAI({ apiKey });
    }
    return cachedClient;
}
export async function generateEmbedding(text, client) {
    const c = getEmbeddingsClient(client);
    const { data } = await c.embeddings.create({ model: 'text-embedding-3-small', input: text });
    return data[0].embedding;
}
