import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ComprehensiveXpFetcher {
  constructor() {
    this.baseUrl = 'https://api.ethos.network/api/v2';
    this.batchSize = 500; // Profiles per batch
    this.concurrency = 100; // Concurrent requests
    this.delay = 50; // ms delay between requests
    this.maxConsecutiveNotFound = 3000; // Stop after 3000 consecutive not found
    this.minXpRequired = 1; // Minimum XP to consider valid
    this.currentProfileId = 1; // Start from profile ID 1
    
    // Database setup
    this.dbPath = path.join(__dirname, '..', 'database', 'weekly-xp.db');
    this.db = new Database(this.dbPath);
    
    // Statistics tracking
    this.stats = {
      totalProfiles: 0,
      validProfiles: 0,
      totalFetched: 0,
      consecutiveNotFound: 0,
      lastProfileId: 0,
      errors: 0,
      startTime: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };
    
    // Data storage
    this.errors = [];
    this.statsFile = path.join(__dirname, '..', 'data', 'comprehensive-xp-stats.json');
    
    console.log('🚀 Comprehensive XP Fetcher initialized');
    console.log(`📁 Database: ${this.dbPath}`);
    console.log(`📊 Stats file: ${this.statsFile}`);
    
    this.createTables();
    this.loadSeasonData();
  }

  // Create database tables
  createTables() {
    try {
      // Main profiles table with XP data
      this.db.prepare(`
        CREATE TABLE IF NOT EXISTS xp_profiles (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          profile_id INTEGER UNIQUE NOT NULL,
          userkey TEXT NOT NULL,
          username TEXT,
          display_name TEXT,
          avatar_url TEXT,
          total_xp INTEGER DEFAULT 0,
          season_0_xp INTEGER DEFAULT 0,
          season_1_xp INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run();

      // Weekly XP data table
      this.db.prepare(`
        CREATE TABLE IF NOT EXISTS weekly_xp_data (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          profile_id INTEGER NOT NULL,
          season_id INTEGER NOT NULL,
          week INTEGER NOT NULL,
          weekly_xp INTEGER DEFAULT 0,
          cumulative_xp INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (profile_id) REFERENCES xp_profiles(profile_id),
          UNIQUE(profile_id, season_id, week)
        )
      `).run();

      // Season weeks information table
      this.db.prepare(`
        CREATE TABLE IF NOT EXISTS season_weeks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          season_id INTEGER NOT NULL,
          week INTEGER NOT NULL,
          start_date TEXT,
          end_date TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(season_id, week)
        )
      `).run();

      console.log('✅ Database tables created/verified');
    } catch (error) {
      console.error('❌ Error creating tables:', error.message);
    }
  }

  // Load season data once at startup
  async loadSeasonData() {
    try {
      console.log('🔍 Loading season data...');
      const seasonsInfo = await this.fetchSeasons();
      
      if (seasonsInfo && seasonsInfo.seasons) {
        this.seasons = seasonsInfo.seasons;
        console.log(`✅ Loaded ${this.seasons.length} seasons:`, this.seasons.map(s => `${s.id}:${s.name}`));
        
        // Load weeks data for each season
        for (const season of this.seasons) {
          await this.loadWeeksData(season.id);
          await this.sleep(this.delay);
        }
      } else {
        // Fallback to default seasons
        this.seasons = [
          { id: 0, name: "Season 0", startDate: "2025-01-01T00:00:00.000Z" },
          { id: 1, name: "Season 1", startDate: "2025-05-14T00:00:00.000Z" }
        ];
        console.log('⚠️ Using fallback season data');
      }
    } catch (error) {
      console.error('❌ Error loading season data:', error.message);
      this.seasons = [
        { id: 0, name: "Season 0", startDate: "2025-01-01T00:00:00.000Z" },
        { id: 1, name: "Season 1", startDate: "2025-05-14T00:00:00.000Z" }
      ];
    }
  }

  // Load weeks data for a season
  async loadWeeksData(seasonId) {
    try {
      const weeksData = await this.fetchSeasonWeeks(seasonId);
      if (weeksData && Array.isArray(weeksData)) {
        for (const weekInfo of weeksData) {
          this.db.prepare(`
            INSERT OR REPLACE INTO season_weeks 
            (season_id, week, start_date, end_date) 
            VALUES (?, ?, ?, ?)
          `).run(seasonId, weekInfo.week, weekInfo.startDate, weekInfo.endDate);
        }
        console.log(`✅ Loaded ${weeksData.length} weeks for season ${seasonId}`);
      }
    } catch (error) {
      console.error(`❌ Error loading weeks for season ${seasonId}:`, error.message);
    }
  }

  // Sleep function for delays
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Create userkey from profile ID
  createUserkey(profileId) {
    return `profileId:${profileId}`;
  }

  // Fetch seasons information
  async fetchSeasons() {
    try {
      const response = await fetch(`${this.baseUrl}/xp/seasons`, {
        headers: {
          'X-Ethos-Client': 'ethoscard.vercel.app'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('❌ Error fetching seasons:', error.message);
      return null;
    }
  }

  // Fetch weeks for a specific season
  async fetchSeasonWeeks(seasonId) {
    try {
      const response = await fetch(`${this.baseUrl}/xp/season/${seasonId}/weeks`, {
        headers: {
          'X-Ethos-Client': 'ethoscard.vercel.app'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`❌ Error fetching weeks for season ${seasonId}:`, error.message);
      return null;
    }
  }

  // Fetch total XP for a user with retry logic
  async fetchUserXp(userkey, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}/xp/user/${userkey}`, {
          headers: {
            'X-Ethos-Client': 'ethoscard.vercel.app'
          }
        });
        
        if (response.status === 404) {
          return null;
        }
        
        if (response.status === 429) {
          const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff
          console.log(`⏳ Rate limited for userkey ${userkey}, waiting ${waitTime}ms before retry ${attempt}/${retries}`);
          await this.sleep(waitTime);
          continue;
        }
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
      } catch (error) {
        if (attempt === retries) {
          console.error(`❌ Error fetching XP for ${userkey}:`, error.message);
          return null;
        }
        await this.sleep(1000 * attempt);
      }
    }
    return null;
  }

  // Fetch XP data for a specific season
  async fetchSeasonXp(userkey, seasonId, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}/xp/user/${userkey}/season/${seasonId}`, {
          headers: {
            'X-Ethos-Client': 'ethoscard.vercel.app'
          }
        });
        
        if (response.status === 404) {
          return null;
        }
        
        if (response.status === 429) {
          const waitTime = Math.pow(2, attempt) * 1000;
          console.log(`⏳ Rate limited for season ${seasonId} XP, waiting ${waitTime}ms before retry ${attempt}/${retries}`);
          await this.sleep(waitTime);
          continue;
        }
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
      } catch (error) {
        if (attempt === retries) {
          console.error(`❌ Error fetching season ${seasonId} XP for ${userkey}:`, error.message);
          return null;
        }
        await this.sleep(1000 * attempt);
      }
    }
    return null;
  }

  // Fetch weekly XP data for a season
  async fetchWeeklyXp(userkey, seasonId, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}/xp/user/${userkey}/season/${seasonId}/weekly`, {
          headers: {
            'X-Ethos-Client': 'ethoscard.vercel.app'
          }
        });
        
        if (response.status === 404) {
          return null;
        }
        
        if (response.status === 429) {
          const waitTime = Math.pow(2, attempt) * 1000;
          console.log(`⏳ Rate limited for weekly XP, waiting ${waitTime}ms before retry ${attempt}/${retries}`);
          await this.sleep(waitTime);
          continue;
        }
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
      } catch (error) {
        if (attempt === retries) {
          console.error(`❌ Error fetching weekly XP for season ${seasonId}, ${userkey}:`, error.message);
          return null;
        }
        await this.sleep(1000 * attempt);
      }
    }
    return null;
  }

  // Process a single profile
  async processProfile(profileId) {
    try {
      const userkey = this.createUserkey(profileId);
      
      // Fetch total XP first to check if profile exists and has XP
      const totalXp = await this.fetchUserXp(userkey);
      
      if (!totalXp || totalXp < this.minXpRequired) {
        return { profileId, found: false, hasXp: false };
      }
      
      console.log(`✅ Profile ${profileId} found with ${totalXp} total XP`);
      
      // Fetch season XP data
      const seasonXpData = {};
      for (const season of this.seasons) {
        const seasonXp = await this.fetchSeasonXp(userkey, season.id);
        seasonXpData[`season_${season.id}_xp`] = seasonXp || 0;
        await this.sleep(this.delay);
      }
      
      // Insert/update profile data
      this.db.prepare(`
        INSERT OR REPLACE INTO xp_profiles 
        (profile_id, userkey, total_xp, season_0_xp, season_1_xp, updated_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(
        profileId, 
        userkey, 
        totalXp, 
        seasonXpData.season_0_xp || 0, 
        seasonXpData.season_1_xp || 0
      );
      
      // Fetch and store weekly data for each season
      for (const season of this.seasons) {
        const weeklyXp = await this.fetchWeeklyXp(userkey, season.id);
        if (weeklyXp && Array.isArray(weeklyXp)) {
          for (const weekData of weeklyXp) {
            this.db.prepare(`
              INSERT OR REPLACE INTO weekly_xp_data 
              (profile_id, season_id, week, weekly_xp, cumulative_xp)
              VALUES (?, ?, ?, ?, ?)
            `).run(
              profileId,
              season.id,
              weekData.week,
              weekData.weeklyXp || 0,
              weekData.cumulativeXp || 0
            );
          }
          console.log(`📊 Stored ${weeklyXp.length} weeks of data for profile ${profileId}, season ${season.id}`);
        }
        await this.sleep(this.delay);
      }
      
      return { profileId, found: true, hasXp: true, totalXp };
      
    } catch (error) {
      console.error(`❌ Error processing profile ${profileId}:`, error.message);
      this.errors.push({ profileId, error: error.message, timestamp: new Date().toISOString() });
      this.stats.errors++;
      return { profileId, found: false, hasXp: false, error: error.message };
    }
  }

  // Process a batch of profiles with concurrency control
  async processBatch(profileIds) {
    console.log(`📦 Processing batch: profiles ${profileIds[0]} to ${profileIds[profileIds.length - 1]}`);
    
    const chunks = [];
    for (let i = 0; i < profileIds.length; i += this.concurrency) {
      chunks.push(profileIds.slice(i, i + this.concurrency));
    }
    
    const results = [];
    for (const chunk of chunks) {
      const chunkPromises = chunk.map(profileId => this.processProfile(profileId));
      const chunkResults = await Promise.all(chunkPromises);
      results.push(...chunkResults);
      
      // Add delay between chunks to avoid overwhelming the API
      await this.sleep(this.delay * 2);
    }
    
    return results;
  }

  // Save statistics
  saveStats() {
    try {
      const statsData = {
        ...this.stats,
        duration: Date.now() - new Date(this.stats.startTime).getTime(),
        lastUpdated: new Date().toISOString()
      };
      
      fs.writeFileSync(this.statsFile, JSON.stringify(statsData, null, 2));
      console.log(`📊 Stats saved: ${this.stats.validProfiles} valid profiles, ${this.stats.totalFetched} fetched, ${this.stats.consecutiveNotFound} consecutive not found`);
    } catch (error) {
      console.error('❌ Error saving stats:', error.message);
    }
  }

  // Main fetching function
  async startFetching() {
    console.log('🚀 Starting comprehensive XP data fetch...');
    console.log('📋 Configuration:');
    console.log(`   - Batch size: ${this.batchSize} profiles`);
    console.log(`   - Concurrency: ${this.concurrency}`);
    console.log(`   - Delay: ${this.delay}ms`);
    console.log(`   - Min XP required: ${this.minXpRequired}`);
    console.log(`   - Max consecutive not found: ${this.maxConsecutiveNotFound}`);
    console.log(`   - Starting from profile ID: ${this.currentProfileId}`);

    while (this.stats.consecutiveNotFound < this.maxConsecutiveNotFound) {
      const batchStart = this.currentProfileId;
      const batchEnd = batchStart + this.batchSize - 1;
      const profileIds = Array.from({ length: this.batchSize }, (_, i) => batchStart + i);
      
      console.log(`\n🔄 Processing batch starting from profile ID ${batchStart}`);
      
      const results = await this.processBatch(profileIds);
      
      // Process results
      let foundInBatch = 0;
      for (const result of results) {
        this.stats.totalFetched++;
        this.stats.lastProfileId = result.profileId;
        
        if (result.found && result.hasXp) {
          this.stats.validProfiles++;
          this.stats.consecutiveNotFound = 0;
          foundInBatch++;
        } else {
          this.stats.consecutiveNotFound++;
        }
      }
      
      console.log(`📊 Batch completed: ${foundInBatch}/${this.batchSize} profiles found with XP`);
      
      this.currentProfileId = batchEnd + 1;
      this.saveStats();
      
      // Check stopping condition
      if (this.stats.consecutiveNotFound >= this.maxConsecutiveNotFound) {
        console.log(`🛑 Stopping: ${this.stats.consecutiveNotFound} consecutive profiles not found (limit: ${this.maxConsecutiveNotFound})`);
        break;
      }
      
      // Add delay between batches
      console.log(`⏳ Waiting ${this.delay}ms before next batch...`);
      await this.sleep(this.delay);
    }

    this.logFinalStats();
  }

  // Log final statistics
  logFinalStats() {
    const duration = Date.now() - new Date(this.stats.startTime).getTime();
    console.log('\n🎉 Comprehensive XP fetch completed!');
    console.log('📊 Final stats:');
    console.log(`   - Valid profiles with XP: ${this.stats.validProfiles}`);
    console.log(`   - Total profiles fetched: ${this.stats.totalFetched}`);
    console.log(`   - Last profile ID: ${this.stats.lastProfileId}`);
    console.log(`   - Consecutive not found: ${this.stats.consecutiveNotFound}`);
    console.log(`   - Errors: ${this.stats.errors}`);
    console.log(`   - Duration: ${Math.round(duration / 1000)} seconds`);
    console.log(`   - Database: ${this.dbPath}`);
    
    // Database statistics
    const profileCount = this.db.prepare('SELECT COUNT(*) as count FROM xp_profiles').get();
    const weeklyDataCount = this.db.prepare('SELECT COUNT(*) as count FROM weekly_xp_data').get();
    console.log(`   - Profiles in database: ${profileCount.count}`);
    console.log(`   - Weekly data records: ${weeklyDataCount.count}`);
  }

  // Close database connection
  close() {
    if (this.db) {
      this.db.close();
      console.log('🔒 Database connection closed');
    }
  }
}

// Run the script
console.log('🚀 Starting comprehensive XP data fetcher...');
const fetcher = new ComprehensiveXpFetcher();

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⚠️ Received SIGINT, gracefully shutting down...');
  fetcher.saveStats();
  fetcher.close();
  process.exit(0);
});

fetcher.startFetching()
  .then(() => {
    console.log('✅ Comprehensive XP data fetch completed');
    fetcher.close();
  })
  .catch(error => {
    console.error('❌ Error in comprehensive fetch:', error);
    fetcher.close();
  });

export default ComprehensiveXpFetcher;
