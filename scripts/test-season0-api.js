// Test script to verify Season 0 API functionality
import {
  getUserWeeklyXp,
  getUserSeasonXp,
  getAllSeasons,
  getSeasonWeeks,
  getUserTotalXp
} from '../utils/ethosStatsApi.js';

async function testSeason0Api() {
  console.log('🧪 Testing Season 0 API Integration...\n');
  
  const testUserkey = 'test-user'; // Replace with actual userkey for testing
  
  try {
    // Test 1: Get all seasons
    console.log('📅 Testing getAllSeasons...');
    const seasons = await getAllSeasons();
    console.log(`Found ${seasons.length} seasons:`);
    seasons.forEach(season => {
      console.log(`  - Season ${season.id}: ${season.name} (${season.startDate})`);
    });
    console.log('');
    
    // Test 2: Get Season 0 weeks
    console.log('📊 Testing getSeasonWeeks for Season 0...');
    const season0Weeks = await getSeasonWeeks(0);
    console.log(`Season 0 has ${season0Weeks.length} weeks:`);
    if (season0Weeks.length > 0) {
      console.log(`  - First week: ${season0Weeks[0].week} (${season0Weeks[0].startDate})`);
      console.log(`  - Last week: ${season0Weeks[season0Weeks.length - 1].week} (${season0Weeks[season0Weeks.length - 1].endDate})`);
    }
    console.log('');
    
    // Test 3: Get user's Season 0 XP
    console.log('🎯 Testing getUserSeasonXp for Season 0...');
    const season0Xp = await getUserSeasonXp(testUserkey, 0);
    console.log(`User's Season 0 XP: ${season0Xp.toLocaleString()}`);
    console.log('');
    
    // Test 4: Get user's weekly XP for Season 0
    console.log('📈 Testing getUserWeeklyXp for Season 0...');
    const season0WeeklyXp = await getUserWeeklyXp(testUserkey, 0);
    console.log(`Season 0 weekly data: ${season0WeeklyXp.length} entries`);
    if (season0WeeklyXp.length > 0) {
      console.log('Sample weekly data:');
      season0WeeklyXp.slice(0, 3).forEach(week => {
        console.log(`  - Week ${week.week}: ${week.weeklyXp} XP (cumulative: ${week.cumulativeXp})`);
      });
    }
    console.log('');
    
    // Test 5: Get user's total XP
    console.log('🏆 Testing getUserTotalXp...');
    const totalXp = await getUserTotalXp(testUserkey);
    console.log(`User's total XP across all seasons: ${totalXp.toLocaleString()}`);
    console.log('');
    
    console.log('✅ All Season 0 API tests completed successfully!');
    
    // Summary
    console.log('\n📋 Summary:');
    console.log(`- Total seasons available: ${seasons.length}`);
    console.log(`- Season 0 weeks: ${season0Weeks.length}`);
    console.log(`- Season 0 XP: ${season0Xp.toLocaleString()}`);
    console.log(`- Season 0 weekly entries: ${season0WeeklyXp.length}`);
    console.log(`- Total XP: ${totalXp.toLocaleString()}`);
    
  } catch (error) {
    console.error('❌ Error testing Season 0 API:', error);
  }
}

// Run the test
testSeason0Api();
