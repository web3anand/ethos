import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ForceRefreshSync {
  constructor() {
    this.dbPath = path.join(__dirname, '..', 'database', 'ethos.db');
    this.db = new Database(this.dbPath);
    this.batchSize = 500; // Increased batch size for faster processing
    this.concurrency = 100; // High concurrency for speed
    this.maxConsecutiveNotFound = 10000; // Stop after 10000 consecutive not found
    this.isRunning = false;
    
    // Create table if it doesn't exist
    this.createTable();
    
    console.log('🔄 Force Refresh Sync initialized');
  }

  createTable() {
    try {
      this.db.prepare(`
        CREATE TABLE IF NOT EXISTS comprehensive_users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          profile_id INTEGER UNIQUE NOT NULL,
          username TEXT,
          display_name TEXT,
          avatar_url TEXT,
          description TEXT,
          social_x TEXT,
          score INTEGER DEFAULT 0,
          total_xp INTEGER DEFAULT 0,
          streak_days INTEGER DEFAULT 0,
          last_updated TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run();
      console.log('✅ Database table created/verified');
    } catch (error) {
      console.error('❌ Error creating table:', error.message);
    }
  }

  async fetchProfilesFromAPI(profileIds) {
    try {
      const response = await fetch('https://api.ethos.network/api/v2/users/by/profile-id', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Ethos-Force-Refresh/2.0'
        },
        body: JSON.stringify({
          profileIds: profileIds
        })
      });
      
      if (!response.ok) {
        return [];
      }
      
      const profiles = await response.json();
      return profiles || [];
    } catch (error) {
      console.error(`❌ Error fetching profiles ${profileIds[0]}-${profileIds[profileIds.length-1]}:`, error.message);
      return [];
    }
  }

  async processProfile(profile) {
    try {
      // Since we clear the database each time, always insert new profiles
      const profileData = {
        profile_id: profile.id,
        username: profile.username || null,
        display_name: profile.displayName || null,
        avatar_url: profile.avatarUrl || null,
        description: profile.description || null,
        social_x: null, // Not available in v2 API
        score: profile.score || 0,
        total_xp: profile.xpTotal || 0,
        streak_days: profile.xpStreakDays || 0,
        last_updated: new Date().toISOString()
      };

      // Always insert new profile (no duplicates since we clear DB first)
      this.db.prepare(`
        INSERT INTO comprehensive_users (
          profile_id, username, display_name, avatar_url, description,
          social_x, score, total_xp, streak_days, last_updated
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        profileData.profile_id, profileData.username, profileData.display_name,
        profileData.avatar_url, profileData.description, profileData.social_x,
        profileData.score, profileData.total_xp, profileData.streak_days, profileData.last_updated
      );
      return { action: 'inserted', profile: profileData };
      
    } catch (error) {
      console.error(`❌ Error processing profile ${profile.id}:`, error.message);
      return { action: 'error', error: error.message };
    }
  }

  async fetchBatch(profileIds) {
    // Fetch all profiles in one API call
    const profiles = await this.fetchProfilesFromAPI(profileIds);
    
    const results = [];
    for (const profile of profiles) {
      const result = await this.processProfile(profile);
      if (result) {
        results.push(result);
      }
    }
    
    return results;
  }

  async fetchBatchConcurrent(profileIds) {
    // Process in chunks to control concurrency
    const chunks = [];
    for (let i = 0; i < profileIds.length; i += this.concurrency) {
      chunks.push(profileIds.slice(i, i + this.concurrency));
    }

    const allResults = [];
    
    for (const chunk of chunks) {
      // Fetch profiles for this chunk
      const profiles = await this.fetchProfilesFromAPI(chunk);
      
      // Process each profile
      for (const profile of profiles) {
        const result = await this.processProfile(profile);
        if (result) {
          allResults.push(result);
        }
      }
      
      // Small delay between chunks to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    return allResults;
  }

  async getCurrentStats() {
    try {
      const totalProfiles = this.db.prepare('SELECT COUNT(*) as count FROM comprehensive_users').get().count;
      const maxId = this.db.prepare('SELECT MAX(profile_id) as max_id FROM comprehensive_users').get().max_id;
      return { totalProfiles, maxId: maxId || 0 };
    } catch (error) {
      console.log('⚠️  Table not found or empty, returning zero stats');
      return { totalProfiles: 0, maxId: 0 };
    }
  }

  async forceRefreshSync() {
    try {
      this.isRunning = true;
      console.log('🚀 Starting comprehensive force refresh sync...');
      console.log('📋 Fetching ALL profiles from ID 1 to infinite');
      console.log(`⚙️  Batch size: ${this.batchSize}, Concurrency: ${this.concurrency}, Max consecutive not found: ${this.maxConsecutiveNotFound}`);
      
      // Clear all existing data to avoid duplicates
      console.log('🗑️  Clearing all existing data from database...');
      try {
        this.db.prepare('DELETE FROM comprehensive_users').run();
        console.log('✅ Database cleared - all existing profiles removed');
      } catch (error) {
        console.log('ℹ️  Table was empty or didn\'t exist, continuing with fresh data');
      }
      
      // Start from profile ID 1 to find all profiles
      let currentProfileId = 1;
      console.log(`📍 Starting comprehensive search from profile ID: ${currentProfileId}`);
      let consecutiveNotFound = 0;
      let totalProcessed = 0;
      let totalInserted = 0;
      let totalErrors = 0;
      let batchNumber = 0;
      let validProfilesCount = 0; // Count of valid profiles found
      
      console.log(`📍 Starting comprehensive sync from profile ID: ${currentProfileId}`);
      
      while (consecutiveNotFound < this.maxConsecutiveNotFound) {
        batchNumber++;
        
        // Create batch of profile IDs to check
        const batch = [];
        for (let i = 0; i < this.batchSize && consecutiveNotFound < this.maxConsecutiveNotFound; i++) {
          batch.push(currentProfileId + i);
        }
        
        console.log(`📦 Batch ${batchNumber}: Checking profiles ${batch[0]} to ${batch[batch.length - 1]} (${batch.length} profiles)`);
        
        // Process the batch with high concurrency
        const results = await this.fetchBatchConcurrent(batch);
        
        let foundInBatch = 0;
        for (const result of results) {
          if (result) {
            totalProcessed++;
            foundInBatch++;
            validProfilesCount++;
            if (result.action === 'inserted') totalInserted++;
            else if (result.action === 'error') totalErrors++;
          }
        }
        
        if (foundInBatch > 0) {
          consecutiveNotFound = 0;
          console.log(`✅ Batch ${batchNumber}: Found ${foundInBatch} profiles (${totalInserted} total inserted)`);
          
          // Save progress every 1000 valid profiles
          if (validProfilesCount % 1000 === 0) {
            console.log(`💾 Checkpoint: ${validProfilesCount} valid profiles processed and saved to database`);
          }
        } else {
          consecutiveNotFound += batch.length;
          console.log(`❌ Batch ${batchNumber}: No profiles found. Consecutive not found: ${consecutiveNotFound}/${this.maxConsecutiveNotFound}`);
        }
        
        currentProfileId += batch.length;
        
        // Show progress every 500 profiles
        if (totalProcessed % 500 === 0 && totalProcessed > 0) {
          console.log(`📊 Progress: ${totalProcessed} processed, ${validProfilesCount} valid (${totalInserted} inserted, ${totalErrors} errors)`);
        }
        
        // Very small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      console.log('✅ Comprehensive force refresh sync completed!');
      console.log(`📈 Final results: ${totalInserted} profiles inserted, ${totalErrors} errors`);
      console.log(`🔢 Processed ${totalProcessed} profiles total`);
      
      // Show final stats
      const finalStats = await this.getCurrentStats();
      console.log(`📊 Final database: ${finalStats.totalProfiles} profiles, highest ID: ${finalStats.maxId}`);
      
      return {
        success: true,
        inserted: totalInserted,
        updated: 0, // No updates since we clear DB each time
        errors: totalErrors,
        totalProcessed: totalProcessed,
        totalProfiles: finalStats.totalProfiles,
        highestId: finalStats.maxId
      };
      
    } catch (error) {
      console.error('❌ Force refresh sync failed:', error);
      return {
        success: false,
        error: error.message
      };
    } finally {
      this.isRunning = false;
    }
  }

  close() {
    this.db.close();
  }
}

// Export for use in API
export default ForceRefreshSync;

// Run directly if called from command line
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🚀 Starting force refresh from command line...');
  console.log('📋 Using Ethos v2 API with 500 profiles per batch, 100 concurrency');
  console.log('🗑️  Will clear database and start fresh to avoid duplicates');
  
  const sync = new ForceRefreshSync();
  sync.forceRefreshSync()
    .then((result) => {
      console.log('🎯 Force refresh result:', result);
      sync.close();
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('❌ Force refresh failed:', error);
      sync.close();
      process.exit(1);
    });
}
