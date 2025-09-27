# Data Update System

This document describes the automatic and manual data update system for the Ethos Dashboard.

## Overview

The system provides two ways to keep data current:

1. **Manual Update Button** - Users can trigger data updates from the UI
2. **Automatic 24-hour Updates** - Vercel Cron jobs fetch fresh data daily

## Manual Update System

### Components

- **`DataUpdateButton.jsx`** - UI component with progress tracking
- **`/api/trigger-comprehensive-fetch`** - Starts the data fetch process
- **`/api/fetch-status`** - Monitors fetch progress
- **`/api/clear-all-cache`** - Clears API caches after update

### How it Works

1. User clicks "Update Data" button
2. System triggers comprehensive fetch script
3. Progress is tracked and displayed
4. Caches are cleared automatically
5. UI refreshes with new data

## Automatic Update System

### Vercel Cron Configuration

The system uses Vercel Cron to automatically update data every 24 hours:

```json
{
  "crons": [
    {
      "path": "/api/cron/update-data",
      "schedule": "0 2 * * *"  // Daily at 2 AM UTC
    }
  ]
}
```

### Environment Variables

Set these environment variables in Vercel:

```bash
CRON_SECRET=your-secure-random-string
```

### How it Works

1. Vercel triggers `/api/cron/update-data` daily at 2 AM UTC
2. System runs comprehensive fetch script
3. Data is saved to CSV files
4. API caches are cleared
5. New data is immediately available

## Comprehensive Fetch Script

### Enhanced Features

The `scripts/comprehensive-ethos-fetch.js` script has been enhanced to:

- **Handle new fields** automatically
- **Support future API changes** gracefully
- **Include additional profile data**:
  - `is_validator` - Validator status
  - `last_active` - Last activity timestamp
  - `join_date` - Account creation date
  - `social_links` - Social media links (JSON)
  - `badges` - User badges (JSON)
  - `achievements` - User achievements (JSON)

### Data Structure

The script fetches:
- **26,000+ user profiles** with comprehensive data
- **440,000+ weekly XP records** across all seasons
- **Season metadata** and week definitions
- **Real-time data** directly from Ethos API

## API Endpoints

### Manual Update
- `POST /api/trigger-comprehensive-fetch` - Start data fetch
- `GET /api/fetch-status` - Check fetch status
- `POST /api/clear-all-cache` - Clear all caches

### Automatic Update
- `POST /api/cron/update-data` - Scheduled data update

## Monitoring

### Logs
- All operations are logged to console
- Vercel provides detailed logs for cron jobs
- Error handling with detailed error messages

### Status Tracking
- Real-time progress updates
- Completion notifications
- Error reporting and recovery

## Deployment

### Vercel Setup

1. **Set Environment Variables**:
   ```bash
   vercel env add CRON_SECRET
   # Enter a secure random string
   ```

2. **Deploy**:
   ```bash
   vercel --prod
   ```

3. **Verify Cron Job**:
   - Check Vercel dashboard for cron job status
   - Monitor logs for successful updates

### Local Development

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Set Environment Variables**:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your values
   ```

3. **Run Development Server**:
   ```bash
   npm run dev
   ```

## Troubleshooting

### Common Issues

1. **Cron Job Fails**:
   - Check Vercel logs
   - Verify `CRON_SECRET` is set
   - Ensure API endpoints are accessible

2. **Manual Update Hangs**:
   - Check network connectivity
   - Verify API endpoints are responding
   - Check browser console for errors

3. **Data Not Updating**:
   - Clear browser cache
   - Check API cache status
   - Verify CSV files are being updated

### Debug Commands

```bash
# Check fetch status
curl http://localhost:3000/api/fetch-status

# Clear all caches
curl -X POST http://localhost:3000/api/clear-all-cache

# Trigger manual update
curl -X POST http://localhost:3000/api/trigger-comprehensive-fetch
```

## Security

- **Cron Secret**: Protects scheduled updates from unauthorized access
- **Rate Limiting**: Prevents API abuse
- **Error Handling**: Graceful failure without exposing sensitive data
- **Logging**: Comprehensive logging for debugging and monitoring

## Performance

- **Caching**: 30-minute cache for profiles, 5-minute for weekly data
- **Batch Processing**: Processes 500 profiles per batch
- **Concurrency**: 10 concurrent requests with delays
- **Timeout Handling**: 10-minute timeout for cron jobs
- **Memory Management**: Efficient data structures and cleanup
