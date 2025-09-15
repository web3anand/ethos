async function testFrontendDebug() {
  console.log('🔍 Testing frontend debug...\n');
  
  try {
    // Test the exact API call that the frontend makes
    const params = new URLSearchParams({
      offset: '0',
      limit: '25',
      clearCache: 'true',
      _t: Date.now(),
      _r: Math.random(),
      season: '0',
      week: '0',
      search: 'hashvalue'
    });
    
    console.log('📊 Testing frontend API call:');
    console.log(`URL: /api/csv-weekly-xp?${params}`);
    
    const response = await fetch(`http://localhost:3001/api/csv-weekly-xp?${params}`);
    const data = await response.json();
    
    console.log('\n✅ API Response:');
    console.log(`Status: ${response.status}`);
    console.log(`Total profiles: ${data.total}`);
    console.log(`Profiles returned: ${data.profiles.length}`);
    
    if (data.profiles[0]) {
      const user = data.profiles[0];
      console.log('\n👤 First user (hashvalue):');
      console.log(`Username: ${user.username}`);
      console.log(`Rank: #${user.rank}`);
      console.log(`Weekly XP: ${user.weekly_xp}`);
      console.log(`Cumulative XP: ${user.cumulative_xp}`);
      console.log(`Season ID: ${user.season_id}`);
      console.log(`Week: ${user.week}`);
      
      console.log('\n🎯 Expected vs Actual:');
      console.log(`Expected Weekly XP: 72,198, Got: ${user.weekly_xp} ${user.weekly_xp === 72198 ? '✅' : '❌'}`);
      console.log(`Expected Rank: #993, Got: #${user.rank} ${user.rank === 993 ? '✅' : '❌'}`);
    }
    
    // Also test without search to see the full dataset
    console.log('\n📊 Testing without search (full dataset):');
    const params2 = new URLSearchParams({
      offset: '0',
      limit: '25',
      clearCache: 'true',
      _t: Date.now(),
      _r: Math.random(),
      season: '0',
      week: '0'
    });
    
    const response2 = await fetch(`http://localhost:3001/api/csv-weekly-xp?${params2}`);
    const data2 = await response2.json();
    
    console.log(`Total profiles: ${data2.total}`);
    console.log(`Profiles returned: ${data2.profiles.length}`);
    
    if (data2.profiles[0]) {
      const user = data2.profiles[0];
      console.log('\n👤 Top user:');
      console.log(`Username: ${user.username}`);
      console.log(`Rank: #${user.rank}`);
      console.log(`Weekly XP: ${user.weekly_xp}`);
      console.log(`Cumulative XP: ${user.cumulative_xp}`);
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

testFrontendDebug();
