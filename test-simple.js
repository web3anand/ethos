// Simple test to create CSV files
import fs from 'fs';
import path from 'path';

const API_BASE_URL = 'https://api.ethos.network/api/v2';
const HEADERS = {
  'Content-Type': 'application/json',
  'X-Ethos-Client': 'ethos-website-incremental-updater'
};

const CSV_DIR = './data/csv';
const PROFILES_FILE = path.join(CSV_DIR, 'comprehensive_profiles.csv');
const WEEKLY_XP_FILE = path.join(CSV_DIR, 'comprehensive_weekly_xp.csv');

// Ensure CSV directory exists
if (!fs.existsSync(CSV_DIR)) {
  fs.mkdirSync(CSV_DIR, { recursive: true });
}

async function fetchProfile(profileId) {
  try {
    const response = await fetch(`${API_BASE_URL}/users/by/profile-id`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ profileIds: [profileId] })
    });
    
    if (!response.ok) return null;
    const data = await response.json();
    return Array.isArray(data) && data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error(`Error fetching profile ${profileId}:`, error.message);
    return null;
  }
}

async function fetchXp(profileId) {
  try {
    const response = await fetch(`${API_BASE_URL}/xp/user/profileId:${profileId}`, {
      headers: HEADERS
    });
    
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error(`Error fetching XP for ${profileId}:`, error.message);
    return null;
  }
}

async function fetchWeeklyXp(profileId, season) {
  try {
    const response = await fetch(`${API_BASE_URL}/xp/user/profileId:${profileId}/season/${season}/weekly`, {
      headers: HEADERS
    });
    
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error(`Error fetching weekly XP for ${profileId} season ${season}:`, error.message);
    return [];
  }
}

async function main() {
  console.log('🚀 Starting simple test...');
  
  const profiles = [];
  const weeklyXp = [];
  
  // Test profiles 1-10
  for (let profileId = 1; profileId <= 10; profileId++) {
    console.log(`Processing profile ${profileId}...`);
    
    const profileData = await fetchProfile(profileId);
    if (!profileData) {
      console.log(`  ❌ Profile ${profileId} not found`);
      continue;
    }
    
    console.log(`  ✅ Found: ${profileData.displayName}`);
    
    const xpData = await fetchXp(profileId);
    const totalXp = xpData?.totalXp || 0;
    
    // Create profile record
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
      is_validator: (profileData.userkeys && profileData.userkeys.some(k => k.startsWith('address:'))) || false,
      season_0_xp: xpData?.seasons?.[0]?.totalXp || 0,
      season_1_xp: xpData?.seasons?.[1]?.totalXp || 0,
      season_0_weeks: xpData?.seasons?.[0]?.weeks || 0,
      season_1_weeks: xpData?.seasons?.[1]?.weeks || 0,
      status: 'active',
      userkeys_count: profileData.userkeys?.length || 0,
      eth_addresses: profileData.userkeys?.filter(k => k.startsWith('address:')).length || 0
    };
    
    profiles.push(profile);
    
    // Fetch weekly XP for both seasons
    for (const season of [0, 1]) {
      const weeklyData = await fetchWeeklyXp(profileId, season);
      console.log(`  📊 Season ${season}: ${weeklyData.length} weekly records`);
      
      for (const week of weeklyData) {
        weeklyXp.push({
          profile_id: profileId,
          userkey: `profileId:${profileId}`,
          season: season,
          week: week.week,
          weekly_xp: week.weeklyXp || 0,
          cumulative_xp: week.cumulativeXp || 0
        });
      }
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`\n📊 Found ${profiles.length} profiles, ${weeklyXp.length} weekly records`);
  
  // Save profiles CSV
  if (profiles.length > 0) {
    const csvHeader = Object.keys(profiles[0]).join(',');
    const csvRows = profiles.map(p => Object.values(p).map(v => 
      typeof v === 'string' && v.includes(',') ? `"${v}"` : v
    ).join(','));
    
    const csvContent = [csvHeader, ...csvRows].join('\n');
    fs.writeFileSync(PROFILES_FILE, csvContent);
    console.log(`✅ Saved ${profiles.length} profiles to ${PROFILES_FILE}`);
  }
  
  // Save weekly XP CSV
  if (weeklyXp.length > 0) {
    const csvHeader = Object.keys(weeklyXp[0]).join(',');
    const csvRows = weeklyXp.map(w => Object.values(w).join(','));
    
    const csvContent = [csvHeader, ...csvRows].join('\n');
    fs.writeFileSync(WEEKLY_XP_FILE, csvContent);
    console.log(`✅ Saved ${weeklyXp.length} weekly records to ${WEEKLY_XP_FILE}`);
  }
  
  console.log('🎉 Test complete!');
}

main().catch(console.error);
