import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

/**
 * XP Data Fetcher by Profile ID
 * Fetches user data and XP information using profile ID technique
 * - 500 profiles per batch
 * - 50ms delay between batches
 * - 100 concurrent requests
 * - Stops after 3000 consecutive profiles with no data
 * - Requires minimum 1 XP to consider as valid profile
 */

class XpDataFetcher {
  constructor() {
    this.baseUrl = 'https://api.ethos.network/api/v2';
    this.batchSize = 500; // 500 per batch as requested
    this.delay = 10000; // ms - increased delay to handle rate limits
    this.concurrency = 20; // Reduced concurrency to avoid rate limits
    this.maxConsecutiveNotFound = 3000;
    this.consecutiveNotFound = 0;
    this.currentProfileId = 25; // Start from the first known profile ID
    this.totalFetched = 0;
    this.validProfiles = 0;
    this.data = [];
    this.errors = [];
    
    // Create data directory if it doesn't exist
    this.dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    
    this.outputFile = path.join(this.dataDir, 'xp-profiles-data.json');
    this.statsFile = path.join(this.dataDir, 'xp-fetch-stats.json');
    
    console.log('🚀 XP Data Fetcher initialized');
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
      const response = await fetch(`${this.baseUrl}/users/by/profile-id/${profileId}`);
      
      if (response.status === 404) {
        return null; // Profile not found
      }
      
      if (response.status === 429) {
        // Rate limited - wait and retry
        if (retries > 0) {
          const waitTime = Math.pow(2, 3 - retries) * 1000; // Exponential backoff: 1s, 2s, 4s
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
      const response = await fetch(`${this.baseUrl}/xp/user/${userkey}`);
      
      if (response.status === 404) {
        return null; // No XP data
      }
      
      if (response.status === 429) {
        // Rate limited - wait and retry
        if (retries > 0) {
          const waitTime = Math.pow(2, 3 - retries) * 1000; // Exponential backoff: 1s, 2s, 4s
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
  async fetchSeasonXp(userkey, seasonId) {
    try {
      const response = await fetch(`${this.baseUrl}/xp/user/${userkey}/season/${seasonId}`);
      
      if (response.status === 404) {
        return null; // No season data
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
  async fetchWeeklyXp(userkey, seasonId) {
    try {
      const response = await fetch(`${this.baseUrl}/xp/user/${userkey}/season/${seasonId}/weekly`);
      
      if (response.status === 404) {
        return null; // No weekly data
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
        this.consecutiveNotFound++;
        return null;
      }

      // Check if profile has userkey
      if (!profile.userkey) {
        this.consecutiveNotFound++;
        return null;
      }

      // Reset consecutive not found counter
      this.consecutiveNotFound = 0;
      this.totalFetched++;

      console.log(`✅ Profile ${profileId} found: ${profile.username || profile.displayName || 'Unknown'}`);

      // Fetch total XP
      const totalXp = await this.fetchUserXp(profile.userkey);
      
      // Check if user has minimum 1 XP
      if (!totalXp || totalXp < 1) {
        console.log(`⚠️ Profile ${profileId} has no XP (${totalXp || 0}), skipping...`);
        return null;
      }

      // Fetch season data (try seasons 0 and 1)
      const seasonData = {};
      for (const seasonId of [0, 1]) {
        const seasonXp = await this.fetchSeasonXp(profile.userkey, seasonId);
        if (seasonXp !== null) {
          seasonData[`season${seasonId}`] = seasonXp;
          
          // Fetch weekly data for this season
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
      console.log(`🎯 Profile ${profileId} processed: ${totalXp} total XP, ${Object.keys(seasonData).length} seasons`);
      
      return profileData;

    } catch (error) {
      console.error(`❌ Error processing profile ${profileId}:`, error.message);
      this.errors.push({ profileId, error: error.message, timestamp: new Date().toISOString() });
      return null;
    }
  }

  // Process a batch of profiles with smart gap handling and rate limiting
  async processBatch(startId, batchSize) {
    const batch = [];
    const results = [];
    
    console.log(`📦 Processing batch: profiles ${startId} to ${startId + batchSize - 1}`);
    
    // Process profiles in smaller chunks to avoid overwhelming the API
    const chunkSize = Math.min(10, batchSize); // Process max 10 at a time
    
    for (let i = 0; i < batchSize; i += chunkSize) {
      const chunkPromises = [];
      const chunkEnd = Math.min(i + chunkSize, batchSize);
      
      // Create promises for this chunk
      for (let j = i; j < chunkEnd; j++) {
        const profileId = startId + j;
        chunkPromises.push(this.processProfile(profileId));
      }
      
      // Wait for this chunk to complete
      const chunkResults = await Promise.all(chunkPromises);
      results.push(...chunkResults);
      
      // Small delay between chunks to be respectful of the API
      if (chunkEnd < batchSize) {
        await this.sleep(500); // 500ms delay between chunks
      }
    }
    
    // Filter out null results and add to batch
    const validResults = results.filter(result => result !== null);
    batch.push(...validResults);
    
    // If we found profiles in this batch, reset consecutive not found counter
    if (validResults.length > 0) {
      this.consecutiveNotFound = 0;
    }
    
    return batch;
  }

  // Save data to JSON file
  saveData() {
    try {
      const output = {
        metadata: {
          totalProfiles: this.data.length,
          totalFetched: this.totalFetched,
          validProfiles: this.validProfiles,
          lastProfileId: this.currentProfileId - 1,
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
        totalFetched: this.totalFetched,
        validProfiles: this.validProfiles,
        lastProfileId: this.currentProfileId - 1,
        consecutiveNotFound: this.consecutiveNotFound,
        errors: this.errors.length,
        lastUpdated: new Date().toISOString()
      };
      
      fs.writeFileSync(this.statsFile, JSON.stringify(stats, null, 2));
      console.log(`📊 Stats saved to ${this.statsFile}`);
      
    } catch (error) {
      console.error('❌ Error saving data:', error.message);
    }
  }

  // Main fetch process
  async fetchAllProfiles() {
    console.log('🚀 Starting XP data fetch process...');
    console.log(`📋 Configuration:`);
    console.log(`   - Batch size: ${this.batchSize}`);
    console.log(`   - Delay: ${this.delay}ms`);
    console.log(`   - Concurrency: ${this.concurrency}`);
    console.log(`   - Max consecutive not found: ${this.maxConsecutiveNotFound}`);
    console.log(`   - Minimum XP required: 1`);
    console.log('');

    const startTime = Date.now();
    
    try {
      while (this.consecutiveNotFound < this.maxConsecutiveNotFound) {
        console.log(`\n🔄 Processing batch starting from profile ID ${this.currentProfileId}`);
        
        // Process batch
        const batch = await this.processBatch(this.currentProfileId, this.batchSize);
        
        // Add valid profiles to data array
        this.data.push(...batch);
        
        // Update current profile ID
        this.currentProfileId += this.batchSize;
        
        // Log progress
        console.log(`📊 Progress: ${this.data.length} valid profiles, ${this.totalFetched} total fetched, ${this.consecutiveNotFound} consecutive not found`);
        
        // Save data every 1000 profiles
        if (this.data.length % 1000 === 0) {
          this.saveData();
        }
        
        // Check if we should stop
        if (this.consecutiveNotFound >= this.maxConsecutiveNotFound) {
          console.log(`🛑 Stopping: ${this.consecutiveNotFound} consecutive profiles not found (limit: ${this.maxConsecutiveNotFound})`);
          break;
        }
        
        // Smart gap jumping: if we have many consecutive not found, jump ahead
        if (this.consecutiveNotFound > 1000 && this.consecutiveNotFound % 1000 === 0) {
          const jumpSize = Math.min(10000, this.consecutiveNotFound * 10);
          console.log(`🚀 Jumping ahead by ${jumpSize} profile IDs due to large gap`);
          this.currentProfileId += jumpSize;
          this.consecutiveNotFound = 0; // Reset counter after jump
        }
        
        // Delay before next batch
        if (this.consecutiveNotFound < this.maxConsecutiveNotFound) {
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
      console.log(`   - Total fetched: ${this.totalFetched}`);
      console.log(`   - Last profile ID: ${this.currentProfileId - 1}`);
      console.log(`   - Consecutive not found: ${this.consecutiveNotFound}`);
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
  const fetcher = new XpDataFetcher();
  await fetcher.fetchAllProfiles();
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
