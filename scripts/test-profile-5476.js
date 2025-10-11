async function testProfile5476() {
  console.log('🔍 Testing profile ID 5476 with v2 API...');
  
  try {
    const response = await fetch('https://api.ethos.network/api/v2/users/by/profile-id', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Ethos-Test/2.0'
      },
      body: JSON.stringify({
        profileIds: [5476]
      })
    });
    
    console.log(`📊 Response status: ${response.status}`);
    
    if (response.ok) {
      const profiles = await response.json();
      console.log(`✅ Found ${profiles.length} profiles`);
      
      if (profiles.length > 0) {
        const profile = profiles[0];
        console.log('\n📋 Profile 5476 data:');
        console.log(`  ID: ${profile.id}`);
        console.log(`  Profile ID: ${profile.profileId}`);
        console.log(`  Username: ${profile.username || 'None'}`);
        console.log(`  Display Name: ${profile.displayName || 'None'}`);
        console.log(`  Score: ${profile.score || 0}`);
        console.log(`  XP Total: ${profile.xpTotal || 0}`);
        console.log(`  XP Streak Days: ${profile.xpStreakDays || 0}`);
        console.log(`  Status: ${profile.status || 'Unknown'}`);
        console.log(`  Avatar URL: ${profile.avatarUrl || 'None'}`);
        console.log(`  Description: ${profile.description || 'None'}`);
        
        if (profile.stats) {
          console.log('\n📊 Stats:');
          if (profile.stats.review) {
            console.log(`  Reviews received: ${JSON.stringify(profile.stats.review.received)}`);
          }
          if (profile.stats.vouch) {
            console.log(`  Vouches given: ${profile.stats.vouch.given?.count || 0}`);
            console.log(`  Vouches received: ${profile.stats.vouch.received?.count || 0}`);
          }
        }
      } else {
        console.log('❌ No profile found with ID 5476');
      }
    } else {
      console.log(`❌ API Error: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.log(`Error details: ${errorText}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
  
  console.log('\n🎯 Profile 5476 test complete!');
}

testProfile5476().catch(console.error);
