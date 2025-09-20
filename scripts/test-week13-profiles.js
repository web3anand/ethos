// Quick test script to check Week 13 data for specific profiles
import fetch from 'node-fetch';

const TEST_PROFILES = [5476, 5000, 5001, 5002, 5003, 5004, 5005, 5006, 5007, 5008, 5009, 5010];

async function testProfile(profileId) {
  try {
    const response = await fetch(`https://api.ethos.network/api/v2/xp/user/profileId:${profileId}/season/1/weekly`);
    
    if (!response.ok) {
      if (response.status === 404) {
        return { profileId, status: 'not_found' };
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data && Array.isArray(data)) {
      const week13 = data.find(w => w.week === 13);
      if (week13 && week13.weeklyXp > 0) {
        return { 
          profileId, 
          status: 'has_week13_xp', 
          weeklyXp: week13.weeklyXp,
          cumulativeXp: week13.cumulativeXp,
          totalWeeks: data.length
        };
      } else if (week13) {
        return { 
          profileId, 
          status: 'has_week13_no_xp', 
          weeklyXp: week13.weeklyXp,
          totalWeeks: data.length
        };
      } else {
        return { 
          profileId, 
          status: 'no_week13', 
          totalWeeks: data.length,
          availableWeeks: data.map(w => w.week).sort((a,b) => a-b)
        };
      }
    }
    
    return { profileId, status: 'invalid_data' };
    
  } catch (error) {
    return { profileId, status: 'error', error: error.message };
  }
}

async function runTests() {
  console.log('🧪 Testing Week 13 data for specific profiles...\n');
  
  const results = [];
  
  for (const profileId of TEST_PROFILES) {
    console.log(`📡 Testing profile ${profileId}...`);
    const result = await testProfile(profileId);
    results.push(result);
    
    if (result.status === 'has_week13_xp') {
      console.log(`✅ Profile ${profileId}: Week 13 = ${result.weeklyXp} XP (${result.totalWeeks} weeks total)`);
    } else if (result.status === 'has_week13_no_xp') {
      console.log(`📊 Profile ${profileId}: Week 13 = ${result.weeklyXp} XP (no XP, ${result.totalWeeks} weeks total)`);
    } else if (result.status === 'no_week13') {
      console.log(`📊 Profile ${profileId}: No Week 13 data (${result.totalWeeks} weeks: ${result.availableWeeks?.join(', ') || 'unknown'})`);
    } else if (result.status === 'not_found') {
      console.log(`❌ Profile ${profileId}: Not found`);
    } else if (result.status === 'error') {
      console.log(`❌ Profile ${profileId}: Error - ${result.error}`);
    } else {
      console.log(`❓ Profile ${profileId}: ${result.status}`);
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n📊 SUMMARY:');
  const summary = results.reduce((acc, result) => {
    acc[result.status] = (acc[result.status] || 0) + 1;
    return acc;
  }, {});
  
  Object.entries(summary).forEach(([status, count]) => {
    console.log(`   ${status}: ${count}`);
  });
  
  const week13WithXp = results.filter(r => r.status === 'has_week13_xp');
  console.log(`\n✅ Profiles with Week 13 XP: ${week13WithXp.length}`);
  week13WithXp.forEach(r => {
    console.log(`   Profile ${r.profileId}: ${r.weeklyXp} XP`);
  });
}

runTests().catch(console.error);
