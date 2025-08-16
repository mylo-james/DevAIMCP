### Story 65: Instrument post-job memory writing across SM/Dev/QA

- **ID**: 65
- **Status**: completed
- **Priority**: medium
- **Story Points**: 3
- **Created At**: 2025-08-16T04:18:24.641Z
- **Updated At**: 2025-08-16T04:18:24.641Z

#### Description

Wire hooks into SM, Dev, and QA workflows to automatically write memories after each job, including story ref, summary, and critical learnings.

#### Acceptance Criteria

- Hooks exist and fire after each job.
- Memory entries include required fields and embeddings.
- E2E tests verify memories are added across roles.
