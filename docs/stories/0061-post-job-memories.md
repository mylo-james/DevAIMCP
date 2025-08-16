### Story 61: Mandatory post-job memory updates (story, summary, critical learnings)

- **ID**: 61
- **Status**: completed
- **Priority**: medium
- **Story Points**: 5
- **Created At**: 2025-08-16T04:18:11.114Z
- **Updated At**: 2025-08-16T04:18:11.114Z

#### Description

After every job, the agent must store a memory including the story reference, concise summary of actions, and any critical learnings (tagged 'critical') with embeddings for retrieval.

#### Acceptance Criteria

- API function to store post-job memory implemented.
- Memory record includes story id/ref, summary, 'critical' tag when applicable, confidence.
- E2E verifies memories written after SM, Dev, QA steps.
- Docs updated to make memory updates mandatory.
