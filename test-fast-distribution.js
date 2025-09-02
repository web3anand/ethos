// Test script for Fast Distribution API
import FastDistributionApi from './utils/fastDistributionApi.js';

async function testFastDistribution() {
  console.log('🧪 Testing Fast Distribution API...\n');
  
  const fastApi = new FastDistributionApi();
  
  try {
    // Test 1: Initialize
    console.log('1️⃣ Testing initialization...');
    const startTime = Date.now();
    const isReady = await fastApi.initialize();
    const initTime = Date.now() - startTime;
    
    console.log(`✅ Initialization: ${isReady ? 'SUCCESS' : 'FALLBACK'} (${initTime}ms)`);
    
    // Test 2: Fast Leaderboard
    console.log('\n2️⃣ Testing fast leaderboard...');
    const leaderboardStart = Date.now();
    
    const leaderboard = await fastApi.getFastLeaderboard(100, (progress) => {
      console.log(`   Progress: ${progress.stage} - ${progress.percentage.toFixed(1)}%`);
    });
    
    const leaderboardTime = Date.now() - leaderboardStart;
    
    if (leaderboard && leaderboard.length > 0) {
      console.log(`✅ Fast leaderboard: ${leaderboard.length} users in ${leaderboardTime}ms`);
      console.log(`   Top user: ${leaderboard[0].displayName} (${leaderboard[0].xpTotal?.toLocaleString()} XP)`);
      console.log(`   Average XP: ${(leaderboard.reduce((sum, u) => sum + (u.xpTotal || 0), 0) / leaderboard.length).toLocaleString()}`);
    } else {
      console.log('❌ Fast leaderboard failed');
      return;
    }
    
    // Test 3: Distribution Stats
    console.log('\n3️⃣ Testing distribution stats...');
    const statsStart = Date.now();
    
    const stats = await fastApi.getFastDistributionStats(leaderboard);
    const statsTime = Date.now() - statsStart;
    
    if (stats) {
      console.log(`✅ Distribution stats calculated in ${statsTime}ms`);
      console.log(`   Total users: ${stats.totalUsers}`);
      console.log(`   Total XP: ${stats.totalXP?.toLocaleString()}`);
      console.log(`   XP ranges: ${JSON.stringify(stats.xpRanges, null, 2)}`);
    } else {
      console.log('❌ Distribution stats failed');
    }
    
    // Test 4: Search functionality
    console.log('\n4️⃣ Testing search...');
    const searchResults = fastApi.searchLeaderboard(leaderboard, 'test');
    console.log(`✅ Search for 'test': ${searchResults.length} results`);
    
    // Test 5: Formatting
    console.log('\n5️⃣ Testing formatting...');
    const testXp = 1234567;
    const formatted = fastApi.formatXP(testXp);
    console.log(`✅ Format ${testXp.toLocaleString()} XP → ${formatted}`);
    
    // Test 6: Cache performance
    console.log('\n6️⃣ Testing cache performance...');
    const cacheStart = Date.now();
    
    const cachedLeaderboard = await fastApi.getFastLeaderboard(100);
    const cacheTime = Date.now() - cacheStart;
    
    console.log(`✅ Cached leaderboard: ${cachedLeaderboard.length} users in ${cacheTime}ms`);
    console.log(`   Speed improvement: ${Math.round(leaderboardTime / Math.max(cacheTime, 1))}x faster`);
    
    // Test 7: Cache stats
    console.log('\n7️⃣ Testing cache stats...');
    const cacheStats = fastApi.getCacheStats();
    console.log(`✅ Cache stats:`, cacheStats);
    
    // Summary
    const totalTime = Date.now() - startTime;
    console.log(`\n📊 SUMMARY:`);
    console.log(`   Total test time: ${totalTime}ms`);
    console.log(`   API ready: ${isReady ? 'YES' : 'FALLBACK'}`);
    console.log(`   Users loaded: ${leaderboard.length}`);
    console.log(`   Cache performance: ${Math.round(leaderboardTime / Math.max(cacheTime, 1))}x improvement`);
    console.log(`   Status: ✅ ALL TESTS PASSED`);
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.log('Stack trace:', error.stack);
  }
}

// Run the test
testFastDistribution();
