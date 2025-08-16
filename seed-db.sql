-- Seed the DevAI database with sample data

-- Insert sample projects
INSERT INTO projects (name, description, repository_url, language, framework, metadata) VALUES
('DevAI Platform', 'AI development intelligence platform with MCP integration', 'https://github.com/example/devai', 'TypeScript', 'Node.js', '{"category": "ai-tools", "status": "active"}'),
('E-commerce API', 'RESTful API for online shopping platform', 'https://github.com/example/ecommerce-api', 'JavaScript', 'Express.js', '{"category": "web-api", "status": "development"}'),
('Mobile App', 'React Native mobile application', 'https://github.com/example/mobile-app', 'JavaScript', 'React Native', '{"category": "mobile", "status": "planning"}');

-- Insert sample memories
INSERT INTO memories (project_id, memory_type, content, context, reasoning, confidence, tags) VALUES
(1, 'insight', 'MCP server should be configured with proper error handling for database connections', 'Database integration', 'Based on testing, connection failures need graceful degradation', 0.9, ARRAY['database', 'error-handling', 'mcp']),
(1, 'decision', 'Use PostgreSQL with pgvector for semantic search capabilities', 'Technology choice', 'Vector embeddings provide better semantic search than traditional text search', 0.95, ARRAY['database', 'vector-search', 'postgresql']),
(2, 'insight', 'API rate limiting should be implemented to prevent abuse', 'Security considerations', 'Public APIs need protection against excessive requests', 0.85, ARRAY['security', 'rate-limiting', 'api']),
(3, 'decision', 'Choose React Native over Flutter for cross-platform development', 'Framework selection', 'Team has more experience with React ecosystem', 0.8, ARRAY['mobile', 'react-native', 'framework']);

-- Insert sample stories
INSERT INTO stories (project_id, title, description, acceptance_criteria, story_points, priority, status) VALUES
(1, 'Implement MCP Server', 'Create the Model Context Protocol server for DevAI', '["Server starts without errors", "Responds to MCP requests", "Handles database operations"]', 8, 'high', 'in-progress'),
(1, 'Add Vector Search', 'Implement semantic search using pgvector', '["Search returns relevant results", "Performance under 100ms", "Supports multiple query types"]', 13, 'high', 'todo'),
(2, 'Design API Schema', 'Create the REST API schema and documentation', '["OpenAPI spec complete", "All endpoints documented", "Example requests provided"]', 5, 'medium', 'done'),
(3, 'Setup Development Environment', 'Configure React Native development environment', '["iOS simulator working", "Android emulator working", "Hot reload functional"]', 3, 'low', 'todo');

-- Insert sample workflows
INSERT INTO workflows (project_id, workflow_type, steps, status) VALUES
(1, 'deployment', '["Build application", "Run tests", "Deploy to staging", "Run integration tests", "Deploy to production"]', 'pending'),
(2, 'code-review', '["Create pull request", "Automated tests pass", "Code review by team", "Address feedback", "Merge to main"]', 'in-progress'),
(3, 'testing', '["Unit tests", "Integration tests", "E2E tests", "Performance tests", "Security scan"]', 'pending');

-- Insert sample policies
INSERT INTO policies (name, description, rules, is_active) VALUES
('Code Quality', 'Ensure high code quality standards', '["All functions must have JSDoc comments", "Test coverage must be >80%", "No console.log in production code"]', true),
('Security', 'Maintain security best practices', '["No hardcoded secrets", "Use environment variables", "Validate all inputs", "Implement proper authentication"]', true),
('Performance', 'Optimize for performance', '["Database queries must use indexes", "API responses under 200ms", "Minimize bundle size", "Use caching where appropriate"]', true);
