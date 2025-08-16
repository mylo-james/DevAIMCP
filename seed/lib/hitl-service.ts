import { query } from './database.ts';

export interface HITLRequest {
  id: number;
  epic_id: number;
  requester_actor_id: number;
  request_type: 'epic_completion' | 'escalation';
  title: string;
  description: string;
  context: Record<string, any>;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'approved' | 'rejected' | 'escalated';
  human_reviewer?: string;
  decision_reason?: string;
  created_at: string;
  updated_at: string;
  decided_at?: string;
}

export interface EpicCompletionStatus {
  epic_id: number;
  total_stories: number;
  completed_stories: number;
  is_complete: boolean;
  hitl_required: boolean;
  hitl_request_id?: number;
}

export interface EscalationPolicy {
  id: string;
  name: string;
  triggers: string[];
  escalation_levels: Array<{
    level: number;
    timeout_hours: number;
    reviewers: string[];
    actions: string[];
  }>;
  active: boolean;
}

export class HITLService {
  private static escalationPolicies: EscalationPolicy[] = [
    {
      id: 'epic_completion',
      name: 'Epic Completion Review',
      triggers: ['epic_complete'],
      escalation_levels: [
        {
          level: 1,
          timeout_hours: 24,
          reviewers: ['product_owner', 'tech_lead'],
          actions: ['review_epic_deliverables', 'approve_or_reject'],
        },
        {
          level: 2,
          timeout_hours: 48,
          reviewers: ['engineering_manager', 'product_manager'],
          actions: ['escalated_review', 'final_decision'],
        },
      ],
      active: true,
    },
    {
      id: 'critical_defect',
      name: 'Critical Defect Escalation',
      triggers: ['defect_severity_critical'],
      escalation_levels: [
        {
          level: 1,
          timeout_hours: 4,
          reviewers: ['tech_lead', 'qa_lead'],
          actions: ['immediate_review', 'hotfix_approval'],
        },
        {
          level: 2,
          timeout_hours: 8,
          reviewers: ['engineering_manager'],
          actions: ['executive_review', 'incident_response'],
        },
      ],
      active: true,
    },
  ];

  /**
   * Check if epic is complete and create HITL request if needed
   */
  static async checkEpicCompletion(epicId: number): Promise<EpicCompletionStatus> {
    // Get all stories for the epic
    const storiesQuery = `
      SELECT id, status FROM stories 
      WHERE epic_id = $1
    `;
    const { rows: stories } = await query<{ id: number; status: string }>(storiesQuery, [epicId]);

    const totalStories = stories.length;
    const completedStories = stories.filter(s => s.status === 'done').length;
    const isComplete = totalStories > 0 && completedStories === totalStories;

    let hitlRequestId: number | undefined;

    if (isComplete) {
      // Check if HITL request already exists
      const existingHITL = await query<HITLRequest>(
        'SELECT * FROM hitl_requests WHERE epic_id = $1 AND request_type = $2',
        [epicId, 'epic_completion']
      );

      if (existingHITL.rows.length === 0) {
        // Create HITL request for epic completion
        const hitlRequest = await this.createHITLRequest({
          epic_id: epicId,
          requester_actor_id: 0, // System-generated
          request_type: 'epic_completion',
          title: `Epic ${epicId} Completion Review`,
          description: `All ${totalStories} stories in epic ${epicId} are complete. Human approval required before epic closure.`,
          context: {
            epic_id: epicId,
            total_stories: totalStories,
            completed_stories: completedStories,
          },
          priority: 'medium',
        });
        hitlRequestId = hitlRequest.id;
      } else {
        hitlRequestId = existingHITL.rows[0].id;
      }
    }

    return {
      epic_id: epicId,
      total_stories: totalStories,
      completed_stories: completedStories,
      is_complete: isComplete,
      hitl_required: isComplete,
      hitl_request_id: hitlRequestId,
    };
  }

  /**
   * Create a new HITL request
   */
  static async createHITLRequest(params: {
    epic_id: number;
    requester_actor_id: number;
    request_type: 'epic_completion' | 'escalation';
    title: string;
    description: string;
    context: Record<string, any>;
    priority: 'low' | 'medium' | 'high' | 'urgent';
  }): Promise<HITLRequest> {
    const sql = `INSERT INTO hitl_requests 
      (epic_id, requester_actor_id, request_type, title, description, context, priority, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
      RETURNING *`;
    const values = [
      params.epic_id,
      params.requester_actor_id,
      params.request_type,
      params.title,
      params.description,
      JSON.stringify(params.context),
      params.priority,
    ];
    const { rows } = await query<HITLRequest>(sql, values);

    // Start escalation timer
    await this.startEscalationTimer(rows[0].id, params.request_type);

    return rows[0];
  }

  /**
   * Process human decision on HITL request
   */
  static async processHumanDecision(
    hitlRequestId: number,
    decision: 'approved' | 'rejected',
    humanReviewer: string,
    reason: string
  ): Promise<HITLRequest> {
    const sql = `UPDATE hitl_requests 
      SET status = $1, human_reviewer = $2, decision_reason = $3, decided_at = NOW(), updated_at = NOW()
      WHERE id = $4
      RETURNING *`;
    const values = [decision, humanReviewer, reason, hitlRequestId];
    const { rows } = await query<HITLRequest>(sql, values);

    if (rows.length === 0) {
      throw new Error(`HITL request ${hitlRequestId} not found`);
    }

    const request = rows[0];

    // Handle post-decision actions
    if (decision === 'approved' && request.request_type === 'epic_completion') {
      await this.finalizeEpicClosure(request.epic_id);
    }

    return request;
  }

  /**
   * Escalate HITL request to next level
   */
  static async escalateRequest(hitlRequestId: number, reason: string): Promise<HITLRequest> {
    const request = await this.getHITLRequest(hitlRequestId);
    if (!request) {
      throw new Error(`HITL request ${hitlRequestId} not found`);
    }

    // Update request status to escalated
    const sql = `UPDATE hitl_requests 
      SET status = 'escalated', updated_at = NOW()
      WHERE id = $1
      RETURNING *`;
    await query<HITLRequest>(sql, [hitlRequestId]);

    // Create new HITL request for escalated review
    const escalatedRequest = await this.createHITLRequest({
      epic_id: request.epic_id,
      requester_actor_id: request.requester_actor_id,
      request_type: 'escalation',
      title: `ESCALATED: ${request.title}`,
      description: `${request.description}\n\nEscalation Reason: ${reason}`,
      context: {
        ...request.context,
        original_request_id: hitlRequestId,
        escalation_reason: reason,
      },
      priority: 'high',
    });

    return escalatedRequest;
  }

  /**
   * Get HITL request by ID
   */
  static async getHITLRequest(hitlRequestId: number): Promise<HITLRequest | null> {
    const { rows } = await query<HITLRequest>('SELECT * FROM hitl_requests WHERE id = $1', [
      hitlRequestId,
    ]);
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Get pending HITL requests
   */
  static async getPendingHITLRequests(
    filters: {
      requestType?: 'epic_completion' | 'escalation';
      priority?: 'low' | 'medium' | 'high' | 'urgent';
      limit?: number;
    } = {}
  ): Promise<HITLRequest[]> {
    let sql = `SELECT * FROM hitl_requests WHERE status = 'pending'`;
    const params: any[] = [];

    if (filters.requestType) {
      sql += ` AND request_type = $${params.length + 1}`;
      params.push(filters.requestType);
    }

    if (filters.priority) {
      sql += ` AND priority = $${params.length + 1}`;
      params.push(filters.priority);
    }

    sql += ` ORDER BY 
      CASE priority 
        WHEN 'urgent' THEN 1 
        WHEN 'high' THEN 2 
        WHEN 'medium' THEN 3 
        WHEN 'low' THEN 4 
      END,
      created_at ASC`;

    if (filters.limit) {
      sql += ` LIMIT $${params.length + 1}`;
      params.push(filters.limit);
    }

    const { rows } = await query<HITLRequest>(sql, params);
    return rows;
  }

  /**
   * Check for overdue HITL requests and escalate
   */
  static async processEscalations(): Promise<{
    processed: number;
    escalated: HITLRequest[];
  }> {
    // Get overdue requests (pending for more than policy timeout)
    const overdueQuery = `
      SELECT h.*, p.name as policy_name
      FROM hitl_requests h
      LEFT JOIN escalation_policies p ON p.request_type = h.request_type
      WHERE h.status = 'pending' 
      AND h.created_at < NOW() - INTERVAL '24 hours'  -- Default timeout
    `;
    const { rows: overdueRequests } = await query<any>(overdueQuery, []);

    const escalatedRequests: HITLRequest[] = [];

    for (const request of overdueRequests) {
      try {
        const escalated = await this.escalateRequest(
          request.id,
          'Automatic escalation due to timeout'
        );
        escalatedRequests.push(escalated);
      } catch (error) {
        console.error(`Failed to escalate HITL request ${request.id}:`, error);
      }
    }

    return {
      processed: overdueRequests.length,
      escalated: escalatedRequests,
    };
  }

  /**
   * Start escalation timer for a HITL request
   */
  private static async startEscalationTimer(
    hitlRequestId: number,
    requestType: string
  ): Promise<void> {
    const policy = this.escalationPolicies.find(p => p.triggers.includes(requestType));
    if (!policy || !policy.active) {
      return;
    }

    // In a real implementation, this would set up a timer or scheduled job
    // For now, we'll just log that the timer should be started
    console.log(
      `Escalation timer started for HITL request ${hitlRequestId} with policy ${policy.name}`
    );
  }

  /**
   * Finalize epic closure after HITL approval
   */
  private static async finalizeEpicClosure(epicId: number): Promise<void> {
    // Update epic status to completed
    await query(
      'UPDATE epics SET status = $1, completed_at = NOW(), updated_at = NOW() WHERE id = $2',
      ['completed', epicId]
    );

    // Log epic completion
    console.log(`Epic ${epicId} finalized and closed after HITL approval`);
  }

  /**
   * Get escalation policies
   */
  static getEscalationPolicies(): EscalationPolicy[] {
    return this.escalationPolicies;
  }

  /**
   * Update escalation policy
   */
  static updateEscalationPolicy(policyId: string, updates: Partial<EscalationPolicy>): boolean {
    const policyIndex = this.escalationPolicies.findIndex(p => p.id === policyId);
    if (policyIndex === -1) {
      return false;
    }

    this.escalationPolicies[policyIndex] = {
      ...this.escalationPolicies[policyIndex],
      ...updates,
    };

    return true;
  }

  /**
   * Check if HITL is required for a specific action
   */
  static isHITLRequired(action: string, context: Record<string, any>): boolean {
    switch (action) {
      case 'epic_completion':
        return true; // Always require HITL for epic completion

      case 'story_completion':
        return false; // Never require HITL for individual stories

      case 'defect_creation':
        return context.severity === 'critical'; // Only for critical defects

      case 'architecture_change':
        return true; // Always require HITL for architecture changes

      default:
        return false;
    }
  }

  /**
   * Get HITL statistics
   */
  static async getHITLStats(): Promise<{
    pending_requests: number;
    avg_decision_time_hours: number;
    approval_rate: number;
    escalation_rate: number;
  }> {
    const statsQuery = `
      SELECT 
        COUNT(*) FILTER (WHERE status = 'pending') as pending_requests,
        AVG(EXTRACT(EPOCH FROM (decided_at - created_at))/3600) FILTER (WHERE decided_at IS NOT NULL) as avg_decision_time_hours,
        COUNT(*) FILTER (WHERE status = 'approved') * 100.0 / NULLIF(COUNT(*) FILTER (WHERE status IN ('approved', 'rejected')), 0) as approval_rate,
        COUNT(*) FILTER (WHERE status = 'escalated') * 100.0 / NULLIF(COUNT(*), 0) as escalation_rate
      FROM hitl_requests
    `;
    const { rows } = await query<any>(statsQuery, []);

    return {
      pending_requests: Number(rows[0].pending_requests || 0),
      avg_decision_time_hours: Number(rows[0].avg_decision_time_hours || 0),
      approval_rate: Number(rows[0].approval_rate || 0),
      escalation_rate: Number(rows[0].escalation_rate || 0),
    };
  }
}
