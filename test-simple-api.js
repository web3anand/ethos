import ethosApiClient from './utils/ethosApiClient.js';

console.log('🔧 Testing API connection...');

async function testApi() {
  try {
    console.log('📡 Calling getUserByUsernameV2("test")...');
    const result = await ethosApiClient.getUserByUsernameV2('test');
    console.log('✅ API call successful:', result ? 'User found' : 'No user found');
    
    console.log('📡 Calling getUserByUsernameV2("alice")...');
    const result2 = await ethosApiClient.getUserByUsernameV2('alice');
    console.log('✅ API call successful:', result2 ? 'User found' : 'No user found');
    
    if (result2) {
      console.log('📋 Sample user data:', {
        username: result2.username,
        primaryAddr: result2.primaryAddr,
        score: result2.score
      });
    }
    
  } catch (error) {
    console.error('❌ API test failed:', error.message);
  }
}

testApi();
