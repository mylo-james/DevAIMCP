# DevAI - AI Development Intelligence Platform

A comprehensive AI development platform that provides your AI agents with project intelligence, learning capabilities, and development workflow automation.

## 🏗️ Project Structure

```
devai/
├── seed/              # Initial setup and development tools
│   ├── tools/         # Command-line tools for development
│   ├── lib/           # Core libraries and utilities
│   ├── database/      # Database schema and migrations
│   ├── docs/          # Documentation and guides
│   ├── tests/         # Test suite
│   ├── agents/        # AI agent definitions
│   ├── agent-teams/   # Agent team configurations
│   ├── workflows/     # Development workflows
│   ├── templates/     # Project templates
│   ├── data/          # Knowledge base and data
│   ├── utils/         # Utility scripts and helpers
│   ├── BMAD-METHOD/   # DevAI methodology resources
│   ├── config.yaml    # Configuration files
│   └── install-manifest.yaml
│
├── server/            # Production MCP server
│   ├── index.ts       # MCP server implementation
│   ├── tools.ts       # Tool definitions
│   ├── resources.ts   # Resource definitions
│   ├── logger.ts      # Logging utilities
│   ├── core-config.yaml
│   ├── policy.md
│   ├── package.json
│   ├── Dockerfile
│   └── .gitignore
│
├── docker-compose.yml # Docker deployment configuration
├── deploy.sh          # Deployment script
├── .gitignore         # Git ignore rules
└── README.md          # This file
```

## 🚀 Quick Start

### 1. Set Up Development Environment

```bash
# Install dependencies for both seed and server
cd seed && npm install
cd ../server && npm install

# Set up database
cd ../seed
npm run db:setup
```

### 2. Configure Environment

```bash
# .env (in both seed/ and server/)
DATABASE_URL=postgresql://user:pass@localhost:5432/devai_mcp
OPENAI_API_KEY=your_openai_key
```

### 3. Start the MCP Server

```bash
cd server
npm run dev  # Development mode
# or
npm run mcp  # Production mode
```

### 4. Use Development Tools

```bash
cd seed

# Create a project
npm run project -- --action create --name "My Project"

# Export data for inspection
npm run export -- --action summary
npm run export -- --action export --format markdown

# Run tests
npm test
```

## 📁 Directory Details

### `seed/` - Initial Setup & Development Tools

**Purpose**: Everything you need for initial setup, development, testing, and data management.

**Key Components**:

- **`tools/`** - Command-line tools for project management, data export, etc.
- **`lib/`** - Core libraries (database manager, policy engine, etc.)
- **`database/`** - PostgreSQL schema and migrations
- **`docs/`** - Documentation and guides
- **`tests/`** - Test suite for all components
- **`agents/`** - AI agent definitions and configurations
- **`agent-teams/`** - Agent team configurations and setups
- **`workflows/`** - Development workflow definitions
- **`templates/`** - Project and document templates

**Usage**:

```bash
cd seed

# Database operations
npm run db:setup
npm run db:seed

# Tool operations
npm run project -- --action list
npm run memory -- --action search --query "database patterns"
npm run export -- --action export --format json

# Testing
npm test
npm run test:integration
```

### `server/` - Production MCP Server

**Purpose**: Clean, deployable MCP server that AI agents connect to.

**Key Components**:

- **`mcp-server/`** - MCP server implementation
- **`core-config.yaml`** - Server configuration
- **`policy.md`** - DevAI policy definitions

**Usage**:

```bash
cd server

# Development
npm run dev

# Production
npm run build
npm start

# Database operations
npm run db:migrate
```

## 🔧 Development Workflow

### 1. **Development Phase** (seed/)

```bash
cd seed

# Create new tools
# Edit existing tools
# Test functionality
npm test

# Export data to inspect AI learning
npm run export -- --action summary
```

### 2. **Deployment Phase** (server/)

```bash
cd server

# Build for production
npm run build

# Deploy to your hosting platform
npm start
```

## 🛠️ Available Tools

### Project Management

- `devai_project_create` - Create new projects
- `devai_project_get` - Get project details
- `devai_project_list` - List all projects
- `devai_project_context` - Get project intelligence

### Memory Management

- `devai_memory_store` - Store AI memories
- `devai_memory_search` - Search memories semantically

### Development Tools

- `devai_policy_validate` - Validate against DevAI policy
- `devai_workflow_execute` - Execute development workflows
- `devai_story_manage` - Manage user stories
- `devai_git_workflow` - Git workflow automation
- `devai_test_run` - Run tests with TDD

### Data Export

- `devai_data_export` - Export all data for inspection

## 🧠 AI Intelligence Features

- **Project Intelligence** - AI understands your projects
- **Memory System** - AI learns and remembers decisions
- **Vector Search** - Semantic search across code and docs
- **Workflow Automation** - Execute development workflows
- **Policy Validation** - Ensure actions follow DevAI principles

## 🚀 Deployment

### Local Development

```bash
# Terminal 1: Start MCP server
cd server && npm run dev

# Terminal 2: Use development tools
cd seed && npm run project -- --action list
```

### Production Deployment

```bash
cd server
npm run build
npm start
```

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d
```

## 📊 Data Inspection

The platform includes comprehensive data export tools:

```bash
cd seed

# Get summary of all data
npm run export -- --action summary

# Export everything as markdown
npm run export -- --action export --format markdown

# Export specific project
npm run export -- --action project --projectId 1 --format html

# Export just memories
npm run export -- --action memories --format csv
```

## 🔗 MCP Integration

Configure your AI client (Claude Desktop, Cursor, etc.) to connect to the DevAI MCP server:

```json
// .cursor/mcp.json
{
  "mcpServers": {
    "devai": {
      "command": "npm",
      "args": ["run", "mcp"],
      "cwd": "/path/to/devai/server"
    }
  }
}
```

## 🤝 Contributing

1. **Development**: Work in the `seed/` directory
2. **Testing**: Add tests in `seed/tests/`
3. **Documentation**: Update docs in `seed/docs/`
4. **Deployment**: Update server code in `server/`

## 📄 License

MIT License - see LICENSE file for details

---

**DevAI** - Your AI's development intelligence platform
