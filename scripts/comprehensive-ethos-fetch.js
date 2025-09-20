import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Starting COMPREHENSIVE Ethos data fetch...\n');

// Configuration
const ETHOS_API_BASE = 'https://api.ethos.network/api/v2';
const BATCH_SIZE = 500;
const CONCURRENCY = 10;
const DELAY_BETWEEN_REQUESTS = 50;
const DELAY_BETWEEN_BATCHES = 200;
const MAX_CONSECUTIVE_EMPTY = 5000;

// Data storage
const allProfiles = new Map(); // profileId -> profile data
const allWeeklyData = []; // All weekly XP records
const allSeasons = new Map(); // seasonId -> season data
let processedCount = 0;
let consecutiveEmpty = 0;
let startTime = Date.now();

console.log(`📊 Configuration:`);
console.log(`   Batch size: ${BATCH_SIZE}`);
console.log(`   Concurrency: ${CONCURRENCY}`);
console.log(`   Delay between requests: ${DELAY_BETWEEN_REQUESTS}ms`);
console.log(`   Delay between batches: ${DELAY_BETWEEN_BATCHES}ms`);
console.log(`   Max consecutive empty: ${MAX_CONSECUTIVE_EMPTY}\n`);

// Function to fetch profiles batch
async function fetchProfilesBatch(profileIds) {
  try {
    const response = await fetch(`${ETHOS_API_BASE}/users/by/profile-id`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Ethos-Client': 'ethos-dashboard'
      },
      body: JSON.stringify({ profileIds: profileIds })
    });

    if (!response.ok) {
      console.error(`❌ Batch fetch failed: ${response.status} ${response.statusText}`);
      return [];
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error(`❌ Error fetching batch:`, error.message);
    return [];
  }
}

// Function to fetch weekly XP data for a profile
async function fetchWeeklyXpData(profileId, seasonId) {
  try {
    const response = await fetch(`${ETHOS_API_BASE}/xp/user/profileId:${profileId}/season/${seasonId}/weekly`, {
      headers: {
        'X-Ethos-Client': 'ethos-dashboard'
      }
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error(`❌ Error fetching weekly data for profile ${profileId}, season ${seasonId}:`, error.message);
    return null;
  }
}

// Function to fetch season XP data for a profile
async function fetchSeasonXpData(profileId) {
  try {
    const response = await fetch(`${ETHOS_API_BASE}/xp/user/profileId:${profileId}/season/1`, {
      headers: {
        'X-Ethos-Client': 'ethos-dashboard'
      }
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`❌ Error fetching season data for profile ${profileId}:`, error.message);
    return null;
  }
}

// Function to process a single profile
async function processProfile(profile) {
  try {
    const profileId = profile.profileId;
    
    // Fetch weekly XP data for both Season 0 and Season 1
    const [season0Data, season1Data] = await Promise.all([
      fetchWeeklyXpData(profileId, 0),
      fetchWeeklyXpData(profileId, 1)
    ]);
    
    // Fetch season XP data
    const seasonData = await fetchSeasonXpData(profileId);
    
    // Store profile data
    const profileData = {
      profile_id: profileId,
      username: profile.username || null,
      display_name: profile.displayName || null,
      avatar_url: profile.avatarUrl || null,
      description: profile.description || null,
      score: profile.score || 0,
      streak_days: profile.xpStreakDays || 0,
      total_xp: profile.xpTotal || 0,
      status: profile.status || 'UNKNOWN',
      userkeys_count: profile.userkeys ? profile.userkeys.length : 0,
      eth_addresses: profile.userkeys ? profile.userkeys.filter(k => k.startsWith('address:0x')).length : 0,
      created_at: new Date().toISOString(),
      last_updated: new Date().toISOString()
    };
    
    // Add season XP data
    if (seasonData) {
      profileData.season_1_xp = seasonData.totalXp || 0;
      profileData.season_1_weeks = seasonData.weeks || 0;
    }
    
    allProfiles.set(profileId, profileData);
    
    // Process Season 0 weekly data
    if (season0Data && season0Data.length > 0) {
      season0Data.forEach(week => {
        allWeeklyData.push({
          profile_id: profileId,
          season_id: 0,
          week: week.week,
          weekly_xp: week.weeklyXp || 0,
          cumulative_xp: week.cumulativeXp || 0,
          created_at: new Date().toISOString()
        });
      });
    }
    
    // Process Season 1 weekly data
    if (season1Data && season1Data.length > 0) {
      season1Data.forEach(week => {
        allWeeklyData.push({
          profile_id: profileId,
          season_id: 1,
          week: week.week,
          weekly_xp: week.weeklyXp || 0,
          cumulative_xp: week.cumulativeXp || 0,
          created_at: new Date().toISOString()
        });
      });
    }
    
    return true;
  } catch (error) {
    console.error(`❌ Error processing profile ${profile.profileId}:`, error.message);
    return false;
  }
}

// Function to process a batch of profiles
async function processBatch(profileIds) {
  console.log(`🔄 Processing batch: profiles ${profileIds[0]} to ${profileIds[profileIds.length - 1]} (${profileIds.length} profiles)`);
  
  // Fetch profile information
  const profiles = await fetchProfilesBatch(profileIds);
  
  if (!profiles || profiles.length === 0) {
    console.log(`❌ No profiles found in batch ${profileIds[0]} - ${profileIds[profileIds.length - 1]}`);
    return 0;
  }
  
  console.log(`✅ Found ${profiles.length}/${profileIds.length} profiles in batch`);
  
  // Process profiles with concurrency control
  const promises = profiles.map(profile => processProfile(profile));
  const results = await Promise.all(promises);
  
  const successCount = results.filter(r => r).length;
  console.log(`✅ Processed ${successCount}/${profiles.length} profiles successfully`);
  
  return successCount;
}

// Function to save data to CSV
function saveDataToCSV() {
  console.log('\n💾 Saving data to CSV files...');
  
  const dataDir = path.join(__dirname, '..', 'data', 'csv');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  // Save profiles CSV
  const profilesArray = Array.from(allProfiles.values());
  const profileHeaders = [
    'profile_id', 'username', 'display_name', 'avatar_url', 'description',
    'score', 'streak_days', 'total_xp', 'status', 'userkeys_count',
    'eth_addresses', 'season_1_xp', 'season_1_weeks', 'created_at', 'last_updated'
  ];
  
  const profilesCSV = [profileHeaders.join(',')];
  profilesArray.forEach(profile => {
    const row = profileHeaders.map(header => {
      const value = profile[header] !== undefined ? profile[header] : '';
      return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
    });
    profilesCSV.push(row.join(','));
  });
  
  const profilesFile = path.join(dataDir, 'comprehensive_profiles.csv');
  fs.writeFileSync(profilesFile, profilesCSV.join('\n'), 'utf8');
  console.log(`✅ Saved ${profilesArray.length} profiles to ${profilesFile}`);
  
  // Save weekly XP CSV
  const weeklyHeaders = ['profile_id', 'season_id', 'week', 'weekly_xp', 'cumulative_xp', 'created_at'];
  const weeklyCSV = [weeklyHeaders.join(',')];
  allWeeklyData.forEach(record => {
    const row = weeklyHeaders.map(header => record[header] !== undefined ? record[header] : '');
    weeklyCSV.push(row.join(','));
  });
  
  const weeklyFile = path.join(dataDir, 'comprehensive_weekly_xp.csv');
  fs.writeFileSync(weeklyFile, weeklyCSV.join('\n'), 'utf8');
  console.log(`✅ Saved ${allWeeklyData.length} weekly records to ${weeklyFile}`);
  
  // Save season weeks CSV
  const seasonWeeks = [
    { season_id: 0, week: 0, start_date: '2025-01-01T00:00:00.000Z', end_date: '2025-05-14T00:01:49.122Z' },
    { season_id: 1, week: 0, start_date: '2025-05-14T00:01:49.122Z', end_date: '2025-06-20T19:55:47.337Z' },
    { season_id: 1, week: 1, start_date: '2025-06-20T19:12:01.074Z', end_date: '2025-06-27T21:32:51.307Z' },
    { season_id: 1, week: 2, start_date: '2025-06-27T21:32:08.305Z', end_date: '2025-07-04T17:00:20.498Z' },
    { season_id: 1, week: 3, start_date: '2025-07-04T17:00:26.151Z', end_date: '2025-07-11T19:04:21.062Z' },
    { season_id: 1, week: 4, start_date: '2025-07-11T19:04:27.040Z', end_date: '2025-07-18T18:38:27.544Z' },
    { season_id: 1, week: 5, start_date: '2025-07-18T18:38:50.206Z', end_date: '2025-07-25T19:51:16.867Z' },
    { season_id: 1, week: 6, start_date: '2025-07-25T19:50:42.697Z', end_date: '2025-08-01T15:13:34.494Z' },
    { season_id: 1, week: 7, start_date: '2025-08-01T15:13:36.422Z', end_date: '2025-08-08T18:55:00.271Z' },
    { season_id: 1, week: 8, start_date: '2025-08-08T18:55:21.479Z', end_date: '2025-08-15T18:09:33.970Z' },
    { season_id: 1, week: 9, start_date: '2025-08-15T18:09:03.459Z', end_date: '2025-08-22T17:53:27.517Z' },
    { season_id: 1, week: 10, start_date: '2025-08-22T17:53:30.582Z', end_date: '2025-08-29T21:04:42.150Z' },
    { season_id: 1, week: 11, start_date: '2025-08-29T21:03:55.956Z', end_date: '2025-09-05T17:16:51.970Z' },
    { season_id: 1, week: 12, start_date: '2025-09-05T17:16:42.166Z', end_date: '2025-09-12T19:37:22.656Z' },
    { season_id: 1, week: 13, start_date: '2025-09-12T19:36:53.967Z', end_date: '2025-09-19T07:49:37.085Z' }
  ];
  
  const seasonWeeksCSV = ['season_id,week,start_date,end_date,created_at'];
  seasonWeeks.forEach(week => {
    seasonWeeksCSV.push(`${week.season_id},${week.week},${week.start_date},${week.end_date},${new Date().toISOString()}`);
  });
  
  const seasonWeeksFile = path.join(dataDir, 'season_weeks.csv');
  fs.writeFileSync(seasonWeeksFile, seasonWeeksCSV.join('\n'), 'utf8');
  console.log(`✅ Saved ${seasonWeeks.length} season weeks to ${seasonWeeksFile}`);
}

// Function to count weekly XP recipients
function countWeeklyRecipients() {
  console.log('\n📊 Counting weekly XP recipients...');
  
  const weekCounts = {};
  allWeeklyData.forEach(record => {
    if (record.weekly_xp > 0) {
      if (!weekCounts[record.week]) {
        weekCounts[record.week] = new Set();
      }
      weekCounts[record.week].add(record.profile_id);
    }
  });
  
  console.log('📈 Users with XP > 0 by week:');
  console.log('================================');
  Object.keys(weekCounts)
    .sort((a, b) => parseInt(a) - parseInt(b))
    .forEach(week => {
      const count = weekCounts[week].size;
      console.log(`Week ${week}: ${count} users`);
    });
  
  return weekCounts;
}

// Main execution
async function main() {
  try {
    console.log('🔄 Starting comprehensive data fetch...\n');
    
    let profileId = 1;
    let batchNumber = 1;
    
    while (consecutiveEmpty < MAX_CONSECUTIVE_EMPTY) {
      const batch = [];
      for (let i = 0; i < BATCH_SIZE; i++) {
        batch.push(profileId + i);
      }
      
      const successCount = await processBatch(batch);
      
      if (successCount === 0) {
        consecutiveEmpty += BATCH_SIZE;
      } else {
        consecutiveEmpty = 0;
      }
      
      processedCount += BATCH_SIZE;
      profileId += BATCH_SIZE;
      batchNumber++;
      
      // Progress update
      if (batchNumber % 10 === 0) {
        const elapsed = (Date.now() - startTime) / 1000;
        const rate = processedCount / elapsed;
        console.log(`📊 Progress: ${processedCount} profiles checked, ${allProfiles.size} found, ${consecutiveEmpty}/${MAX_CONSECUTIVE_EMPTY} consecutive empty, ${rate.toFixed(1)} profiles/sec`);
      }
      
      // Add delay between batches
      if (consecutiveEmpty < MAX_CONSECUTIVE_EMPTY) {
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }
    }
    
    console.log(`\n🛑 Stopping: ${consecutiveEmpty} consecutive empty profiles`);
    
    // Save data
    saveDataToCSV();
    
    // Count recipients
    const weekCounts = countWeeklyRecipients();
    
    // Final summary
    const elapsed = (Date.now() - startTime) / 1000;
    console.log('\n🎉 COMPREHENSIVE FETCH COMPLETED!');
    console.log('=====================================');
    console.log(`📊 Total profiles checked: ${processedCount}`);
    console.log(`✅ Total profiles found: ${allProfiles.size}`);
    console.log(`📈 Total weekly records: ${allWeeklyData.length}`);
    console.log(`⏱️  Duration: ${elapsed.toFixed(1)}s`);
    console.log(`📊 Rate: ${(processedCount / elapsed).toFixed(1)} profiles/sec`);
    console.log(`📊 Valid rate: ${(allProfiles.size / elapsed).toFixed(1)} valid profiles/sec`);
    
    // Focus on Week 12 and 13
    console.log('\n🎯 Week 12 and 13 Analysis:');
    console.log('============================');
    const week12Count = weekCounts['12'] ? weekCounts['12'].size : 0;
    const week13Count = weekCounts['13'] ? weekCounts['13'].size : 0;
    console.log(`Week 12: ${week12Count} users with XP > 0`);
    console.log(`Week 13: ${week13Count} users with XP > 0`);
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

// Run the comprehensive fetch
main();

