### Story 58: Per-actor importance scoring with nightly decay

- **ID**: 58
- **Status**: completed
- **Priority**: critical
- **Story Points**: 8
- **Created At**: 2025-08-16T04:18:01.096Z
- **Updated At**: 2025-08-16T04:18:01.096Z

#### Description

Implement actor-specific importance for knowledge resources. Increment +1 on confirmed hits; nightly cron decays −1 for each actor active that day; ranking uses vector similarity re-ranked by actor-importance (then global).

#### Acceptance Criteria

- DB tables exist for kb_resources and kb_actor_importance.
- API to increment importance on confirmed hits.
- Nightly job decays importance for active actors; floor at 0.
- Retrieval ranks by vector score then actor importance.
- Unit tests for increment/decay/ranking.
