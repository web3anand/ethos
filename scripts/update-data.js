// Standalone data update script for external cron services
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { BackupManager } from './backup-manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  // Your deployed Vercel app URL
  VERCEL_URL: process.env.VERCEL_URL || 'http://localhost:3000',
  
  // API endpoints
  PROFILES_API: `${process.env.VERCEL_URL || 'http://localhost:3000'}/api/comprehensive-profiles`,
  WEEKLY_XP_API: `${process.env.VERCEL_URL || 'http://localhost:3000'}/api/csv-weekly-xp`,
  
  // File paths
  DATA_DIR: path.join(__dirname, '..', 'data', 'csv'),
  PROFILES_FILE: 'comprehensive_profiles.csv',
  WEEKLY_XP_FILE: 'comprehensive_weekly_xp.csv',
  SEASON_WEEKS_FILE: 'season_weeks.csv',
  LOG_FILE: 'update-data.log',
  
  // Processing
  BATCH_SIZE: 1000,
  MAX_RETRIES: 3,
  RETRY_DELAY: 5000,
  
  // Backup settings
  CREATE_BACKUP_BEFORE_UPDATE: true,
  MAX_BACKUP_RETRIES: 3,
};

export async function performDataUpdate() {
  const stats = {
    profilesUpdated: 0,
    profilesCreated: 0,
    weeklyRecordsUpdated: 0,
    weeklyRecordsCreated: 0,
    errors: 0,
    startTime: new Date().toISOString(),
    backupCreated: false,
    backupPath: null,
  };

  const backupManager = new BackupManager();
  let backupCreated = false;

  try {
    console.log('🔄 Starting data update...');
    
    // Create backup before update if enabled
    if (CONFIG.CREATE_BACKUP_BEFORE_UPDATE) {
      try {
        console.log('💾 Creating backup before update...');
        const backupStats = backupManager.createBackup();
        stats.backupCreated = true;
        stats.backupPath = backupStats.timestamp;
        backupCreated = true;
        console.log(`✅ Backup created: ${backupStats.timestamp}`);
      } catch (backupError) {
        console.warn('⚠️  Failed to create backup, continuing with update:', backupError.message);
      }
    }
    
    // Fetch all profiles
    const profiles = await fetchAllProfiles();
    console.log(`📊 Fetched ${profiles.length} profiles`);
    
    // Fetch all weekly XP data
    const weeklyXp = await fetchAllWeeklyXpData();
    console.log(`📊 Fetched ${weeklyXp.length} weekly XP records`);
    
    // Load existing data
    const { existingProfiles, existingWeeklyXp } = await loadExistingData();
    
    // Merge data
    const mergedProfiles = mergeProfilesData(existingProfiles, profiles, stats);
    const mergedWeeklyXp = mergeWeeklyXpData(existingWeeklyXp, weeklyXp, stats);
    
    // Save data
    await saveData(mergedProfiles, mergedWeeklyXp);
    
    stats.endTime = new Date().toISOString();
    console.log('✅ Data update completed:', stats);
    
    // Log the update
    await logUpdate(stats);
    
    return stats;
    
  } catch (error) {
    console.error('❌ Data update failed:', error);
    stats.error = error.message;
    
    // If we have a backup and the update failed, offer to restore
    if (backupCreated && stats.backupPath) {
      console.log(`💾 Update failed. Backup available at: ${stats.backupPath}`);
      console.log(`   To restore: node scripts/backup-manager.js restore backup-${stats.backupPath}`);
    }
    
    // Log the error
    await logUpdate(stats);
    
    throw error;
  }
}

async function fetchAllProfiles() {
  const allProfiles = [];
  let offset = 0;
  let hasMore = true;
  let retryCount = 0;

  console.log('📥 Fetching all profiles...');

  while (hasMore && retryCount < CONFIG.MAX_RETRIES) {
    try {
      const url = `${CONFIG.PROFILES_API}?offset=${offset}&limit=${CONFIG.BATCH_SIZE}`;
      console.log(`📡 Fetching profiles: ${url}`);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.profiles || !Array.isArray(data.profiles)) {
        throw new Error('Invalid response format - missing profiles array');
      }

      allProfiles.push(...data.profiles);
      hasMore = data.profiles.length === CONFIG.BATCH_SIZE;
      offset += CONFIG.BATCH_SIZE;
      retryCount = 0; // Reset retry count on success
      
      console.log(`📥 Fetched ${data.profiles.length} profiles (total: ${allProfiles.length})`);
      
      // Add small delay to avoid overwhelming the API
      if (hasMore) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
    } catch (error) {
      retryCount++;
      console.error(`❌ Error fetching profiles at offset ${offset} (attempt ${retryCount}):`, error.message);
      
      if (retryCount < CONFIG.MAX_RETRIES) {
        console.log(`⏳ Retrying in ${CONFIG.RETRY_DELAY}ms...`);
        await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY));
      } else {
        console.error(`❌ Max retries reached for profiles at offset ${offset}`);
        break;
      }
    }
  }

  console.log(`✅ Profiles fetch completed: ${allProfiles.length} total profiles`);
  return allProfiles;
}

async function fetchAllWeeklyXpData() {
  const allWeeklyData = [];
  
  // Define seasons and weeks
  const seasons = [
    { id: 0, name: 'Season 0', weeks: [0] },
    { id: 1, name: 'Season 1', weeks: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] }
  ];

  console.log('📥 Fetching all weekly XP data...');

  for (const season of seasons) {
    for (const week of season.weeks) {
      let offset = 0;
      let hasMore = true;
      let retryCount = 0;
      let seasonWeekRecords = [];

      console.log(`📡 Fetching Season ${season.id}, Week ${week}...`);

      while (hasMore && retryCount < CONFIG.MAX_RETRIES) {
        try {
          const url = `${CONFIG.WEEKLY_XP_API}?season=${season.id}&week=${week}&offset=${offset}&limit=${CONFIG.BATCH_SIZE}`;
          console.log(`📡 Fetching weekly XP: ${url}`);
          
          const response = await fetch(url);
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          
          const data = await response.json();
          
          if (!data.profiles || !Array.isArray(data.profiles)) {
            throw new Error('Invalid response format - missing profiles array');
          }

          const enrichedData = data.profiles.map(record => ({
            ...record,
            season_id: season.id,
            week: week,
            season_name: season.name
          }));
          
          seasonWeekRecords.push(...enrichedData);
          hasMore = data.profiles.length === CONFIG.BATCH_SIZE;
          offset += CONFIG.BATCH_SIZE;
          retryCount = 0; // Reset retry count on success
          
          console.log(`📥 Fetched ${data.profiles.length} records for Season ${season.id}, Week ${week} (total: ${seasonWeekRecords.length})`);
          
          // Add small delay to avoid overwhelming the API
          if (hasMore) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          
        } catch (error) {
          retryCount++;
          console.error(`❌ Error fetching weekly XP for Season ${season.id}, Week ${week} at offset ${offset} (attempt ${retryCount}):`, error.message);
          
          if (retryCount < CONFIG.MAX_RETRIES) {
            console.log(`⏳ Retrying in ${CONFIG.RETRY_DELAY}ms...`);
            await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY));
          } else {
            console.error(`❌ Max retries reached for Season ${season.id}, Week ${week} at offset ${offset}`);
            break;
          }
        }
      }

      allWeeklyData.push(...seasonWeekRecords);
      console.log(`✅ Season ${season.id}, Week ${week} completed: ${seasonWeekRecords.length} records`);
    }
  }

  console.log(`✅ Weekly XP fetch completed: ${allWeeklyData.length} total records`);
  return allWeeklyData;
}

async function loadExistingData() {
  const profilesFile = path.join(CONFIG.DATA_DIR, CONFIG.PROFILES_FILE);
  const weeklyXpFile = path.join(CONFIG.DATA_DIR, CONFIG.WEEKLY_XP_FILE);
  
  let existingProfiles = [];
  let existingWeeklyXp = [];
  
  try {
    if (fs.existsSync(profilesFile)) {
      const content = fs.readFileSync(profilesFile, 'utf8');
      existingProfiles = parseCsv(content);
    }
  } catch (error) {
    console.error('❌ Error loading existing profiles:', error.message);
  }
  
  try {
    if (fs.existsSync(weeklyXpFile)) {
      const content = fs.readFileSync(weeklyXpFile, 'utf8');
      existingWeeklyXp = parseCsv(content);
    }
  } catch (error) {
    console.error('❌ Error loading existing weekly XP data:', error.message);
  }
  
  return { existingProfiles, existingWeeklyXp };
}

function parseCsv(content) {
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

function mergeProfilesData(existingProfiles, newProfiles, stats) {
  const profileMap = new Map();
  
  existingProfiles.forEach(profile => {
    const key = profile.profile_id || profile.id;
    if (key) profileMap.set(key, profile);
  });
  
  newProfiles.forEach(profile => {
    const key = profile.profile_id || profile.id;
    if (key) {
      if (profileMap.has(key)) {
        Object.assign(profileMap.get(key), profile);
        stats.profilesUpdated++;
      } else {
        profileMap.set(key, profile);
        stats.profilesCreated++;
      }
    }
  });
  
  return Array.from(profileMap.values());
}

function mergeWeeklyXpData(existingWeeklyXp, newWeeklyXp, stats) {
  const weeklyMap = new Map();
  
  existingWeeklyXp.forEach(record => {
    const key = `${record.profile_id}_${record.season_id}_${record.week}`;
    weeklyMap.set(key, record);
  });
  
  newWeeklyXp.forEach(record => {
    const key = `${record.profile_id}_${record.season_id}_${record.week}`;
    if (weeklyMap.has(key)) {
      Object.assign(weeklyMap.get(key), record);
      stats.weeklyRecordsUpdated++;
    } else {
      weeklyMap.set(key, record);
      stats.weeklyRecordsCreated++;
    }
  });
  
  return Array.from(weeklyMap.values());
}

async function saveData(profiles, weeklyXp) {
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
  
  const profilesCsv = arrayToCsv(profiles, profilesHeaders);
  fs.writeFileSync(path.join(CONFIG.DATA_DIR, CONFIG.PROFILES_FILE), profilesCsv);
  
  // Save weekly XP data
  const weeklyHeaders = [
    'profile_id', 'username', 'display_name', 'avatar_url', 'season_id', 'week',
    'weekly_xp', 'cumulative_xp', 'total_xp', 'rank', 'created_at'
  ];
  
  const weeklyCsv = arrayToCsv(weeklyXp, weeklyHeaders);
  fs.writeFileSync(path.join(CONFIG.DATA_DIR, CONFIG.WEEKLY_XP_FILE), weeklyCsv);
  
  console.log(`💾 Saved ${profiles.length} profiles and ${weeklyXp.length} weekly XP records`);
}

function arrayToCsv(data, headers) {
  if (data.length === 0) return headers.join(',') + '\n';
  
  const csvLines = [headers.join(',')];
  data.forEach(row => {
    const values = headers.map(header => {
      const value = row[header] || '';
      if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    });
    csvLines.push(values.join(','));
  });
  
  return csvLines.join('\n') + '\n';
}

async function logUpdate(stats) {
  try {
    const logEntry = {
      timestamp: new Date().toISOString(),
      ...stats
    };

    const logPath = path.join(CONFIG.DATA_DIR, CONFIG.LOG_FILE);
    const logLine = JSON.stringify(logEntry) + '\n';
    
    fs.appendFileSync(logPath, logLine);
    console.log(`📝 Update logged to ${logPath}`);
  } catch (error) {
    console.error('❌ Failed to log update:', error.message);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  performDataUpdate()
    .then(stats => {
      console.log('✅ Update completed:', stats);
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Update failed:', error);
      process.exit(1);
    });
}
