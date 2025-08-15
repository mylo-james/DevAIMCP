#!/bin/bash

# DevAI MCP Server Deployment Script

set -e

echo "🚀 DevAI MCP Server Deployment"
echo "================================"

# Check if .env file exists
if [ ! -f "server/.env" ]; then
    echo "❌ Error: server/.env file not found!"
    echo "Please create server/.env with the following variables:"
    echo "DATABASE_URL=postgresql://devai_user:devai_password@localhost:5432/devai_mcp"
    echo "OPENAI_API_KEY=your_openai_api_key"
    exit 1
fi

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command_exists docker; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command_exists docker-compose; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Prerequisites check passed"

# Build and start services
echo "🔨 Building and starting services..."

# Build the server image
echo "Building DevAI MCP Server..."
docker-compose build devai-mcp-server

# Start services
echo "Starting services..."
docker-compose up -d postgres

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 10

# Start the MCP server
echo "Starting DevAI MCP Server..."
docker-compose up -d devai-mcp-server

# Check if services are running
echo "🔍 Checking service status..."
docker-compose ps

echo ""
echo "✅ Deployment completed!"
echo ""
echo "📊 Service Information:"
echo "  - DevAI MCP Server: Running in container 'devai-mcp-server'"
echo "  - PostgreSQL Database: Running on localhost:5432"
echo "  - Database: devai_mcp"
echo "  - Username: devai_user"
echo "  - Password: devai_password"
echo ""
echo "🔧 Management Commands:"
echo "  - View logs: docker-compose logs -f devai-mcp-server"
echo "  - Stop services: docker-compose down"
echo "  - Restart server: docker-compose restart devai-mcp-server"
echo "  - Access database: docker-compose exec postgres psql -U devai_user -d devai_mcp"
echo ""
echo "🌐 Optional Tools:"
echo "  - Start pgAdmin: docker-compose --profile tools up -d pgadmin"
echo "  - pgAdmin URL: http://localhost:8080 (admin@devai.local / admin123)"
echo ""
echo "🎯 Next Steps:"
echo "  1. Configure your AI client to connect to the MCP server"
echo "  2. Use the startup tools to create projects and export data"
echo "  3. Monitor the AI's learning through data exports"
