#!/usr/bin/env tsx

/**
 * DevAI Notification Feature Example
 *
 * This example demonstrates how to configure and use the notification feature
 * to receive notifications when agents complete their work.
 */

import { NotificationService } from '../lib/notification-service';

async function notificationExample() {
  console.log('🚀 DevAI Notification Feature Example\n');

  const notificationService = NotificationService.getInstance();

  // Example 1: Configure Pushover notifications
  console.log('1. Configuring Pushover notifications...');
  try {
    const pushoverConfig = await notificationService.configureNotification(
      1, // actorId
      'pushover',
      {
        user_key: 'your_pushover_user_key_here',
        app_token: 'your_pushover_app_token_here',
      }
    );
    console.log('✅ Pushover configured:', pushoverConfig.notification_type);
  } catch (error) {
    console.log('❌ Pushover configuration failed:', (error as Error).message);
  }

  // Example 2: Configure IFTTT notifications
  console.log('\n2. Configuring IFTTT notifications...');
  try {
    const iftttConfig = await notificationService.configureNotification(
      1, // actorId
      'ifttt',
      {
        webhook_key: 'your_ifttt_webhook_key_here',
        event_name: 'devai_notification',
      }
    );
    console.log('✅ IFTTT configured:', iftttConfig.notification_type);
  } catch (error) {
    console.log('❌ IFTTT configuration failed:', (error as Error).message);
  }

  // Example 3: Configure webhook notifications
  console.log('\n3. Configuring webhook notifications...');
  try {
    const webhookConfig = await notificationService.configureNotification(
      1, // actorId
      'webhook',
      {
        webhook_url: 'https://your-domain.com/webhook',
        headers: {
          Authorization: 'Bearer your_token_here',
        },
      }
    );
    console.log('✅ Webhook configured:', webhookConfig.notification_type);
  } catch (error) {
    console.log('❌ Webhook configuration failed:', (error as Error).message);
  }

  // Example 4: Test notification configuration
  console.log('\n4. Testing notification configuration...');
  try {
    const testResult = await notificationService.testNotification(1, 'pushover');
    console.log('✅ Test notification sent:', testResult.provider);
  } catch (error) {
    console.log('❌ Test notification failed:', (error as Error).message);
  }

  // Example 5: Send manual completion notification
  console.log('\n5. Sending manual completion notification...');
  try {
    const results = await notificationService.notifyAgentCompletion(
      1, // actorId
      'Developer', // actorRole
      123, // storyId
      'implementation', // jobType
      {
        challenges: 'Had to refactor the authentication module for better security',
        next_steps: 'Ready for QA validation and testing',
        url: 'https://github.com/your-repo/pull/456',
        confidence: 0.95,
      }
    );
    console.log('✅ Manual notification sent to', results.length, 'providers');
    results.forEach((result: any) => {
      console.log(`   - ${result.provider}: ${result.success ? '✅' : '❌'} ${result.error || ''}`);
    });
  } catch (error) {
    console.log('❌ Manual notification failed:', (error as Error).message);
  }

  // Example 6: Get notification configurations
  console.log('\n6. Getting notification configurations...');
  try {
    const configs = await notificationService.getActorNotificationConfigs(1);
    console.log('✅ Found', configs.length, 'notification configurations:');
    configs.forEach((config: any) => {
      console.log(`   - ${config.notification_type}: ${config.is_active ? 'Active' : 'Inactive'}`);
    });
  } catch (error) {
    console.log('❌ Failed to get configurations:', (error as Error).message);
  }

  console.log('\n🎉 Notification feature example completed!');
  console.log('\n📱 To receive notifications:');
  console.log('   1. Install Pushover app on your phone');
  console.log('   2. Create an account at pushover.net');
  console.log('   3. Get your user key and app token');
  console.log('   4. Update the configuration above with your real credentials');
  console.log('   5. Run this example again');
}

// Run the example
if (import.meta.url === `file://${process.argv[1]}`) {
  notificationExample().catch(console.error);
}

export { notificationExample };
