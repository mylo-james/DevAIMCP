### Story 64: HITL at epic completion and truth/escalation policy

- **ID**: 64
- **Status**: completed
- **Priority**: high
- **Story Points**: 5
- **Created At**: 2025-08-16T04:18:21.587Z
- **Updated At**: 2025-08-16T04:18:21.587Z

#### Description

Enforce HITL (human-in-the-loop) approval when finishing an epic. Add policy that agents escalate to humans instead of guessing when confidence is low or blocked; log escalations.

#### Acceptance Criteria

- Epic completion triggers HITL approval gate.
- Agents check confidence and policy; escalate when needed.
- Audit log records HITL decisions and escalations.
- Tests verify gate blocks completion until approval.
