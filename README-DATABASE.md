# DevAI Database Management

This directory contains a fully seeded DevAI database with BMAD methodology and MCP tools integration.

## 📦 What's Included

### Database Contents

- **123 BMAD Documents** - Complete methodology with updated MCP tool syntax
- **15 MCP Tools** - Fully implemented BMAD agent commands as structured tools
- **2 Sample Projects** - BMAD Method & Actor-Weighted Retrieval with stories
- **Vector Search** - pgvector extension with embeddings for semantic search

### Key Features

- **BMAD Methodology** - All agent workflows (PO, SM, Dev, Architect, QA)
- **MCP Integration** - Tools like `bmad_po_create_epic`, `bmad_sm_draft`, etc.
- **Updated Documentation** - No old `@agent *command` syntax conflicts
- **Type Safety** - Structured parameters with validation
- **Cursor Compatible** - Works seamlessly with Cursor and other MCP clients

## 🚀 Quick Start

### 1. Start the Database

```bash
docker compose up -d postgres
```

### 2. Restore from Backup (if needed)

```bash
./restore-database.sh
```

### 3. Start the MCP Server

```bash
npm start
```

## 📊 Database Statistics

| Component     | Count | Description                                  |
| ------------- | ----- | -------------------------------------------- |
| **Projects**  | 3     | Including BMAD Method project                |
| **Memories**  | 123   | BMAD docs + seeded knowledge                 |
| **Stories**   | 13    | Sample user stories with acceptance criteria |
| **MCP Tools** | 15    | Structured BMAD agent commands               |

## 🛠️ Available MCP Tools

### Product Owner

- `bmad_po_create_epic` - Create brownfield epics
- `bmad_po_create_story` - Generate user stories
- `bmad_po_shard_doc` - Break down documents
- `bmad_po_validate_story` - Validate story drafts

### Scrum Master

- `bmad_sm_draft` - Create next story in sequence
- `bmad_sm_story_checklist` - Execute validation checklist

### Developer

- `bmad_dev_develop_story` - Full implementation workflow
- `bmad_dev_run_tests` - Execute BMAD testing standards
- `bmad_dev_explain` - Knowledge transfer sessions

### QA & Architecture

- `bmad_qa_review_story` - Senior code review
- `bmad_architect_design` - System architecture
- `bmad_correct_course` - Course correction workflows
- `bmad_execute_checklist` - Agent-specific checklists

## 📝 Usage Examples

### Create Epic for Brownfield Project

```javascript
bmad_po_create_epic({
  projectId: 9,
  context: 'Add real-time notifications',
  existingSystemInfo: 'React + Node.js + Socket.io',
});
```

### Development Workflow

```javascript
// 1. Create story
bmad_sm_draft({ projectId: 9, epicId: 15 });

// 2. Implement story
bmad_dev_develop_story({ projectId: 9, storyId: 42 });

// 3. QA review
bmad_qa_review_story({ projectId: 9, storyId: 42 });
```

## 🔄 Backup & Restore

### Create New Backup

```bash
docker exec devai-postgres pg_dump -U devai_user -d devai_mcp --clean --if-exists > new_backup.sql
```

### Restore from Backup

```bash
./restore-database.sh
```

The restore script automatically:

- Verifies container is running
- Checks backup file exists
- Restores complete database
- Validates data integrity
- Reports statistics

## 🏗️ Schema Overview

### Core Tables

- `projects` - Project metadata and configuration
- `memories` - BMAD knowledge base with vector embeddings
- `stories` - User stories with acceptance criteria
- `workflows` - Development workflow definitions
- `policies` - Development policies and standards

### Extensions

- `vector` - pgvector for semantic search
- `uuid-ossp` - UUID generation

## 🔍 Querying Examples

### Search BMAD Knowledge

```sql
SELECT content FROM memories
WHERE content LIKE '%bmad_po_%'
LIMIT 5;
```

### Get Project Stories

```sql
SELECT title, priority, story_points
FROM stories
WHERE project_id = 9
ORDER BY priority DESC;
```

## 🚨 Troubleshooting

### Container Not Starting

```bash
docker compose down
docker compose up -d postgres
```

### Restore Issues

```bash
# Check container logs
docker logs devai-postgres

# Verify backup file
head -10 devai_bmad_seeded_backup.sql
```

### Missing Data

```bash
# Check record counts
docker exec devai-postgres psql -U devai_user -d devai_mcp -c "
SELECT
  'projects' as table_name, COUNT(*) as count FROM projects
UNION ALL
SELECT 'memories', COUNT(*) FROM memories
UNION ALL
SELECT 'stories', COUNT(*) FROM stories;
"
```

## 📚 Additional Resources

- **[MCP Tools Reference](BMAD-METHOD/docs/mcp-tools-reference.md)** - Complete tool documentation
- **[User Guide](BMAD-METHOD/docs/user-guide.md)** - BMAD methodology overview
- **[Enhanced Workflow](BMAD-METHOD/docs/enhanced-ide-development-workflow.md)** - Step-by-step development process

---

**Ready to use!** Your DevAI system is now fully configured with BMAD methodology and MCP tools integration.
