import { createProject, createStory } from './lib/database.js';

async function seedDataSimple() {
  console.log('🌱 Seeding DevAI database (simple version)...');

  try {
    // Create a sample project
    const project = await createProject({
      name: 'DevAI Platform',
      description: 'AI development intelligence platform with project management and memory capabilities',
      repository_url: 'https://github.com/your-org/devai',
      language: 'TypeScript',
      framework: 'Node.js',
      metadata: { 
        category: 'AI Tools',
        complexity: 'Advanced',
        team_size: 3
      }
    });
    console.log('✅ Created project:', project.name);

    // Create sample user stories with simple string arrays for acceptance_criteria
    const stories = [
      {
        projectId: project.id,
        title: 'Implement MCP Server',
        description: 'Create Model Context Protocol server for AI agent integration',
        acceptance_criteria: ['Server responds to MCP requests', 'Tools are properly exposed', 'Error handling implemented'],
        story_points: 8,
        priority: 'high'
      },
      {
        projectId: project.id,
        title: 'Add Vector Search',
        description: 'Implement semantic search across project memories',
        acceptance_criteria: ['Search returns relevant results', 'Performance under 100ms', 'Results ranked by relevance'],
        story_points: 5,
        priority: 'medium'
      },
      {
        projectId: project.id,
        title: 'Create Project Dashboard',
        description: 'Build web interface for project management',
        acceptance_criteria: ['Display project overview', 'Show recent memories', 'Allow story management'],
        story_points: 13,
        priority: 'medium'
      }
    ];

    for (const story of stories) {
      await createStory({
        project_id: story.projectId,
        title: story.title,
        description: story.description,
        acceptance_criteria: story.acceptance_criteria,
        story_points: story.story_points,
        priority: story.priority
      });
      console.log('✅ Created story:', story.title);
    }

    console.log('🎉 Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
  }
}

seedDataSimple();
