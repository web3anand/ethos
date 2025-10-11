// Fresh fetch of Week 13 data directly from Ethos API
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG = {
  ETHOS_API_BASE: 'https://api.ethos.network/api/v2/xp/user',
  SEASON_ID: 1,
  WEEK: 13,
  BATCH_SIZE: 1000, // 1000 per batch
  CONCURRENCY: 10, // 10 concurrent requests
  DELAY_BETWEEN_REQUESTS: 50, // 50ms delay between requests
  DELAY_BETWEEN_BATCHES: 1000, // 1 second between batches
  MAX_CONSECUTIVE_EMPTY: 5000, // Stop after 5000 consecutive empty profiles
  OUTPUT_FILE: path.join(__dirname, '..', 'data', 'fresh-week13-fetch.json'),
  LOG_FILE: path.join(__dirname, '..', 'data', 'fresh-week13-fetch.log')
};

class FreshWeek13Fetcher {
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
      await new Promise(resolve => setTimeout(resolve, CONFIG.DELAY_BETWEEN_REQUESTS));
      
      const url = `${CONFIG.ETHOS_API_BASE}/profileId:${profileId}/season/${CONFIG.SEASON_ID}/weekly`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Ethos-Fresh-Week13-Fetch/1.0',
          'X-Ethos-Client': 'ethos-fresh-week13-fetch@1.0.0'
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
      
      if (data && Array.isArray(data)) {
        const week13Data = data.find(week => week.week === CONFIG.WEEK);
        
        if (week13Data && week13Data.weeklyXp > 0) {
          this.results.profileIds.add(profileId);
          this.results.totalWithWeek13Data++;
          
          // Store sample data (first 50 users)
          if (this.results.sampleData.length < 50) {
            this.results.sampleData.push({
              profile_id: profileId,
              week: week13Data.week,
              weekly_xp: week13Data.weeklyXp,
              cumulative_xp: week13Data.cumulativeXp || 0,
              total_weeks: data.length
            });
          }
          
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
      this.results.errors.push({ profileId, error: error.message });
      console.error(`❌ Error fetching profile ${profileId}:`, error.message);
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
    this.results.consecutiveEmpty = validResults.length === 0 ? this.results.consecutiveEmpty + batchSize : 0;
    
    // Store batch results
    this.results.batches.push({
      batchStart,
      batchEnd,
      batchSize,
      validResults: validResults.length,
      totalSoFar: this.results.totalWithWeek13Data
    });
    
    console.log(`✅ Batch complete: ${validResults.length} users with Week 13 XP (Total: ${this.results.totalWithWeek13Data})`);
    console.log(`📊 Consecutive empty: ${this.results.consecutiveEmpty}/${CONFIG.MAX_CONSECUTIVE_EMPTY}`);
    
    // Log progress every 10 batches
    if (this.results.batches.length % 10 === 0) {
      console.log(`📈 Progress: Checked ${this.results.totalChecked} profiles, found ${this.results.totalWithWeek13Data} Week 13 recipients`);
      console.log(`🆔 Last found profile ID: ${batchEnd}`);
    }
    
    return validResults.length;
  }

  async fetchAll() {
    console.log('🚀 Starting FRESH Week 13 recipient count fetch...');
    console.log(`📊 Target: Find all users with weekly_xp > 0 for Season 1, Week 13`);
    console.log(`📦 Batch size: ${CONFIG.BATCH_SIZE} profiles`);
    console.log(`⚡ Concurrency: ${CONFIG.CONCURRENCY} requests`);
    console.log(`⏹️  Stop condition: ${CONFIG.MAX_CONSECUTIVE_EMPTY} consecutive empty profiles`);
    
    let currentProfileId = 1;
    let batchCount = 0;
    
    while (this.results.consecutiveEmpty < CONFIG.MAX_CONSECUTIVE_EMPTY) {
      batchCount++;
      const batchStart = currentProfileId;
      const batchSize = Math.min(CONFIG.BATCH_SIZE, CONFIG.MAX_CONSECUTIVE_EMPTY - this.results.consecutiveEmpty);
      
      const validResults = await this.processBatch(batchStart, batchSize);
      
      currentProfileId += batchSize;
      
      // Add delay between batches
      if (this.results.consecutiveEmpty < CONFIG.MAX_CONSECUTIVE_EMPTY) {
        await new Promise(resolve => setTimeout(resolve, CONFIG.DELAY_BETWEEN_BATCHES));
      }
    }
    
    this.results.endTime = new Date().toISOString();
    this.results.duration = Math.round((new Date(this.results.endTime) - new Date(this.results.startTime)) / 1000);
    
    // Save results
    await this.saveResults();
    
    // Print summary
    this.printSummary();
    
    return this.results;
  }

  async saveResults() {
    // Ensure data directory exists
    const dataDir = path.dirname(CONFIG.OUTPUT_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Save JSON results
    fs.writeFileSync(CONFIG.OUTPUT_FILE, JSON.stringify(this.results, null, 2));
    console.log(`💾 Results saved to: ${CONFIG.OUTPUT_FILE}`);
    
    // Save log
    const logEntry = {
      timestamp: new Date().toISOString(),
      totalChecked: this.results.totalChecked,
      totalWithWeek13Data: this.results.totalWithWeek13Data,
      consecutiveEmpty: this.results.consecutiveEmpty,
      duration: this.results.duration,
      errors: this.results.errors.length
    };
    
    const logContent = JSON.stringify(logEntry) + '\n';
    fs.appendFileSync(CONFIG.LOG_FILE, logContent);
    console.log(`📝 Log file: ${CONFIG.LOG_FILE}`);
  }

  printSummary() {
    console.log('\n📊 FRESH WEEK 13 FETCH SUMMARY');
    console.log('============================================================');
    console.log(`🎯 Target: Season 1, Week 13`);
    console.log(`📈 Total profiles checked: ${this.results.totalChecked.toLocaleString()}`);
    console.log(`✅ Total Week 13 recipients: ${this.results.totalWithWeek13Data.toLocaleString()}`);
    console.log(`🆔 Last checked profile ID: ${this.results.totalChecked}`);
    console.log(`🆔 Last found profile ID: ${Math.max(...this.results.profileIds) || 'N/A'}`);
    console.log(`⏸️  Consecutive empty profiles: ${this.results.consecutiveEmpty.toLocaleString()}`);
    console.log(`📦 Total batches processed: ${this.results.batches.length}`);
    console.log(`❌ Total errors: ${this.results.errors.length}`);
    console.log(`⏱️  Duration: ${this.results.duration}s`);
    
    if (this.results.sampleData.length > 0) {
      console.log(`\n📋 Sample Week 13 recipients:`);
      this.results.sampleData.slice(0, 20).forEach((user, i) => {
        console.log(`   ${i + 1}. Profile ${user.profile_id}: ${user.weekly_xp.toLocaleString()} XP (${user.total_weeks} weeks)`);
      });
    }
    
    if (this.results.batches.length > 0) {
      console.log(`\n📦 Recent batch results:`);
      this.results.batches.slice(-5).forEach((batch, i) => {
        console.log(`   Batch ${this.results.batches.length - 4 + i}: profiles ${batch.batchStart}-${batch.batchEnd} = ${batch.validResults} users`);
      });
    }
    
    console.log(`\n🎉 Fresh fetch completed!`);
    console.log(`📄 Detailed results: ${CONFIG.OUTPUT_FILE}`);
    console.log(`📝 Log file: ${CONFIG.LOG_FILE}`);
  }
}

// Run the fresh fetch
const fetcher = new FreshWeek13Fetcher();
fetcher.fetchAll().catch(console.error);
