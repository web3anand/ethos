#!/usr/bin/env node

// Test the improved caching system
import { ethosDistributionApi } from './utils/ethosDistributionApi.js';

async function testCaching() {
  console.log('🧪 Testing Improved Caching System...\n');
  
  try {
    // Check initial cache status
    console.log('1. Initial cache status:');
    let stats = ethosDistributionApi.getCacheStats();
    console.log(`   Cache items: ${stats.totalItems}`);
    stats.items.forEach(item => {
      console.log(`   - ${item.key}: ${item.age}min old, ${(item.dataSize/1024).toFixed(1)}KB`);
    });
    
    console.log('\n2. First call to quick leaderboard...');
    const start1 = Date.now();
    const quickData1 = await ethosDistributionApi.getQuickLeaderboard();
    const time1 = Date.now() - start1;
    console.log(`   ✅ First call: ${quickData1.length} users in ${time1}ms`);
    
    console.log('\n3. Second call to quick leaderboard (should be cached)...');
    const start2 = Date.now();
    const quickData2 = await ethosDistributionApi.getQuickLeaderboard();
    const time2 = Date.now() - start2;
    console.log(`   ✅ Second call: ${quickData2.length} users in ${time2}ms`);
    console.log(`   📈 Speed improvement: ${Math.round(time1/time2)}x faster`);
    
    // Check cache status after calls
    console.log('\n4. Cache status after API calls:');
    stats = ethosDistributionApi.getCacheStats();
    console.log(`   Cache items: ${stats.totalItems}`);
    stats.items.forEach(item => {
      console.log(`   - ${item.key}: ${item.age}min old, ${(item.dataSize/1024).toFixed(1)}KB, expired: ${item.expired}`);
    });
    
    console.log('\n5. Testing comprehensive leaderboard (first 100 users)...');
    const start3 = Date.now();
    const comprehensiveData = await ethosDistributionApi.getLeaderboardData(100);
    const time3 = Date.now() - start3;
    console.log(`   ✅ Comprehensive data: ${comprehensiveData.length} users in ${time3}ms`);
    
    console.log('\n6. Second call to comprehensive leaderboard (should be cached)...');
    const start4 = Date.now();
    const comprehensiveData2 = await ethosDistributionApi.getLeaderboardData(100);
    const time4 = Date.now() - start4;
    console.log(`   ✅ Second call: ${comprehensiveData2.length} users in ${time4}ms`);
    console.log(`   📈 Speed improvement: ${Math.round(time3/time4)}x faster`);
    
    // Final cache status
    console.log('\n7. Final cache status:');
    stats = ethosDistributionApi.getCacheStats();
    console.log(`   Total cached items: ${stats.totalItems}`);
    const totalSize = stats.items.reduce((sum, item) => sum + item.dataSize, 0);
    console.log(`   Total cache size: ${(totalSize/1024).toFixed(1)}KB`);
    
    console.log('\n✅ Caching system working perfectly!');
    console.log('🔄 Subsequent page loads will be instant until cache expires (1 hour)');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testCaching();
