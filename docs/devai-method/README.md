# DevAI Method - AI-Driven Development Intelligence

## Overview

DevAI Method is a natural language, orchestrator-first framework that combines AI personas with Agile development methodologies. The system introduces a modular architecture with persona-based intelligence, per-actor importance scoring, and comprehensive workflow automation.

### Key Features

- **Orchestrator-First UX**: Natural language intake without command syntax
- **Named Personas**: Specialized AI personas that stay in character
- **Actor-Scoped Access**: Resource authorization based on actor keys
- **Importance Scoring**: Per-actor knowledge ranking with nightly decay
- **Workflow Automation**: SM→Dev→QA loop with defect handling
- **Mandatory Memory**: Post-job memory updates with critical learnings
- **HITL Gates**: Human-in-the-loop approval at epic completion

### When to Use DevAI

- **New Projects (Greenfield)**: Complete end-to-end development
- **Existing Projects (Brownfield)**: Feature additions and enhancements
- **Team Collaboration**: Multiple personas working together
- **Quality Assurance**: Automated testing and validation workflows
- **Knowledge Management**: Learning and decision tracking

## Core Concepts

### Personas

DevAI uses named personas instead of generic agents:

- **Alex** (Scrum Master): Story creation and coordination
- **Jordan** (Developer): Technical implementation
- **Sam** (QA): Quality validation and testing
- **Taylor** (Architect): System design and architecture
- **Morgan** (Product Owner): Requirements and business value

Each persona has:

- Unique name and biography
- Role-specific specialties and preferences
- Distinct communication style
- Never-break-character enforcement

### Orchestrator

The Orchestrator coordinates all interactions:

- Greets users in DevAI mode
- Routes queries to appropriate personas
- Manages handoffs between personas
- Maintains session context
- Enforces HITL gates at epic completion

### Importance Scoring

Knowledge resources are ranked by:

1. Vector similarity to query
2. Per-actor importance scores
3. Global recency

Importance is updated by:

- +1 on confirmed resource hits
- -1 nightly decay for active actors (floor at 0)

### Development Workflow

1. **SM** drafts story → hands off to **Dev**
2. **Dev** implements → hands off to **QA**
3. **QA** validates:
   - **Approve**: Auto-push code, complete story
   - **Reject**: Create defect → SM storifies → Dev fixes → QA re-validates

### Memory System

After every job, actors must store:

- Story ID reference
- Concise summary of actions
- Critical learnings (tagged 'critical')
- Confidence level
- Vectorized for future retrieval

### Authorization

- Each persona operates with actor keys
- Resources have access control tags
- Server-side enforcement with audit logging
- Escalation on unauthorized access

## Natural Language Interface

DevAI eliminates command syntax in favor of natural language:

**Instead of**: `create-story "User authentication"`
**Use**: "I need to create a story for user authentication"

**Instead of**: `review-code --file auth.js`  
**Use**: "Please review the authentication code for quality issues"

The Orchestrator interprets intent and routes to the appropriate persona automatically.

## Integration

DevAI integrates with development environments through:

- MCP (Model Context Protocol) server
- IDE extensions and plugins
- Git workflow automation
- Database-backed intelligence
- Vector search capabilities

## Getting Started

1. Activate DevAI mode in your IDE
2. MCP session opens with Orchestrator greeting
3. Describe what you want to accomplish in natural language
4. Orchestrator routes to appropriate persona
5. Personas maintain context and follow procedures
6. Automatic handoffs and memory updates
7. HITL approval required only at epic completion

---

_DevAI Method - Natural Language Development Intelligence_
