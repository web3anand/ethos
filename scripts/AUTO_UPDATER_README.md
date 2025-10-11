# Ethos Auto-Updater

This script automatically updates all profiles and weekly XP data from the Ethos API every 3 hours and saves the data to CSV files.

## Features

- **Automatic Updates**: Runs every 3 hours to fetch the latest data
- **Profile Management**: Updates existing profiles and adds new ones
- **Weekly XP Data**: Fetches weekly XP data for all seasons and weeks
- **Error Handling**: Retries failed requests and continues on errors
- **Logging**: Comprehensive logging to track updates and errors
- **Graceful Shutdown**: Handles SIGINT and SIGTERM signals properly

## Usage

### Start Auto-Updater

```bash
# Run once (for testing)
npm run auto-update

# Run in background (Linux/Mac)
npm run auto-update:start

# Stop auto-updater
npm run auto-update:stop

# Or use the Windows batch file
scripts/start-auto-updater.bat
```

### Manual Update

```bash
# Run a single update cycle
node scripts/auto-updater.js
```

## Configuration

Edit `scripts/auto-updater.config.js` to customize:

- **API Endpoints**: Update the API URLs if they change
- **Update Interval**: Change from 3 hours to any interval
- **Batch Size**: Adjust how many profiles to fetch per request
- **Seasons/Weeks**: Add new seasons or weeks to track
- **File Paths**: Change where CSV files are saved

## Data Files

The auto-updater creates/updates these files:

- `data/csv/comprehensive_profiles.csv` - All user profiles
- `data/csv/comprehensive_weekly_xp.csv` - Weekly XP data
- `data/csv/season_weeks.csv` - Season and week definitions
- `data/csv/auto-updater.log` - Update logs

## Logging

The auto-updater logs all activities to:
- Console output
- `data/csv/auto-updater.log` file

Log levels: DEBUG, INFO, WARN, ERROR

## Error Handling

- **Retry Logic**: Failed requests are retried up to 3 times
- **Continue on Error**: Processing continues even if some requests fail
- **Error Cooldown**: 30-minute pause after too many consecutive errors
- **Graceful Shutdown**: Properly handles interruption signals

## Monitoring

Check the log file to monitor:
- Update frequency and success
- Number of profiles/records processed
- Any errors or issues
- Performance metrics

## API Requirements

The script expects these API endpoints:

- `GET /v1/profiles?offset={offset}&limit={limit}` - Fetch profiles
- `GET /v1/weekly-xp?season={season}&week={week}&limit={limit}` - Fetch weekly XP

## Troubleshooting

### Common Issues

1. **API Endpoints Not Working**
   - Update the API URLs in `auto-updater.config.js`
   - Check if the API requires authentication

2. **Permission Errors**
   - Ensure the script has write permissions to the `data/csv/` directory
   - Run with appropriate user permissions

3. **Memory Issues**
   - Reduce `BATCH_SIZE` in the config
   - Increase `BATCH_DELAY` to slow down requests

4. **Network Issues**
   - Increase `RETRY_DELAY` and `MAX_RETRIES`
   - Check network connectivity

### Log Analysis

```bash
# View recent logs
tail -f data/csv/auto-updater.log

# Search for errors
grep ERROR data/csv/auto-updater.log

# Check update frequency
grep "Update completed" data/csv/auto-updater.log
```

## Development

To modify the auto-updater:

1. Edit `scripts/auto-updater.js` for main logic
2. Edit `scripts/auto-updater.config.js` for configuration
3. Test with `npm run auto-update`
4. Deploy with `npm run auto-update:start`

## Support

For issues or questions:
1. Check the log file for error messages
2. Verify API endpoints are accessible
3. Ensure proper file permissions
4. Review configuration settings
