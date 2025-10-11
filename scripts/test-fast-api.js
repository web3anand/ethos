import FastDistributionApi from '../utils/fastDistributionApi.js';

console.log('🧪 Testing Fast API with updated data...');

try {
  const fastApi = new FastDistributionApi();
  
  console.log('📊 Getting distribution stats...');
  const stats = await fastApi.getFastDistributionStats();
  
  console.log('📈 Distribution Stats:');
  console.log(`  Total Users: ${stats.totalUsers?.toLocaleString() || 'N/A'}`);
  console.log(`  Total XP: ${stats.totalXp?.toLocaleString() || 'N/A'}`);
  console.log(`  Average Score: ${stats.averageScore?.toFixed(2) || 'N/A'}`);
  console.log(`  Top Score: ${stats.topScore?.toLocaleString() || 'N/A'}`);
  
  console.log('\n📊 Getting leaderboard data...');
  const leaderboard = await fastApi.getFastLeaderboard(100000);
  
  console.log(`📈 Leaderboard: ${leaderboard.length} profiles loaded`);
  
  if (leaderboard.length > 0) {
    console.log('📋 Top 3 profiles:');
    leaderboard.slice(0, 3).forEach((profile, index) => {
      console.log(`  ${index + 1}. ${profile.username || 'No username'} - Score: ${profile.score || 0}, XP: ${profile.xpTotal || 0}`);
    });
  }
  
} catch (error) {
  console.error('❌ Test failed:', error);
}
