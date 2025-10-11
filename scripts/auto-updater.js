import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  // API endpoints (using local APIs that are already working)
  PROFILES_API: 'http://localhost:3000/api/comprehensive-profiles',
  WEEKLY_XP_API: 'http://localhost:3000/api/csv-weekly-xp',
  
  // File paths
  DATA_DIR: path.join(__dirname, '..', 'data', 'csv'),
  PROFILES_FILE: 'comprehensive_profiles.csv',
  WEEKLY_XP_FILE: 'comprehensive_weekly_xp.csv',
  SEASON_WEEKS_FILE: 'season_weeks.csv',
  LOG_FILE: 'auto-updater.log',
  
  // Update intervals (in milliseconds)
  UPDATE_INTERVAL: 3 * 60 * 60 * 1000, // 3 hours
  BATCH_SIZE: 100, // Process profiles in batches
  
  // Retry configuration
  MAX_RETRIES: 3,
  RETRY_DELAY: 5000, // 5 seconds
};

class AutoUpdater {
  constructor() {
    this.isRunning = false;
    this.lastUpdate = null;
    this.stats = {
      profilesUpdated: 0,
      profilesCreated: 0,
      weeklyRecordsUpdated: 0,
      weeklyRecordsCreated: 0,
      errors: 0,
      lastRun: null
    };
    
    this.log('Auto-updater initialized');
  }

  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}`;
    
    console.log(logMessage);
    
    // Write to log file
    try {
      fs.appendFileSync(path.join(CONFIG.DATA_DIR, CONFIG.LOG_FILE), logMessage + '\n');
    } catch (error) {
      console.error('Failed to write to log file:', error.message);
    }
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async fetchWithRetry(url, options = {}, retries = CONFIG.MAX_RETRIES) {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            'User-Agent': 'Ethos-AutoUpdater/1.0',
            'Accept': 'application/json',
            ...options.headers
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
      } catch (error) {
        this.log(`Attempt ${i + 1} failed for ${url}: ${error.message}`, 'WARN');
        
        if (i === retries - 1) {
          throw error;
        }
        
        await this.sleep(CONFIG.RETRY_DELAY * (i + 1));
      }
    }
  }

  async fetchAllProfiles() {
    this.log('Fetching all profiles from API...');
    
    const allProfiles = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      try {
        this.log(`Fetching profiles batch: offset=${offset}, limit=${CONFIG.BATCH_SIZE}`);
        
        const response = await this.fetchWithRetry(`${CONFIG.PROFILES_API}?offset=${offset}&limit=${CONFIG.BATCH_SIZE}`);
        
        if (!response.profiles || !Array.isArray(response.profiles)) {
          throw new Error('Invalid response format: missing profiles array');
        }

        allProfiles.push(...response.profiles);
        
        this.log(`Fetched ${response.profiles.length} profiles (total: ${allProfiles.length})`);
        
        // Check if we have more data
        hasMore = response.profiles.length === CONFIG.BATCH_SIZE;
        offset += CONFIG.BATCH_SIZE;
        
        // Small delay between requests to be respectful
        await this.sleep(100);
        
      } catch (error) {
        this.log(`Error fetching profiles at offset ${offset}: ${error.message}`, 'ERROR');
        this.stats.errors++;
        break;
      }
    }

    this.log(`Total profiles fetched: ${allProfiles.length}`);
    return allProfiles;
  }

  async fetchWeeklyXpData(seasonId, week) {
    this.log(`Fetching weekly XP data for Season ${seasonId}, Week ${week}...`);
    
    try {
      const response = await this.fetchWithRetry(`${CONFIG.WEEKLY_XP_API}?season=${seasonId}&week=${week}&limit=10000`);
      
      if (!response.profiles || !Array.isArray(response.profiles)) {
        throw new Error('Invalid response format: missing profiles array');
      }

      this.log(`Fetched ${response.profiles.length} weekly XP records for Season ${seasonId}, Week ${week}`);
      return response.profiles;
    } catch (error) {
      this.log(`Error fetching weekly XP data for Season ${seasonId}, Week ${week}: ${error.message}`, 'ERROR');
      this.stats.errors++;
      return [];
    }
  }

  async fetchAllWeeklyXpData() {
    this.log('Fetching all weekly XP data...');
    
    const allWeeklyData = [];
    
    // Define seasons and weeks to fetch
    const seasons = [
      { id: 0, name: 'Season 0', weeks: [0] }, // Season 0 total
      { id: 1, name: 'Season 1', weeks: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] } // Season 1 with all weeks
    ];

    for (const season of seasons) {
      for (const week of season.weeks) {
        const weeklyData = await this.fetchWeeklyXpData(season.id, week);
        
        // Add season and week info to each record
        const enrichedData = weeklyData.map(record => ({
          ...record,
          season_id: season.id,
          week: week,
          season_name: season.name
        }));
        
        allWeeklyData.push(...enrichedData);
        
        // Small delay between requests
        await this.sleep(100);
      }
    }

    this.log(`Total weekly XP records fetched: ${allWeeklyData.length}`);
    return allWeeklyData;
  }

  parseCsv(content) {
    const lines = content.trim().split('\n');
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',');
    return lines.slice(1).map(line => {
      const values = line.split(',');
      const obj = {};
      headers.forEach((header, index) => {
        obj[header.trim()] = values[index]?.trim() || '';
      });
      return obj;
    });
  }

  arrayToCsv(data, headers) {
    if (data.length === 0) return headers.join(',') + '\n';
    
    const csvLines = [headers.join(',')];
    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header] || '';
        // Escape commas and quotes in values
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      csvLines.push(values.join(','));
    });
    
    return csvLines.join('\n') + '\n';
  }

  async loadExistingData() {
    const profilesFile = path.join(CONFIG.DATA_DIR, CONFIG.PROFILES_FILE);
    const weeklyXpFile = path.join(CONFIG.DATA_DIR, CONFIG.WEEKLY_XP_FILE);
    
    let existingProfiles = [];
    let existingWeeklyXp = [];
    
    try {
      if (fs.existsSync(profilesFile)) {
        const content = fs.readFileSync(profilesFile, 'utf8');
        existingProfiles = this.parseCsv(content);
        this.log(`Loaded ${existingProfiles.length} existing profiles`);
      }
    } catch (error) {
      this.log(`Error loading existing profiles: ${error.message}`, 'WARN');
    }
    
    try {
      if (fs.existsSync(weeklyXpFile)) {
        const content = fs.readFileSync(weeklyXpFile, 'utf8');
        existingWeeklyXp = this.parseCsv(content);
        this.log(`Loaded ${existingWeeklyXp.length} existing weekly XP records`);
      }
    } catch (error) {
      this.log(`Error loading existing weekly XP data: ${error.message}`, 'WARN');
    }
    
    return { existingProfiles, existingWeeklyXp };
  }

  mergeProfilesData(existingProfiles, newProfiles) {
    const profileMap = new Map();
    
    // Add existing profiles to map
    existingProfiles.forEach(profile => {
      const key = profile.profile_id || profile.id;
      if (key) {
        profileMap.set(key, profile);
      }
    });
    
    // Merge new profiles
    newProfiles.forEach(profile => {
      const key = profile.profile_id || profile.id;
      if (key) {
        const existing = profileMap.get(key);
        if (existing) {
          // Update existing profile with new data
          Object.assign(existing, profile);
          this.stats.profilesUpdated++;
        } else {
          // Add new profile
          profileMap.set(key, profile);
          this.stats.profilesCreated++;
        }
      }
    });
    
    return Array.from(profileMap.values());
  }

  mergeWeeklyXpData(existingWeeklyXp, newWeeklyXp) {
    const weeklyMap = new Map();
    
    // Add existing weekly data to map
    existingWeeklyXp.forEach(record => {
      const key = `${record.profile_id}_${record.season_id}_${record.week}`;
      weeklyMap.set(key, record);
    });
    
    // Merge new weekly data
    newWeeklyXp.forEach(record => {
      const key = `${record.profile_id}_${record.season_id}_${record.week}`;
      const existing = weeklyMap.get(key);
      if (existing) {
        // Update existing record
        Object.assign(existing, record);
        this.stats.weeklyRecordsUpdated++;
      } else {
        // Add new record
        weeklyMap.set(key, record);
        this.stats.weeklyRecordsCreated++;
      }
    });
    
    return Array.from(weeklyMap.values());
  }

  async saveData(profiles, weeklyXp) {
    try {
      // Ensure data directory exists
      if (!fs.existsSync(CONFIG.DATA_DIR)) {
        fs.mkdirSync(CONFIG.DATA_DIR, { recursive: true });
      }
      
      // Save profiles
      const profilesHeaders = [
        'profile_id', 'userkey', 'username', 'display_name', 'avatar_url', 'description',
        'score', 'streak_days', 'total_xp', 'is_validator', 'season_0_xp', 'season_1_xp',
        'season_0_weeks', 'season_1_weeks', 'status', 'userkeys_count', 'eth_addresses',
        'created_at', 'last_updated'
      ];
      
      const profilesCsv = this.arrayToCsv(profiles, profilesHeaders);
      fs.writeFileSync(path.join(CONFIG.DATA_DIR, CONFIG.PROFILES_FILE), profilesCsv);
      this.log(`Saved ${profiles.length} profiles to ${CONFIG.PROFILES_FILE}`);
      
      // Save weekly XP data
      const weeklyHeaders = [
        'profile_id', 'username', 'display_name', 'avatar_url', 'season_id', 'week',
        'weekly_xp', 'cumulative_xp', 'total_xp', 'rank', 'created_at'
      ];
      
      const weeklyCsv = this.arrayToCsv(weeklyXp, weeklyHeaders);
      fs.writeFileSync(path.join(CONFIG.DATA_DIR, CONFIG.WEEKLY_XP_FILE), weeklyCsv);
      this.log(`Saved ${weeklyXp.length} weekly XP records to ${CONFIG.WEEKLY_XP_FILE}`);
      
      // Update season weeks data
      const seasonWeeks = [
        { season_id: 0, season_name: 'Season 0', week: 0 },
        { season_id: 1, season_name: 'Season 1', week: 0 },
        { season_id: 1, season_name: 'Season 1', week: 1 },
        { season_id: 1, season_name: 'Season 1', week: 2 },
        { season_id: 1, season_name: 'Season 1', week: 3 },
        { season_id: 1, season_name: 'Season 1', week: 4 },
        { season_id: 1, season_name: 'Season 1', week: 5 },
        { season_id: 1, season_name: 'Season 1', week: 6 },
        { season_id: 1, season_name: 'Season 1', week: 7 },
        { season_id: 1, season_name: 'Season 1', week: 8 },
        { season_id: 1, season_name: 'Season 1', week: 9 },
        { season_id: 1, season_name: 'Season 1', week: 10 },
        { season_id: 1, season_name: 'Season 1', week: 11 },
        { season_id: 1, season_name: 'Season 1', week: 12 },
        { season_id: 1, season_name: 'Season 1', week: 13 }
      ];
      
      const seasonWeeksCsv = this.arrayToCsv(seasonWeeks, ['season_id', 'season_name', 'week']);
      fs.writeFileSync(path.join(CONFIG.DATA_DIR, CONFIG.SEASON_WEEKS_FILE), seasonWeeksCsv);
      this.log(`Updated season weeks data`);
      
    } catch (error) {
      this.log(`Error saving data: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  async performUpdate() {
    if (this.isRunning) {
      this.log('Update already in progress, skipping...', 'WARN');
      return;
    }

    this.isRunning = true;
    this.stats.lastRun = new Date().toISOString();
    
    try {
      this.log('Starting auto-update...');
      
      // Load existing data
      const { existingProfiles, existingWeeklyXp } = await this.loadExistingData();
      
      // Fetch new data from APIs
      const [newProfiles, newWeeklyXp] = await Promise.all([
        this.fetchAllProfiles(),
        this.fetchAllWeeklyXpData()
      ]);
      
      // Merge data
      const mergedProfiles = this.mergeProfilesData(existingProfiles, newProfiles);
      const mergedWeeklyXp = this.mergeWeeklyXpData(existingWeeklyXp, newWeeklyXp);
      
      // Save updated data
      await this.saveData(mergedProfiles, mergedWeeklyXp);
      
      // Log statistics
      this.log(`Update completed successfully:`);
      this.log(`  - Profiles: ${this.stats.profilesCreated} created, ${this.stats.profilesUpdated} updated`);
      this.log(`  - Weekly XP: ${this.stats.weeklyRecordsCreated} created, ${this.stats.weeklyRecordsUpdated} updated`);
      this.log(`  - Errors: ${this.stats.errors}`);
      
      this.lastUpdate = new Date();
      
    } catch (error) {
      this.log(`Update failed: ${error.message}`, 'ERROR');
      this.stats.errors++;
    } finally {
      this.isRunning = false;
    }
  }

  start() {
    this.log('Starting auto-updater...');
    
    // Perform initial update
    this.performUpdate();
    
    // Set up interval for regular updates
    setInterval(() => {
      this.performUpdate();
    }, CONFIG.UPDATE_INTERVAL);
    
    this.log(`Auto-updater started. Updates every ${CONFIG.UPDATE_INTERVAL / 1000 / 60} minutes`);
  }

  stop() {
    this.log('Stopping auto-updater...');
    process.exit(0);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nReceived SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nReceived SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Start the auto-updater
const updater = new AutoUpdater();
updater.start();

export default AutoUpdater;
