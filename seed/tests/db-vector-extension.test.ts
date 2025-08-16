import { describe, it, expect } from 'vitest';
import { Client } from 'pg';

const runIntegration = process.env.INTEGRATION === 'true';

describe('DB vector extension', () => {
  it('vector extension is available (integration)', async () => {
    if (!runIntegration) return;
    const url = process.env.DATABASE_URL;
    expect(url).toBeTruthy();
    const client = new Client({ connectionString: url });
    await client.connect();
    try {
      const res = await client.query(
        "SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') AS has_vector"
      );
      expect(res.rows[0].has_vector).toBe(true);
    } finally {
      await client.end();
    }
  });
});
