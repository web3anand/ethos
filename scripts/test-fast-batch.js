// Test the new fast batch configuration
import fetch from 'node-fetch';

const CONFIG = {
  ETHOS_API_BASE: 'https://api.ethos.network/api/v2/xp/user',
  SEASON_ID: 1,
  WEEK: 13,
  DELAY_BETWEEN_REQUESTS: 20, // 20ms delay
  CONCURRENCY: 3 // 3 concurrent requests
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
        'User-Agent': 'Ethos-Week13-Fast-Test/1.0',
        'X-Ethos-Client': 'ethos-week13-test@1.0.0'
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

async function testFastBatch() {
  console.log('🚀 Testing FAST batch configuration...\n');
  console.log(`⚡ Concurrency: ${CONFIG.CONCURRENCY} requests`);
  console.log(`⏱️  Delay: ${CONFIG.DELAY_BETWEEN_REQUESTS}ms between requests`);
  console.log(`📦 Batch size: 100 profiles\n`);
  
  const profileIds = [5000, 5001, 5002, 5003, 5004, 5005, 5006, 5007, 5008, 5009, 5010, 5011, 5012, 5013, 5014, 5015, 5016, 5017, 5018, 5019];
  
  const startTime = Date.now();
  
  // Create semaphore for concurrency control
  const semaphore = new Array(CONFIG.CONCURRENCY).fill(0).map(() => Promise.resolve());
  let semaphoreIndex = 0;
  
  const fetchWithSemaphore = async (profileId) => {
    // Wait for available slot
    await semaphore[semaphoreIndex];
    const currentSlot = semaphoreIndex;
    semaphoreIndex = (semaphoreIndex + 1) % CONFIG.CONCURRENCY;
    
    const fetchPromise = fetchUserWeek13Data(profileId);
    semaphore[currentSlot] = fetchPromise.catch(() => null);
    
    return fetchPromise;
  };
  
  // Process all profiles concurrently
  const batchPromises = profileIds.map(profileId => fetchWithSemaphore(profileId));
  const results = await Promise.all(batchPromises);
  
  const endTime = Date.now();
  const validResults = results.filter(result => result !== null);
  
  console.log('\n📊 FAST BATCH TEST RESULTS:');
  console.log(`   Profiles tested: ${profileIds.length}`);
  console.log(`   Week 13 recipients: ${validResults.length}`);
  console.log(`   Duration: ${endTime - startTime}ms`);
  console.log(`   Speed: ${(profileIds.length / ((endTime - startTime) / 1000)).toFixed(1)} profiles/second`);
  
  if (validResults.length > 0) {
    console.log('\n✅ Week 13 recipients found:');
    validResults.forEach((user, index) => {
      console.log(`   ${index + 1}. Profile ${user.profile_id}: ${user.weekly_xp.toLocaleString()} XP`);
    });
  }
  
  console.log('\n🎉 Fast batch test completed!');
  console.log(`⚡ This is ${(1000 / (endTime - startTime) * profileIds.length).toFixed(1)}x faster than the previous 50ms delay!`);
}

testFastBatch().catch(console.error);
