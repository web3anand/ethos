#!/usr/bin/env node

// Test the optimized distribution API
import { ethosDistributionApi } from './utils/ethosDistributionApi.js';

async function testOptimizedApi() {
  console.log('🧪 Testing Optimized Distribution API...\n');
  
  try {
    console.log('1. Testing quick leaderboard (should be fast)...');
    const startTime = Date.now();
    const quickData = await ethosDistributionApi.getQuickLeaderboard();
    const quickTime = Date.now() - startTime;
    
    console.log(`✅ Quick leaderboard: ${quickData.length} users in ${quickTime}ms`);
    if (quickData.length > 0) {
      console.log(`Top user: ${quickData[0].displayName} - ${quickData[0].xpTotal.toLocaleString()} XP`);
    }
    
    console.log('\n2. Testing progressive loading (first 500 users)...');
    let progressCount = 0;
    const progressStart = Date.now();
    
    const progressiveData = await ethosDistributionApi.getLeaderboardData(
      500,
      (progress) => {
        progressCount++;
        if (progressCount % 5 === 0) { // Log every 5th update
          console.log(`   Progress: ${progress.processed}/${progress.target} (${progress.percentage.toFixed(1)}%) - Query: "${progress.query}"`);
        }
      }
    );
    
    const progressiveTime = Date.now() - progressStart;
    console.log(`✅ Progressive loading: ${progressiveData.length} users in ${progressiveTime}ms`);
    
    // Show distribution stats
    const ranges = ethosDistributionApi.getXpDistributionRanges(progressiveData);
    console.log('\nXP Distribution (500 users):');
    Object.entries(ranges).forEach(([range, count]) => {
      if (count > 0) {
        console.log(`  ${range}: ${count} users`);
      }
    });
    
    console.log('\n3. Testing search functionality...');
    const searchResults = ethosDistributionApi.searchInLeaderboard(progressiveData, 'crypto');
    console.log(`Search for "crypto": ${searchResults.length} results`);
    
    console.log('\n✅ All optimized tests completed successfully!');
    console.log(`Quick load: ${quickTime}ms, Progressive load: ${progressiveTime}ms`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testOptimizedApi();
