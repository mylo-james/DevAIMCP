import { query, generateEmbedding } from './database.ts';
import { AuthorizationService } from './authorization.ts';
import { ImportanceManager } from './importance-manager.ts';

export interface RetrievalResult {
  resource: any;
  vectorScore: number;
  actorImportance: number;
  globalRecency: number;
  combinedScore: number;
  accessAllowed: boolean;
}

export interface RetrievalParams {
  actorId: number;
  query: string;
  projectId?: number;
  resourceTypes?: string[];
  limit?: number;
  includeGlobalRecency?: boolean;
}

export class RetrievalService {
  
  /**
   * Main retrieval method that combines vector search, importance re-ranking, and ACL filtering
   */
  static async retrieve(params: RetrievalParams): Promise<RetrievalResult[]> {
    // Step 1: Generate query embedding
    const queryEmbedding = await generateEmbedding(params.query);
    
    // Step 2: Get initial vector search results (before ACL filtering)
    const vectorResults = await this.performVectorSearch(queryEmbedding, params);
    
    // Step 3: Apply ACL filtering
    const authorizedResults = await this.applyACLFilter(params.actorId, vectorResults);
    
    // Step 4: Apply actor-importance re-ranking
    const rerankedResults = await this.applyImportanceReranking(params.actorId, authorizedResults);
    
    // Step 5: Apply global recency if requested
    const finalResults = params.includeGlobalRecency 
      ? await this.applyGlobalRecency(rerankedResults)
      : rerankedResults;
    
    // Step 6: Sort by combined score and limit results
    const sortedResults = finalResults
      .sort((a, b) => b.combinedScore - a.combinedScore)
      .slice(0, params.limit || 10);
    
    return sortedResults;
  }
  
  /**
   * Perform initial vector similarity search
   */
  private static async performVectorSearch(
    queryEmbedding: number[], 
    params: RetrievalParams
  ): Promise<Array<{ resource: any; vectorScore: number }>> {
    let sql = `
      SELECT r.*, 1 - (r.embedding <=> $1) AS vector_score
      FROM kb_resources r
      WHERE r.embedding IS NOT NULL
    `;
    const queryParams: any[] = [queryEmbedding];
    
    if (params.projectId) {
      sql += ` AND r.project_id = $${queryParams.length + 1}`;
      queryParams.push(params.projectId);
    }
    
    if (params.resourceTypes && params.resourceTypes.length > 0) {
      sql += ` AND r.type = ANY($${queryParams.length + 1}::text[])`;
      queryParams.push(params.resourceTypes);
    }
    
    sql += ` ORDER BY r.embedding <=> $1 ASC LIMIT ${(params.limit || 10) * 2}`; // Get more for filtering
    
    const { rows } = await query<any>(sql, queryParams);
    
    return rows.map(row => ({
      resource: row,
      vectorScore: Number(row.vector_score),
    }));
  }
  
  /**
   * Apply ACL filtering to remove unauthorized resources
   */
  private static async applyACLFilter(
    actorId: number, 
    results: Array<{ resource: any; vectorScore: number }>
  ): Promise<Array<{ resource: any; vectorScore: number; accessAllowed: boolean }>> {
    const filteredResults = [];
    
    for (const result of results) {
      const accessCheck = await AuthorizationService.checkResourceAccess(actorId, result.resource.id);
      
      if (accessCheck.allowed) {
        filteredResults.push({
          ...result,
          accessAllowed: true,
        });
      }
      // Note: We could optionally include denied results with accessAllowed: false for audit purposes
    }
    
    return filteredResults;
  }
  
  /**
   * Apply actor-importance re-ranking
   */
  private static async applyImportanceReranking(
    actorId: number,
    results: Array<{ resource: any; vectorScore: number; accessAllowed: boolean }>
  ): Promise<Array<RetrievalResult & { globalRecency: number }>> {
    const rerankedResults = [];
    
    for (const result of results) {
      // Get actor-specific importance for this resource
      const importance = await ImportanceManager.getImportance(actorId, result.resource.id);
      const actorImportance = importance?.importance || 0;
      
      // Calculate global recency score (newer = higher score)
      const resourceAge = Date.now() - new Date(result.resource.updated_at).getTime();
      const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
      const globalRecency = Math.max(0, 1 - (resourceAge / maxAge));
      
      // Calculate combined score: vector similarity + importance boost + recency
      const combinedScore = result.vectorScore + (actorImportance * 0.1) + (globalRecency * 0.05);
      
      rerankedResults.push({
        resource: result.resource,
        vectorScore: result.vectorScore,
        actorImportance,
        globalRecency,
        combinedScore,
        accessAllowed: result.accessAllowed,
      });
    }
    
    return rerankedResults;
  }
  
  /**
   * Apply global recency weighting
   */
  private static async applyGlobalRecency(
    results: Array<RetrievalResult & { globalRecency: number }>
  ): Promise<RetrievalResult[]> {
    // Recalculate combined scores with enhanced recency weighting
    return results.map(result => ({
      ...result,
      combinedScore: result.vectorScore + (result.actorImportance * 0.1) + (result.globalRecency * 0.15),
    }));
  }
  
  /**
   * Search with automatic importance increment on confirmed hits
   */
  static async searchWithFeedback(params: RetrievalParams & {
    confirmedResourceIds?: number[];
  }): Promise<RetrievalResult[]> {
    const results = await this.retrieve(params);
    
    // Increment importance for confirmed hits
    if (params.confirmedResourceIds && params.confirmedResourceIds.length > 0) {
      for (const resourceId of params.confirmedResourceIds) {
        await ImportanceManager.incrementImportance(params.actorId, resourceId);
      }
    }
    
    return results;
  }
  
  /**
   * Get retrieval statistics for monitoring
   */
  static async getRetrievalStats(actorId: number): Promise<{
    totalQueries: number;
    avgResultsPerQuery: number;
    topResourceTypes: string[];
    recentQueries: string[];
  }> {
    // Get recent activity for this actor
    const activities = await ImportanceManager.getActorActivity(actorId, 100);
    
    const searchActivities = activities.filter(a => a.action === 'search_query');
    const importanceIncrements = activities.filter(a => a.action === 'importance_increment');
    
    return {
      totalQueries: searchActivities.length,
      avgResultsPerQuery: searchActivities.length > 0 ? importanceIncrements.length / searchActivities.length : 0,
      topResourceTypes: [], // Would calculate from actual data
      recentQueries: searchActivities.slice(0, 10).map(a => a.metadata?.query || 'Unknown'),
    };
  }
  
  /**
   * Advanced search with multiple ranking strategies
   */
  static async advancedSearch(params: RetrievalParams & {
    rankingStrategy?: 'vector_only' | 'importance_only' | 'combined' | 'recency_boosted';
    diversityFactor?: number;
  }): Promise<RetrievalResult[]> {
    const baseResults = await this.retrieve(params);
    
    switch (params.rankingStrategy) {
      case 'vector_only':
        return baseResults.sort((a, b) => b.vectorScore - a.vectorScore);
      
      case 'importance_only':
        return baseResults.sort((a, b) => b.actorImportance - a.actorImportance);
      
      case 'recency_boosted':
        return baseResults.sort((a, b) => 
          (b.vectorScore + b.globalRecency * 0.3) - (a.vectorScore + a.globalRecency * 0.3)
        );
      
      case 'combined':
      default:
        return baseResults; // Already sorted by combined score
    }
  }
  
  /**
   * Batch retrieval for multiple queries
   */
  static async batchRetrieve(
    actorId: number,
    queries: string[],
    sharedParams?: Partial<RetrievalParams>
  ): Promise<Map<string, RetrievalResult[]>> {
    const results = new Map<string, RetrievalResult[]>();
    
    for (const query of queries) {
      const queryResults = await this.retrieve({
        actorId,
        query,
        ...sharedParams,
      });
      results.set(query, queryResults);
    }
    
    return results;
  }
}