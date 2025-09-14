/**
 * Enhanced Incremental Profile Updater with Full Refresh
 * 
 * This script performs two types of updates:
 * 1. FULL REFRESH: Updates ALL existing profiles from ID 1 to maxProfileId to catch any changes
 * 2. NEW PROFILE DISCOVERY: Searches for new profiles starting from the highest existing profile ID
 * 
 * The full refresh ensures that updates to existing profiles (XP changes, new achievements, etc.)
 * are captured across the entire database, not just new profile registrations.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const BATCH_SIZE = 100; // Smaller batches for updates
const CONCURRENCY = 5; // Lower concurrency for updates
const DELAY_MS = 50; // Delay between requests
const MAX_CONSECUTIVE_NOT_FOUND = 3000; // Stop after 3000 consecutive not found

// Refresh configuration - FULL REFRESH from ID 1
const ENABLE_FULL_REFRESH = false; // Disable separate full refresh (we'll do sequential scan instead)
const FULL_REFRESH_BATCH_SIZE = 500; // Batch size for full refresh (larger batches for efficiency)
const FULL_REFRESH_CONCURRENCY = 100; // Concurrency for full refresh

// API configuration
const API_BASE_URL = 'https://api.ethos.network/api/v2';
const HEADERS = {
  'Content-Type': 'application/json',
  'X-Ethos-Client': 'ethos-website-incremental-updater'
};

// File paths
const CSV_DIR = path.join(__dirname, '..', 'data', 'csv');
const PROFILES_FILE = path.join(CSV_DIR, 'comprehensive_profiles.csv');
const WEEKLY_XP_FILE = path.join(CSV_DIR, 'comprehensive_weekly_xp.csv');
const STATS_FILE = path.join(CSV_DIR, 'update_stats.json');

// Load existing data
function loadExistingData() {
  console.log('📊 Loading existing data...');
  
  const profiles = new Map();
  const weeklyXp = new Map();
  let maxProfileId = 0;
  
  try {
    // Load existing profiles
    if (fs.existsSync(PROFILES_FILE)) {
      const profilesContent = fs.readFileSync(PROFILES_FILE, 'utf8');
      const lines = profilesContent.trim().split('\n');
      const headers = lines[0].split(',');
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        const profile = {};
        
        headers.forEach((header, index) => {
          let value = values[index] || '';
          
          // Convert numeric fields
          if (['profile_id', 'score', 'streak_days', 'total_xp', 'season_0_xp', 'season_1_xp', 'season_0_weeks', 'season_1_weeks', 'userkeys_count', 'eth_addresses'].includes(header)) {
            value = value === '' ? 0 : parseInt(value);
          }
          
          // Convert boolean fields
          if (['is_validator'].includes(header)) {
            value = value === 'true';
          }
          
          // Handle null/empty values
          if (value === '' || value === 'null') {
            value = null;
          }
          
          profile[header] = value;
        });
        
        profiles.set(profile.profile_id, profile);
        maxProfileId = Math.max(maxProfileId, profile.profile_id);
      }
    }
    
    // Load existing weekly XP data
    if (fs.existsSync(WEEKLY_XP_FILE)) {
      const weeklyContent = fs.readFileSync(WEEKLY_XP_FILE, 'utf8');
      const lines = weeklyContent.trim().split('\n');
      const headers = lines[0].split(',');
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        const record = {};
        
        headers.forEach((header, index) => {
          let value = values[index] || '';
          
          // Convert numeric fields
          if (['profile_id', 'season', 'week', 'weekly_xp', 'cumulative_xp'].includes(header)) {
            value = value === '' ? 0 : parseInt(value);
          }
          
          // Handle null/empty values
          if (value === '' || value === 'null') {
            value = null;
          }
          
          record[header] = value;
        });
        
        const key = `${record.profile_id}_${record.season}_${record.week}`;
        weeklyXp.set(key, record);
      }
    }
    
    console.log(`✅ Loaded ${profiles.size} existing profiles, max ID: ${maxProfileId}`);
    console.log(`✅ Loaded ${weeklyXp.size} existing weekly XP records`);
    
    return { profiles, weeklyXp, maxProfileId };
  } catch (error) {
    console.error('❌ Error loading existing data:', error);
    return { profiles: new Map(), weeklyXp: new Map(), maxProfileId: 0 };
  }
}

// Fetch user profile with retry logic
async function fetchUserProfile(profileId, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(`${API_BASE_URL}/users/by/profile-id`, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({ profileIds: [profileId] })
      });
      
      if (response.status === 429) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        console.log(`⏳ Rate limited, waiting ${delay}ms before retry ${attempt}/${retries}`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      if (response.status === 404) {
        return null; // Profile not found
      }
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      // The API returns an array, so we need the first element
      return Array.isArray(data) && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.warn(`⚠️ Attempt ${attempt}/${retries} failed for profile ${profileId}:`, error.message);
      
      if (attempt === retries) {
        throw error;
      }
      
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Fetch user XP data
async function fetchUserXp(profileId, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(`${API_BASE_URL}/xp/user/profileId:${profileId}`, {
        headers: HEADERS
      });
      
      if (response.status === 429) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      if (response.status === 404) {
        return null;
      }
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      if (attempt === retries) {
        throw error;
      }
      
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Fetch weekly XP data for a profile
async function fetchWeeklyXp(profileId, season, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(`${API_BASE_URL}/xp/user/profileId:${profileId}/season/${season}/weekly`, {
        headers: HEADERS
      });
      
      if (response.status === 429) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      if (response.status === 404) {
        return [];
      }
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      if (attempt === retries) {
        throw error;
      }
      
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Process a single profile
async function processProfile(profileId, existingProfiles, existingWeeklyXp) {
  try {
    // Fetch profile data
    const profileData = await fetchUserProfile(profileId);
    if (!profileData) {
      return { status: 'not_found', profileId };
    }
    
    console.log(`      📋 Profile ${profileId}: ${profileData.displayName || profileData.username} (XP: ${profileData.xpTotal})`);
    
    
    // Use XP data from profile response
    const totalXp = profileData.xpTotal || 0;
    if (totalXp < 1) {
      return { status: 'no_xp', profileId };
    }
    
    // Determine if this is a new profile or update
    const isNewProfile = !existingProfiles.has(profileId);
    
    // Prepare profile data
    const profile = {
      profile_id: profileId,
      userkey: `profileId:${profileId}`,
      username: profileData.username || `user_${profileId}`,
      display_name: profileData.displayName || profileData.username || `User ${profileId}`,
      avatar_url: profileData.avatarUrl || null,
      description: profileData.description || null,
      score: profileData.score || 0,
      streak_days: profileData.xpStreakDays || 0,
      total_xp: totalXp,
      is_validator: (profileData.userkeys && profileData.userkeys.some(key => key.startsWith('address:'))) || false,
      season_0_xp: 0, // Will be calculated from weekly data
      season_1_xp: 0, // Will be calculated from weekly data
      season_0_weeks: 0, // Will be calculated from weekly data
      season_1_weeks: 0, // Will be calculated from weekly data
      status: 'active',
      userkeys_count: 1,
      eth_addresses: profileData.ethAddresses?.length || 0
    };
    
    // Update or add profile
    existingProfiles.set(profileId, profile);
    
    // Fetch and update weekly XP data for both seasons
    const weeklyRecords = [];
    let season0Xp = 0, season1Xp = 0, season0Weeks = 0, season1Weeks = 0;
    
    for (const season of [0, 1]) {
      const weeklyData = await fetchWeeklyXp(profileId, season);
      
      for (const week of weeklyData) {
        const key = `${profileId}_${season}_${week.week}`;
        const weeklyXp = week.weeklyXp || 0;
        const record = {
          profile_id: profileId,
          userkey: `profileId:${profileId}`,
          season: season,
          week: week.week,
          weekly_xp: weeklyXp,
          cumulative_xp: week.cumulativeXp || 0
        };
        
        existingWeeklyXp.set(key, record);
        weeklyRecords.push(record);
        
        // Calculate season totals
        if (season === 0) {
          season0Xp += weeklyXp;
          season0Weeks++;
        } else if (season === 1) {
          season1Xp += weeklyXp;
          season1Weeks++;
        }
      }
    }
    
    // Update profile with calculated season data
    profile.season_0_xp = season0Xp;
    profile.season_1_xp = season1Xp;
    profile.season_0_weeks = season0Weeks;
    profile.season_1_weeks = season1Weeks;
    
    return {
      status: isNewProfile ? 'new' : 'updated',
      profileId,
      profile,
      weeklyRecords: weeklyRecords.length
    };
    
  } catch (error) {
    console.error(`❌ Error processing profile ${profileId}:`, error.message);
    return { status: 'error', profileId, error: error.message };
  }
}

// Process full refresh from ID 1 to maxProfileId
async function processFullRefresh(profiles, weeklyXp, maxProfileId) {
  console.log(`🔄 Starting full refresh from profile ID 1 to ${maxProfileId}...`);
  
  let refreshedProfiles = 0;
  let currentId = 1;
  
  while (currentId <= maxProfileId) {
    const batch = [];
    
    // Create batch
    for (let i = 0; i < FULL_REFRESH_BATCH_SIZE && currentId + i <= maxProfileId; i++) {
      batch.push(currentId + i);
    }
    
    console.log(`🔄 Refreshing batch: ${batch[0]} - ${batch[batch.length - 1]} (${batch.length} profiles)`);
    
    // Process batch with concurrency control
    for (let i = 0; i < batch.length; i += FULL_REFRESH_CONCURRENCY) {
      const chunk = batch.slice(i, i + FULL_REFRESH_CONCURRENCY);
      const chunkPromises = chunk.map(profileId => processProfile(profileId, profiles, weeklyXp));
      
      try {
        console.log(`  🔄 Processing chunk: ${chunk.join(', ')}`);
        const chunkResults = await Promise.all(chunkPromises);
        
        // Count refreshed profiles and log results
        let chunkNew = 0, chunkUpdated = 0, chunkNotFound = 0, chunkNoXp = 0;
        for (const result of chunkResults) {
          if (result.status === 'updated') {
            refreshedProfiles++;
            chunkUpdated++;
          } else if (result.status === 'new') {
            refreshedProfiles++;
            chunkNew++;
          } else if (result.status === 'not_found') {
            chunkNotFound++;
          } else if (result.status === 'no_xp') {
            chunkNoXp++;
          }
        }
        
        if (chunkNew > 0 || chunkUpdated > 0) {
          console.log(`    ✅ Chunk results: ${chunkNew} new, ${chunkUpdated} updated, ${chunkNotFound} not found, ${chunkNoXp} no XP`);
        } else {
          console.log(`    ⚠️ Chunk results: ${chunkNotFound} not found, ${chunkNoXp} no XP`);
        }
        
        // Add delay between chunks
        if (i + FULL_REFRESH_CONCURRENCY < batch.length) {
          await new Promise(resolve => setTimeout(resolve, DELAY_MS));
        }
      } catch (error) {
        console.error(`❌ Error processing refresh chunk:`, error);
      }
    }
    
    // Save progress every 5 batches (every 2500 profiles with 500 batch size)
    if ((currentId - 1) % (FULL_REFRESH_BATCH_SIZE * 5) === 0) {
      console.log(`💾 Saving refresh progress... (${refreshedProfiles} refreshed so far)`);
      saveData(profiles, weeklyXp);
    }
    
    currentId += FULL_REFRESH_BATCH_SIZE;
  }
  
  return refreshedProfiles;
}

// Save data to CSV files
function saveData(profiles, weeklyXp) {
  console.log('💾 Saving updated data to CSV files...');
  
  // Ensure directory exists
  if (!fs.existsSync(CSV_DIR)) {
    fs.mkdirSync(CSV_DIR, { recursive: true });
  }
  
  // Save profiles
  const profileHeaders = [
    'profile_id', 'userkey', 'username', 'display_name', 'avatar_url', 'description',
    'score', 'streak_days', 'total_xp', 'is_validator', 'season_0_xp', 'season_1_xp',
    'season_0_weeks', 'season_1_weeks', 'status', 'userkeys_count', 'eth_addresses'
  ];
  
  const profileLines = [profileHeaders.join(',')];
  for (const profile of profiles.values()) {
    const values = profileHeaders.map(header => {
      const value = profile[header];
      if (value === null || value === undefined) return '';
      if (typeof value === 'string' && value.includes(',')) return `"${value}"`;
      return value;
    });
    profileLines.push(values.join(','));
  }
  
  fs.writeFileSync(PROFILES_FILE, profileLines.join('\n'));
  
  // Save weekly XP data
  const weeklyHeaders = ['profile_id', 'userkey', 'season', 'week', 'weekly_xp', 'cumulative_xp'];
  const weeklyLines = [weeklyHeaders.join(',')];
  for (const record of weeklyXp.values()) {
    const values = weeklyHeaders.map(header => {
      const value = record[header];
      if (value === null || value === undefined) return '';
      return value;
    });
    weeklyLines.push(values.join(','));
  }
  
  fs.writeFileSync(WEEKLY_XP_FILE, weeklyLines.join('\n'));
  
  console.log(`✅ Saved ${profiles.size} profiles and ${weeklyXp.size} weekly records`);
}

// Main incremental update function
async function runIncrementalUpdate() {
  console.log('🚀 Starting incremental profile update...');
  const startTime = Date.now();
  
  // Load existing data
  const { profiles, weeklyXp, maxProfileId } = loadExistingData();
  
  // Start from the last known profile ID + 1
  let currentProfileId = maxProfileId + 1;
  let consecutiveNotFound = 0;
  let processed = 0;
  let newProfiles = 0;
  let updatedProfiles = 0;
  let errors = 0;
  
  console.log(`📊 Starting from profile ID: ${currentProfileId}`);
  
  // Full refresh pass: Update all existing profiles from ID 1 to maxProfileId
  let refreshedProfiles = 0;
  if (ENABLE_FULL_REFRESH) {
    // If no existing profiles, start discovery from ID 1
    const refreshEndId = maxProfileId > 0 ? maxProfileId : 10000; // Start with 10000 if no existing data
    console.log(`\n🔄 Starting FULL refresh from profile ID 1 to ${refreshEndId}...`);
    
    refreshedProfiles = await processFullRefresh(profiles, weeklyXp, refreshEndId);
    updatedProfiles += refreshedProfiles; // Count towards total updates
    
    console.log(`✅ Full refresh complete: ${refreshedProfiles} profiles refreshed`);
    
    // Save after full refresh
    saveData(profiles, weeklyXp);
  }
  
  console.log(`\n🔍 Starting sequential profile scan from ID: 1`);
  
  // Override: Start from ID 1 and go to infinity until we hit consecutive not found limit
  currentProfileId = 1; // Always start from 1 for complete sequential scan
  console.log(`🔍 Scanning sequentially from profile ID 1 until ${MAX_CONSECUTIVE_NOT_FOUND} consecutive not found`);
  
  while (consecutiveNotFound < MAX_CONSECUTIVE_NOT_FOUND) {
    const batch = [];
    
    // Create batch (use the larger batch size)
    for (let i = 0; i < FULL_REFRESH_BATCH_SIZE; i++) {
      batch.push(currentProfileId + i);
    }
    
    console.log(`🔄 Processing batch: ${batch[0]} - ${batch[batch.length - 1]} (${batch.length} profiles)`);
    
    // Process batch with higher concurrency control
    const results = [];
    for (let i = 0; i < batch.length; i += FULL_REFRESH_CONCURRENCY) {
      const chunk = batch.slice(i, i + FULL_REFRESH_CONCURRENCY);
      const chunkPromises = chunk.map(profileId => processProfile(profileId, profiles, weeklyXp));
      
      try {
        const chunkResults = await Promise.all(chunkPromises);
        results.push(...chunkResults);
        
        // Add delay between chunks
        if (i + CONCURRENCY < batch.length) {
          await new Promise(resolve => setTimeout(resolve, DELAY_MS));
        }
      } catch (error) {
        console.error(`❌ Error processing chunk:`, error);
        errors += chunk.length;
      }
    }
    
    // Process results
    let batchNotFound = 0;
    for (const result of results) {
      processed++;
      
      if (result.status === 'not_found' || result.status === 'no_xp') {
        batchNotFound++;
        consecutiveNotFound++;
      } else if (result.status === 'new') {
        newProfiles++;
        consecutiveNotFound = 0;
      } else if (result.status === 'updated') {
        updatedProfiles++;
        consecutiveNotFound = 0;
      } else if (result.status === 'error') {
        errors++;
        consecutiveNotFound++;
      }
    }
    
    console.log(`✅ Batch complete: ${results.length} processed, ${batchNotFound} not found, ${consecutiveNotFound} consecutive not found`);
    
    // Move to next batch
    currentProfileId += FULL_REFRESH_BATCH_SIZE;
    
    // Save progress every 2 batches (since batches are larger now)
    if (processed % (FULL_REFRESH_BATCH_SIZE * 2) === 0) {
      console.log(`💾 Saving progress... (${processed} processed)`);
      saveData(profiles, weeklyXp);
    }
  }
  
  // Final save
  saveData(profiles, weeklyXp);
  
  const duration = Math.round((Date.now() - startTime) / 1000);
  const stats = {
    processed,
    newProfiles,
    updatedProfiles,
    refreshedProfiles,
    errors,
    duration,
    finalProfileCount: profiles.size,
    finalWeeklyRecords: weeklyXp.size,
    lastProcessedId: currentProfileId - 1,
    timestamp: Date.now()
  };
  
  // Save stats
  fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));
  
  console.log('🎉 Incremental update completed!');
  console.log(`📊 Final stats:`, stats);
  
  return stats;
}

// Run if called directly
const isMainModule = process.argv[1] === __filename;

if (isMainModule) {
  console.log('🚀 Running as main module...');
  runIncrementalUpdate().catch(console.error);
}

export { runIncrementalUpdate };