import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Verifying weekly counts against Ethos API...\n');

// Configuration
const ETHOS_API_BASE = 'https://api.ethos.network/api/v2/xp/user';
const SEASON_ID = 1;
const TARGET_WEEK_12 = 1998;
const TARGET_WEEK_13 = 2498;

// Sample of profile IDs to check (from different ranges)
const SAMPLE_PROFILE_IDS = [
  // Low range (1-1000)
  1, 2, 3, 5, 6, 9, 10, 13, 15, 17, 19, 20, 21, 23, 30, 49, 50, 61, 74, 124, 133,
  
  // Mid range (1000-10000)
  1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000,
  
  // High range (10000-50000)
  10000, 15000, 20000, 25000, 30000, 35000, 40000, 45000, 50000,
  
  // Very high range (50000+)
  55000, 60000, 65000, 70000, 75000, 80000, 85000, 90000, 95000, 100000
];

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

// Function to get XP amount for specific week
function getWeekXP(weeklyData, week) {
  if (!Array.isArray(weeklyData)) return 0;
  
  const weekData = weeklyData.find(w => w.week === week);
  return weekData ? (parseInt(weekData.weekly_xp) || 0) : 0;
}

// Function to verify counts
async function verifyWeeklyCounts() {
  console.log('📊 Checking sample profiles for Week 12 and 13 XP...\n');
  
  const week12Profiles = [];
  const week13Profiles = [];
  const checkedProfiles = [];
  
  for (const profileId of SAMPLE_PROFILE_IDS) {
    console.log(`🔍 Checking profile ${profileId}...`);
    
    const weeklyData = await fetchProfileWeeklyData(profileId);
    
    if (weeklyData) {
      const hasWeek12 = hasWeekXP(weeklyData, 12);
      const hasWeek13 = hasWeekXP(weeklyData, 13);
      const week12XP = getWeekXP(weeklyData, 12);
      const week13XP = getWeekXP(weeklyData, 13);
      
      checkedProfiles.push({
        profileId,
        hasWeek12,
        hasWeek13,
        week12XP,
        week13XP
      });
      
      if (hasWeek12) {
        week12Profiles.push({ profileId, xp: week12XP });
        console.log(`  ✅ Week 12: ${week12XP} XP`);
      }
      
      if (hasWeek13) {
        week13Profiles.push({ profileId, xp: week13XP });
        console.log(`  ✅ Week 13: ${week13XP} XP`);
      }
      
      if (!hasWeek12 && !hasWeek13) {
        console.log(`  ❌ No Week 12 or 13 XP`);
      }
    } else {
      console.log(`  ❌ Profile not found`);
    }
    
    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('\n📊 VERIFICATION RESULTS:');
  console.log('========================');
  console.log(`Profiles checked: ${checkedProfiles.length}`);
  console.log(`Week 12 profiles found: ${week12Profiles.length}`);
  console.log(`Week 13 profiles found: ${week13Profiles.length}`);
  
  console.log('\n🎯 Week 12 profiles:');
  week12Profiles.forEach(p => console.log(`  Profile ${p.profileId}: ${p.xp} XP`));
  
  console.log('\n🎯 Week 13 profiles:');
  week13Profiles.forEach(p => console.log(`  Profile ${p.profileId}: ${p.xp} XP`));
  
  // Check if we're missing profiles in our current data
  console.log('\n🔍 Checking if these profiles are in our current CSV...');
  
  try {
    const csvPath = path.join(__dirname, '..', 'data', 'csv', 'comprehensive_weekly_xp.csv');
    const data = fs.readFileSync(csvPath, 'utf8');
    const lines = data.split('\n').slice(1).filter(line => line.trim());
    
    const csvProfiles = new Set();
    lines.forEach(line => {
      const [profile_id] = line.split(',');
      csvProfiles.add(profile_id);
    });
    
    console.log(`\n📋 Current CSV contains ${csvProfiles.size} unique profiles`);
    
    const missingFromCSV = week12Profiles.filter(p => !csvProfiles.has(p.profileId.toString()));
    if (missingFromCSV.length > 0) {
      console.log(`\n❌ Week 12 profiles missing from CSV: ${missingFromCSV.map(p => p.profileId).join(', ')}`);
    } else {
      console.log(`\n✅ All Week 12 sample profiles are in CSV`);
    }
    
    const missingFromCSV13 = week13Profiles.filter(p => !csvProfiles.has(p.profileId.toString()));
    if (missingFromCSV13.length > 0) {
      console.log(`\n❌ Week 13 profiles missing from CSV: ${missingFromCSV13.map(p => p.profileId).join(', ')}`);
    } else {
      console.log(`\n✅ All Week 13 sample profiles are in CSV`);
    }
    
  } catch (error) {
    console.error('❌ Error reading CSV:', error.message);
  }
}

// Run verification
verifyWeeklyCounts().catch(console.error);
