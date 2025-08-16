import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  createProject,
  createStory,
  storeMemory,
  query,
} from './lib/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BMAD_ROOT = path.resolve(__dirname, '..', 'BMAD-METHOD');

async function ensureProject(name: string, description?: string) {
  const existing = await query<any>(
    'SELECT * FROM projects WHERE name = $1 LIMIT 1',
    [name]
  );
  if (existing.rows[0]) return existing.rows[0];
  return await createProject({
    name,
    description,
    repository_url: null as any,
    language: null as any,
    framework: null as any,
    metadata: null as any,
  });
}

async function collectFiles(
  dir: string,
  exts: string[],
  out: string[] = [],
  base?: string
): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await collectFiles(full, exts, out, base ?? dir);
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      if (exts.includes(ext)) out.push(full);
    }
  }
  return out;
}

function toTags(relPath: string): string[] {
  return relPath
    .split(path.sep)
    .filter(Boolean)
    .map((s) => s.replace(/\s+/g, '-').toLowerCase());
}

async function seedBmadKnowledge(projectId: number) {
  try {
    const files = await collectFiles(BMAD_ROOT, ['.md', '.txt']);
    let count = 0;
    for (const file of files) {
      const rel = path.relative(BMAD_ROOT, file);
      const content = await fs.readFile(file, 'utf8');
      const title = path.basename(file);
      const tags = toTags(rel);
      await storeMemory({
        id: 0 as any,
        project_id: projectId,
        memory_type: 'doc',
        content: `# ${title}\n\nPath: ${rel}\n\n${content}`,
        context: rel,
        reasoning: null,
        confidence: null,
        tags,
        embedding: null,
        created_at: '' as any,
        updated_at: '' as any,
      });
      count += 1;
      if (count % 50 === 0) console.log(`Seeded ${count} BMAD docs...`);
    }
    console.log(`✅ Seeded ${count} BMAD docs into project`);
  } catch (err) {
    console.error('❌ Error seeding BMAD docs:', err);
  }
}

const AWR_SPEC = `MCP Actor‑Weighted Retrieval — Abstract Spec (Model‑Agnostic)

Goal
Implement an MCP‑style server where multiple AI actors (agent personalities) share a knowledge base but value items differently. The system maintains a per‑actor importance signal for each item and uses it to bias ranking over time, incrementing on actual use and decaying periodically.

Operating Principles
- Multiple actors (e.g., engineering, design, product) access a common store.
- Each actor has its own credentials/permissions and its own importance value per item.
- Search returns items ordered by a blend of semantic similarity, lexical relevance, and the actor‑specific importance signal.
- Consume: when an item is actually used to answer or shown to the user, increment its importance for that actor by one (bounded above by an implementation‑defined cap). Increment at most once per request.
- Decay: a scheduled process periodically reduces importance for all (actor, item) pairs (bounded below at zero). This can be a cron job or computed on the fly.
- Store importance sparsely: only persist pairs that have been touched; default importance is zero.
- Enforce access control before ranking and retrieval.

Concepts
Actor, Item, Importance.

API Surface (names only)
actors.list, auth.get_key, items.upsert, items.search, items.consume, items.decay

Retrieval & Ranking (algorithm‑agnostic)
final_score = sim_score + lexical_score + importance_weight * importance(actor, item)

Importance Lifecycle
Initialization, Increment on Consume, Decay (scheduled or computed), Access Control & Permissions, Storage Model, Observability & Safety, Behavioral Rules, Notes for the Implementer.

Action Checklist (BMAD + Actor‑Weighted Retrieval)
1) Foundation
2) Data Model & Migrations
3) Ingestion
4) Search & Ranking
5) Consumption
6) Decay
7) BMAD Workflow Integration
8) Security & Permissions
9) Observability & Metrics
10) Configuration & Operations
11) Testing
12) Rollout
13) Documentation
`;

const AWR_STEPS: Array<{
  title: string;
  description: string;
  acceptance_criteria: string[];
  points: number;
  priority: string;
}> = [
  {
    title: 'Foundation',
    description: 'Set up base project, MCP tool stubs, config',
    acceptance_criteria: ['Repo builds', 'MCP starts', 'Env wired'],
    points: 3,
    priority: 'high',
  },
  {
    title: 'Data Model & Migrations',
    description: 'Design actors, items, importance schema',
    acceptance_criteria: ['DDL applied', 'Indexes present'],
    points: 5,
    priority: 'high',
  },
  {
    title: 'Ingestion',
    description: 'Upsert items with embeddings and ACLs',
    acceptance_criteria: ['Upsert API', 'Embeddings persisted/queued'],
    points: 5,
    priority: 'high',
  },
  {
    title: 'Search & Ranking',
    description: 'Blend similarity, lexical, importance',
    acceptance_criteria: ['Weighted score', 'Configurable weights'],
    points: 8,
    priority: 'high',
  },
  {
    title: 'Consumption',
    description: 'Idempotent importance increments with keys',
    acceptance_criteria: ['At-most-once per request'],
    points: 3,
    priority: 'medium',
  },
  {
    title: 'Decay',
    description: 'Scheduled or computed decay not below zero',
    acceptance_criteria: ['Decay job or read-time decay'],
    points: 5,
    priority: 'medium',
  },
  {
    title: 'BMAD Workflow Integration',
    description: 'Integrate with BMAD agents/workflows',
    acceptance_criteria: ['Docs seeded', 'Agents aware'],
    points: 3,
    priority: 'medium',
  },
  {
    title: 'Security & Permissions',
    description: 'ACLs and scopes enforced before ranking',
    acceptance_criteria: ['Scopes enforced', 'ACL filter applied'],
    points: 5,
    priority: 'high',
  },
  {
    title: 'Observability & Metrics',
    description: 'Log search/consume minimally; metrics',
    acceptance_criteria: ['Event logs', 'Basic dashboards'],
    points: 3,
    priority: 'medium',
  },
  {
    title: 'Configuration & Operations',
    description: 'Runtime knobs for weights, caps, decay',
    acceptance_criteria: ['Configurable at runtime'],
    points: 3,
    priority: 'medium',
  },
  {
    title: 'Testing',
    description: 'Unit/integration for ranking, ACL, idempotency',
    acceptance_criteria: ['Tests green'],
    points: 5,
    priority: 'high',
  },
  {
    title: 'Rollout',
    description: 'Staged rollout with rate limits',
    acceptance_criteria: ['Feature flags'],
    points: 3,
    priority: 'low',
  },
  {
    title: 'Documentation',
    description: 'API surface, ops guide, tuning guide',
    acceptance_criteria: ['Docs published'],
    points: 3,
    priority: 'low',
  },
];

async function seedActorWeightedRetrieval() {
  const project = await ensureProject(
    'Actor‑Weighted Retrieval',
    'MCP actor‑weighted retrieval server'
  );
  // Seed spec as a doc memory
  await storeMemory({
    id: 0 as any,
    project_id: project.id,
    memory_type: 'spec',
    content: AWR_SPEC,
    context: 'specs/actor-weighted-retrieval.md',
    reasoning: null,
    confidence: null,
    tags: ['spec', 'retrieval', 'mcp'],
    embedding: null,
    created_at: '' as any,
    updated_at: '' as any,
  });
  // Seed checklist as stories
  for (const step of AWR_STEPS) {
    await createStory({
      id: 0 as any,
      project_id: project.id,
      title: step.title,
      description: step.description,
      acceptance_criteria: step.acceptance_criteria,
      story_points: step.points,
      priority: step.priority,
      status: 'todo',
      created_at: '' as any,
      updated_at: '' as any,
    });
  }
  console.log('✅ Seeded Actor‑Weighted Retrieval spec and checklist');
}

async function main() {
  console.log('🌱 Seeding BMAD knowledge and Actor‑Weighted Retrieval...');
  // Seed BMAD Method docs
  const bmadProject = await ensureProject(
    'BMAD Method',
    'Breakthrough Method of Agile AI-driven Development'
  );
  await seedBmadKnowledge(bmadProject.id);
  // Seed Actor-Weighted Retrieval project
  await seedActorWeightedRetrieval();
  console.log('🎉 Seeding complete');
}

main().catch((e) => {
  console.error('Seeding failed', e);
  process.exit(1);
});



