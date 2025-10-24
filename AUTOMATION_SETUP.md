# 🤖 Ethos Data Automation Setup Guide

This guide will help you set up automatic week detection and N8N automation for your Ethos data system.

## 🎯 Overview

The system now includes:
- **Automatic Week Detection**: Dynamically detects the current week based on `season_weeks.csv`
- **N8N Webhook Integration**: External automation support
- **Enhanced Vercel Cron**: More frequent updates (every 6 hours)
- **Smart Fallbacks**: Graceful handling when auto-detection fails

## 🔧 Setup Instructions

### 1. Automatic Week Detection

The system now automatically detects the current week! No more manual updates needed.

**How it works:**
- Reads `data/csv/season_weeks.csv` to determine current week
- Falls back to Week 18 if CSV is unavailable
- Updates frontend automatically on page load

**API Endpoints:**
- `GET /api/current-week` - Get current week info
- `GET /api/current-week?includeWeeks=true` - Include available weeks
- `GET /api/current-week?includeSeasons=true` - Include available seasons

### 2. N8N Automation Setup

#### Option A: Use the Provided Workflow

1. **Import the workflow:**
   - Copy `n8n-workflow.json` content
   - Import into your N8N instance
   - Update the webhook URL to your Vercel app

2. **Configure webhook URL:**
   ```json
   "url": "https://your-vercel-app.vercel.app/api/webhook/n8n-update"
   ```

3. **Set up notifications:**
   - Configure Slack/Discord/Email nodes
   - Update notification messages as needed

#### Option B: Create Custom N8N Workflow

1. **Create a new workflow in N8N**
2. **Add a Cron Trigger:**
   - Schedule: `0 */6 * * *` (every 6 hours)
   - Or `0 2,8,14,20 * * *` (4 times daily)

3. **Add HTTP Request node:**
   - Method: GET or POST
   - URL: `https://your-vercel-app.vercel.app/api/webhook/n8n-update`
   - Timeout: 600 seconds

4. **Add conditional logic:**
   - Check if `{{ $json.success }}` is true
   - Send success/error notifications

5. **Add notification nodes:**
   - Slack, Discord, Email, or Webhook
   - Include relevant data from the response

### 3. Vercel Cron Job (Backup)

The Vercel cron job runs every 6 hours as a backup:

```json
{
  "crons": [
    {
      "path": "/api/cron/update-data",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

### 4. Environment Variables

Add these to your Vercel environment variables:

```bash
# Optional: N8N webhook authentication
N8N_WEBHOOK_SECRET=your-secret-token

# Optional: Notification webhooks
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

## 🚀 Testing the Automation

### Test Week Detection

```bash
# Test current week detection
curl "https://your-vercel-app.vercel.app/api/current-week"

# Expected response:
{
  "current": {
    "season": 1,
    "week": 18,
    "isCurrent": true
  },
  "timestamp": "2025-10-24T06:00:00.000Z",
  "source": "automatic_detection"
}
```

### Test N8N Webhook

```bash
# Test the webhook endpoint
curl -X POST "https://your-vercel-app.vercel.app/api/webhook/n8n-update"

# Expected response:
{
  "success": true,
  "message": "Data update completed successfully via N8N webhook",
  "duration": "45.2s",
  "timestamp": "2025-10-24T06:00:00.000Z"
}
```

### Test Frontend Auto-Detection

1. Open your distribution page
2. Check browser console for:
   ```
   [Distribution] 🔍 Auto-detecting current week...
   [Distribution] ✅ Auto-detected: Season 1, Week 18
   ```

## 📊 Monitoring

### Check Automation Status

1. **Vercel Dashboard:**
   - Go to Functions tab
   - Check cron job execution logs
   - Monitor webhook endpoint calls

2. **N8N Dashboard:**
   - View workflow execution history
   - Check for failed executions
   - Monitor notification delivery

3. **Application Logs:**
   - Check Vercel function logs
   - Look for success/error messages
   - Monitor data update timestamps

### Troubleshooting

**Week Detection Issues:**
- Ensure `data/csv/season_weeks.csv` exists and is up-to-date
- Check that date ranges in CSV are correct
- Verify fallback week (18) is appropriate

**N8N Webhook Issues:**
- Verify webhook URL is correct
- Check N8N workflow is active
- Ensure timeout settings are adequate (600s)

**Vercel Cron Issues:**
- Check Vercel cron job is enabled
- Verify function timeout settings
- Monitor execution logs for errors

## 🔄 Maintenance

### Updating Week Data

When new weeks are added:

1. **Update `season_weeks.csv`:**
   ```csv
   season_id,week,start_date,end_date,created_at
   1,19,2025-10-24T07:49:37.085Z,2025-10-31T07:49:37.085Z,2025-10-24T06:00:00.000Z
   ```

2. **The system will automatically:**
   - Detect the new week
   - Update frontend defaults
   - Include in available weeks list

### Scaling the System

For high-frequency updates:

1. **Reduce N8N schedule:**
   - Change to `0 */2 * * *` (every 2 hours)
   - Or `0 * * * *` (every hour)

2. **Add rate limiting:**
   - Implement request throttling
   - Add authentication tokens
   - Monitor API usage

3. **Add redundancy:**
   - Multiple N8N instances
   - Backup webhook endpoints
   - Health check monitoring

## 🎉 Benefits

✅ **No More Manual Updates**: Week detection is fully automatic
✅ **Flexible Automation**: Use N8N, Vercel Cron, or both
✅ **Smart Fallbacks**: System works even if auto-detection fails
✅ **Real-time Notifications**: Get notified of success/failures
✅ **Easy Monitoring**: Clear logs and status indicators
✅ **Future-Proof**: Automatically handles new weeks

Your Ethos data system is now fully automated! 🚀
