// High-performance batch script to fetch Week 13 recipients from Ethos API
// 500 profiles per batch, 100 concurrency, stop after 3000 consecutive empty

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG = {
  ETHOS_API_BASE: 'https://api.ethos.network/api/v2/xp/user',
  SEASON_ID: 1,
  WEEK: 13,
  BATCH_SIZE: 500, // 500 per batch
  CONCURRENCY: 100, // 100 concurrent requests
  MAX_CONSECUTIVE_EMPTY: 3000,
  DELAY_BETWEEN_REQUESTS: 10, // 10ms delay between requests
  DELAY_BETWEEN_BATCHES: 1000, // 1000ms between batches
  OUTPUT_FILE: path.join(__dirname, '..', 'data', 'week13-batch-fetch.json'),
  LOG_FILE: path.join(__dirname, '..', 'data', 'week13-batch-fetch.log')
};

class BatchWeek13Fetcher {
  constructor() {
    this.results = {
      totalChecked: 0,
      totalWithWeek13Data: 0,
      consecutiveEmpty: 0,
      startTime: new Date().toISOString(),
      errors: [],
      sampleData: [],
      profileIds: new Set(),
      batches: []
    };
  }

  async fetchUserWeek13Data(profileId) {
    try {
      // Add delay between requests
      await new Promise(resolve => setTimeout(resolve, CONFIG.DELAY_BETWEEN_REQUESTS));
      
      const url = `${CONFIG.ETHOS_API_BASE}/profileId:${profileId}/season/${CONFIG.SEASON_ID}/weekly`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Ethos-Week13-Batch-Counter/1.0',
          'X-Ethos-Client': 'ethos-week13-counter@1.0.0'
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null; // User not found
        }
        if (response.status === 429) {
          // Rate limited, wait longer and retry
          console.log(`⏳ Rate limited for profile ${profileId}, waiting 10 seconds...`);
          await new Promise(resolve => setTimeout(resolve, 10000));
          return this.fetchUserWeek13Data(profileId);
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Check if user has any weekly data and look for Week 13
      if (data && Array.isArray(data)) {
        const week13Data = data.find(week => week.week === CONFIG.WEEK);
        
        if (week13Data && week13Data.weeklyXp > 0) {
          return {
            profile_id: profileId,
            week: week13Data.week,
            weekly_xp: week13Data.weeklyXp,
            cumulative_xp: week13Data.cumulativeXp || 0,
            total_weeks: data.length
          };
        }
      }
      
      return null;
      
    } catch (error) {
      this.results.errors.push({
        profile_id: profileId,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      return null;
    }
  }

  async processBatch(batchStart, batchSize) {
    const batchEnd = batchStart + batchSize - 1;
    const profileIds = Array.from({ length: batchSize }, (_, i) => batchStart + i);
    
    console.log(`📦 Processing batch: profiles ${batchStart} to ${batchEnd} (${batchSize} profiles)`);
    
    // Create semaphore for concurrency control
    const semaphore = new Array(CONFIG.CONCURRENCY).fill(0).map(() => Promise.resolve());
    let semaphoreIndex = 0;
    
    const fetchWithSemaphore = async (profileId) => {
      // Wait for available slot
      await semaphore[semaphoreIndex];
      const currentSlot = semaphoreIndex;
      semaphoreIndex = (semaphoreIndex + 1) % CONFIG.CONCURRENCY;
      
      const fetchPromise = this.fetchUserWeek13Data(profileId);
      semaphore[currentSlot] = fetchPromise.catch(() => null);
      
      return fetchPromise;
    };
    
    // Process all profiles in this batch concurrently
    const batchPromises = profileIds.map(profileId => fetchWithSemaphore(profileId));
    const batchResults = await Promise.all(batchPromises);
    
    // Filter valid results
    const validResults = batchResults.filter(result => result !== null);
    
    // Update counters
    this.results.totalChecked += batchSize;
    this.results.totalWithWeek13Data += validResults.length;
    
    // Add to profile IDs set
    validResults.forEach(result => {
      this.results.profileIds.add(result.profile_id);
    });
    
    // Store sample data (first 20 users)
    if (this.results.sampleData.length < 20) {
      const remainingSlots = 20 - this.results.sampleData.length;
      this.results.sampleData.push(...validResults.slice(0, remainingSlots));
    }
    
    // Update consecutive empty counter
    if (validResults.length > 0) {
      this.results.consecutiveEmpty = 0;
    } else {
      this.results.consecutiveEmpty += batchSize;
    }
    
    // Store batch results
    const batchInfo = {
      batchStart,
      batchEnd,
      batchSize,
      validResults: validResults.length,
      consecutiveEmpty: this.results.consecutiveEmpty,
      timestamp: new Date().toISOString()
    };
    this.results.batches.push(batchInfo);
    
    console.log(`✅ Batch complete: ${validResults.length} users with Week 13 XP (Total: ${this.results.totalWithWeek13Data})`);
    console.log(`📊 Consecutive empty: ${this.results.consecutiveEmpty}/${CONFIG.MAX_CONSECUTIVE_EMPTY}`);
    
    return validResults;
  }

  async run() {
    console.log('🚀 Starting BATCH Week 13 recipient count fetch...');
    console.log(`📊 Target: Find all users with weekly_xp > 0 for Season ${CONFIG.SEASON_ID}, Week ${CONFIG.WEEK}`);
    console.log(`📦 Batch size: ${CONFIG.BATCH_SIZE} profiles`);
    console.log(`⚡ Concurrency: ${CONFIG.CONCURRENCY} requests`);
    console.log(`⏹️  Stop condition: ${CONFIG.MAX_CONSECUTIVE_EMPTY} consecutive empty profiles`);
    console.log('');

    let currentProfileId = 1;
    let batchNumber = 1;
    let lastFoundProfileId = 0;

    while (this.results.consecutiveEmpty < CONFIG.MAX_CONSECUTIVE_EMPTY) {
      try {
        const batchResults = await this.processBatch(currentProfileId, CONFIG.BATCH_SIZE);
        
        if (batchResults.length > 0) {
          lastFoundProfileId = currentProfileId + CONFIG.BATCH_SIZE - 1;
        }
        
        // Progress update every 10 batches
        if (batchNumber % 10 === 0) {
          console.log(`📈 Progress: Checked ${this.results.totalChecked} profiles, found ${this.results.totalWithWeek13Data} Week 13 recipients`);
          console.log(`🆔 Last found profile ID: ${lastFoundProfileId}`);
        }
        
        currentProfileId += CONFIG.BATCH_SIZE;
        batchNumber++;
        
        // Add delay between batches to avoid overwhelming the API
        if (this.results.consecutiveEmpty < CONFIG.MAX_CONSECUTIVE_EMPTY) {
          await new Promise(resolve => setTimeout(resolve, CONFIG.DELAY_BETWEEN_BATCHES));
        }
        
      } catch (error) {
        console.error(`❌ Error in batch ${batchNumber}:`, error.message);
        this.results.errors.push({
          batch: batchNumber,
          error: error.message,
          timestamp: new Date().toISOString()
        });
        break;
      }
    }

    this.results.endTime = new Date().toISOString();
    this.results.lastCheckedProfileId = currentProfileId - 1;
    this.results.lastFoundProfileId = lastFoundProfileId;
    this.results.duration = new Date(this.results.endTime) - new Date(this.results.startTime);

    // Save results
    await this.saveResults();
    this.printSummary();
  }

  async saveResults() {
    try {
      // Save detailed results
      const resultsData = {
        ...this.results,
        profileIds: Array.from(this.results.profileIds).sort((a, b) => a - b)
      };
      
      fs.writeFileSync(CONFIG.OUTPUT_FILE, JSON.stringify(resultsData, null, 2));
      console.log(`💾 Results saved to: ${CONFIG.OUTPUT_FILE}`);
      
      // Save log
      const logEntry = {
        timestamp: new Date().toISOString(),
        totalChecked: this.results.totalChecked,
        totalWithWeek13Data: this.results.totalWithWeek13Data,
        lastCheckedProfileId: this.results.lastCheckedProfileId,
        lastFoundProfileId: this.results.lastFoundProfileId,
        consecutiveEmpty: this.results.consecutiveEmpty,
        errors: this.results.errors.length,
        batches: this.results.batches.length
      };
      
      const logLine = JSON.stringify(logEntry) + '\n';
      fs.appendFileSync(CONFIG.LOG_FILE, logLine);
      
    } catch (error) {
      console.error('❌ Error saving results:', error.message);
    }
  }

  printSummary() {
    console.log('\n📊 BATCH WEEK 13 FETCH SUMMARY');
    console.log('='.repeat(60));
    console.log(`🎯 Target: Season ${CONFIG.SEASON_ID}, Week ${CONFIG.WEEK}`);
    console.log(`📈 Total profiles checked: ${this.results.totalChecked.toLocaleString()}`);
    console.log(`✅ Total Week 13 recipients: ${this.results.totalWithWeek13Data.toLocaleString()}`);
    console.log(`🆔 Last checked profile ID: ${this.results.lastCheckedProfileId.toLocaleString()}`);
    console.log(`🆔 Last found profile ID: ${this.results.lastFoundProfileId.toLocaleString()}`);
    console.log(`⏸️  Consecutive empty profiles: ${this.results.consecutiveEmpty.toLocaleString()}`);
    console.log(`📦 Total batches processed: ${this.results.batches.length}`);
    console.log(`❌ Total errors: ${this.results.errors.length}`);
    console.log(`⏱️  Duration: ${Math.round(this.results.duration / 1000)}s`);
    
    if (this.results.sampleData.length > 0) {
      console.log('\n📋 Sample Week 13 recipients:');
      this.results.sampleData.forEach((user, index) => {
        console.log(`   ${index + 1}. Profile ${user.profile_id}: ${user.weekly_xp.toLocaleString()} XP (${user.total_weeks} weeks)`);
      });
    }
    
    // Show recent batch results
    if (this.results.batches.length > 0) {
      console.log('\n📦 Recent batch results:');
      this.results.batches.slice(-5).forEach((batch, index) => {
        console.log(`   Batch ${this.results.batches.length - 4 + index}: profiles ${batch.batchStart}-${batch.batchEnd} = ${batch.validResults} users`);
      });
    }
    
    console.log('\n🎉 Batch fetch completed!');
    console.log(`📄 Detailed results: ${CONFIG.OUTPUT_FILE}`);
    console.log(`📝 Log file: ${CONFIG.LOG_FILE}`);
  }
}

// Run the fetcher
const fetcher = new BatchWeek13Fetcher();
fetcher.run().catch(error => {
  console.error('❌ Fetcher failed:', error);
  process.exit(1);
});
