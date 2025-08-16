import { query } from './database.ts';
import { createHash, randomBytes } from 'crypto';

export interface ActorKey {
  id: number;
  actor_id: number;
  key_hash: string;
  scopes: string[];
  expires_at?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AccessDecision {
  allowed: boolean;
  reason: string;
  actor_id?: number;
  resource_id: number;
  scopes_checked: string[];
}

export interface AuditLogEntry {
  id: number;
  actor_id?: number;
  action: string;
  resource_id?: number;
  decision: 'allow' | 'deny';
  reason: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export class AuthorizationService {
  /**
   * Generate a new actor key
   */
  static async generateActorKey(
    actorId: number,
    scopes: string[] = [],
    expiresInDays?: number
  ): Promise<{
    key: string;
    keyRecord: ActorKey;
  }> {
    // Generate a secure random key
    const key = randomBytes(32).toString('hex');
    const keyHash = createHash('sha256').update(key).digest('hex');

    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const sql = `INSERT INTO actor_keys (actor_id, key_hash, scopes, expires_at)
      VALUES ($1, $2, $3, $4)
      RETURNING *`;
    const values = [actorId, keyHash, scopes, expiresAt];
    const { rows } = await query<ActorKey>(sql, values);

    return {
      key, // Return the plain key only once for the user to store
      keyRecord: rows[0],
    };
  }

  /**
   * Validate an actor key and return actor info
   */
  static async validateActorKey(key: string): Promise<{
    valid: boolean;
    actorId?: number;
    scopes?: string[];
    reason: string;
  }> {
    const keyHash = createHash('sha256').update(key).digest('hex');

    const sql = `
      SELECT ak.*, p.name as actor_name, p.role as actor_role
      FROM actor_keys ak
      JOIN personas p ON ak.actor_id = p.id
      WHERE ak.key_hash = $1 AND ak.active = true
    `;
    const { rows } = await query<any>(sql, [keyHash]);

    if (rows.length === 0) {
      return {
        valid: false,
        reason: 'Invalid or inactive key',
      };
    }

    const keyRecord = rows[0];

    // Check expiration
    if (keyRecord.expires_at && new Date(keyRecord.expires_at) < new Date()) {
      return {
        valid: false,
        reason: 'Key has expired',
      };
    }

    return {
      valid: true,
      actorId: keyRecord.actor_id,
      scopes: keyRecord.scopes,
      reason: 'Valid key',
    };
  }

  /**
   * Check if an actor has access to a resource
   */
  static async checkResourceAccess(actorId: number, resourceId: number): Promise<AccessDecision> {
    // Get the resource and its access tags
    const resourceQuery = 'SELECT * FROM kb_resources WHERE id = $1';
    const { rows: resourceRows } = await query<any>(resourceQuery, [resourceId]);

    if (resourceRows.length === 0) {
      return {
        allowed: false,
        reason: 'Resource not found',
        resource_id: resourceId,
        scopes_checked: [],
      };
    }

    const resource = resourceRows[0];
    const resourceTags = resource.access_tags || [];

    // Get actor's scopes from all their active keys
    const actorScopesQuery = `
      SELECT DISTINCT unnest(scopes) as scope
      FROM actor_keys 
      WHERE actor_id = $1 AND active = true 
      AND (expires_at IS NULL OR expires_at > NOW())
    `;
    const { rows: scopeRows } = await query<{ scope: string }>(actorScopesQuery, [actorId]);
    const actorScopes = scopeRows.map(row => row.scope);

    // Check if actor has any required scopes
    let accessAllowed = false;
    let reason = 'No matching scopes';

    if (resourceTags.length === 0) {
      // No access restrictions - allow access
      accessAllowed = true;
      reason = 'Public resource';
    } else {
      // Check if actor has any of the required tags/scopes
      const hasRequiredScope = resourceTags.some(tag => actorScopes.includes(tag));
      if (hasRequiredScope) {
        accessAllowed = true;
        reason = 'Actor has required scope';
      } else {
        reason = `Actor lacks required scopes: ${resourceTags.join(', ')}`;
      }
    }

    // Log the access decision
    await this.auditResourceAccess(actorId, resourceId, accessAllowed ? 'allow' : 'deny', reason);

    return {
      allowed: accessAllowed,
      reason,
      actor_id: actorId,
      resource_id: resourceId,
      scopes_checked: resourceTags,
    };
  }

  /**
   * Get filtered resources based on actor authorization
   */
  static async getAuthorizedResources(actorId: number, projectId?: number): Promise<any[]> {
    // Get actor's scopes
    const actorScopesQuery = `
      SELECT DISTINCT unnest(scopes) as scope
      FROM actor_keys 
      WHERE actor_id = $1 AND active = true 
      AND (expires_at IS NULL OR expires_at > NOW())
    `;
    const { rows: scopeRows } = await query<{ scope: string }>(actorScopesQuery, [actorId]);
    const actorScopes = scopeRows.map(row => row.scope);

    // Build query to get authorized resources
    let baseQuery = `
      SELECT r.* FROM kb_resources r
      WHERE (
        array_length(r.access_tags, 1) IS NULL  -- Public resources
        OR r.access_tags && $1::text[]           -- Resources with matching tags
      )
    `;

    const queryParams: any[] = [actorScopes];

    if (projectId) {
      baseQuery += ' AND r.project_id = $2';
      queryParams.push(projectId);
    }

    baseQuery += ' ORDER BY r.updated_at DESC';

    const { rows } = await query<any>(baseQuery, queryParams);
    return rows;
  }

  /**
   * Audit resource access decisions
   */
  static async auditResourceAccess(
    actorId: number,
    resourceId: number,
    decision: 'allow' | 'deny',
    reason: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const sql = `INSERT INTO audit_log (actor_id, action, resource_id, decision, reason, metadata)
      VALUES ($1, $2, $3, $4, $5, $6)`;
    const values = [
      actorId,
      'resource_access',
      resourceId,
      decision,
      reason,
      metadata ? JSON.stringify(metadata) : null,
    ];
    await query(sql, values);
  }

  /**
   * Get audit log entries
   */
  static async getAuditLog(
    filters: {
      actorId?: number;
      resourceId?: number;
      decision?: 'allow' | 'deny';
      limit?: number;
    } = {}
  ): Promise<AuditLogEntry[]> {
    let sql = 'SELECT * FROM audit_log WHERE 1=1';
    const params: any[] = [];

    if (filters.actorId) {
      sql += ` AND actor_id = $${params.length + 1}`;
      params.push(filters.actorId);
    }

    if (filters.resourceId) {
      sql += ` AND resource_id = $${params.length + 1}`;
      params.push(filters.resourceId);
    }

    if (filters.decision) {
      sql += ` AND decision = $${params.length + 1}`;
      params.push(filters.decision);
    }

    sql += ' ORDER BY created_at DESC';

    if (filters.limit) {
      sql += ` LIMIT $${params.length + 1}`;
      params.push(filters.limit);
    }

    const { rows } = await query<AuditLogEntry>(sql, params);
    return rows;
  }

  /**
   * Revoke an actor key
   */
  static async revokeActorKey(keyId: number): Promise<boolean> {
    const result = await query(
      'UPDATE actor_keys SET active = false, updated_at = NOW() WHERE id = $1',
      [keyId]
    );
    return (result.rowCount || 0) > 0;
  }

  /**
   * List actor keys for an actor
   */
  static async getActorKeys(actorId: number): Promise<ActorKey[]> {
    const { rows } = await query<ActorKey>(
      'SELECT * FROM actor_keys WHERE actor_id = $1 ORDER BY created_at DESC',
      [actorId]
    );
    return rows;
  }
}
