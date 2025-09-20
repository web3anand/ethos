// Script to fetch Week 13 recipients directly from Ethos API
// This will help verify the accurate count without affecting the working system

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG = {
  ETHOS_API_BASE: 'https://api.ethos.network/api/v2/xp/user',
  SEASON_ID: 1,
  WEEK: 13,
  BATCH_SIZE: 100, // Process in batches
  MAX_CONSECUTIVE_EMPTY: 3000, // Stop after 3000 consecutive empty responses
  DELAY_BETWEEN_REQUESTS: 100, // 100ms delay between requests
  OUTPUT_FILE: path.join(__dirname, '..', 'data', 'week13-direct-fetch.json'),
  LOG_FILE: path.join(__dirname, '..', 'data', 'week13-fetch.log')
};

class Week13Fetcher {
  constructor() {
    this.results = {
      totalChecked: 0,
      totalWithWeek13Data: 0,
      consecutiveEmpty: 0,
      maxConsecutiveEmpty: 0,
      startTime: new Date().toISOString(),
      errors: [],
      sampleData: [],
      profileIds: new Set()
    };
  }

  async fetchUserWeek13Data(profileId) {
    try {
      const url = `${CONFIG.ETHOS_API_BASE}/${profileId}/season/${CONFIG.SEASON_ID}/weekly`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Ethos-Week13-Counter/1.0'
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null; // User not found
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Check if user has Week 13 data
      if (data && Array.isArray(data)) {
        const week13Data = data.find(week => week.week === CONFIG.WEEK);
        
        if (week13Data && week13Data.weekly_xp > 0) {
          this.results.profileIds.add(profileId);
          this.results.totalWithWeek13Data++;
          
          // Store sample data (first 10 users)
          if (this.results.sampleData.length < 10) {
            this.results.sampleData.push({
              profile_id: profileId,
              week: week13Data.week,
              weekly_xp: week13Data.weekly_xp,
              cumulative_xp: week13Data.cumulative_xp || 0
            });
          }
          
          return {
            profile_id: profileId,
            week: week13Data.week,
            weekly_xp: week13Data.weekly_xp,
            cumulative_xp: week13Data.cumulative_xp || 0
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
      
      console.error(`❌ Error fetching profile ${profileId}:`, error.message);
      return null;
    }
  }

  async processBatch(startId, batchSize) {
    const promises = [];
    
    for (let i = 0; i < batchSize; i++) {
      const profileId = startId + i;
      promises.push(this.fetchUserWeek13Data(profileId));
    }
    
    const results = await Promise.all(promises);
    return results.filter(result => result !== null);
  }

  async run() {
    console.log('🚀 Starting Week 13 recipient count fetch...');
    console.log(`📊 Target: Find all users with weekly_xp > 0 for Season ${CONFIG.SEASON_ID}, Week ${CONFIG.WEEK}`);
    console.log(`⏹️  Stop condition: ${CONFIG.MAX_CONSECUTIVE_EMPTY} consecutive empty responses`);
    console.log('');

    let currentProfileId = 1;
    let batchNumber = 1;
    let lastFoundProfileId = 0;

    while (this.results.consecutiveEmpty < CONFIG.MAX_CONSECUTIVE_EMPTY) {
      try {
        console.log(`📦 Processing batch ${batchNumber} (profiles ${currentProfileId} to ${currentProfileId + CONFIG.BATCH_SIZE - 1})...`);
        
        const batchResults = await this.processBatch(currentProfileId, CONFIG.BATCH_SIZE);
        this.results.totalChecked += CONFIG.BATCH_SIZE;
        
        if (batchResults.length > 0) {
          this.results.consecutiveEmpty = 0;
          lastFoundProfileId = currentProfileId + CONFIG.BATCH_SIZE - 1;
          console.log(`✅ Found ${batchResults.length} users with Week 13 data in this batch`);
          console.log(`📊 Total Week 13 recipients so far: ${this.results.totalWithWeek13Data}`);
        } else {
          this.results.consecutiveEmpty += CONFIG.BATCH_SIZE;
          console.log(`⏸️  No Week 13 data in this batch (${this.results.consecutiveEmpty}/${CONFIG.MAX_CONSECUTIVE_EMPTY} consecutive empty)`);
        }
        
        // Update max consecutive empty
        if (this.results.consecutiveEmpty > this.results.maxConsecutiveEmpty) {
          this.results.maxConsecutiveEmpty = this.results.consecutiveEmpty;
        }
        
        // Progress update every 10 batches
        if (batchNumber % 10 === 0) {
          console.log(`📈 Progress: Checked ${this.results.totalChecked} profiles, found ${this.results.totalWithWeek13Data} Week 13 recipients`);
        }
        
        currentProfileId += CONFIG.BATCH_SIZE;
        batchNumber++;
        
        // Add delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, CONFIG.DELAY_BETWEEN_REQUESTS));
        
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
        errors: this.results.errors.length
      };
      
      const logLine = JSON.stringify(logEntry) + '\n';
      fs.appendFileSync(CONFIG.LOG_FILE, logLine);
      
    } catch (error) {
      console.error('❌ Error saving results:', error.message);
    }
  }

  printSummary() {
    console.log('\n📊 WEEK 13 FETCH SUMMARY');
    console.log('='.repeat(50));
    console.log(`🎯 Target: Season ${CONFIG.SEASON_ID}, Week ${CONFIG.WEEK}`);
    console.log(`📈 Total profiles checked: ${this.results.totalChecked.toLocaleString()}`);
    console.log(`✅ Total Week 13 recipients: ${this.results.totalWithWeek13Data.toLocaleString()}`);
    console.log(`🆔 Last checked profile ID: ${this.results.lastCheckedProfileId.toLocaleString()}`);
    console.log(`🆔 Last found profile ID: ${this.results.lastFoundProfileId.toLocaleString()}`);
    console.log(`⏸️  Consecutive empty responses: ${this.results.consecutiveEmpty.toLocaleString()}`);
    console.log(`❌ Total errors: ${this.results.errors.length}`);
    console.log(`⏱️  Duration: ${Math.round(this.results.duration / 1000)}s`);
    
    if (this.results.sampleData.length > 0) {
      console.log('\n📋 Sample Week 13 recipients:');
      this.results.sampleData.forEach((user, index) => {
        console.log(`   ${index + 1}. Profile ${user.profile_id}: ${user.weekly_xp.toLocaleString()} XP`);
      });
    }
    
    if (this.results.errors.length > 0) {
      console.log('\n❌ Recent errors:');
      this.results.errors.slice(-5).forEach(error => {
        console.log(`   Profile ${error.profile_id}: ${error.error}`);
      });
    }
    
    console.log('\n🎉 Fetch completed!');
    console.log(`📄 Detailed results: ${CONFIG.OUTPUT_FILE}`);
    console.log(`📝 Log file: ${CONFIG.LOG_FILE}`);
  }
}

// Run the fetcher
const fetcher = new Week13Fetcher();
fetcher.run().catch(error => {
  console.error('❌ Fetcher failed:', error);
  process.exit(1);
});
