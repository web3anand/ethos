// Test script to verify the V2 API approach for profiles 1-10
import { getUserByProfileId } from './utils/ethosApiClient.js';

async function testV2ProfileApi() {
  console.log('🧪 Testing V2 Profile API for profiles 1-10...\n');
  
  const results = [];
  
  for (let profileId = 1; profileId <= 10; profileId++) {
    try {
      console.log(`Testing profile ${profileId}...`);
      
      const userData = await getUserByProfileId(profileId);
      
      if (userData) {
        const result = {
          profileId: userData.profileId,
          id: userData.id,
          username: userData.username,
          displayName: userData.displayName,
          score: userData.score,
          xpTotal: userData.xpTotal,
          status: userData.status,
          found: true
        };
        
        results.push(result);
        console.log(`✅ Profile ${profileId}: ${result.displayName || result.username} (Score: ${result.score})`);
      } else {
        results.push({ profileId, found: false });
        console.log(`❌ Profile ${profileId}: Not found`);
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 300));
      
    } catch (error) {
      console.error(`❌ Profile ${profileId}: Error - ${error.message}`);
      results.push({ profileId, found: false, error: error.message });
    }
  }
  
  console.log('\n📊 Summary:');
  const found = results.filter(r => r.found);
  const notFound = results.filter(r => !r.found);
  
  console.log(`✅ Found: ${found.length}/10 profiles`);
  console.log(`❌ Not found: ${notFound.length}/10 profiles`);
  
  if (found.length > 0) {
    console.log('\n✅ Found profiles:');
    found.forEach(profile => {
      console.log(`   Profile ${profile.profileId}: ${profile.displayName || profile.username} (Score: ${profile.score || 0})`);
    });
    
    console.log('\n🎯 Scores check:');
    const withScores = found.filter(p => p.score > 0);
    const withoutScores = found.filter(p => p.score === 0);
    console.log(`   With scores > 0: ${withScores.length}/${found.length}`);
    console.log(`   With scores = 0: ${withoutScores.length}/${found.length}`);
    
    if (withScores.length > 0) {
      console.log('   🎉 SUCCESS: V2 API is returning actual scores!');
    } else {
      console.log('   ⚠️ WARNING: All scores are 0, may need to investigate further');
    }
  }
  
  if (notFound.length > 0) {
    console.log('\n❌ Not found profiles:');
    notFound.forEach(profile => {
      console.log(`   Profile ${profile.profileId}: ${profile.error || 'Not found'}`);
    });
  }
}

// Run the test
testV2ProfileApi().catch(console.error);
