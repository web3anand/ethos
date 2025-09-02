import ethosApiClient from './utils/ethosApiClient.js';

console.log('🔧 Testing what API returns for profile IDs...');

async function testProfileIds() {
  const testIds = [1, 2, 3, 4, 5, 10, 14, 22];
  
  for (const id of testIds) {
    console.log(`\n🔍 Testing profile ID: ${id}`);
    
    try {
      // Try method 1
      const result1 = await ethosApiClient.getUserByUsernameV2(id.toString());
      console.log(`   Method 1 (getUserByUsernameV2):`, result1 ? 'Found' : 'Not found');
      if (result1) {
        console.log(`   Fields:`, Object.keys(result1));
        console.log(`   Sample data:`, {
          username: result1.username,
          primaryAddr: result1.primaryAddr,
          address: result1.address,
          userkey: result1.userkey,
          id: result1.id,
          score: result1.score
        });
      }
    } catch (error) {
      console.log(`   Method 1 error:`, error.message);
    }
    
    try {
      // Try method 2
      const result2 = await ethosApiClient.getUserByXUsernameV2(id.toString());
      console.log(`   Method 2 (getUserByXUsernameV2):`, result2 ? 'Found' : 'Not found');
      if (result2) {
        console.log(`   Fields:`, Object.keys(result2));
        console.log(`   Sample data:`, {
          username: result2.username,
          primaryAddr: result2.primaryAddr,
          address: result2.address,
          userkey: result2.userkey,
          id: result2.id,
          score: result2.score
        });
      }
    } catch (error) {
      console.log(`   Method 2 error:`, error.message);
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

testProfileIds();
