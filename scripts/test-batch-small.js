// Quick test of batch approach with small batch
import fetch from 'node-fetch';

const CONFIG = {
  ETHOS_API_BASE: 'https://api.ethos.network/api/v2/xp/user',
  SEASON_ID: 1,
  WEEK: 13,
  BATCH_SIZE: 10, // Small test batch
  CONCURRENCY: 5
};

async function fetchUserWeek13Data(profileId) {
  try {
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

async function testBatch() {
  console.log('🧪 Testing batch approach with profiles 5000-5009...\n');
  
  const profileIds = [5000, 5001, 5002, 5003, 5004, 5005, 5006, 5007, 5008, 5009];
  
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
  const startTime = Date.now();
  const batchPromises = profileIds.map(profileId => fetchWithSemaphore(profileId));
  const batchResults = await Promise.all(batchPromises);
  const endTime = Date.now();
  
  // Filter valid results
  const validResults = batchResults.filter(result => result !== null);
  
  console.log('📊 BATCH TEST RESULTS:');
  console.log(`   Profiles tested: ${profileIds.length}`);
  console.log(`   Week 13 recipients: ${validResults.length}`);
  console.log(`   Duration: ${endTime - startTime}ms`);
  console.log(`   Concurrency: ${CONFIG.CONCURRENCY}`);
  
  if (validResults.length > 0) {
    console.log('\n✅ Week 13 recipients found:');
    validResults.forEach((user, index) => {
      console.log(`   ${index + 1}. Profile ${user.profile_id}: ${user.weekly_xp.toLocaleString()} XP`);
    });
  } else {
    console.log('\n📊 No Week 13 recipients in this batch');
  }
  
  console.log('\n🎉 Batch test completed!');
}

testBatch().catch(console.error);
