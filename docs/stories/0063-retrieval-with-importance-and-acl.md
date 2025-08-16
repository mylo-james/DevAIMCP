### Story 63: Retrieval service: vector + actor-importance re-ranking + ACL filter

- **ID**: 63
- **Status**: todo
- **Priority**: critical
- **Story Points**: 8
- **Created At**: 2025-08-16T04:18:18.599Z
- **Updated At**: 2025-08-16T04:18:18.599Z

#### Description

Implement retrieval that combines vector similarity with actor-specific importance re-ranking and enforces actor-scoped ACLs before returning results.

#### Acceptance Criteria

- Search uses vector index on resources.
- Results re-ranked by actor-importance, then global recency.
- ACLs filter out unauthorized resources.
- Unit tests validate ranking and filtering.
