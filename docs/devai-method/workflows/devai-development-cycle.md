# DevAI Development Cycle

## Overview

The DevAI development cycle is a natural language, persona-driven workflow that automates the traditional Scrum development process with AI coordination and mandatory quality gates.

## Workflow Steps

### 1. Story Intake and Routing

**User Input** → **Orchestrator** → **Persona Routing**

- User describes what they want in natural language
- Orchestrator analyzes intent and routes to appropriate persona
- Initial context captured and maintained throughout workflow

### 2. Story Creation (Alex - Scrum Master)

**Requirements** → **Story Draft** → **Dev Handoff**

**Alex's Process:**

1. Analyzes user requirements in natural language
2. Breaks down complex features into implementable stories
3. Creates clear acceptance criteria and estimates
4. Validates story readiness using checklist
5. Hands off to Jordan (Developer) with context

**Memory Update**: Alex records story creation decisions and requirement insights

### 3. Implementation (Jordan - Developer)

**Story** → **Technical Implementation** → **QA Handoff**

**Jordan's Process:**

1. Reviews story requirements and acceptance criteria
2. Plans technical approach and identifies dependencies
3. Implements features following TDD principles
4. Writes comprehensive tests (unit + integration)
5. Self-validates against Definition of Done checklist
6. Hands off to Sam (QA) with implementation context

**Memory Update**: Jordan records technical decisions, patterns used, and implementation learnings

### 4. Quality Validation (Sam - QA)

**Implementation** → **Validation** → **Approve/Reject Decision**

**Sam's Process:**

1. Reviews acceptance criteria and implementation
2. Executes validation tests and quality checks
3. Verifies all requirements are met
4. Makes approval decision

#### 4a. QA Approval Path

**Approve** → **Auto-Push** → **Story Complete**

- Sam approves the implementation
- System automatically pushes code to repository
- Story marked as complete
- Workflow ends (unless epic completion triggers HITL)

#### 4b. QA Rejection Path

**Reject** → **Create Defect** → **SM Storification** → **Dev Fix Loop**

- Sam creates defect with detailed description
- Alex (SM) automatically storifies defect into new fix story
- Jordan (Developer) receives fix story for implementation
- Process loops back to implementation → QA validation
- Continues until QA approves

**Memory Update**: Sam records validation results, issues found, and quality insights

## Defect Loop Details

### Defect Creation

When QA rejects a story:

1. **Defect Record**: Title, description, severity level
2. **Automatic Storification**: SM creates fix story with:
   - Title: "Fix: [Defect Title]"
   - Description: Defect details and context
   - Priority: Based on defect severity
   - Story Points: Estimated based on complexity

### Fix Implementation

1. Jordan receives fix story
2. Analyzes defect root cause
3. Implements fix with additional tests
4. Ensures no regression in related areas
5. Hands back to Sam for re-validation

## HITL (Human-in-the-Loop) Gates

### Epic-Level HITL

- **Trigger**: All stories in epic are complete
- **Process**: Human approval required before epic closure
- **Purpose**: Final validation of epic delivery

### No Story-Level HITL

- Individual stories flow through SM→Dev→QA automatically
- Human intervention only at epic boundaries
- Escalation available for complex issues

## Natural Language Coordination

### Example Flow

**User**: "I need a shopping cart feature"

**Orchestrator**: "I'll connect you with Alex, our Scrum Master, to break this down into stories."

**Alex**: "Great! Let me understand the shopping cart requirements. Do you need: add items, remove items, quantity updates, price calculations, checkout integration? I'll create stories for each component."

**Alex → Jordan**: "Here's the shopping cart story with acceptance criteria. The user needs basic cart operations with checkout flow."

**Jordan**: "Got it! I'll implement the cart service with item management, persistence, and checkout integration. I'll include comprehensive tests and follow our established patterns."

**Jordan → Sam**: "Shopping cart implementation complete. I've added unit tests for cart operations, integration tests for checkout flow, and documented the API endpoints."

**Sam**: "I'll validate the shopping cart against all acceptance criteria, test edge cases, and verify the checkout integration works properly."

## Automation Features

### Automatic Handoffs

- Personas automatically hand off to next role
- Context preserved across handoffs
- No manual coordination required

### Auto-Push on Approval

- QA approval triggers immediate git push
- Branch management handled automatically
- Deployment pipeline integration

### Memory Automation

- Post-job memories written automatically
- Critical learnings extracted and tagged
- Knowledge base updated with insights

### Importance Tracking

- Resource usage tracked per actor
- Importance scores updated on confirmed hits
- Nightly decay maintains relevance

## Quality Assurance

### Mandatory Checklists

- Each persona follows role-specific checklists
- Checklists enforced before handoffs
- Quality gates prevent incomplete work

### Comprehensive Testing

- Unit tests for all functionality
- Integration tests for workflows
- End-to-end validation of complete flows

### Audit Trails

- All decisions logged and auditable
- Access control decisions tracked
- Performance and quality metrics captured

---

_DevAI Development Cycle - Natural Language Workflow Automation_
