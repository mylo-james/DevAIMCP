### Story 59: Actor-scoped authorization with keys and resource ACL

- **ID**: 59
- **Status**: completed
- **Priority**: high
- **Story Points**: 8
- **Created At**: 2025-08-16T04:18:04.063Z
- **Updated At**: 2025-08-16T04:18:04.063Z

#### Description

Issue actor keys and enforce resource access control so agents only see allowed files/resources. Log access and denials.

#### Acceptance Criteria

- Actor and actor_keys tables exist.
- Resource ACL/tag strategy implemented.
- Middleware enforces actor-scoped access on retrieval.
- Audit logs record access decisions.
- Tests ensure unauthorized access is blocked.
