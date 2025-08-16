import { createProject } from './lib/database.js';
import { manageMemory } from './tools/memory-manager.js';
import { manageStory } from './tools/story-manager.js';

async function seedData() {
  console.log('🌱 Seeding DevAI database...');

  try {
    // Create a sample project
    const project = await createProject({
      name: 'DevAI Platform',
      description:
        'AI development intelligence platform with project management and memory capabilities',
      repository_url: 'https://github.com/your-org/devai',
      language: 'TypeScript',
      framework: 'Node.js',
      metadata: {
        category: 'AI Tools',
        complexity: 'Advanced',
        team_size: 3,
      },
    });
    console.log('✅ Created project:', project.name);

    // Store some sample memories
    const memories = [
      {
        projectId: project.id,
        content: 'Use TypeScript for type safety across the entire codebase',
        memoryType: 'best_practice',
        context: 'Development standards',
        reasoning:
          'TypeScript provides better developer experience and catches errors early',
        confidence: 0.95,
      },
      {
        projectId: project.id,
        content: 'Implement vector embeddings for semantic search capabilities',
        memoryType: 'architecture_decision',
        context: 'Database design',
        reasoning:
          'Vector embeddings enable AI to understand and search through code semantically',
        confidence: 0.9,
      },
      {
        projectId: project.id,
        content: 'Use PostgreSQL with pgvector extension for vector storage',
        memoryType: 'technology_choice',
        context: 'Database selection',
        reasoning:
          'PostgreSQL with pgvector provides robust vector operations and ACID compliance',
        confidence: 0.85,
      },
    ];

    for (const memory of memories) {
      await manageMemory({
        action: 'store',
        projectId: memory.projectId,
        content: memory.content,
        memoryType: memory.memoryType,
        context: memory.context,
        reasoning: memory.reasoning,
        confidence: memory.confidence,
      });
      console.log('✅ Stored memory:', memory.content.substring(0, 50) + '...');
    }

    // Create sample user stories
    const stories = [
      {
        projectId: project.id,
        title: 'Implement MCP Server',
        description:
          'Create Model Context Protocol server for AI agent integration',
        acceptance_criteria: [
          'Server responds to MCP requests',
          'Tools are properly exposed',
          'Error handling implemented',
        ],
        story_points: 8,
        priority: 'high',
      },
      {
        projectId: project.id,
        title: 'Add Vector Search',
        description: 'Implement semantic search across project memories',
        acceptance_criteria: [
          'Search returns relevant results',
          'Performance under 100ms',
          'Results ranked by relevance',
        ],
        story_points: 5,
        priority: 'medium',
      },
      {
        projectId: project.id,
        title: 'Create Project Dashboard',
        description: 'Build web interface for project management',
        acceptance_criteria: [
          'Display project overview',
          'Show recent memories',
          'Allow story management',
        ],
        story_points: 13,
        priority: 'medium',
      },
    ];

    for (const story of stories) {
      await manageStory({
        action: 'create',
        projectId: story.projectId,
        title: story.title,
        description: story.description,
        acceptance_criteria: story.acceptance_criteria,
        story_points: story.story_points,
        priority: story.priority,
      });
      console.log('✅ Created story:', story.title);
    }

    console.log('🎉 Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
  }
}

seedData();
