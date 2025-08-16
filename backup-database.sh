#!/bin/bash

# DevAI BMAD Database Backup Script
# Creates a timestamped backup of the DevAI database

echo "💾 DevAI BMAD Database Backup"
echo "=============================="

# Check if Docker container is running
if ! docker ps | grep -q "devai-postgres"; then
    echo "❌ Error: devai-postgres container is not running"
    echo "Please start the container first with: docker compose up -d postgres"
    exit 1
fi

# Generate timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="devai_bmad_backup_${TIMESTAMP}.sql"

echo "🐘 Creating database backup..."
echo "📁 Backup file: $BACKUP_FILE"

# Create the backup
if docker exec devai-postgres pg_dump -U devai_user -d devai_mcp --clean --if-exists > "$BACKUP_FILE"; then
    BACKUP_SIZE=$(ls -lah "$BACKUP_FILE" | awk '{print $5}')
    echo "✅ Backup completed successfully!"
    echo "   File: $BACKUP_FILE"
    echo "   Size: $BACKUP_SIZE"
    
    # Verify backup contents
    PROJECTS=$(grep -c "INSERT INTO.*projects" "$BACKUP_FILE" 2>/dev/null || echo "0")
    MEMORIES=$(grep -c "INSERT INTO.*memories" "$BACKUP_FILE" 2>/dev/null || echo "0") 
    STORIES=$(grep -c "INSERT INTO.*stories" "$BACKUP_FILE" 2>/dev/null || echo "0")
    MCP_REFS=$(grep -c "bmad_" "$BACKUP_FILE" 2>/dev/null || echo "0")
    
    echo ""
    echo "📊 Backup Contents:"
    echo "   Projects: $PROJECTS"
    echo "   Memories: $MEMORIES"  
    echo "   Stories: $STORIES"
    echo "   MCP Tool References: $MCP_REFS"
    
    echo ""
    echo "💡 To restore this backup:"
    echo "   docker exec -i devai-postgres psql -U devai_user -d devai_mcp < $BACKUP_FILE"
    
else
    echo "❌ Backup failed!"
    exit 1
fi
