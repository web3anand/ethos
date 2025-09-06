import ethosApiClient from '../utils/ethosApiClient.js';

async function inspectRawData() {
  console.log('🔍 INSPECTING RAW ETHOS API DATA');
  console.log('===============================');

  const testUser = {
    profileId: 10953,
    username: 'fritzlang',
    displayName: 'Fritz Lang',
    score: 1043
  };

  try {
    // Test basic getUserStats call
    console.log('\n1️⃣ TESTING BASIC getUserStats');
    console.log('===============================');
    
    const basicStats = await ethosApiClient.getUserStats(testUser.profileId);
    console.log('Basic stats structure:', JSON.stringify(basicStats, null, 2));
    
    // Test if there are other endpoints that might work
    console.log('\n2️⃣ TESTING ALTERNATIVE API ENDPOINTS');
    console.log('======================================');
    
    // Try different ID formats and API versions
    const alternatives = [
      `https://api.ethos.network/api/v1/reviews?author=${testUser.profileId}`,
      `https://api.ethos.network/api/v1/reviews?subject=${testUser.profileId}`,
      `https://api.ethos.network/api/v1/profiles/${testUser.profileId}/reviews`,
      `https://api.ethos.network/api/v1/attestations?attester=${testUser.profileId}`,
      `https://api.ethos.network/api/v1/attestations?attestee=${testUser.profileId}`,
      `https://api.ethos.network/api/v1/users/${testUser.profileId}`,
      `https://api.ethos.network/api/v1/user/${testUser.profileId}`,
    ];

    for (const url of alternatives) {
      try {
        console.log(`\nTrying: ${url}`);
        const response = await fetch(url);
        console.log(`Status: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log('✅ SUCCESS! Data:', JSON.stringify(data, null, 2));
        } else {
          const errorText = await response.text();
          console.log('❌ Failed:', errorText.substring(0, 200) + '...');
        }
      } catch (error) {
        console.log('❌ Error:', error.message);
      }
    }

    console.log('\n3️⃣ TESTING USERNAME-BASED ENDPOINTS');
    console.log('====================================');
    
    // Try with username instead of profileId
    const usernameAlternatives = [
      `https://api.ethos.network/api/v1/reviews?author=${testUser.username}`,
      `https://api.ethos.network/api/v1/reviews?subject=${testUser.username}`,
      `https://api.ethos.network/api/v1/profiles/${testUser.username}`,
      `https://api.ethos.network/api/v1/users/${testUser.username}`,
    ];

    for (const url of usernameAlternatives) {
      try {
        console.log(`\nTrying: ${url}`);
        const response = await fetch(url);
        console.log(`Status: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log('✅ SUCCESS! Data:', JSON.stringify(data, null, 2));
        }
      } catch (error) {
        console.log('❌ Error:', error.message);
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

inspectRawData();
