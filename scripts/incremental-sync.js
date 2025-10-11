import Database from 'better-sqlite3';
import path from 'path';
import fetch from 'node-fetch';

class IncrementalSync {
  constructor() {
    this.dbPath = path.join(process.cwd(), 'database', 'ethos.db');
    this.db = new Database(this.dbPath);
    this.batchSize = 500;
    this.concurrency = 100;
    this.maxConsecutiveNotFound = 1000; // Smaller limit for incremental sync
    this.isRunning = false;
    
    console.log('🔄 Incremental Sync initialized');
  }

  async fetchProfilesFromAPI(profileIds) {
    try {
      const response = await fetch('https://api.ethos.xyz/api/v2/users/by/profile-id', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ profileIds })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data || [];
    } catch (error) {
      console.error('❌ API fetch error:', error.message);
      return [];
    }
  }

  async processProfile(profile) {
    try {
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

      // Check if profile already exists
      const existing = this.db.prepare('SELECT profile_id FROM comprehensive_users WHERE profile_id = ?').get(profileData.profile_id);
      
      if (existing) {
        // Update existing profile
        this.db.prepare(`
          UPDATE comprehensive_users SET
            username = ?, display_name = ?, avatar_url = ?, description = ?,
            social_x = ?, score = ?, total_xp = ?, streak_days = ?, last_updated = ?
          WHERE profile_id = ?
        `).run(
          profileData.username, profileData.display_name, profileData.avatar_url,
          profileData.description, profileData.social_x, profileData.score,
          profileData.total_xp, profileData.streak_days, profileData.last_updated,
          profileData.profile_id
        );
        return { action: 'updated', profile: profileData };
      } else {
        // Insert new profile
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
      }
      
    } catch (error) {
      console.error(`❌ Error processing profile ${profile.id}:`, error.message);
      return { action: 'error', error: error.message };
    }
  }

  async fetchBatch(profileIds) {
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
    const chunks = [];
    for (let i = 0; i < profileIds.length; i += this.concurrency) {
      chunks.push(profileIds.slice(i, i + this.concurrency));
    }

    const allResults = [];
    
    for (const chunk of chunks) {
      const profiles = await this.fetchProfilesFromAPI(chunk);
      
      for (const profile of profiles) {
        const result = await this.processProfile(profile);
        if (result) {
          allResults.push(result);
        }
      }
      
      // Small delay between chunks
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    return allResults;
  }

  async getCurrentStats() {
    const stats = this.db.prepare('SELECT COUNT(*) as totalProfiles, MAX(profile_id) as maxId FROM comprehensive_users').get();
    return {
      totalProfiles: stats.totalProfiles || 0,
      maxId: stats.maxId || 0
    };
  }

  async incrementalSync() {
    if (this.isRunning) {
      console.log('⚠️  Sync already running, skipping...');
      return { success: false, error: 'Sync already running' };
    }

    try {
      this.isRunning = true;
      console.log('🚀 Starting incremental sync...');
      
      // Get current stats
      const existingStats = await this.getCurrentStats();
      console.log(`📊 Current database: ${existingStats.totalProfiles} profiles, highest ID: ${existingStats.maxId}`);
      
      // Start from the highest existing ID + 1 to find new profiles
      let currentProfileId = existingStats.maxId + 1;
      console.log(`📍 Starting incremental search from profile ID: ${currentProfileId}`);
      
      let consecutiveNotFound = 0;
      let totalProcessed = 0;
      let totalInserted = 0;
      let totalUpdated = 0;
      let totalErrors = 0;
      let batchNumber = 0;
      
      while (consecutiveNotFound < this.maxConsecutiveNotFound) {
        batchNumber++;
        
        const batch = [];
        for (let i = 0; i < this.batchSize && consecutiveNotFound < this.maxConsecutiveNotFound; i++) {
          batch.push(currentProfileId + i);
        }
        
        console.log(`📦 Batch ${batchNumber}: Checking profiles ${batch[0]} to ${batch[batch.length - 1]} (${batch.length} profiles)`);
        
        const results = await this.fetchBatchConcurrent(batch);
        
        let foundInBatch = 0;
        for (const result of results) {
          if (result) {
            totalProcessed++;
            foundInBatch++;
            if (result.action === 'inserted') totalInserted++;
            else if (result.action === 'updated') totalUpdated++;
            else if (result.action === 'error') totalErrors++;
          }
        }
        
        if (foundInBatch > 0) {
          consecutiveNotFound = 0;
          console.log(`✅ Batch ${batchNumber}: Found ${foundInBatch} profiles (${totalInserted} inserted, ${totalUpdated} updated)`);
        } else {
          consecutiveNotFound += batch.length;
          console.log(`❌ Batch ${batchNumber}: No profiles found. Consecutive not found: ${consecutiveNotFound}/${this.maxConsecutiveNotFound}`);
        }
        
        currentProfileId += batch.length;
        
        // Show progress every 100 profiles
        if (totalProcessed % 100 === 0 && totalProcessed > 0) {
          console.log(`📊 Progress: ${totalProcessed} processed (${totalInserted} inserted, ${totalUpdated} updated, ${totalErrors} errors)`);
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      console.log('✅ Incremental sync completed!');
      console.log(`📈 Final results: ${totalInserted} profiles inserted, ${totalUpdated} profiles updated, ${totalErrors} errors`);
      
      const finalStats = await this.getCurrentStats();
      console.log(`📊 Final database: ${finalStats.totalProfiles} profiles, highest ID: ${finalStats.maxId}`);
      
      return {
        success: true,
        inserted: totalInserted,
        updated: totalUpdated,
        errors: totalErrors,
        totalProcessed: totalProcessed,
        totalProfiles: finalStats.totalProfiles,
        highestId: finalStats.maxId
      };
      
    } catch (error) {
      console.error('❌ Incremental sync failed:', error);
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
export default IncrementalSync;

// Run directly if called from command line
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🚀 Starting incremental sync from command line...');
  
  const sync = new IncrementalSync();
  sync.incrementalSync()
    .then((result) => {
      console.log('📊 Sync result:', result);
      sync.close();
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('❌ Sync failed:', error);
      sync.close();
      process.exit(1);
    });
}
