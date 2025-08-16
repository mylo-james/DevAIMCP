### Story 56: Orchestrator-first DevAI mode (natural language, no @commands)

- **ID**: 56
- **Status**: todo
- **Priority**: high
- **Story Points**: 5
- **Created At**: 2025-08-16T04:17:52.189Z
- **Updated At**: 2025-08-16T04:17:52.189Z

#### Description

Implement DevAI mode activation that connects to the MCP and greets the user with the Orchestrator. Replace @command style with natural language intake. Orchestrator should accept initial user query (even if gathered before load) and maintain session context.

#### Acceptance Criteria

- DevAI mode is invokable from IDE; MCP session opens and Orchestrator greets the user.
- No @command syntax needed; natural queries are processed.
- Initial query submitted before activation is captured and handed to the Orchestrator.
- Unit/integration tests demonstrate orchestrator greeting and NL intake.
