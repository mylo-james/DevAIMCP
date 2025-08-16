import { query, generateEmbedding } from './database';

export interface KBResource {
  id: number;
  project_id: number;
  uri: string;
  type: string;
  content?: string;
  access_tags: string[];
  metadata?: Record<string, any>;
  embedding?: number[];
  created_at: string;
  updated_at: string;
}

export interface ActorImportance {
  id: number;
  actor_id: number;
  resource_id: number;
  importance: number;
  last_touched_at: string;
  created_at: string;
  updated_at: string;
}

export interface ActivityLogEntry {
  id: number;
  actor_id: number;
  action: string;
  resource_id?: number;
  story_id?: number;
  metadata?: Record<string, any>;
  created_at: string;
}

export class ImportanceManager {
  /**
   * Create a new knowledge base resource
   */
  static async createKBResource(
    input: Omit<KBResource, 'id' | 'created_at' | 'updated_at'>
  ): Promise<KBResource> {
    const embedding = input.content ? await generateEmbedding(input.content) : null;

    const sql = `INSERT INTO kb_resources (project_id, uri, type, content, access_tags, metadata, embedding)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`;
    const values = [
      input.project_id,
      input.uri,
      input.type,
      input.content || null,
      input.access_tags || [],
      JSON.stringify(input.metadata || {}),
      embedding,
    ];
    const { rows } = await query(sql, values);
    if (!rows[0]) {
      throw new Error('Failed to create KB resource');
    }
    return rows[0];
  }

  /**
   * Increment importance for an actor-resource pair on confirmed hit
   */
  static async incrementImportance(actorId: number, resourceId: number): Promise<ActorImportance> {
    const sql = `INSERT INTO kb_actor_importance (actor_id, resource_id, importance, last_touched_at)
      VALUES ($1, $2, 1, NOW())
      ON CONFLICT (actor_id, resource_id)
      DO UPDATE SET 
        importance = kb_actor_importance.importance + 1,
        last_touched_at = NOW(),
        updated_at = NOW()
      RETURNING *`;
    const { rows } = await query(sql, [actorId, resourceId]);
    if (!rows[0]) {
      throw new Error('Failed to create actor importance');
    }

    // Log the activity
    await this.logActivity(actorId, 'importance_increment', resourceId);

    return rows[0];
  }

  /**
   * Get importance score for a specific actor-resource pair
   */
  static async getImportance(actorId: number, resourceId: number): Promise<ActorImportance | null> {
    const { rows } = await query(
      'SELECT * FROM kb_actor_importance WHERE actor_id = $1 AND resource_id = $2',
      [actorId, resourceId]
    );
    return rows[0] || null;
  }

  /**
   * Get all importance scores for an actor
   */
  static async getActorImportanceScores(actorId: number): Promise<ActorImportance[]> {
    const { rows } = await query(
      'SELECT * FROM kb_actor_importance WHERE actor_id = $1 ORDER BY importance DESC, last_touched_at DESC',
      [actorId]
    );
    return rows;
  }

  /**
   * Run nightly decay for all actors who were active today
   */
  static async runNightlyDecay(): Promise<{
    actorsProcessed: number;
    importanceDecayed: number;
  }> {
    // Get all actors who were active today
    const activeActorsQuery = `
      SELECT DISTINCT actor_id 
      FROM activity_log 
      WHERE created_at >= CURRENT_DATE
    `;
    const { rows: activeActors } = await query(activeActorsQuery);

    let totalDecayed = 0;

    for (const { actor_id } of activeActors) {
      // Decay all importance scores for this actor by 1 (floor at 0)
      const decayResult = await query(
        `UPDATE kb_actor_importance 
         SET importance = GREATEST(0, importance - 1),
             updated_at = NOW()
         WHERE actor_id = $1 AND importance > 0`,
        [actor_id]
      );

      totalDecayed += decayResult.rowCount || 0;

      // Log the decay activity
      await this.logActivity(actor_id, 'nightly_decay');
    }

    return {
      actorsProcessed: activeActors.length,
      importanceDecayed: totalDecayed,
    };
  }

  /**
   * Get resources ranked by vector similarity and actor importance
   */
  static async getRankedResources(params: {
    actorId: number;
    queryEmbedding: number[];
    projectId?: number;
    limit?: number;
  }): Promise<
    Array<{
      resource: KBResource;
      vectorScore: number;
      actorImportance: number;
      combinedScore: number;
    }>
  > {
    const limit = params.limit || 10;

    let projectFilter = '';
    const queryParams: any[] = [params.queryEmbedding, params.actorId, limit];

    if (params.projectId) {
      projectFilter = 'AND r.project_id = $4';
      queryParams.push(params.projectId);
    }

    const sql = `
      SELECT 
        r.*,
        1 - (r.embedding <=> $1) AS vector_score,
        COALESCE(ai.importance, 0) AS actor_importance,
        (1 - (r.embedding <=> $1)) + (COALESCE(ai.importance, 0) * 0.1) AS combined_score
      FROM kb_resources r
      LEFT JOIN kb_actor_importance ai ON r.id = ai.resource_id AND ai.actor_id = $2
      WHERE r.embedding IS NOT NULL ${projectFilter}
      ORDER BY combined_score DESC, r.updated_at DESC
      LIMIT $3
    `;

    const { rows } = await query(sql, queryParams);

    return rows.map(row => ({
      resource: {
        id: row.id,
        project_id: row.project_id,
        uri: row.uri,
        type: row.type,
        content: row.content,
        access_tags: row.access_tags,
        metadata: row.metadata,
        embedding: row.embedding,
        created_at: row.created_at,
        updated_at: row.updated_at,
      },
      vectorScore: Number(row.vector_score),
      actorImportance: Number(row.actor_importance),
      combinedScore: Number(row.combined_score),
    }));
  }

  /**
   * Log actor activity
   */
  static async logActivity(
    actorId: number,
    action: string,
    resourceId?: number,
    storyId?: number,
    metadata?: Record<string, any>
  ): Promise<ActivityLogEntry> {
    const sql = `INSERT INTO activity_log (actor_id, action, resource_id, story_id, metadata)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *`;
    const values = [
      actorId,
      action,
      resourceId || null,
      storyId || null,
      metadata ? JSON.stringify(metadata) : null,
    ];
    const { rows } = await query(sql, values);
    if (!rows[0]) {
      throw new Error('Failed to log activity');
    }
    return rows[0];
  }

  /**
   * Get activity log for an actor
   */
  static async getActorActivity(actorId: number, limit: number = 50): Promise<ActivityLogEntry[]> {
    const { rows } = await query(
      'SELECT * FROM activity_log WHERE actor_id = $1 ORDER BY created_at DESC LIMIT $2',
      [actorId, limit]
    );
    return rows;
  }

  /**
   * Get actors who were active on a specific date
   */
  static async getActiveActorsForDate(date: string): Promise<number[]> {
    const { rows } = await query(
      'SELECT DISTINCT actor_id FROM activity_log WHERE created_at::date = $1',
      [date]
    );
    return rows.map(row => row.actor_id);
  }

  /**
   * Schedule nightly decay job (this would typically be called by a cron job)
   */
  static async scheduleNightlyDecay(): Promise<void> {
    // This is a placeholder for scheduling logic
    // In production, this would be handled by a cron job or scheduler
    console.log('Nightly decay scheduled - run at 00:00 daily');
  }
}
