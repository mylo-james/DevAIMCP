#!/bin/bash

# DevAI BMAD Database Restore Script
# This script restores the DevAI database from the seeded backup
# containing all BMAD methodology documentation and MCP tools setup

echo "🔄 DevAI BMAD Database Restore"
echo "=============================="

# Check if Docker container is running
if ! docker ps | grep -q "devai-postgres"; then
    echo "❌ Error: devai-postgres container is not running"
    echo "Please start the container first with: docker compose up -d postgres"
    exit 1
fi

# Check if backup file exists
if [ ! -f "devai_bmad_seeded_backup.sql" ]; then
    echo "❌ Error: Backup file 'devai_bmad_seeded_backup.sql' not found"
    echo "Please ensure the backup file is in the current directory"
    exit 1
fi

echo "📁 Found backup file: $(ls -lah devai_bmad_seeded_backup.sql | awk '{print $5}')"
echo "🐘 Restoring database from backup..."

# Restore the database
if docker exec -i devai-postgres psql -U devai_user -d devai_mcp < devai_bmad_seeded_backup.sql; then
    echo "✅ Database restore completed successfully!"
    echo ""
    echo "📊 Verifying restore:"
    
    # Verify projects
    PROJECT_COUNT=$(docker exec devai-postgres psql -U devai_user -d devai_mcp -t -c "SELECT COUNT(*) FROM projects;")
    echo "   Projects: $PROJECT_COUNT"
    
    # Verify memories (BMAD docs)
    MEMORY_COUNT=$(docker exec devai-postgres psql -U devai_user -d devai_mcp -t -c "SELECT COUNT(*) FROM memories;")
    echo "   Memories: $MEMORY_COUNT"
    
    # Verify stories
    STORY_COUNT=$(docker exec devai-postgres psql -U devai_user -d devai_mcp -t -c "SELECT COUNT(*) FROM stories;")
    echo "   Stories: $STORY_COUNT"
    
    # Verify MCP tool references
    MCP_REFS=$(docker exec devai-postgres psql -U devai_user -d devai_mcp -t -c "SELECT COUNT(*) FROM memories WHERE content LIKE '%bmad_%';")
    echo "   MCP Tool References: $MCP_REFS"
    
    echo ""
    echo "🚀 DevAI BMAD system is ready!"
    echo "   - All BMAD methodology documentation loaded"
    echo "   - MCP tools syntax updated"
    echo "   - Projects and stories restored"
    echo "   - Ready for development workflows"
    
else
    echo "❌ Database restore failed!"
    echo "Check the error messages above for details"
    exit 1
fi
