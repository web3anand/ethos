// Optimized Profile Database Builder with Concurrent Fetching and Incremental Sync
import { getUserByProfileId, getUsersByProfileIds } from './utils/ethosApiClient.js';
import fs from 'fs';
import path from 'path';

// Optimized Configuration - leveraging API limits
const DEFAULT_CONCURRENCY = 150;     // API calls in parallel
const DEFAULT_BATCH_SIZE = 1000;     // Records per DB flush
const DEFAULT_MAX_RETRIES = 3;       // Retry failed requests
const DEFAULT_SLEEP_MS = 50;         // Delay between batches
const MAX_RECORDS_PER_QUERY = 250;   // SQL parameter limit
const INCREMENTAL_CHUNK_SIZE = 500;  // Profiles to check for incremental updates

class OptimizedProfileBuilder {
  constructor() {
    this.dataDir = './data';
    this.profilesFile = path.join(this.dataDir, 'user-profiles.json');
    this.metadataFile = path.join(this.dataDir, 'database-metadata.json');
    this.profiles = new Map();
    this.concurrency = DEFAULT_CONCURRENCY;
    this.batchSize = DEFAULT_BATCH_SIZE;
    this.maxRetries = DEFAULT_MAX_RETRIES;
    this.sleepMs = DEFAULT_SLEEP_MS;
    
    this.buildMeta = {
      lastProfileId: 0,
      lastFullSync: null,
      lastIncrementalSync: null,
      consecutiveNotFound: 0,
      maxConsecutiveNotFound: 1000,
      totalAttempts: 0,
      successfulFetches: 0,
      lastUpdated: null,
      syncMode: 'full' // 'full' or 'incremental'
    };
  }

  // Initialize and determine sync strategy
  async initialize() {
    console.log('🚀 Initializing Optimized Profile Builder...');
    
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    
    await this.loadExistingProfiles();
    await this.loadBuildMeta();
    
    // Determine if we need full sync or can do incremental
    const shouldDoFullSync = this.shouldDoFullSync();
    this.buildMeta.syncMode = shouldDoFullSync ? 'full' : 'incremental';
    
    console.log(`✅ Initialized with ${this.profiles.size} existing profiles`);
    console.log(`📊 Sync mode: ${this.buildMeta.syncMode.toUpperCase()}`);
    console.log(`📊 Last profile ID: ${this.buildMeta.lastProfileId}`);
    
    return this.buildMeta.syncMode;
  }

  // Determine if we need a full sync (once a day or if no data)
  shouldDoFullSync() {
    if (this.profiles.size === 0) return true;
    if (!this.buildMeta.lastFullSync) return true;
    
    const lastFullSync = new Date(this.buildMeta.lastFullSync);
    const now = new Date();
    const hoursSinceLastSync = (now - lastFullSync) / (1000 * 60 * 60);
    
    // Full sync every 24 hours
    return hoursSinceLastSync >= 24;
  }

  // Load existing profiles
  async loadExistingProfiles() {
    try {
      if (fs.existsSync(this.profilesFile)) {
        const data = fs.readFileSync(this.profilesFile, 'utf8');
        const profilesArray = JSON.parse(data);
        
        profilesArray.forEach(profile => {
          const key = profile.primaryAddr || profile.address || profile.profileId;
          this.profiles.set(key, profile);
        });
        
        console.log(`📄 Loaded ${profilesArray.length} existing profiles`);
      }
    } catch (error) {
      console.error('❌ Error loading existing profiles:', error);
    }
  }

  // Load build metadata
  async loadBuildMeta() {
    try {
      if (fs.existsSync(this.metadataFile)) {
        const data = fs.readFileSync(this.metadataFile, 'utf8');
        const meta = JSON.parse(data);
        this.buildMeta = { ...this.buildMeta, ...meta };
        console.log(`📊 Loaded metadata - Last ID: ${this.buildMeta.lastProfileId}`);
      }
    } catch (error) {
      console.error('❌ Error loading metadata:', error);
    }
  }

  // Save build metadata
  async saveBuildMeta() {
    try {
      fs.writeFileSync(this.metadataFile, JSON.stringify(this.buildMeta, null, 2));
    } catch (error) {
      console.error('❌ Error saving metadata:', error);
    }
  }

  // Save profiles to file
  async saveProfiles() {
    try {
      const profilesArray = Array.from(this.profiles.values())
        .sort((a, b) => (b.score || 0) - (a.score || 0));
      
      fs.writeFileSync(this.profilesFile, JSON.stringify(profilesArray, null, 2));
      console.log(`💾 Saved ${profilesArray.length} profiles to database`);
      
      await this.saveBuildMeta();
    } catch (error) {
      console.error('❌ Error saving profiles:', error);
    }
  }

  // Concurrent fetch with retry logic
  async fetchProfilesConcurrent(profileIds) {
    const semaphore = new Semaphore(this.concurrency);
    const results = [];
    
    const fetchPromises = profileIds.map(async (profileId) => {
      return semaphore.acquire(async () => {
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
          try {
            const profile = await getUserByProfileId(profileId);
            if (profile) {
              return { profileId, profile, success: true };
            } else {
              return { profileId, profile: null, success: false };
            }
          } catch (error) {
            console.log(`⚠️ Attempt ${attempt}/${this.maxRetries} failed for profile ${profileId}: ${error.message}`);
            if (attempt === this.maxRetries) {
              return { profileId, profile: null, success: false, error: error.message };
            }
            await this.sleep(100 * attempt); // Exponential backoff
          }
        }
      });
    });

    const batchResults = await Promise.all(fetchPromises);
    return batchResults;
  }

  // Full sync - fetch all profiles from scratch
  async performFullSync() {
    console.log('🔄 Starting FULL SYNC - fetching all profiles...');
    const startTime = Date.now();
    
    let currentId = 1;
    let consecutiveNotFound = 0;
    let totalFetched = 0;
    let batchNumber = 1;

    while (consecutiveNotFound < this.buildMeta.maxConsecutiveNotFound) {
      const batchStart = Date.now();
      
      // Create batch of profile IDs
      const profileIds = [];
      for (let i = 0; i < this.batchSize && consecutiveNotFound < this.buildMeta.maxConsecutiveNotFound; i++) {
        profileIds.push(currentId + i);
      }

      console.log(`\n📦 Batch ${batchNumber}: Processing profile IDs ${currentId}-${currentId + profileIds.length - 1}`);
      console.log(`📊 Progress: ${totalFetched} profiles | Consecutive not found: ${consecutiveNotFound}`);

      // Fetch batch concurrently
      const results = await this.fetchProfilesConcurrent(profileIds);
      
      let batchFound = 0;
      let batchNotFound = 0;

      for (const result of results) {
        this.buildMeta.totalAttempts++;
        
        if (result.success && result.profile) {
          // Found profile
          const profile = this.normalizeProfile(result.profile, result.profileId);
          const key = profile.primaryAddr || profile.address || profile.profileId;
          this.profiles.set(key, profile);
          
          batchFound++;
          totalFetched++;
          consecutiveNotFound = 0; // Reset counter
          this.buildMeta.successfulFetches++;
          this.buildMeta.lastProfileId = Math.max(this.buildMeta.lastProfileId, result.profileId);
        } else {
          // Not found
          batchNotFound++;
          consecutiveNotFound++;
        }
      }

      const batchTime = Date.now() - batchStart;
      const rate = (profileIds.length / batchTime * 1000).toFixed(1);
      
      console.log(`✅ Batch ${batchNumber} complete: +${batchFound} profiles, ${batchNotFound} not found in ${(batchTime/1000).toFixed(1)}s (${rate} profiles/sec)`);

      // Save progress periodically
      if (batchNumber % 5 === 0) {
        await this.saveProfiles();
        console.log(`💾 Progress saved: ${totalFetched} profiles`);
      }

      currentId += profileIds.length;
      batchNumber++;

      // Small delay between batches
      if (this.sleepMs > 0) {
        await this.sleep(this.sleepMs);
      }
    }

    // Final save
    this.buildMeta.lastFullSync = new Date().toISOString();
    this.buildMeta.lastIncrementalSync = new Date().toISOString();
    await this.saveProfiles();

    const totalTime = (Date.now() - startTime) / 1000;
    const avgRate = (totalFetched / totalTime).toFixed(1);
    
    console.log(`\n🎉 FULL SYNC COMPLETE!`);
    console.log(`✅ Total profiles: ${totalFetched}`);
    console.log(`✅ Time taken: ${(totalTime/60).toFixed(1)} minutes`);
    console.log(`✅ Average rate: ${avgRate} profiles/sec`);
    console.log(`✅ Last profile ID: ${this.buildMeta.lastProfileId}`);
  }

  // Incremental sync - only check for new profiles beyond last known ID
  async performIncrementalSync() {
    console.log('⚡ Starting INCREMENTAL SYNC - checking for new profiles...');
    const startTime = Date.now();
    
    let currentId = this.buildMeta.lastProfileId + 1;
    let consecutiveNotFound = 0;
    let newProfilesFound = 0;

    while (consecutiveNotFound < 200) { // Lower threshold for incremental
      // Create smaller batches for incremental
      const profileIds = [];
      for (let i = 0; i < INCREMENTAL_CHUNK_SIZE; i++) {
        profileIds.push(currentId + i);
      }

      console.log(`\n📦 Checking profile IDs ${currentId}-${currentId + profileIds.length - 1}`);

      const results = await this.fetchProfilesConcurrent(profileIds);
      
      let chunkFound = 0;
      for (const result of results) {
        if (result.success && result.profile) {
          const profile = this.normalizeProfile(result.profile, result.profileId);
          const key = profile.primaryAddr || profile.address || profile.profileId;
          this.profiles.set(key, profile);
          
          chunkFound++;
          newProfilesFound++;
          consecutiveNotFound = 0;
          this.buildMeta.lastProfileId = Math.max(this.buildMeta.lastProfileId, result.profileId);
        } else {
          consecutiveNotFound++;
        }
      }

      if (chunkFound > 0) {
        console.log(`✅ Found ${chunkFound} new profiles`);
      }

      currentId += profileIds.length;

      // Small delay
      await this.sleep(this.sleepMs);
    }

    this.buildMeta.lastIncrementalSync = new Date().toISOString();
    await this.saveProfiles();

    const totalTime = (Date.now() - startTime) / 1000;
    
    console.log(`\n⚡ INCREMENTAL SYNC COMPLETE!`);
    console.log(`✅ New profiles found: ${newProfilesFound}`);
    console.log(`✅ Total profiles: ${this.profiles.size}`);
    console.log(`✅ Time taken: ${totalTime.toFixed(1)} seconds`);
    console.log(`✅ Last profile ID: ${this.buildMeta.lastProfileId}`);
  }

  // Normalize profile data
  normalizeProfile(profile, profileId) {
    return {
      profileId: profileId,
      id: profile.id,
      username: profile.username,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      description: profile.description,
      score: profile.score || 0,
      xpTotal: profile.xpTotal || 0,
      xpStreakDays: profile.xpStreakDays || 0,
      status: profile.status,
      userkeys: profile.userkeys || [],
      links: {
        profile: `https://app.ethos.network/profile/x/${profile.username}`,
        scoreBreakdown: `https://app.ethos.network/profile/x/${profile.username}/score`
      },
      stats: profile.stats || { review: {}, vouch: {} },
      source: 'profile-id-v2-api-optimized',
      fetchedAt: new Date().toISOString(),
      primaryAddr: profile.userkeys?.find(key => key.startsWith('address:')) || `profileId:${profileId}`
    };
  }

  // Sleep utility
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Main build method
  async buildDatabase() {
    const syncMode = await this.initialize();
    
    if (syncMode === 'full') {
      await this.performFullSync();
    } else {
      await this.performIncrementalSync();
    }

    return {
      totalProfiles: this.profiles.size,
      syncMode: syncMode,
      lastProfileId: this.buildMeta.lastProfileId
    };
  }
}

// Semaphore for concurrency control
class Semaphore {
  constructor(maxConcurrency) {
    this.maxConcurrency = maxConcurrency;
    this.currentConcurrency = 0;
    this.queue = [];
  }

  async acquire(task) {
    return new Promise((resolve, reject) => {
      this.queue.push({
        task,
        resolve,
        reject
      });
      this.process();
    });
  }

  async process() {
    if (this.currentConcurrency >= this.maxConcurrency || this.queue.length === 0) {
      return;
    }

    this.currentConcurrency++;
    const { task, resolve, reject } = this.queue.shift();

    try {
      const result = await task();
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      this.currentConcurrency--;
      this.process();
    }
  }
}

// Run the optimized builder
async function main() {
  try {
    const builder = new OptimizedProfileBuilder();
    const result = await builder.buildDatabase();
    
    console.log('\n🎉 Optimized Profile Database Building Complete!');
    console.log(`📊 Final Stats:`);
    console.log(`   - Total profiles: ${result.totalProfiles}`);
    console.log(`   - Sync mode: ${result.syncMode.toUpperCase()}`);
    console.log(`   - Last profile ID: ${result.lastProfileId}`);
    console.log(`📁 Files updated:`);
    console.log(`   - ./data/user-profiles.json`);
    console.log(`   - ./data/database-metadata.json`);
    
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (process.argv[1] && import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  main();
}

export default OptimizedProfileBuilder;
