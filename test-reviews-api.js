// Test script to explore Ethos API endpoints for reviews given data
async function testEthosAPI() {
  const baseUrlV2 = 'https://api.ethos.network/api/v2';
  const profileId = 5476; // hashvalue's profile ID
  
  const endpoints = [
    `/profiles/${profileId}/reviews`,
    `/profiles/${profileId}/activities`,
    `/profiles/${profileId}/reviews/given`,
    `/profiles/${profileId}/reviews/received`,
    `/reviews/profile/${profileId}`,
    `/activities/profile/${profileId}`,
    `/users/${profileId}/reviews`,
    `/users/${profileId}/activities`
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`\n🔍 Testing: ${baseUrlV2}${endpoint}`);
      const response = await fetch(`${baseUrlV2}${endpoint}`, {
        headers: {
          'X-Ethos-Client': 'ethos-app-dev'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ SUCCESS: Found data`);
        console.log(`📊 Data keys:`, Object.keys(data));
        
        if (data.data && Array.isArray(data.data)) {
          console.log(`📈 Array length: ${data.data.length}`);
          if (data.data.length > 0) {
            console.log(`📋 First item keys:`, Object.keys(data.data[0]));
          }
        }
      } else {
        console.log(`❌ ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.log(`💥 Error:`, error.message);
    }
  }
}

testEthosAPI().catch(console.error);
