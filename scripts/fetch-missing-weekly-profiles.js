import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Fetching missing weekly profiles...\n');

// Configuration
const ETHOS_API_BASE = 'https://api.ethos.network/api/v2/xp/user';
const SEASON_ID = 1;
const TARGET_WEEK_12 = 1998;
const TARGET_WEEK_13 = 2498;
const CURRENT_WEEK_12 = 1978;
const CURRENT_WEEK_13 = 2460;

const MISSING_WEEK_12 = TARGET_WEEK_12 - CURRENT_WEEK_12;
const MISSING_WEEK_13 = TARGET_WEEK_13 - CURRENT_WEEK_13;

console.log(`📊 Missing profiles needed:`);
console.log(`   Week 12: ${MISSING_WEEK_12} users`);
console.log(`   Week 13: ${MISSING_WEEK_13} users\n`);

// Read existing profile IDs
const existingProfiles = new Set();
try {
  const csvPath = path.join(__dirname, '..', 'data', 'csv', 'comprehensive_weekly_xp.csv');
  const data = fs.readFileSync(csvPath, 'utf8');
  const lines = data.split('\n').slice(1).filter(line => line.trim());
  
  lines.forEach(line => {
    const [profile_id] = line.split(',');
    existingProfiles.add(profile_id);
  });
  
  console.log(`📋 Existing profiles in CSV: ${existingProfiles.size}`);
} catch (error) {
  console.log('⚠️  Could not read existing CSV data');
}

// Function to fetch profile weekly data
async function fetchProfileWeeklyData(profileId) {
  try {
    const response = await fetch(`${ETHOS_API_BASE}/profileId:${profileId}/season/${SEASON_ID}/weekly`, {
      headers: {
        'X-Ethos-Client': 'ethos-dashboard',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`❌ Error fetching profile ${profileId}:`, error.message);
    return null;
  }
}

// Function to check if profile has specific week XP
function hasWeekXP(weeklyData, week) {
  if (!Array.isArray(weeklyData)) return false;
  
  return weeklyData.some(weekData => 
    weekData.week === week && 
    weekData.weekly_xp && 
    parseInt(weekData.weekly_xp) > 0
  );
}

// Function to get XP data for specific week
function getWeekData(weeklyData, week) {
  if (!Array.isArray(weeklyData)) return null;
  
  return weeklyData.find(weekData => weekData.week === week);
}

// Function to find missing profiles
async function findMissingProfiles() {
  console.log('🔍 Searching for missing profiles...\n');
  
  const foundWeek12 = [];
  const foundWeek13 = [];
  let checked = 0;
  let consecutiveEmpty = 0;
  const maxConsecutiveEmpty = 2000;
  
  // Start from a higher range since we already checked up to 40,500
  const startProfileId = 40000;
  const maxProfileId = 100000;
  
  for (let profileId = startProfileId; profileId <= maxProfileId; profileId++) {
    // Skip if we already have this profile
    if (existingProfiles.has(profileId.toString())) {
      continue;
    }
    
    checked++;
    if (checked % 500 === 0) {
      console.log(`📊 Checked ${checked} profiles, found Week 12: ${foundWeek12.length}, Week 13: ${foundWeek13.length}`);
    }
    
    const weeklyData = await fetchProfileWeeklyData(profileId);
    
    if (!weeklyData) {
      consecutiveEmpty++;
      if (consecutiveEmpty >= maxConsecutiveEmpty) {
        console.log(`🛑 Stopping: ${consecutiveEmpty} consecutive empty profiles`);
        break;
      }
      continue;
    }
    
    consecutiveEmpty = 0;
    
    // Check for Week 12 and 13 XP
    if (hasWeekXP(weeklyData, 12)) {
      const weekData = getWeekData(weeklyData, 12);
      foundWeek12.push({
        profileId,
        weeklyXp: weekData.weekly_xp,
        cumulativeXp: weekData.cumulative_xp
      });
      console.log(`✅ Found Week 12 XP: Profile ${profileId} (${weekData.weekly_xp} XP)`);
    }
    
    if (hasWeekXP(weeklyData, 13)) {
      const weekData = getWeekData(weeklyData, 13);
      foundWeek13.push({
        profileId,
        weeklyXp: weekData.weekly_xp,
        cumulativeXp: weekData.cumulative_xp
      });
      console.log(`✅ Found Week 13 XP: Profile ${profileId} (${weekData.weekly_xp} XP)`);
    }
    
    // Stop if we found enough missing profiles
    if (foundWeek12.length >= MISSING_WEEK_12 && foundWeek13.length >= MISSING_WEEK_13) {
      console.log('🎉 Found all missing profiles!');
      break;
    }
    
    // Add small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  
  console.log('\n📊 SEARCH RESULTS:');
  console.log('==================');
  console.log(`Week 12 missing profiles found: ${foundWeek12.length}/${MISSING_WEEK_12}`);
  console.log(`Week 13 missing profiles found: ${foundWeek13.length}/${MISSING_WEEK_13}`);
  console.log(`Total profiles checked: ${checked}`);
  
  if (foundWeek12.length > 0) {
    console.log(`\n🎯 Week 12 profiles:`);
    foundWeek12.forEach(p => console.log(`  Profile ${p.profileId}: ${p.weeklyXp} XP (cumulative: ${p.cumulativeXp})`));
  }
  
  if (foundWeek13.length > 0) {
    console.log(`\n🎯 Week 13 profiles:`);
    foundWeek13.forEach(p => console.log(`  Profile ${p.profileId}: ${p.weeklyXp} XP (cumulative: ${p.cumulativeXp})`));
  }
  
  // Save results to file
  if (foundWeek12.length > 0 || foundWeek13.length > 0) {
    const results = {
      week12: foundWeek12,
      week13: foundWeek13,
      timestamp: new Date().toISOString(),
      checked: checked
    };
    
    const resultsPath = path.join(__dirname, '..', 'data', 'missing-weekly-profiles.json');
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    console.log(`\n💾 Results saved to: ${resultsPath}`);
  }
}

// Run the search
findMissingProfiles().catch(console.error);
