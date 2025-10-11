import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testApiProfiles() {
  console.log('🔍 Testing API with profile IDs 1-100...');
  
  let foundProfiles = 0;
  let notFoundProfiles = 0;
  let errorProfiles = 0;
  const sampleProfiles = [];
  
  for (let profileId = 1; profileId <= 100; profileId++) {
    try {
      console.log(`📡 Fetching profile ${profileId}...`);
      
      const response = await fetch(`https://api.ethos.network/v1/profile/${profileId}`, {
        headers: {
          'User-Agent': 'Ethos-Test/1.0'
        }
      });
      
      if (response.ok) {
        const profile = await response.json();
        foundProfiles++;
        
        // Store first 5 profiles as samples
        if (sampleProfiles.length < 5) {
          sampleProfiles.push({
            id: profile.id,
            username: profile.username,
            displayName: profile.displayName,
            score: profile.score,
            xp: profile.xp,
            streak: profile.streak,
            season0Xp: profile.season0Xp,
            season1Xp: profile.season1Xp,
            weeklyXp: profile.weeklyXp,
            twitterId: profile.twitterId
          });
        }
        
        console.log(`  ✅ Profile ${profileId}: ${profile.username || 'No username'} (Score: ${profile.score || 0}, XP: ${profile.xp || 0})`);
      } else {
        notFoundProfiles++;
        console.log(`  ❌ Profile ${profileId}: Not found (${response.status})`);
      }
    } catch (error) {
      errorProfiles++;
      console.log(`  ❌ Profile ${profileId}: Error - ${error.message}`);
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  console.log('\n📊 Results Summary:');
  console.log(`✅ Found: ${foundProfiles} profiles`);
  console.log(`❌ Not found: ${notFoundProfiles} profiles`);
  console.log(`⚠️  Errors: ${errorProfiles} profiles`);
  
  if (sampleProfiles.length > 0) {
    console.log('\n📋 Sample Profile Data:');
    sampleProfiles.forEach((profile, index) => {
      console.log(`\n${index + 1}. Profile ID ${profile.id}:`);
      console.log(`   Username: ${profile.username || 'None'}`);
      console.log(`   Display Name: ${profile.displayName || 'None'}`);
      console.log(`   Score: ${profile.score || 0}`);
      console.log(`   XP: ${profile.xp || 0}`);
      console.log(`   Streak: ${profile.streak || 0}`);
      console.log(`   Season 0 XP: ${profile.season0Xp || 0}`);
      console.log(`   Season 1 XP: ${profile.season1Xp || 0}`);
      console.log(`   Weekly XP: ${profile.weeklyXp || 0}`);
      console.log(`   Twitter ID: ${profile.twitterId || 'None'}`);
    });
  }
  
  console.log('\n🎯 API Test Complete!');
}

testApiProfiles().catch(console.error);
