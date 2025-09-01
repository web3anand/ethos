#!/usr/bin/env node

// Test the new distribution API
import { ethosDistributionApi } from './utils/ethosDistributionApi.js';

async function testDistributionApi() {
  console.log('🧪 Testing Ethos Distribution API...\n');
  
  try {
    console.log('1. Testing leaderboard data fetch...');
    const leaderboard = await ethosDistributionApi.getLeaderboardData(50);
    console.log(`✅ Fetched ${leaderboard.length} users for leaderboard`);
    
    if (leaderboard.length > 0) {
      console.log('\nTop 5 users:');
      leaderboard.slice(0, 5).forEach((user, index) => {
        console.log(`${index + 1}. ${user.displayName} - ${user.xpTotal.toLocaleString()} XP (${user.xpPercentage.toFixed(3)}%)`);
      });
    }
    
    console.log('\n2. Testing XP distribution stats...');
    const stats = await ethosDistributionApi.getXpDistributionStats();
    if (stats) {
      console.log(`✅ Fetched stats for ${stats.totalSeasons} seasons`);
      console.log(`Current season: ${stats.currentSeason.name} (Week ${stats.currentSeason.week})`);
      
      stats.seasonStats.forEach(season => {
        console.log(`- ${season.seasonName}: ${season.totalWeeks} weeks`);
      });
    }
    
    console.log('\n3. Testing utility functions...');
    const totalXp = ethosDistributionApi.calculateTotalXp(leaderboard);
    console.log(`Total XP across all users: ${totalXp.toLocaleString()}`);
    console.log(`Formatted: ${ethosDistributionApi.formatXpToMillions(totalXp)}`);
    
    const ranges = ethosDistributionApi.getXpDistributionRanges(leaderboard);
    console.log('\nXP Distribution Ranges:');
    Object.entries(ranges).forEach(([range, count]) => {
      console.log(`- ${range}: ${count} users`);
    });
    
    console.log('\n4. Testing search functionality...');
    const searchResults = ethosDistributionApi.searchInLeaderboard(leaderboard, 'buz');
    console.log(`Search for "buz": ${searchResults.length} results`);
    if (searchResults.length > 0) {
      console.log(`Found: ${searchResults[0].displayName} at rank #${searchResults[0].rank}`);
    }
    
    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testDistributionApi();
