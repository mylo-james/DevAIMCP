import { query } from './database.ts';

export interface NotificationConfig {
  id: number;
  actor_id: number;
  notification_type: 'pushover' | 'ifttt' | 'webhook' | 'email';
  config_data: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationRequest {
  actor_id: number;
  title: string;
  message: string;
  priority?: 'low' | 'normal' | 'high' | 'emergency';
  url?: string;
  metadata?: Record<string, any>;
}

export interface NotificationResult {
  success: boolean;
  provider: string;
  message_id?: string;
  error?: string;
  sent_at: string;
}

export class NotificationService {
  private static instance: NotificationService;
  
  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }
  
  /**
   * Send a notification to an actor's configured notification channels
   */
  async sendNotification(request: NotificationRequest): Promise<NotificationResult[]> {
    const configs = await this.getActorNotificationConfigs(request.actor_id);
    const results: NotificationResult[] = [];
    
    for (const config of configs) {
      if (!config.is_active) continue;
      
      try {
        const result = await this.sendToProvider(config, request);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          provider: config.notification_type,
          error: error instanceof Error ? error.message : String(error),
          sent_at: new Date().toISOString(),
        });
      }
    }
    
    // Log the notification attempt
    await this.logNotificationAttempt(request, results);
    
    return results;
  }
  
  /**
   * Send notification when an agent completes their work
   */
  async notifyAgentCompletion(
    actorId: number,
    actorRole: string,
    storyId: number,
    jobType: string,
    completionDetails?: Record<string, any>
  ): Promise<NotificationResult[]> {
    const story = await this.getStoryDetails(storyId);
    const title = `${actorRole} Work Complete`;
    const message = this.buildCompletionMessage(actorRole, story, jobType, completionDetails);
    
    return this.sendNotification({
      actor_id: actorId,
      title,
      message,
      priority: 'normal',
      url: completionDetails?.url,
      metadata: {
        story_id: storyId,
        actor_role: actorRole,
        job_type: jobType,
        completion_details: completionDetails,
      },
    });
  }
  
  /**
   * Configure notification settings for an actor
   */
  async configureNotification(
    actorId: number,
    notificationType: 'pushover' | 'ifttt' | 'webhook' | 'email',
    configData: Record<string, any>
  ): Promise<NotificationConfig> {
    const sql = `
      INSERT INTO notification_configs (actor_id, notification_type, config_data, is_active)
      VALUES ($1, $2, $3, true)
      ON CONFLICT (actor_id, notification_type) 
      DO UPDATE SET config_data = $3, updated_at = NOW()
      RETURNING *
    `;
    
    const values = [actorId, notificationType, JSON.stringify(configData)];
    const { rows } = await query<NotificationConfig>(sql, values);
    return rows[0];
  }
  
  /**
   * Get notification configs for an actor
   */
  async getActorNotificationConfigs(actorId: number): Promise<NotificationConfig[]> {
    const sql = 'SELECT * FROM notification_configs WHERE actor_id = $1 AND is_active = true';
    const { rows } = await query<NotificationConfig>(sql, [actorId]);
    return rows;
  }
  
  /**
   * Test notification configuration
   */
  async testNotification(actorId: number, notificationType: string): Promise<NotificationResult> {
    const configs = await this.getActorNotificationConfigs(actorId);
    const config = configs.find(c => c.notification_type === notificationType);
    
    if (!config) {
      throw new Error(`No ${notificationType} configuration found for actor ${actorId}`);
    }
    
    const testRequest: NotificationRequest = {
      actor_id: actorId,
      title: 'DevAI Notification Test',
      message: 'This is a test notification from DevAI. If you receive this, your notification setup is working correctly!',
      priority: 'normal',
      metadata: { test: true },
    };
    
    const results = await this.sendToProvider(config, testRequest);
    return results;
  }
  
  private async sendToProvider(
    config: NotificationConfig,
    request: NotificationRequest
  ): Promise<NotificationResult> {
    switch (config.notification_type) {
      case 'pushover':
        return this.sendPushoverNotification(config, request);
      case 'ifttt':
        return this.sendIFTTTNotification(config, request);
      case 'webhook':
        return this.sendWebhookNotification(config, request);
      case 'email':
        return this.sendEmailNotification(config, request);
      default:
        throw new Error(`Unsupported notification type: ${config.notification_type}`);
    }
  }
  
  private async sendPushoverNotification(
    config: NotificationConfig,
    request: NotificationRequest
  ): Promise<NotificationResult> {
    const { user_key, app_token } = config.config_data;
    
    if (!user_key || !app_token) {
      throw new Error('Pushover configuration missing user_key or app_token');
    }
    
    const response = await fetch('https://api.pushover.net/1/messages.json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: app_token,
        user: user_key,
        title: request.title,
        message: request.message,
        priority: this.mapPriorityToPushover(request.priority),
        url: request.url,
        url_title: 'View Details',
      }),
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(`Pushover API error: ${result.errors?.join(', ') || 'Unknown error'}`);
    }
    
    return {
      success: true,
      provider: 'pushover',
      message_id: result.request,
      sent_at: new Date().toISOString(),
    };
  }
  
  private async sendIFTTTNotification(
    config: NotificationConfig,
    request: NotificationRequest
  ): Promise<NotificationResult> {
    const { webhook_key, event_name } = config.config_data;
    
    if (!webhook_key || !event_name) {
      throw new Error('IFTTT configuration missing webhook_key or event_name');
    }
    
    const response = await fetch(`https://maker.ifttt.com/trigger/${event_name}/with/key/${webhook_key}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        value1: request.title,
        value2: request.message,
        value3: request.url || '',
      }),
    });
    
    if (!response.ok) {
      throw new Error(`IFTTT webhook error: ${response.status} ${response.statusText}`);
    }
    
    return {
      success: true,
      provider: 'ifttt',
      sent_at: new Date().toISOString(),
    };
  }
  
  private async sendWebhookNotification(
    config: NotificationConfig,
    request: NotificationRequest
  ): Promise<NotificationResult> {
    const { webhook_url, headers = {} } = config.config_data;
    
    if (!webhook_url) {
      throw new Error('Webhook configuration missing webhook_url');
    }
    
    const response = await fetch(webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({
        title: request.title,
        message: request.message,
        priority: request.priority,
        url: request.url,
        metadata: request.metadata,
        timestamp: new Date().toISOString(),
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Webhook error: ${response.status} ${response.statusText}`);
    }
    
    return {
      success: true,
      provider: 'webhook',
      sent_at: new Date().toISOString(),
    };
  }
  
  private async sendEmailNotification(
    config: NotificationConfig,
    request: NotificationRequest
  ): Promise<NotificationResult> {
    // This would integrate with an email service like SendGrid, AWS SES, etc.
    // For now, we'll simulate the email sending
    const { email_address } = config.config_data;
    
    if (!email_address) {
      throw new Error('Email configuration missing email_address');
    }
    
    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return {
      success: true,
      provider: 'email',
      sent_at: new Date().toISOString(),
    };
  }
  
  private mapPriorityToPushover(priority?: string): number {
    switch (priority) {
      case 'low': return -1;
      case 'normal': return 0;
      case 'high': return 1;
      case 'emergency': return 2;
      default: return 0;
    }
  }
  
  private async getStoryDetails(storyId: number): Promise<any> {
    const sql = 'SELECT * FROM stories WHERE id = $1';
    const { rows } = await query(sql, [storyId]);
    return rows[0] || { title: 'Unknown Story', id: storyId };
  }
  
  private buildCompletionMessage(
    actorRole: string,
    story: any,
    jobType: string,
    completionDetails?: Record<string, any>
  ): string {
    const storyTitle = story?.title || `Story #${story?.id}`;
    
    let message = `${actorRole} has completed their work on "${storyTitle}".`;
    
    if (completionDetails?.challenges) {
      message += `\n\nChallenges encountered: ${completionDetails.challenges}`;
    }
    
    if (completionDetails?.next_steps) {
      message += `\n\nNext steps: ${completionDetails.next_steps}`;
    }
    
    return message;
  }
  
  private async logNotificationAttempt(
    request: NotificationRequest,
    results: NotificationResult[]
  ): Promise<void> {
    const sql = `
      INSERT INTO notification_logs (actor_id, title, message, results, created_at)
      VALUES ($1, $2, $3, $4, NOW())
    `;
    
    const values = [
      request.actor_id,
      request.title,
      request.message,
      JSON.stringify(results),
    ];
    
    await query(sql, values);
  }
}