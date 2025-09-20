// Slow version of Week 13 count fetcher with conservative rate limiting
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG = {
  ETHOS_API_BASE: 'https://api.ethos.network/api/v2/xp/user',
  SEASON_ID: 1,
  WEEK: 13,
  DELAY_BETWEEN_REQUESTS: 2000, // 2 seconds between requests
  MAX_CONSECUTIVE_EMPTY: 100, // Stop after 100 consecutive empty responses
  OUTPUT_FILE: path.join(__dirname, '..', 'data', 'week13-slow-fetch.json'),
  LOG_FILE: path.join(__dirname, '..', 'data', 'week13-slow-fetch.log')
};

class SlowWeek13Fetcher {
  constructor() {
    this.results = {
      totalChecked: 0,
      totalWithWeek13Data: 0,
      consecutiveEmpty: 0,
      startTime: new Date().toISOString(),
      errors: [],
      sampleData: [],
      profileIds: new Set()
    };
  }

  async fetchUserWeek13Data(profileId) {
    try {
      const url = `${CONFIG.ETHOS_API_BASE}/profileId:${profileId}/season/${CONFIG.SEASON_ID}/weekly`;
      
      console.log(`📡 Fetching profile ${profileId}...`);
      
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
        if (response.status === 429) {
          console.log(`⏳ Rate limited, waiting 10 seconds...`);
          await new Promise(resolve => setTimeout(resolve, 10000));
          return this.fetchUserWeek13Data(profileId); // Retry
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Check if user has any weekly data and look for Week 13
      if (data && Array.isArray(data)) {
        console.log(`📊 Profile ${profileId} has ${data.length} weeks of data`);
        
        // Find Week 13 data
        const week13Data = data.find(week => week.week === CONFIG.WEEK);
        
        if (week13Data && week13Data.weeklyXp > 0) {
          this.results.profileIds.add(profileId);
          this.results.totalWithWeek13Data++;
          
          // Store sample data (first 10 users)
          if (this.results.sampleData.length < 10) {
            this.results.sampleData.push({
              profile_id: profileId,
              week: week13Data.week,
              weekly_xp: week13Data.weeklyXp,
              cumulative_xp: week13Data.cumulativeXp || 0
            });
          }
          
          console.log(`✅ Profile ${profileId}: Week 13 = ${week13Data.weeklyXp} XP (Total: ${this.results.totalWithWeek13Data})`);
          
          return {
            profile_id: profileId,
            week: week13Data.week,
            weekly_xp: week13Data.weeklyXp,
            cumulative_xp: week13Data.cumulativeXp || 0
          };
        } else if (week13Data) {
          console.log(`📊 Profile ${profileId}: Week 13 = ${week13Data.weeklyXp} XP (no XP)`);
        } else {
          console.log(`📊 Profile ${profileId}: No Week 13 data found`);
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

  async run() {
    console.log('🚀 Starting SLOW Week 13 recipient count fetch...');
    console.log(`📊 Target: Find all users with weekly_xp > 0 for Season ${CONFIG.SEASON_ID}, Week ${CONFIG.WEEK}`);
    console.log(`⏹️  Stop condition: ${CONFIG.MAX_CONSECUTIVE_EMPTY} consecutive empty responses`);
    console.log(`⏱️  Delay between requests: ${CONFIG.DELAY_BETWEEN_REQUESTS}ms`);
    console.log('');

    let currentProfileId = 5000; // Start from profile 5000
    let lastFoundProfileId = 0;

    while (this.results.consecutiveEmpty < CONFIG.MAX_CONSECUTIVE_EMPTY) {
      try {
        const result = await this.fetchUserWeek13Data(currentProfileId);
        this.results.totalChecked++;
        
        if (result) {
          this.results.consecutiveEmpty = 0;
          lastFoundProfileId = currentProfileId;
        } else {
          this.results.consecutiveEmpty++;
          console.log(`⏸️  No Week 13 data (${this.results.consecutiveEmpty}/${CONFIG.MAX_CONSECUTIVE_EMPTY} consecutive empty)`);
        }
        
        // Progress update every 10 profiles
        if (this.results.totalChecked % 10 === 0) {
          console.log(`📈 Progress: Checked ${this.results.totalChecked} profiles, found ${this.results.totalWithWeek13Data} Week 13 recipients`);
        }
        
        currentProfileId++;
        
        // Add delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, CONFIG.DELAY_BETWEEN_REQUESTS));
        
      } catch (error) {
        console.error(`❌ Error at profile ${currentProfileId}:`, error.message);
        this.results.errors.push({
          profile_id: currentProfileId,
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
    console.log('\n📊 SLOW WEEK 13 FETCH SUMMARY');
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
    
    console.log('\n🎉 Fetch completed!');
    console.log(`📄 Detailed results: ${CONFIG.OUTPUT_FILE}`);
    console.log(`📝 Log file: ${CONFIG.LOG_FILE}`);
  }
}

// Run the fetcher
const fetcher = new SlowWeek13Fetcher();
fetcher.run().catch(error => {
  console.error('❌ Fetcher failed:', error);
  process.exit(1);
});
