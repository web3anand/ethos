// Test script to check profiles 1-10 with the corrected API approach
import ethosApiClient from './utils/ethosApiClient.js';

async function testProfileById(profileId) {
  try {
    console.log(`\n🔍 Testing profile ID: ${profileId}`);
    
    // Method 1: Use profileId userkey to get stats
    const profileKey = `profileId:${profileId}`;
    const stats = await ethosApiClient.getUserStats(profileKey);
    
    if (stats && stats.profileId) {
      console.log(`   ✅ Found stats for profile ${profileId}`);
      console.log(`   📊 Profile ID: ${stats.profileId}`);
      console.log(`   📊 Score: ${stats.score || 'N/A'}`);
      console.log(`   📊 Userkeys: ${stats.userkeys?.length || 0}`);
      
      // Try to get full profile data
      let userProfile = null;
      if (stats.userkeys) {
        const xServiceKey = stats.userkeys.find(key => key.startsWith('service:x.com:'));
        if (xServiceKey) {
          const xUserId = xServiceKey.split(':')[2];
          try {
            userProfile = await ethosApiClient.getUserByXUsernameV2(xUserId);
            if (userProfile) {
              console.log(`   ✅ Found X profile: ${userProfile.displayName || userProfile.username || 'Unknown'}`);
              console.log(`   📊 Username: ${userProfile.username || 'N/A'}`);
              console.log(`   📊 Score: ${userProfile.score || 'N/A'}`);
              console.log(`   📊 XP Total: ${userProfile.xpTotal || 0}`);
            }
          } catch (error) {
            console.log(`   ⚠️ Could not fetch X profile: ${error.message}`);
          }
        }
      }
      
      const finalScore = userProfile?.score || stats.score || 0;
      const displayName = userProfile?.displayName || userProfile?.username || `Profile ${profileId}`;
      
      console.log(`   🎯 FINAL: ${displayName} (Score: ${finalScore})`);
      return { profileId, displayName, score: finalScore, found: true };
      
    } else {
      console.log(`   ❌ Profile ID ${profileId}: Not found`);
      return { profileId, found: false };
    }
    
  } catch (error) {
    console.log(`   ❌ Error fetching profile ${profileId}: ${error.message}`);
    return { profileId, error: error.message, found: false };
  }
}

async function testProfiles1to10() {
  console.log('🚀 Testing profiles 1-10 with corrected API approach...\n');
  
  const results = [];
  
  for (let i = 1; i <= 10; i++) {
    const result = await testProfileById(i);
    results.push(result);
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  console.log('\n📊 SUMMARY:');
  console.log('═'.repeat(60));
  
  const found = results.filter(r => r.found);
  const notFound = results.filter(r => !r.found);
  
  console.log(`✅ Found: ${found.length} profiles`);
  console.log(`❌ Not found: ${notFound.length} profiles`);
  
  if (found.length > 0) {
    console.log('\n🎯 Found profiles:');
    found.forEach(r => {
      console.log(`   Profile ${r.profileId}: ${r.displayName} (Score: ${r.score})`);
    });
  }
  
  if (notFound.length > 0) {
    console.log('\n❌ Not found:');
    notFound.forEach(r => {
      console.log(`   Profile ${r.profileId}`);
    });
  }
}

// Run the test
testProfiles1to10().catch(console.error);
