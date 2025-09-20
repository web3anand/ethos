// Test 50ms delay with 500 batch size
import fetch from 'node-fetch';

const CONFIG = {
  ETHOS_API_BASE: 'https://api.ethos.network/api/v2/xp/user',
  SEASON_ID: 1,
  WEEK: 13,
  DELAY_BETWEEN_REQUESTS: 50 // 50ms delay
};

async function fetchUserWeek13Data(profileId) {
  try {
    // Add delay between requests
    await new Promise(resolve => setTimeout(resolve, CONFIG.DELAY_BETWEEN_REQUESTS));
    
    const url = `${CONFIG.ETHOS_API_BASE}/profileId:${profileId}/season/${CONFIG.SEASON_ID}/weekly`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Ethos-Week13-Test/1.0'
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null; // User not found
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data && Array.isArray(data)) {
      const week13Data = data.find(week => week.week === CONFIG.WEEK);
      
      if (week13Data && week13Data.weeklyXp > 0) {
        return {
          profile_id: profileId,
          week: week13Data.week,
          weekly_xp: week13Data.weeklyXp,
          cumulative_xp: week13Data.cumulativeXp || 0,
          total_weeks: data.length
        };
      }
    }
    
    return null;
    
  } catch (error) {
    console.error(`❌ Error fetching profile ${profileId}:`, error.message);
    return null;
  }
}

async function testSequential() {
  console.log('🧪 Testing 50ms delay with sequential requests...\n');
  
  const profileIds = [5000, 5001, 5002, 5003, 5004, 5005, 5006, 5007, 5008, 5009];
  
  const startTime = Date.now();
  const results = [];
  
  for (const profileId of profileIds) {
    console.log(`📡 Fetching profile ${profileId}...`);
    const result = await fetchUserWeek13Data(profileId);
    results.push(result);
    
    if (result) {
      console.log(`✅ Profile ${profileId}: ${result.weekly_xp} XP`);
    } else {
      console.log(`📊 Profile ${profileId}: No Week 13 XP`);
    }
  }
  
  const endTime = Date.now();
  const validResults = results.filter(result => result !== null);
  
  console.log('\n📊 TEST RESULTS:');
  console.log(`   Profiles tested: ${profileIds.length}`);
  console.log(`   Week 13 recipients: ${validResults.length}`);
  console.log(`   Duration: ${endTime - startTime}ms`);
  console.log(`   Delay per request: ${CONFIG.DELAY_BETWEEN_REQUESTS}ms`);
  
  if (validResults.length > 0) {
    console.log('\n✅ Week 13 recipients found:');
    validResults.forEach((user, index) => {
      console.log(`   ${index + 1}. Profile ${user.profile_id}: ${user.weekly_xp.toLocaleString()} XP`);
    });
  }
  
  console.log('\n🎉 Sequential test completed!');
}

testSequential().catch(console.error);
