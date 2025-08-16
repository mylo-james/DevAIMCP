### Epic: DevAI Custom Mode with Orchestrator, Personas, Per-Actor Importance, and HITL Gate

#### Problem

The current BMAD methodology relies on command-style invocations (e.g., @commands) and generic agents. For our MCP, we need a natural-language, orchestrator-first experience with named personas that stay in character, actor-scoped knowledge access, per-actor importance scoring with nightly decay, and a development workflow that includes a strict HITL gate at epic completion.

#### Goals

- Orchestrator-first UX: entering DevAI mode connects to MCP and greets the user with the Orchestrator. No @commands; natural language only.
- Persona routing: the Orchestrator selects the best persona by workflow knowledge, keeps role context, and NEVER breaks character.
- Actor personas: each agent is a named persona with biography, specialties, preferences, and persistent memories.
- Per-actor importance: for all knowledge resources, maintain actor-specific importance. On confirmed success, +1; nightly decay −1 for actors active that day.
- Actor-scoped access: agents operate under an actor key; visibility is limited to resources that actor is allowed to access.
- Workflow alignment: load → Orchestrator → route → fetch most-important resources for the actor → follow role procedures → complete or escalate → handoff or HITL.
- Development lifecycle: SM drafts story → Dev implements → QA validates. If QA rejects: create defect → SM storifies → Dev fixes → QA approves → push. HITL required only when finishing an epic.
- Mandatory memory updates after each job: include story reference, summary, and critical learnings for other agents.
- Truth & accuracy culture: prefer asking a human over guessing; escalate on uncertainty.

#### Non-Goals

- Re-creating @command UX. We explicitly remove @command syntax in DevAI mode.
- Building a general-purpose identity system beyond project personas.

#### Success Metrics

- Median time-to-first-meaningful-response reduced after entering DevAI mode.
- ≥90% of persona interactions include automatic memory updates.
- Importance scoring influences retrieval order (measurable increase in top-3 precision for actors).
- No unauthorized resource access in audit logs.
- All epics gated by HITL sign-off.

#### High-Level Design

- DevAI Mode Activation: IDE triggers DevAI mode → MCP session opens → Orchestrator greets and intakes any pre-load user query.
- Orchestrator: routes to persona based on query + workflow state; coordinates handoffs and HITL gates.
- Personas: defined with immutable name, role, specialties, and style. Stay in character; role procedures and checklists enforced.
- Knowledge Base: index resources with embeddings; maintain per-actor importance scores; retrieval ranks by vector score, then actor importance, then global recency.
- Importance Algorithm: when an actor confirms a resource was “what they were looking for,” increment that resource’s importance for that actor by +1. Nightly at 00:00, for each actor active that day, decrement all their resource importances by 1 (floor at 0). Track last_touched_at and activity.
- Actor-Scoped Authorization: each persona uses an actor key. Resource access filtered by ACLs/tags/ownership; enforced server-side and logged.
- Workflow Updates: implement SM→Dev→QA loop with defect creation and storification when QA rejects; auto-push on QA approval; HITL only at epic completion.
- Memory Discipline: after every job, store memory: story id/ref, summary of actions, critical learnings (tag “critical”), confidence, and tags. Vectorize for future retrieval.
- Truth Policy: when confidence is low or policy blocks an action, ask a human rather than guessing; record the escalation.

#### Data Model Changes

- actors(id, name, role, specialties, metadata)
- actor_keys(id, actor_id, key, scopes, expires_at)
- kb_resources(id, project_id, uri, type, access_tags, metadata, embedding VECTOR(1536))
- kb_actor_importance(actor_id, resource_id, importance INT DEFAULT 0, last_touched_at TIMESTAMPTZ)
- kb_access(actor_id, resource_id) or tag-based policy resolved at query time
- activity_log(id, actor_id, action, resource_id, story_id, metadata, created_at)

Notes:

- Importance floor at 0. Nightly decay runs for each actor with activity that day.
- Optionally maintain per-actor-per-tag importance aggregates for cold-start ranking.

#### Services & Modules

- Orchestrator Service: session init, persona routing, handoffs, HITL gating.
- Persona Runtime: role procedures, checklists, and never-break-character enforcement.
- Retrieval Service: vector search + actor-importance re-ranking + authorization filtering.
- Importance Manager: +1 on confirmed hits; nightly decay job.
- Memory Manager: mandatory post-job writes (story ref, summary, critical learnings, tags, confidence).
- Policy/Access: actor key validation; resource ACL; audit logging.
- Dev Workflow Engine: SM→Dev→QA loop; defect storification; auto-push; epic HITL.

#### Migration Plan for Documentation

- Copy `../BMAD-METHOD` into repo under `docs/devai-method/`.
- Systematically rename references of “BMAD” to “DevAI”.
- Remove @command syntax; replace with natural-language instructions and IDE/MCP integration notes.
- Update agent docs to personas with names and in-character guidance.
- Update workflows and checklists to reflect DevAI lifecycle and HITL gate.

#### Acceptance Criteria (Epic)

- DevAI mode is invokable and greets with Orchestrator without @commands.
- Personas remain in character and follow role procedures; handoffs occur automatically.
- Actor-scoped authorization prevents access outside actor permissions.
- Per-actor importance is updated on confirmed success and decays nightly; retrieval uses importance.
- Dev lifecycle implemented with SM→Dev→QA and defect loop; HITL at epic completion.
- After each job, memories are stored including story reference, summary, and critical learnings.
- Documentation migrated to DevAI and reflects new flows and rules.

#### Risks & Mitigations

- Over-restriction blocking progress → add graceful escalation and override paths with audit.
- Importance drift → decay and lower-bounds; periodic evaluation.
- Persona rigidity → allow SM/PO to refine persona specialties/tags with controls.

#### QA Strategy

- Unit tests: importance updates/decay; ACL filters; memory writes.
- Integration tests: orchestrator routing; persona handoffs; defect cycle.
- E2E: full SM→Dev→QA→HITL flow against a sample project.
- All JavaScript/TypeScript tests use the `*.test.ts` naming convention.
