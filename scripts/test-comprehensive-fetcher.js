import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class TestComprehensiveFetcher {
  constructor() {
    this.dataDir = path.join(__dirname, '..', 'data', 'csv');
    
    // Ensure data directory exists
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  // Fetch basic profile information
  async fetchProfileInfo(profileId) {
    try {
      const response = await fetch(`https://api.ethos.network/api/v2/users/by/profile-id`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Ethos-Client': 'ethoscard.vercel.app'
        },
        body: JSON.stringify({ profileIds: [profileId] })
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error(`Error fetching profile ${profileId}:`, error.message);
      return null;
    }
  }

  // Fetch user XP summary
  async fetchUserXp(profileId) {
    try {
      const response = await fetch(`https://api.ethos.network/api/v2/xp/user/profileId:${profileId}`, {
        headers: {
          'X-Ethos-Client': 'ethoscard.vercel.app'
        }
      });

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      return null;
    }
  }

  // Fetch season XP for a specific season
  async fetchSeasonXp(profileId, seasonId) {
    try {
      const response = await fetch(`https://api.ethos.network/api/v2/xp/user/profileId:${profileId}/season/${seasonId}`, {
        headers: {
          'X-Ethos-Client': 'ethoscard.vercel.app'
        }
      });

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      return null;
    }
  }

  // Fetch weekly XP for a specific season
  async fetchWeeklyXp(profileId, seasonId) {
    try {
      const response = await fetch(`https://api.ethos.network/api/v2/xp/user/profileId:${profileId}/season/${seasonId}/weekly`, {
        headers: {
          'X-Ethos-Client': 'ethoscard.vercel.app'
        }
      });

      if (!response.ok) {
        return [];
      }

      return await response.json();
    } catch (error) {
      return [];
    }
  }

  // Check if user is a validator holder
  isValidatorHolder(profile) {
    if (!profile) return false;
    
    // Check various indicators for validator status
    if (profile.validatorHolding === true) return true;
    if (profile.isValidator === true) return true;
    if (profile.validator === true) return true;
    
    // Check score - validators typically have higher scores
    if (profile.score && profile.score > 900) return true;
    
    // Check description for validator mentions
    if (profile.description) {
      const desc = profile.description.toLowerCase();
      if (desc.includes('validator') || desc.includes('node') || desc.includes('staking')) {
        return true;
      }
    }
    
    return false;
  }

  // Test with known profile IDs
  async testKnownProfiles() {
    const testProfileIds = [25, 41, 298, 5476]; // Known existing profiles
    
    console.log('🧪 Testing comprehensive fetching with known profiles...');
    
    for (const profileId of testProfileIds) {
      console.log(`\n🔍 Testing Profile ID: ${profileId}`);
      
      try {
        // Get basic profile info
        const profile = await this.fetchProfileInfo(profileId);
        if (!profile) {
          console.log(`❌ Profile ${profileId} not found`);
          continue;
        }
        
        console.log(`✅ Profile found: ${profile.username || 'No username'} (${profile.displayName || 'No display name'})`);
        console.log(`   Score: ${profile.score || 0}, Streak: ${profile.streakDays || 0}`);
        console.log(`   Validator: ${this.isValidatorHolder(profile) ? 'Yes' : 'No'}`);

        // Get XP summary
        const xpSummary = await this.fetchUserXp(profileId);
        console.log(`   Total XP: ${xpSummary || 0}`);

        // Get season XP
        for (const seasonId of [0, 1]) {
          const seasonXp = await this.fetchSeasonXp(profileId, seasonId);
          console.log(`   Season ${seasonId} XP: ${seasonXp || 0}`);
          
          const weeklyXp = await this.fetchWeeklyXp(profileId, seasonId);
          console.log(`   Season ${seasonId} weeks: ${weeklyXp ? weeklyXp.length : 0}`);
          
          if (weeklyXp && weeklyXp.length > 0) {
            const latestWeek = weeklyXp[weeklyXp.length - 1];
            console.log(`   Latest week ${latestWeek.week}: ${latestWeek.weeklyXp} XP (cumulative: ${latestWeek.cumulativeXp})`);
          }
        }

      } catch (error) {
        console.error(`❌ Error testing profile ${profileId}:`, error.message);
      }
      
      // Small delay between profiles
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('\n✅ Testing completed!');
  }
}

// Run the test
console.log('🧪 Starting comprehensive fetcher test...');
const tester = new TestComprehensiveFetcher();
tester.testKnownProfiles()
  .then(() => console.log('✅ Test completed'))
  .catch(console.error);

