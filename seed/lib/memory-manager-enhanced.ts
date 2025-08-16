import { query, generateEmbedding } from './database.ts';

export interface PostJobMemory {
  id: number;
  actor_id: number;
  story_id?: number;
  job_type: string;
  summary: string;
  critical_learnings: string[];
  confidence: number;
  tags: string[];
  embedding?: number[];
  created_at: string;
  updated_at: string;
}

export interface MemoryHook {
  id: string;
  actor_role: string;
  job_type: string;
  enabled: boolean;
  mandatory: boolean;
}

export class EnhancedMemoryManager {
  
  private static registeredHooks: MemoryHook[] = [
    { id: 'sm_draft_complete', actor_role: 'Scrum Master', job_type: 'story_draft', enabled: true, mandatory: true },
    { id: 'dev_implement_complete', actor_role: 'Developer', job_type: 'implementation', enabled: true, mandatory: true },
    { id: 'qa_validate_complete', actor_role: 'QA', job_type: 'validation', enabled: true, mandatory: true },
    { id: 'defect_fix_complete', actor_role: 'Developer', job_type: 'defect_fix', enabled: true, mandatory: true },
    { id: 'qa_revalidate_complete', actor_role: 'QA', job_type: 'revalidation', enabled: true, mandatory: true },
  ];
  
  /**
   * Store mandatory post-job memory
   */
  static async storePostJobMemory(params: {
    actorId: number;
    storyId?: number;
    jobType: string;
    summary: string;
    criticalLearnings?: string[];
    confidence: number;
    additionalTags?: string[];
  }): Promise<PostJobMemory> {
    const tags = ['post-job', params.jobType];
    if (params.criticalLearnings && params.criticalLearnings.length > 0) {
      tags.push('critical');
    }
    if (params.additionalTags) {
      tags.push(...params.additionalTags);
    }
    
    // Generate embedding for the memory content
    const memoryContent = `Job: ${params.jobType}\nSummary: ${params.summary}\nCritical Learnings: ${params.criticalLearnings?.join('; ') || 'None'}`;
    const embedding = await generateEmbedding(memoryContent);
    
    const sql = `INSERT INTO post_job_memories (actor_id, story_id, job_type, summary, critical_learnings, confidence, tags, embedding)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`;
    const values = [
      params.actorId,
      params.storyId || null,
      params.jobType,
      params.summary,
      JSON.stringify(params.criticalLearnings || []),
      params.confidence,
      tags,
      embedding,
    ];
    const { rows } = await query<PostJobMemory>(sql, values);
    return rows[0];
  }
  
  /**
   * Check if memory update is mandatory for a job type
   */
  static isMandatoryMemoryUpdate(actorRole: string, jobType: string): boolean {
    const hook = this.registeredHooks.find(h => 
      h.actor_role === actorRole && h.job_type === jobType
    );
    return hook?.mandatory || false;
  }
  
  /**
   * Get memory hook for actor and job type
   */
  static getMemoryHook(actorRole: string, jobType: string): MemoryHook | undefined {
    return this.registeredHooks.find(h => 
      h.actor_role === actorRole && h.job_type === jobType
    );
  }
  
  /**
   * Execute post-job memory hook
   */
  static async executePostJobHook(params: {
    actorId: number;
    actorRole: string;
    storyId?: number;
    jobType: string;
    jobResult: any;
    confidence: number;
  }): Promise<PostJobMemory | null> {
    const hook = this.getMemoryHook(params.actorRole, params.jobType);
    if (!hook || !hook.enabled) {
      return null;
    }
    
    // Generate summary based on job type and result
    const summary = this.generateJobSummary(params.jobType, params.jobResult);
    
    // Extract critical learnings
    const criticalLearnings = this.extractCriticalLearnings(params.jobType, params.jobResult);
    
    // Store the memory
    const memory = await this.storePostJobMemory({
      actorId: params.actorId,
      storyId: params.storyId,
      jobType: params.jobType,
      summary,
      criticalLearnings,
      confidence: params.confidence,
      additionalTags: [params.actorRole.toLowerCase().replace(' ', '_')],
    });
    
    return memory;
  }
  
  /**
   * Search post-job memories
   */
  static async searchPostJobMemories(params: {
    query: string;
    actorId?: number;
    storyId?: number;
    jobType?: string;
    criticalOnly?: boolean;
    limit?: number;
  }): Promise<Array<{ memory: PostJobMemory; score: number }>> {
    const queryEmbedding = await generateEmbedding(params.query);
    
    let sql = `
      SELECT m.*, 1 - (m.embedding <=> $1) AS score
      FROM post_job_memories m
      WHERE m.embedding IS NOT NULL
    `;
    const queryParams: any[] = [queryEmbedding];
    
    if (params.actorId) {
      sql += ` AND m.actor_id = $${queryParams.length + 1}`;
      queryParams.push(params.actorId);
    }
    
    if (params.storyId) {
      sql += ` AND m.story_id = $${queryParams.length + 1}`;
      queryParams.push(params.storyId);
    }
    
    if (params.jobType) {
      sql += ` AND m.job_type = $${queryParams.length + 1}`;
      queryParams.push(params.jobType);
    }
    
    if (params.criticalOnly) {
      sql += ` AND 'critical' = ANY(m.tags)`;
    }
    
    sql += ` ORDER BY m.embedding <=> $1 ASC`;
    
    if (params.limit) {
      sql += ` LIMIT $${queryParams.length + 1}`;
      queryParams.push(params.limit);
    }
    
    const { rows } = await query<any>(sql, queryParams);
    
    return rows.map(row => ({
      memory: {
        id: row.id,
        actor_id: row.actor_id,
        story_id: row.story_id,
        job_type: row.job_type,
        summary: row.summary,
        critical_learnings: JSON.parse(row.critical_learnings || '[]'),
        confidence: row.confidence,
        tags: row.tags,
        embedding: row.embedding,
        created_at: row.created_at,
        updated_at: row.updated_at,
      },
      score: Number(row.score),
    }));
  }
  
  /**
   * Get all post-job memories for a story
   */
  static async getStoryMemories(storyId: number): Promise<PostJobMemory[]> {
    const { rows } = await query<PostJobMemory>(
      'SELECT * FROM post_job_memories WHERE story_id = $1 ORDER BY created_at ASC',
      [storyId]
    );
    return rows.map(row => ({
      ...row,
      critical_learnings: JSON.parse(row.critical_learnings as any || '[]'),
    }));
  }
  
  /**
   * Get critical memories across all actors
   */
  static async getCriticalMemories(limit: number = 50): Promise<PostJobMemory[]> {
    const { rows } = await query<PostJobMemory>(
      `SELECT * FROM post_job_memories 
       WHERE 'critical' = ANY(tags) 
       ORDER BY created_at DESC 
       LIMIT $1`,
      [limit]
    );
    return rows.map(row => ({
      ...row,
      critical_learnings: JSON.parse(row.critical_learnings as any || '[]'),
    }));
  }
  
  private static generateJobSummary(jobType: string, jobResult: any): string {
    switch (jobType) {
      case 'story_draft':
        return `Completed story draft. Story ready for development implementation.`;
      case 'implementation':
        return `Implemented story features and functionality. Code ready for QA validation.`;
      case 'validation':
        return `Validated story implementation against acceptance criteria. ${jobResult?.approved ? 'Approved for release.' : 'Issues found, requires fixes.'}`;
      case 'defect_fix':
        return `Fixed defect issues identified by QA. Code ready for re-validation.`;
      case 'revalidation':
        return `Re-validated story after defect fixes. ${jobResult?.approved ? 'All issues resolved, approved for release.' : 'Additional issues found.'}`;
      default:
        return `Completed ${jobType} job.`;
    }
  }
  
  private static extractCriticalLearnings(jobType: string, jobResult: any): string[] {
    const learnings: string[] = [];
    
    // Extract learnings based on job type and result
    if (jobResult?.learnings) {
      learnings.push(...jobResult.learnings);
    }
    
    if (jobResult?.challenges) {
      learnings.push(`Challenges faced: ${jobResult.challenges}`);
    }
    
    if (jobResult?.solutions) {
      learnings.push(`Solutions applied: ${jobResult.solutions}`);
    }
    
    if (jobResult?.best_practices) {
      learnings.push(`Best practices: ${jobResult.best_practices}`);
    }
    
    return learnings;
  }
}