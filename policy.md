# DevAI Policy (Must-Load Before Any Action)

Agents MUST load and follow this policy before executing any action (planning, coding, testing, refactoring, docs, or review). Treat this as the single source of truth.

## Core Development Workflow
- Always pull latest `main`, create a new branch, work incrementally, and open a PR with CI passing.
- Never skip hooks (`--no-verify` is forbidden). Monitor PR/CI until green. [[Workflow source: DevAI Method]]
- TDD required: write failing tests first, implement to green, then refactor. JavaScript tests must be named `*.test.ts`. [[Preferences: Repo rule]]
- Single story in progress at a time; statuses progress Draft → Approved → InProgress → Done.

## Agent Discipline
- Use specialized roles for planning vs implementation. Keep clean chats per role and phase.
- Load context on demand only; do not preload entire bundle unless required.
- Present options as numbered lists and request explicit user selection when ambiguity exists.

## Documents and Sharding
- Required project docs: `docs/prd.md`, `docs/architecture.md`.
- Shard with `shard-doc` into `docs/prd/` and `docs/architecture/` before development.

## Mandatory Pre-Action Policy Check
Before any action, perform a policy check using the following contract. If the environment cannot perform real tool calls, simulate the check by reading this file and the Knowledge Base, then enumerating checks and your compliance.

```json
{
  "tool": "devai.policy.validateAction",
  "args": {
    "actionType": "plan|code|test|refactor|review|doc",
    "files": ["optional/changed/file/paths"],
    "branch": "current-branch-name",
    "testsPlanned": true,
    "storyId": "optional/current-story"
  }
}
```
Expected result fields: `allowed` (bool), `requiredSteps` (array), `notes` (array). If `allowed=false`, output `requiredSteps` and pause.

## Required Steps by Action Type
- plan: ensure doc targets exist; propose shards; record decisions.
- code: ensure failing test exists (`*.test.ts`); branch is set; list files; run tests often.
- test: run full suite; capture failures; stop on red.
- refactor: ensure green; keep behavior; small steps.
- review: check diffs, naming, clarity, and test coverage; suggest improvements.
- doc: update relevant docs and changelog entry.

## Conventional Commits and PR Hygiene
- Conventional commits; one logical change per commit; small PRs preferred.
- PR description: What/Why/How/Testing; link story; checklist of acceptance criteria.

## Tool Endpoints (Conceptual)
- devai.getPolicy() → returns this document.
- devai.getKnowledgeBase() → returns consolidated DevAI knowledge base.
- devai.validateAction(payload) → enforces this policy per action.
- devai.getTemplates() / devai.getTasks() / devai.getWorkflows() → for on-demand loading.

Always acknowledge policy load at the start of each session and before executing any action.
