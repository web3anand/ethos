async function testV2API() {
  console.log('🔍 Testing Ethos v2 API...');
  
  try {
    // Test with profile IDs 1-10
    const profileIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    
    console.log(`📡 Fetching profiles: ${profileIds.join(', ')}`);
    
    const response = await fetch('https://api.ethos.network/api/v2/users/by/profile-id', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Ethos-Test/2.0'
      },
      body: JSON.stringify({
        profileIds: profileIds
      })
    });
    
    console.log(`📊 Response status: ${response.status}`);
    
    if (response.ok) {
      const profiles = await response.json();
      console.log(`✅ Found ${profiles.length} profiles`);
      
      if (profiles.length > 0) {
        console.log('\n📋 Sample profile data:');
        profiles.forEach((profile, index) => {
          console.log(`\n${index + 1}. Profile ID ${profile.id}:`);
          console.log(`   Username: ${profile.username || 'None'}`);
          console.log(`   Display Name: ${profile.displayName || 'None'}`);
          console.log(`   Score: ${profile.score || 0}`);
          console.log(`   XP Total: ${profile.xpTotal || 0}`);
          console.log(`   XP Streak Days: ${profile.xpStreakDays || 0}`);
          console.log(`   Status: ${profile.status || 'Unknown'}`);
        });
      }
    } else {
      console.log(`❌ API Error: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.log(`Error details: ${errorText}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
  
  console.log('\n🎯 V2 API test complete!');
}

testV2API().catch(console.error);
