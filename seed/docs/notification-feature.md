# DevAI Notification Feature

## Overview

The DevAI notification feature allows agents to automatically send notifications to your phone when they complete their work, significantly reducing Human-in-the-Loop (HITL) response times. This feature integrates seamlessly with the existing DevAI workflow system and supports multiple notification providers.

## 🎯 Purpose

- **Reduce HITL Times**: Get immediate notifications when agents complete their work
- **Stay Informed**: Receive real-time updates on story progress and workflow transitions
- **Faster Response**: Respond quickly to completed work without constantly monitoring the system
- **Multiple Channels**: Support for various notification services (Pushover, IFTTT, Webhooks, Email)

## 🏗️ Architecture

### Components

1. **NotificationService**: Core service managing notification sending and configuration
2. **Database Tables**:
   - `notification_configs`: Actor notification settings
   - `notification_logs`: Audit trail of all notification attempts
3. **MCP Tools**: Three new tools for notification management
4. **Workflow Integration**: Automatic notifications at key completion points

### Notification Providers

| Provider     | Use Case                  | Setup Complexity | Features                               |
| ------------ | ------------------------- | ---------------- | -------------------------------------- |
| **Pushover** | Mobile notifications      | Easy             | Rich formatting, priority levels, URLs |
| **IFTTT**    | Custom integrations       | Medium           | Connect to any service, custom actions |
| **Webhook**  | Custom systems            | Medium           | Full control, custom payloads          |
| **Email**    | Traditional notifications | Easy             | Universal compatibility                |

## 🚀 Quick Start

### 1. Configure Notification Settings

First, configure notification settings for an actor (persona):

```javascript
// Configure Pushover notifications
await devai_configure_notification({
  actorId: 1, // Your actor ID
  notificationType: 'pushover',
  configData: {
    user_key: 'your_pushover_user_key',
    app_token: 'your_pushover_app_token',
  },
});

// Configure IFTTT notifications
await devai_configure_notification({
  actorId: 1,
  notificationType: 'ifttt',
  configData: {
    webhook_key: 'your_ifttt_webhook_key',
    event_name: 'devai_notification',
  },
});
```

### 2. Test Your Configuration

```javascript
// Test Pushover configuration
await devai_test_notification({
  actorId: 1,
  notificationType: 'pushover',
});
```

### 3. Automatic Notifications

Once configured, notifications are automatically sent when agents complete their work:

- **Scrum Master**: When story draft is completed
- **Developer**: When implementation is completed
- **QA**: When validation is completed (approval or rejection)
- **Developer**: When defect fixes are completed

## 📱 Notification Providers Setup

### Pushover (Recommended)

1. **Install Pushover**: Download from [pushover.net](https://pushover.net)
2. **Create Account**: Sign up and get your user key
3. **Create App**: Create a new app to get your app token
4. **Configure DevAI**:

```javascript
await devai_configure_notification({
  actorId: 1,
  notificationType: 'pushover',
  configData: {
    user_key: 'uQiRzpo4DXghDmr9QzzfQu27cmVRsG',
    app_token: 'azGDORePK8gMaC0QOYAMyEEuzJnyUi',
  },
});
```

### IFTTT (If This Then That)

1. **Create IFTTT Account**: Sign up at [ifttt.com](https://ifttt.com)
2. **Create Webhook Applet**:
   - Trigger: Webhook (receive a web request)
   - Action: Choose your preferred notification method
3. **Get Webhook Key**: Copy the webhook key from your applet
4. **Configure DevAI**:

```javascript
await devai_configure_notification({
  actorId: 1,
  notificationType: 'ifttt',
  configData: {
    webhook_key: 'your_webhook_key_here',
    event_name: 'devai_notification',
  },
});
```

### Custom Webhook

1. **Set up Webhook Endpoint**: Create an endpoint that accepts POST requests
2. **Configure DevAI**:

```javascript
await devai_configure_notification({
  actorId: 1,
  notificationType: 'webhook',
  configData: {
    webhook_url: 'https://your-domain.com/webhook',
    headers: {
      Authorization: 'Bearer your_token_here',
    },
  },
});
```

### Email (Basic)

```javascript
await devai_configure_notification({
  actorId: 1,
  notificationType: 'email',
  configData: {
    email_address: 'your-email@example.com',
  },
});
```

## 🔧 MCP Tools Reference

### `devai_notify_completion`

Send a manual notification when an agent completes their work.

```javascript
await devai_notify_completion({
  actorId: 1,
  actorRole: 'Developer',
  storyId: 123,
  jobType: 'implementation',
  completionDetails: {
    challenges: 'Had to refactor the authentication module',
    nextSteps: 'Ready for QA validation',
    url: 'https://github.com/your-repo/pull/456',
    confidence: 0.95,
  },
});
```

**Parameters:**

- `actorId` (number): Actor ID who completed the work
- `actorRole` (string): Role of the actor (e.g., "Scrum Master", "Developer", "QA")
- `storyId` (number): Story ID that was worked on
- `jobType` (string): Type of job completed (e.g., "story_draft", "implementation", "validation")
- `completionDetails` (object, optional): Additional details about the completion

### `devai_configure_notification`

Configure notification settings for an actor.

```javascript
await devai_configure_notification({
  actorId: 1,
  notificationType: 'pushover',
  configData: {
    user_key: 'your_user_key',
    app_token: 'your_app_token',
  },
});
```

**Parameters:**

- `actorId` (number): Actor ID to configure notifications for
- `notificationType` (string): Type of notification service ("pushover", "ifttt", "webhook", "email")
- `configData` (object): Configuration data for the notification service

### `devai_test_notification`

Test notification configuration for an actor.

```javascript
await devai_test_notification({
  actorId: 1,
  notificationType: 'pushover',
});
```

**Parameters:**

- `actorId` (number): Actor ID to test notifications for
- `notificationType` (string): Type of notification to test

## 🔄 Workflow Integration

The notification feature is automatically integrated into the DevAI workflow system. Notifications are sent at these key points:

### Story Development Flow

1. **SM Draft Complete** → Notification sent to SM
2. **Dev Implementation Complete** → Notification sent to Dev
3. **QA Validation Complete** → Notification sent to QA
   - **Approval**: "Story approved and auto-pushed to repository"
   - **Rejection**: "Defect created and fix story assigned to Developer"
4. **Dev Defect Fix Complete** → Notification sent to Dev

### Notification Content

Each notification includes:

- **Title**: Role and action (e.g., "Developer Work Complete")
- **Message**: Story details and completion status
- **Challenges**: Any issues encountered during the work
- **Next Steps**: What happens next in the workflow
- **Confidence**: Agent's confidence level in the completion
- **URL**: Link to view the completed work (if available)

## 📊 Notification Logs

All notification attempts are logged in the `notification_logs` table for audit purposes:

```sql
SELECT
  actor_id,
  title,
  message,
  results,
  created_at
FROM notification_logs
ORDER BY created_at DESC
LIMIT 10;
```

## 🛠️ Advanced Configuration

### Multiple Notification Providers

You can configure multiple notification providers for the same actor:

```javascript
// Configure multiple providers
await devai_configure_notification({
  actorId: 1,
  notificationType: 'pushover',
  configData: {
    /* pushover config */
  },
});

await devai_configure_notification({
  actorId: 1,
  notificationType: 'ifttt',
  configData: {
    /* ifttt config */
  },
});

await devai_configure_notification({
  actorId: 1,
  notificationType: 'webhook',
  configData: {
    /* webhook config */
  },
});
```

### Priority Levels

Notifications support different priority levels:

- **low**: Quiet notifications
- **normal**: Standard notifications (default)
- **high**: Urgent notifications
- **emergency**: Critical notifications

### Custom Message Formatting

The notification service automatically formats messages based on the completion context:

```javascript
// Example notification message
"Developer has completed their work on 'User Authentication Feature'.

Challenges encountered: Had to refactor the authentication module for better security

Next steps: Ready for QA validation"
```

## 🔍 Troubleshooting

### Common Issues

1. **No notifications received**:
   - Check notification configuration with `devai_test_notification`
   - Verify provider credentials
   - Check notification logs in database

2. **Pushover errors**:
   - Verify user_key and app_token
   - Check Pushover app settings
   - Ensure device is registered

3. **IFTTT not working**:
   - Verify webhook key and event name
   - Check IFTTT applet status
   - Test webhook manually

4. **Webhook failures**:
   - Verify webhook URL is accessible
   - Check authentication headers
   - Review webhook server logs

### Debug Mode

Enable debug logging to troubleshoot notification issues:

```javascript
// Check notification logs
const logs = await query(
  `
  SELECT * FROM notification_logs 
  WHERE actor_id = $1 
  ORDER BY created_at DESC 
  LIMIT 5
`,
  [actorId]
);

console.log('Recent notification logs:', logs);
```

## 🎯 Best Practices

1. **Start Simple**: Begin with Pushover for easy setup
2. **Test First**: Always test configuration before relying on notifications
3. **Multiple Providers**: Use multiple providers for redundancy
4. **Monitor Logs**: Regularly check notification logs for issues
5. **Update Configs**: Keep notification configurations up to date

## 🚀 Future Enhancements

Planned improvements for the notification feature:

- **SMS Notifications**: Direct SMS support
- **Slack Integration**: Team chat notifications
- **Custom Templates**: User-defined message templates
- **Notification Scheduling**: Time-based notification rules
- **Escalation Rules**: Automatic escalation for urgent matters
- **Notification Preferences**: Per-actor notification preferences

---

**DevAI Notification Feature** - Reduce HITL times and stay informed with real-time agent completion notifications.
