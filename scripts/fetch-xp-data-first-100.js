import fs from 'fs';
import path from 'path';

/**
 * XP Data Fetcher - First 100 Profile IDs Only
 * Very conservative approach to avoid rate limits
 * - Sequential processing (no concurrency)
 * - 2 second delay between each request
 * - Only processes first 100 profile IDs
 * - Requires minimum 1 XP to consider as valid profile
 */

class XpDataFetcherFirst100 {
  constructor() {
    this.baseUrl = 'https://api.ethos.network/api/v2';
    this.maxProfileId = 100; // Only process first 100
    this.delay = 2000; // 2 seconds between requests
    this.validProfiles = 0;
    this.data = [];
    this.errors = [];
    
    // Create data directory if it doesn't exist
    this.dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    
    this.outputFile = path.join(this.dataDir, 'xp-profiles-first-100.json');
    this.statsFile = path.join(this.dataDir, 'xp-fetch-first-100-stats.json');
    
    console.log('🚀 XP Data Fetcher (First 100) initialized');
    console.log(`📁 Output file: ${this.outputFile}`);
    console.log(`📊 Stats file: ${this.statsFile}`);
  }

  // Sleep function for delays
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Fetch user profile data by profile ID with rate limit handling
  async fetchUserProfile(profileId, retries = 3) {
    try {
      console.log(`🔍 Fetching profile ${profileId}...`);
      const response = await fetch(`${this.baseUrl}/users/by/profile-id/${profileId}`, {
        headers: {
          'X-Ethos-Client': 'ethos-xp-fetcher@1.0.0'
        }
      });
      
      if (response.status === 404) {
        console.log(`❌ Profile ${profileId} not found`);
        return null; // Profile not found
      }
      
      if (response.status === 429) {
        // Rate limited - wait and retry
        if (retries > 0) {
          const waitTime = Math.pow(2, 3 - retries) * 2000; // Exponential backoff: 2s, 4s, 8s
          console.log(`⏳ Rate limited for profile ${profileId}, waiting ${waitTime}ms before retry ${4 - retries}/3`);
          await this.sleep(waitTime);
          return await this.fetchUserProfile(profileId, retries - 1);
        } else {
          throw new Error(`HTTP 429: Too Many Requests (max retries exceeded)`);
        }
      }
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const profile = await response.json();
      console.log(`✅ Profile ${profileId} found: ${profile.username || profile.displayName || 'Unknown'}`);
      return profile;
    } catch (error) {
      console.error(`❌ Error fetching profile ${profileId}:`, error.message);
      this.errors.push({ profileId, error: error.message, timestamp: new Date().toISOString() });
      return null;
    }
  }

  // Fetch total XP for a user with rate limit handling
  async fetchUserXp(userkey, retries = 3) {
    try {
      const response = await fetch(`${this.baseUrl}/xp/user/${userkey}`, {
        headers: {
          'X-Ethos-Client': 'ethoscard.vercel.app'
        }
      });
      
      if (response.status === 404) {
        return null; // No XP data
      }
      
      if (response.status === 429) {
        // Rate limited - wait and retry
        if (retries > 0) {
          const waitTime = Math.pow(2, 3 - retries) * 2000; // Exponential backoff: 2s, 4s, 8s
          await this.sleep(waitTime);
          return await this.fetchUserXp(userkey, retries - 1);
        } else {
          throw new Error(`HTTP 429: Too Many Requests (max retries exceeded)`);
        }
      }
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const xpData = await response.json();
      return xpData;
    } catch (error) {
      console.error(`❌ Error fetching XP for userkey ${userkey}:`, error.message);
      return null;
    }
  }

  // Fetch XP data for a specific season
  async fetchSeasonXp(userkey, seasonId, retries = 3) {
    try {
      const response = await fetch(`${this.baseUrl}/xp/user/${userkey}/season/${seasonId}`, {
        headers: {
          'X-Ethos-Client': 'ethos-xp-fetcher@1.0.0'
        }
      });
      
      if (response.status === 404) {
        return null; // No season data
      }
      
      if (response.status === 429) {
        // Rate limited - wait and retry
        if (retries > 0) {
          const waitTime = Math.pow(2, 3 - retries) * 2000; // Exponential backoff: 2s, 4s, 8s
          await this.sleep(waitTime);
          return await this.fetchSeasonXp(userkey, seasonId, retries - 1);
        } else {
          throw new Error(`HTTP 429: Too Many Requests (max retries exceeded)`);
        }
      }
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const seasonData = await response.json();
      return seasonData;
    } catch (error) {
      console.error(`❌ Error fetching season ${seasonId} XP for userkey ${userkey}:`, error.message);
      return null;
    }
  }

  // Fetch weekly XP data for a season
  async fetchWeeklyXp(userkey, seasonId, retries = 3) {
    try {
      const response = await fetch(`${this.baseUrl}/xp/user/${userkey}/season/${seasonId}/weekly`, {
        headers: {
          'X-Ethos-Client': 'ethos-xp-fetcher@1.0.0'
        }
      });
      
      if (response.status === 404) {
        return null; // No weekly data
      }
      
      if (response.status === 429) {
        // Rate limited - wait and retry
        if (retries > 0) {
          const waitTime = Math.pow(2, 3 - retries) * 2000; // Exponential backoff: 2s, 4s, 8s
          await this.sleep(waitTime);
          return await this.fetchWeeklyXp(userkey, seasonId, retries - 1);
        } else {
          throw new Error(`HTTP 429: Too Many Requests (max retries exceeded)`);
        }
      }
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const weeklyData = await response.json();
      return weeklyData;
    } catch (error) {
      console.error(`❌ Error fetching weekly XP for userkey ${userkey}, season ${seasonId}:`, error.message);
      return null;
    }
  }

  // Process a single profile with all XP data
  async processProfile(profileId) {
    try {
      // Fetch basic profile data
      const profile = await this.fetchUserProfile(profileId);
      
      if (!profile) {
        return null;
      }

      // Check if profile has userkey
      if (!profile.userkey) {
        console.log(`⚠️ Profile ${profileId} has no userkey, skipping...`);
        return null;
      }

      console.log(`📊 Processing XP data for profile ${profileId}...`);

      // Fetch total XP
      const totalXp = await this.fetchUserXp(profile.userkey);
      
      // Check if user has minimum 1 XP
      if (!totalXp || totalXp < 1) {
        console.log(`⚠️ Profile ${profileId} has no XP (${totalXp || 0}), skipping...`);
        return null;
      }

      console.log(`✅ Profile ${profileId} has ${totalXp} total XP`);

      // Fetch season data (try seasons 0 and 1)
      const seasonData = {};
      for (const seasonId of [0, 1]) {
        console.log(`📅 Fetching season ${seasonId} data for profile ${profileId}...`);
        const seasonXp = await this.fetchSeasonXp(profile.userkey, seasonId);
        if (seasonXp !== null) {
          seasonData[`season${seasonId}`] = seasonXp;
          
          // Fetch weekly data for this season
          console.log(`📅 Fetching weekly data for season ${seasonId}...`);
          const weeklyData = await this.fetchWeeklyXp(profile.userkey, seasonId);
          if (weeklyData) {
            seasonData[`season${seasonId}_weekly`] = weeklyData;
          }
        }
      }

      // Create comprehensive profile data
      const profileData = {
        profileId: profileId,
        userkey: profile.userkey,
        username: profile.username,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
        description: profile.description,
        socialX: profile.socialX,
        totalXp: totalXp,
        seasonData: seasonData,
        fetchedAt: new Date().toISOString(),
        source: 'ethos-api-v2'
      };

      this.validProfiles++;
      console.log(`🎯 Profile ${profileId} completed: ${totalXp} total XP, ${Object.keys(seasonData).length} seasons`);
      
      return profileData;

    } catch (error) {
      console.error(`❌ Error processing profile ${profileId}:`, error.message);
      this.errors.push({ profileId, error: error.message, timestamp: new Date().toISOString() });
      return null;
    }
  }

  // Save data to JSON file
  saveData() {
    try {
      const output = {
        metadata: {
          totalProfiles: this.data.length,
          validProfiles: this.validProfiles,
          maxProfileId: this.maxProfileId,
          fetchedAt: new Date().toISOString(),
          errors: this.errors.length
        },
        profiles: this.data
      };
      
      fs.writeFileSync(this.outputFile, JSON.stringify(output, null, 2));
      console.log(`💾 Data saved to ${this.outputFile}`);
      
      // Save stats
      const stats = {
        totalProfiles: this.data.length,
        validProfiles: this.validProfiles,
        maxProfileId: this.maxProfileId,
        errors: this.errors.length,
        lastUpdated: new Date().toISOString()
      };
      
      fs.writeFileSync(this.statsFile, JSON.stringify(stats, null, 2));
      console.log(`📊 Stats saved to ${this.statsFile}`);
      
    } catch (error) {
      console.error('❌ Error saving data:', error.message);
    }
  }

  // Main fetch process - sequential processing
  async fetchFirst100Profiles() {
    console.log('🚀 Starting XP data fetch for first 100 profiles...');
    console.log(`📋 Configuration:`);
    console.log(`   - Max profile ID: ${this.maxProfileId}`);
    console.log(`   - Delay between requests: ${this.delay}ms`);
    console.log(`   - Processing: Sequential (no concurrency)`);
    console.log(`   - Minimum XP required: 1`);
    console.log('');

    const startTime = Date.now();
    
    try {
      for (let profileId = 1; profileId <= this.maxProfileId; profileId++) {
        console.log(`\n🔄 Processing profile ${profileId}/${this.maxProfileId}`);
        
        // Process profile
        const profileData = await this.processProfile(profileId);
        
        // Add valid profile to data array
        if (profileData) {
          this.data.push(profileData);
          console.log(`✅ Added profile ${profileId} to results (${this.data.length} total)`);
        }
        
        // Save data every 10 profiles
        if (this.data.length % 10 === 0) {
          this.saveData();
        }
        
        // Delay before next request (except for the last one)
        if (profileId < this.maxProfileId) {
          console.log(`⏳ Waiting ${this.delay}ms before next request...`);
          await this.sleep(this.delay);
        }
      }
      
      // Final save
      this.saveData();
      
      const endTime = Date.now();
      const duration = Math.round((endTime - startTime) / 1000);
      
      console.log('\n🎉 Fetch process completed!');
      console.log(`📊 Final stats:`);
      console.log(`   - Valid profiles: ${this.validProfiles}`);
      console.log(`   - Total profiles processed: ${this.maxProfileId}`);
      console.log(`   - Errors: ${this.errors.length}`);
      console.log(`   - Duration: ${duration} seconds`);
      console.log(`   - Data saved to: ${this.outputFile}`);
      
    } catch (error) {
      console.error('❌ Fatal error in fetch process:', error.message);
      this.saveData(); // Save what we have
    }
  }
}

// Run the fetcher
async function main() {
  const fetcher = new XpDataFetcherFirst100();
  await fetcher.fetchFirst100Profiles();
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the process
main().catch(console.error);
