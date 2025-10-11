// Auto-updater configuration
export const CONFIG = {
  // API endpoints - Update these with the actual Ethos API endpoints
  API: {
    PROFILES: 'https://api.ethos.network/v1/profiles',
    WEEKLY_XP: 'https://api.ethos.network/v1/weekly-xp',
    // Alternative endpoints if the above don't work:
    // PROFILES: 'https://ethos-api.example.com/profiles',
    // WEEKLY_XP: 'https://ethos-api.example.com/weekly-xp',
  },
  
  // Update intervals (in milliseconds)
  INTERVALS: {
    UPDATE_INTERVAL: 3 * 60 * 60 * 1000, // 3 hours
    BATCH_DELAY: 100, // 100ms delay between API requests
    RETRY_DELAY: 5000, // 5 seconds between retries
  },
  
  // Processing configuration
  PROCESSING: {
    BATCH_SIZE: 100, // Process profiles in batches of 100
    MAX_RETRIES: 3, // Maximum retry attempts for failed requests
    CONCURRENT_REQUESTS: 5, // Maximum concurrent API requests
  },
  
  // Data configuration
  DATA: {
    // Seasons and weeks to fetch
    SEASONS: [
      { id: 0, name: 'Season 0', weeks: [0] }, // Season 0 total
      { id: 1, name: 'Season 1', weeks: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] } // Season 1 with all weeks
    ],
    
    // File paths (relative to project root)
    PROFILES_FILE: 'data/csv/comprehensive_profiles.csv',
    WEEKLY_XP_FILE: 'data/csv/comprehensive_weekly_xp.csv',
    SEASON_WEEKS_FILE: 'data/csv/season_weeks.csv',
    LOG_FILE: 'data/csv/auto-updater.log',
  },
  
  // Logging configuration
  LOGGING: {
    LEVEL: 'INFO', // DEBUG, INFO, WARN, ERROR
    MAX_LOG_SIZE: 10 * 1024 * 1024, // 10MB max log file size
    MAX_LOG_FILES: 5, // Keep 5 log files
  },
  
  // Error handling
  ERROR_HANDLING: {
    CONTINUE_ON_ERROR: true, // Continue processing even if some requests fail
    MAX_CONSECUTIVE_ERRORS: 10, // Stop if too many consecutive errors
    ERROR_COOLDOWN: 30 * 60 * 1000, // 30 minutes cooldown after errors
  }
};

export default CONFIG;
