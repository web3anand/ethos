import ForceRefreshSync from './force-refresh-sync.js';

console.log('🧪 Testing Force Refresh Sync...');

try {
  const sync = new ForceRefreshSync();
  console.log('✅ ForceRefreshSync instance created successfully');
  
  // Test a small batch first
  console.log('🔍 Testing with profile IDs 1-10...');
  const testProfileIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  
  const profiles = await sync.fetchProfilesFromAPI(testProfileIds);
  console.log(`📊 Fetched ${profiles.length} profiles from API`);
  
  if (profiles.length > 0) {
    console.log('📋 Sample profile:', {
      id: profiles[0].id,
      username: profiles[0].username,
      score: profiles[0].score,
      xpTotal: profiles[0].xpTotal
    });
  }
  
  sync.close();
  console.log('✅ Test completed successfully');
  
} catch (error) {
  console.error('❌ Test failed:', error);
}
