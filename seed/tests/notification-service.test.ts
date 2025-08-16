import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NotificationService } from '../lib/notification-service.ts';

// Mock fetch globally
global.fetch = vi.fn();

// Mock database
vi.mock('../lib/database.ts', () => ({
  query: vi.fn(),
}));

describe('NotificationService', () => {
  let notificationService: NotificationService;
  
  beforeEach(() => {
    notificationService = NotificationService.getInstance();
    vi.clearAllMocks();
  });
  
  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getInstance', () => {
    it('should return the same instance', () => {
      const instance1 = NotificationService.getInstance();
      const instance2 = NotificationService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('sendNotification', () => {
    it('should send notification to all active configs', async () => {
      const mockConfigs = [
        {
          id: 1,
          actor_id: 1,
          notification_type: 'pushover' as const,
          config_data: { user_key: 'test_user', app_token: 'test_token' },
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 2,
          actor_id: 1,
          notification_type: 'ifttt' as const,
          config_data: { webhook_key: 'test_key', event_name: 'test_event' },
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      // Mock getActorNotificationConfigs
      vi.spyOn(notificationService as any, 'getActorNotificationConfigs').mockResolvedValue(mockConfigs);
      
      // Mock sendToProvider to return different providers for each call
      const sendToProviderSpy = vi.spyOn(notificationService as any, 'sendToProvider');
      sendToProviderSpy
        .mockResolvedValueOnce({
          success: true,
          provider: 'pushover',
          message_id: 'test_id',
          sent_at: new Date().toISOString(),
        })
        .mockResolvedValueOnce({
          success: true,
          provider: 'ifttt',
          message_id: 'test_id2',
          sent_at: new Date().toISOString(),
        });

      // Mock logNotificationAttempt
      vi.spyOn(notificationService as any, 'logNotificationAttempt').mockResolvedValue(undefined);

      const request = {
        actor_id: 1,
        title: 'Test Notification',
        message: 'Test message',
        priority: 'normal' as const,
      };

      const results = await notificationService.sendNotification(request);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[0].provider).toBe('pushover');
      expect(results[1].success).toBe(true);
      expect(results[1].provider).toBe('ifttt');
    });

    it('should skip inactive configs', async () => {
      const mockConfigs = [
        {
          id: 1,
          actor_id: 1,
          notification_type: 'pushover' as const,
          config_data: { user_key: 'test_user', app_token: 'test_token' },
          is_active: false,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      vi.spyOn(notificationService as any, 'getActorNotificationConfigs').mockResolvedValue(mockConfigs);
      vi.spyOn(notificationService as any, 'logNotificationAttempt').mockResolvedValue(undefined);

      const request = {
        actor_id: 1,
        title: 'Test Notification',
        message: 'Test message',
      };

      const results = await notificationService.sendNotification(request);

      expect(results).toHaveLength(0);
    });

    it('should handle provider errors gracefully', async () => {
      const mockConfigs = [
        {
          id: 1,
          actor_id: 1,
          notification_type: 'pushover' as const,
          config_data: { user_key: 'test_user', app_token: 'test_token' },
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      vi.spyOn(notificationService as any, 'getActorNotificationConfigs').mockResolvedValue(mockConfigs);
      vi.spyOn(notificationService as any, 'sendToProvider').mockRejectedValue(new Error('Provider error'));
      vi.spyOn(notificationService as any, 'logNotificationAttempt').mockResolvedValue(undefined);

      const request = {
        actor_id: 1,
        title: 'Test Notification',
        message: 'Test message',
      };

      const results = await notificationService.sendNotification(request);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toBe('Provider error');
    });
  });

  describe('notifyAgentCompletion', () => {
    it('should send completion notification with story details', async () => {
      const mockStory = {
        id: 1,
        title: 'Test Story',
        description: 'Test description',
      };

      vi.spyOn(notificationService as any, 'getStoryDetails').mockResolvedValue(mockStory);
      vi.spyOn(notificationService as any, 'getActorNotificationConfigs').mockResolvedValue([]);
      vi.spyOn(notificationService as any, 'logNotificationAttempt').mockResolvedValue(undefined);

      const results = await notificationService.notifyAgentCompletion(
        1,
        'Developer',
        1,
        'implementation',
        {
          challenges: 'Some challenges',
          nextSteps: 'Next steps',
          confidence: 0.9,
        }
      );

      expect(results).toBeDefined();
    });
  });

  describe('configureNotification', () => {
    it('should configure notification for an actor', async () => {
      const mockConfig = {
        id: 1,
        actor_id: 1,
        notification_type: 'pushover' as const,
        config_data: { user_key: 'test_user', app_token: 'test_token' },
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const { query } = await import('../lib/database.ts');
      (query as any).mockResolvedValue({ rows: [mockConfig] });

      const result = await notificationService.configureNotification(
        1,
        'pushover',
        { user_key: 'test_user', app_token: 'test_token' }
      );

      expect(result).toEqual(mockConfig);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO notification_configs'),
        [1, 'pushover', '{"user_key":"test_user","app_token":"test_token"}']
      );
    });
  });

  describe('testNotification', () => {
    it('should test notification configuration', async () => {
      const mockConfig = {
        id: 1,
        actor_id: 1,
        notification_type: 'pushover' as const,
        config_data: { user_key: 'test_user', app_token: 'test_token' },
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      vi.spyOn(notificationService as any, 'getActorNotificationConfigs').mockResolvedValue([mockConfig]);
      vi.spyOn(notificationService as any, 'sendToProvider').mockResolvedValue({
        success: true,
        provider: 'pushover',
        sent_at: new Date().toISOString(),
      });

      const result = await notificationService.testNotification(1, 'pushover');

      expect(result.success).toBe(true);
      expect(result.provider).toBe('pushover');
    });

    it('should throw error for non-existent config', async () => {
      vi.spyOn(notificationService as any, 'getActorNotificationConfigs').mockResolvedValue([]);

      await expect(notificationService.testNotification(1, 'pushover')).rejects.toThrow(
        'No pushover configuration found for actor 1'
      );
    });
  });

  describe('sendPushoverNotification', () => {
    it('should send pushover notification successfully', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ request: 'test_request_id' }),
      };
      (fetch as any).mockResolvedValue(mockResponse);

      const config = {
        id: 1,
        actor_id: 1,
        notification_type: 'pushover' as const,
        config_data: { user_key: 'test_user', app_token: 'test_token' },
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const request = {
        actor_id: 1,
        title: 'Test Title',
        message: 'Test Message',
        priority: 'normal' as const,
        url: 'https://example.com',
      };

      const result = await (notificationService as any).sendPushoverNotification(config, request);

      expect(result.success).toBe(true);
      expect(result.provider).toBe('pushover');
      expect(result.message_id).toBe('test_request_id');
      expect(fetch).toHaveBeenCalledWith(
        'https://api.pushover.net/1/messages.json',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('"token":"test_token"'),
        })
      );
    });

    it('should handle pushover API errors', async () => {
      const mockResponse = {
        ok: false,
        json: vi.fn().mockResolvedValue({ errors: ['Invalid token'] }),
      };
      (fetch as any).mockResolvedValue(mockResponse);

      const config = {
        id: 1,
        actor_id: 1,
        notification_type: 'pushover' as const,
        config_data: { user_key: 'test_user', app_token: 'invalid_token' },
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const request = {
        actor_id: 1,
        title: 'Test Title',
        message: 'Test Message',
      };

      await expect((notificationService as any).sendPushoverNotification(config, request)).rejects.toThrow(
        'Pushover API error: Invalid token'
      );
    });

    it('should validate required config data', async () => {
      const config = {
        id: 1,
        actor_id: 1,
        notification_type: 'pushover' as const,
        config_data: { user_key: 'test_user' }, // Missing app_token
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const request = {
        actor_id: 1,
        title: 'Test Title',
        message: 'Test Message',
      };

      await expect((notificationService as any).sendPushoverNotification(config, request)).rejects.toThrow(
        'Pushover configuration missing user_key or app_token'
      );
    });
  });

  describe('sendIFTTTNotification', () => {
    it('should send IFTTT notification successfully', async () => {
      const mockResponse = { ok: true };
      (fetch as any).mockResolvedValue(mockResponse);

      const config = {
        id: 1,
        actor_id: 1,
        notification_type: 'ifttt' as const,
        config_data: { webhook_key: 'test_key', event_name: 'test_event' },
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const request = {
        actor_id: 1,
        title: 'Test Title',
        message: 'Test Message',
        url: 'https://example.com',
      };

      const result = await (notificationService as any).sendIFTTTNotification(config, request);

      expect(result.success).toBe(true);
      expect(result.provider).toBe('ifttt');
      expect(fetch).toHaveBeenCalledWith(
        'https://maker.ifttt.com/trigger/test_event/with/key/test_key',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('"value1":"Test Title"'),
        })
      );
    });
  });

  describe('sendWebhookNotification', () => {
    it('should send webhook notification successfully', async () => {
      const mockResponse = { ok: true };
      (fetch as any).mockResolvedValue(mockResponse);

      const config = {
        id: 1,
        actor_id: 1,
        notification_type: 'webhook' as const,
        config_data: { webhook_url: 'https://example.com/webhook' },
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const request = {
        actor_id: 1,
        title: 'Test Title',
        message: 'Test Message',
        priority: 'high' as const,
        url: 'https://example.com',
        metadata: { test: true },
      };

      const result = await (notificationService as any).sendWebhookNotification(config, request);

      expect(result.success).toBe(true);
      expect(result.provider).toBe('webhook');
      expect(fetch).toHaveBeenCalledWith(
        'https://example.com/webhook',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('"title":"Test Title"'),
        })
      );
    });
  });

  describe('sendEmailNotification', () => {
    it('should send email notification successfully', async () => {
      const config = {
        id: 1,
        actor_id: 1,
        notification_type: 'email' as const,
        config_data: { email_address: 'test@example.com' },
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const request = {
        actor_id: 1,
        title: 'Test Title',
        message: 'Test Message',
      };

      const result = await (notificationService as any).sendEmailNotification(config, request);

      expect(result.success).toBe(true);
      expect(result.provider).toBe('email');
    });
  });

  describe('mapPriorityToPushover', () => {
    it('should map priorities correctly', () => {
      expect((notificationService as any).mapPriorityToPushover('low')).toBe(-1);
      expect((notificationService as any).mapPriorityToPushover('normal')).toBe(0);
      expect((notificationService as any).mapPriorityToPushover('high')).toBe(1);
      expect((notificationService as any).mapPriorityToPushover('emergency')).toBe(2);
      expect((notificationService as any).mapPriorityToPushover(undefined)).toBe(0);
    });
  });

  describe('buildCompletionMessage', () => {
    it('should build completion message with story details', () => {
      const story = { id: 1, title: 'Test Story' };
      const completionDetails = {
        challenges: 'Some challenges encountered',
        next_steps: 'Next steps to take',
      };

      const message = (notificationService as any).buildCompletionMessage(
        'Developer',
        story,
        'implementation',
        completionDetails
      );

      expect(message).toContain('Developer has completed their work on "Test Story"');
      expect(message).toContain('Some challenges encountered');
      expect(message).toContain('Next steps to take');
    });

    it('should build message without optional details', () => {
      const story = { id: 1, title: 'Test Story' };

      const message = (notificationService as any).buildCompletionMessage(
        'QA',
        story,
        'validation',
        undefined
      );

      expect(message).toBe('QA has completed their work on "Test Story".');
    });
  });
});