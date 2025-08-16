### Story 60: Update development workflow: SM→Dev→QA loop with defects and auto-push

- **ID**: 60
- **Status**: completed
- **Priority**: high
- **Story Points**: 8
- **Created At**: 2025-08-16T04:18:07.945Z
- **Updated At**: 2025-08-16T04:18:07.945Z

#### Description

Implement the DevAI development flow: Scrum Master drafts story; Dev implements; QA validates. If QA rejects, QA creates a defect which SM storifies; Dev fixes; QA approves; on approval, push code. HITL required only at epic completion.

#### Acceptance Criteria

- Workflow engine supports SM→Dev→QA loop.
- Defect creation and storification flow implemented.
- Auto-push on QA approval via git workflow.
- HITL enforced only at epic completion.
- Integration tests cover happy path and rejection path.
