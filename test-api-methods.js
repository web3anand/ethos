// Quick test of Ethos API methods to diagnose the issue
import ethosApiClient from './utils/ethosApiClient.js';

async function testEthosApiMethods() {
  console.log('🔍 Testing Ethos API methods to diagnose the issue...\n');
  
  try {
    // Test 1: Try getting a user by a known method
    console.log('1. Testing getUserByUsernameV2 with "test"...');
    try {
      const testUser = await ethosApiClient.getUserByUsernameV2('test');
      console.log('✅ getUserByUsernameV2 works:', testUser ? 'Found user' : 'No user found');
    } catch (error) {
      console.log('❌ getUserByUsernameV2 failed:', error.message);
    }
    
    // Test 2: Try getting a user by X username
    console.log('\n2. Testing getUserByXUsernameV2 with "test"...');
    try {
      const xUser = await ethosApiClient.getUserByXUsernameV2('test');
      console.log('✅ getUserByXUsernameV2 works:', xUser ? 'Found user' : 'No user found');
    } catch (error) {
      console.log('❌ getUserByXUsernameV2 failed:', error.message);
    }
    
    // Test 3: Try the profiles/bulk endpoint
    console.log('\n3. Testing bulkGetProfiles...');
    try {
      const bulkProfiles = await ethosApiClient.bulkGetProfiles(['test']);
      console.log('✅ bulkGetProfiles works:', bulkProfiles ? `Found ${bulkProfiles.length} profiles` : 'No profiles found');
    } catch (error) {
      console.log('❌ bulkGetProfiles failed:', error.message);
    }
    
    // Test 4: Try a different search approach - get all profiles and search locally
    console.log('\n4. Testing getAllProfilesV2...');
    try {
      const allProfiles = await ethosApiClient.getAllProfilesV2(5); // Just get a few
      console.log('✅ getAllProfilesV2 works:', allProfiles ? `Found ${allProfiles.length} profiles` : 'No profiles found');
      
      if (allProfiles && allProfiles.length > 0) {
        console.log('📋 Sample profiles:');
        allProfiles.slice(0, 3).forEach((profile, i) => {
          console.log(`   ${i + 1}. ${profile.primaryAddr || profile.address} - Score: ${profile.score || 0}`);
        });
      }
    } catch (error) {
      console.log('❌ getAllProfilesV2 failed:', error.message);
    }
    
    // Test 5: Let's try directly making a request to see what's available
    console.log('\n5. Testing direct API endpoints...');
    try {
      const response = await fetch('https://api.ethos.network/api/v2/profiles?limit=5');
      const data = await response.json();
      console.log('✅ Direct API call:', response.status, data ? 'Got data' : 'No data');
      
      if (data && data.data && data.data.values) {
        console.log(`📊 Found ${data.data.values.length} profiles directly`);
      }
    } catch (error) {
      console.log('❌ Direct API call failed:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testEthosApiMethods();
