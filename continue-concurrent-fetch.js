// Simple Concurrent Profile Fetcher - Continue from where we left off
import { getUserByProfileId } from './utils/ethosApiClient.js';
import fs from 'fs';

const CONCURRENCY = 150;  // 150 concurrent requests as you suggested
const BATCH_SIZE = 1000;   // Process 1000 at a time
const START_ID = 7202;     // Continue from where we left off
const MAX_CONSECUTIVE = 1000; // Stop after 1000 consecutive not found

class SimpleConcurrentFetcher {
  constructor() {
    this.profiles = new Map();
    this.loadExistingProfiles();
  }

  loadExistingProfiles() {
    try {
      if (fs.existsSync('./data/user-profiles.json')) {
        const data = JSON.parse(fs.readFileSync('./data/user-profiles.json', 'utf8'));
        data.forEach(profile => {
          const key = profile.primaryAddr || profile.profileId;
          this.profiles.set(key, profile);
        });
        console.log(`📄 Loaded ${data.length} existing profiles`);
      }
    } catch (error) {
      console.error('Error loading profiles:', error);
    }
  }

  async fetchConcurrent(profileIds) {
    const semaphore = new Semaphore(CONCURRENCY);
    
    const promises = profileIds.map(profileId => 
      semaphore.acquire(async () => {
        try {
          const profile = await getUserByProfileId(profileId);
          return { profileId, profile, success: !!profile };
        } catch (error) {
          return { profileId, profile: null, success: false, error: error.message };
        }
      })
    );

    return Promise.all(promises);
  }

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
      source: 'profile-id-v2-api-concurrent',
      fetchedAt: new Date().toISOString(),
      primaryAddr: profile.userkeys?.find(key => key.startsWith('address:')) || `profileId:${profileId}`
    };
  }

  saveProfiles() {
    const profilesArray = Array.from(this.profiles.values())
      .sort((a, b) => (b.score || 0) - (a.score || 0));
    
    fs.writeFileSync('./data/user-profiles.json', JSON.stringify(profilesArray, null, 2));
    console.log(`💾 Saved ${profilesArray.length} profiles`);
  }

  async run() {
    console.log(`🚀 Starting concurrent fetch from profile ID ${START_ID}`);
    console.log(`⚡ Concurrency: ${CONCURRENCY} | Batch: ${BATCH_SIZE}`);
    
    let currentId = START_ID;
    let consecutiveNotFound = 0;
    let totalFound = 0;
    let batchNum = 1;

    while (consecutiveNotFound < MAX_CONSECUTIVE) {
      const startTime = Date.now();
      
      // Create batch
      const profileIds = [];
      for (let i = 0; i < BATCH_SIZE; i++) {
        profileIds.push(currentId + i);
      }

      console.log(`\n📦 Batch ${batchNum}: Processing IDs ${currentId}-${currentId + BATCH_SIZE - 1}`);
      
      // Fetch concurrently
      const results = await this.fetchConcurrent(profileIds);
      
      let batchFound = 0;
      let batchNotFound = 0;
      
      for (const result of results) {
        if (result.success && result.profile) {
          const profile = this.normalizeProfile(result.profile, result.profileId);
          const key = profile.primaryAddr || profile.profileId;
          this.profiles.set(key, profile);
          
          batchFound++;
          totalFound++;
          consecutiveNotFound = 0;
        } else {
          batchNotFound++;
          consecutiveNotFound++;
        }
      }

      const batchTime = (Date.now() - startTime) / 1000;
      const rate = (BATCH_SIZE / batchTime).toFixed(1);
      
      console.log(`✅ Batch ${batchNum}: +${batchFound} found, ${batchNotFound} not found in ${batchTime.toFixed(1)}s (${rate} profiles/sec)`);
      console.log(`📊 Total found: ${this.profiles.size} | Consecutive not found: ${consecutiveNotFound}`);

      // Save every 5 batches
      if (batchNum % 5 === 0) {
        this.saveProfiles();
      }

      currentId += BATCH_SIZE;
      batchNum++;

      // Small delay to be nice to the API
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    this.saveProfiles();
    console.log(`\n🎉 COMPLETE! Found ${totalFound} new profiles. Total: ${this.profiles.size}`);
  }
}

class Semaphore {
  constructor(maxConcurrency) {
    this.maxConcurrency = maxConcurrency;
    this.currentConcurrency = 0;
    this.queue = [];
  }

  async acquire(task) {
    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
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

// Run it
const fetcher = new SimpleConcurrentFetcher();
fetcher.run().catch(console.error);
