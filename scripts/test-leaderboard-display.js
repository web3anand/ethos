import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Testing leaderboard display logic...\n');

// Simulate the frontend state
const selectedSeason = '1';
const selectedWeek = '13';
const weeklySearchTerm = '';

console.log(`📊 Test parameters:`);
console.log(`   Season: ${selectedSeason}`);
console.log(`   Week: ${selectedWeek}`);
console.log(`   Search: "${weeklySearchTerm}"\n`);

// Test API call
async function testApiCall() {
  try {
    const params = new URLSearchParams({
      offset: '0',
      limit: '25',
      clearCache: 'true',
      _t: Date.now(),
      _r: Math.random()
    });
    
    if (selectedSeason !== undefined && selectedSeason !== null && selectedSeason !== '') {
      params.append('season', selectedSeason);
    }
    if (selectedWeek !== undefined && selectedWeek !== null && selectedWeek !== '') {
      params.append('week', selectedWeek);
    }
    if (weeklySearchTerm) {
      params.append('search', weeklySearchTerm);
    }
    
    console.log(`🔍 API Parameters: ${params.toString()}`);
    
    const response = await fetch(`http://localhost:3000/api/csv-weekly-xp?${params}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
    if (!response.ok) {
      console.error(`❌ API Error: ${response.status} ${response.statusText}`);
      return;
    }
    
    const data = await response.json();
    
    console.log(`✅ API Response:`);
    console.log(`   Total profiles: ${data.total}`);
    console.log(`   Profiles returned: ${data.profiles.length}`);
    console.log(`   Seasons available: ${data.seasons.length}`);
    console.log(`   Weeks available: ${data.weeks.length}`);
    
    if (data.profiles.length > 0) {
      console.log(`\n🎯 First 3 profiles:`);
      data.profiles.slice(0, 3).forEach((profile, index) => {
        console.log(`   ${index + 1}. ${profile.username} (${profile.display_name}) - Rank #${profile.rank}, Week ${profile.week} XP: ${profile.weekly_xp}`);
      });
    }
    
    // Test the display logic
    console.log(`\n🔍 Display Logic Test:`);
    console.log(`   weeklyData.length: ${data.profiles.length}`);
    console.log(`   weeklyLoading: false`);
    console.log(`   Should show data: ${data.profiles.length > 0 ? 'YES' : 'NO'}`);
    console.log(`   Should show "No data found": ${data.profiles.length === 0 ? 'YES' : 'NO'}`);
    
  } catch (error) {
    console.error('❌ Error testing API:', error.message);
  }
}

// Run the test
testApiCall();
