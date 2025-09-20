// Check if there are more Week 13 recipients beyond profile ID 36,000
import fetch from 'node-fetch';

const CONFIG = {
  ETHOS_API_BASE: 'https://api.ethos.network/api/v2/xp/user',
  SEASON_ID: 1,
  WEEK: 13,
  DELAY_BETWEEN_REQUESTS: 50, // 50ms delay
  CONCURRENCY: 5 // 5 concurrent requests
};

async function fetchUserWeek13Data(profileId) {
  try {
    await new Promise(resolve => setTimeout(resolve, CONFIG.DELAY_BETWEEN_REQUESTS));
    
    const url = `${CONFIG.ETHOS_API_BASE}/profileId:${profileId}/season/${CONFIG.SEASON_ID}/weekly`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Ethos-Week13-High-ID-Check/1.0',
        'X-Ethos-Client': 'ethos-week13-high-id-check@1.0.0'
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

async function checkHigherProfileIds() {
  console.log('🔍 Checking for Week 13 recipients beyond profile ID 36,000...\n');
  
  // Test some higher profile IDs to see if there are more users
  const testProfileIds = [
    40000, 45000, 50000, 55000, 60000, 65000, 70000, 75000, 80000, 85000, 90000, 95000, 100000
  ];
  
  console.log('📡 Testing higher profile IDs...');
  
  const results = [];
  for (const profileId of testProfileIds) {
    console.log(`   Testing profile ${profileId}...`);
    const result = await fetchUserWeek13Data(profileId);
    if (result) {
      results.push(result);
      console.log(`   ✅ Found: ${result.weekly_xp.toLocaleString()} XP`);
    } else {
      console.log(`   📊 No Week 13 XP`);
    }
  }
  
  console.log(`\n📊 Results:`);
  console.log(`   Profiles tested: ${testProfileIds.length}`);
  console.log(`   Week 13 recipients found: ${results.length}`);
  
  if (results.length > 0) {
    console.log('\n✅ Week 13 recipients found at higher profile IDs:');
    results.forEach((user, i) => {
      console.log(`   ${i + 1}. Profile ${user.profile_id}: ${user.weekly_xp.toLocaleString()} XP`);
    });
    
    console.log('\n🎯 KEY CAUSE IDENTIFIED:');
    console.log('   The 49 missing users are likely at higher profile IDs');
    console.log('   that were not checked by the batch script.');
    console.log('   The script stopped at profile ID 36,000 after finding');
    console.log('   3,000 consecutive empty profiles, but there might be');
    console.log('   more users scattered at higher IDs.');
  } else {
    console.log('\n📊 No Week 13 recipients found at higher profile IDs.');
    console.log('   The 49 missing users are likely due to other causes:');
    console.log('   1. Data sync issues between your CSV and the API');
    console.log('   2. Different data sources or time periods');
    console.log('   3. API filtering differences');
  }
}

checkHigherProfileIds().catch(console.error);
