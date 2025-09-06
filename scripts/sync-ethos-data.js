import EthosDatabase from '../database/index.js';
import EthosApiClient from '../utils/ethosApiClient.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class EthosDataSync {
  constructor() {
    this.db = new EthosDatabase();
    this.ethosApi = new EthosApiClient();
    this.isRunning = false;
  }

  // Sync all profiles from the API to database
  async syncProfiles() {
    const logId = this.db.startSyncLog('profiles');
    let recordsProcessed = 0;
    let recordsUpdated = 0;
    let recordsCreated = 0;
    let errorMessage = null;

    try {
      console.log('🔄 Starting profile sync...');
      
      // Load existing cached data first
      await this.loadCachedProfiles();

      // Get profiles from API (this might take a while)
      const profiles = await this.ethosApi.getAllProfiles();
      
      console.log(`📊 Processing ${profiles.length} profiles...`);

      for (const profile of profiles) {
        try {
          const result = this.db.upsertProfile(profile);
          recordsProcessed++;
          
          if (result.changes > 0) {
            recordsUpdated++;
          }

          // Sync user keys if available
          if (profile.userkeys && profile.userkeys.length > 0) {
            this.db.upsertUserKeys(profile.profileId || profile.id, profile.userkeys);
          }

          // Sync stats if available
          if (profile.stats) {
            this.db.upsertUserStats(profile.profileId || profile.id, profile.stats);
          }

          if (recordsProcessed % 100 === 0) {
            console.log(`📈 Processed ${recordsProcessed}/${profiles.length} profiles`);
          }
        } catch (error) {
          console.error(`❌ Error processing profile ${profile.profileId || profile.id}:`, error);
        }
      }

      console.log('✅ Profile sync completed successfully');
    } catch (error) {
      console.error('❌ Profile sync failed:', error);
      errorMessage = error.message;
    }

    this.db.completeSyncLog(logId, recordsProcessed, recordsUpdated, recordsCreated, errorMessage);
    return { recordsProcessed, recordsUpdated, recordsCreated };
  }

  // Load cached profiles from file system
  async loadCachedProfiles() {
    try {
      const dataDir = path.join(__dirname, '../data');
      if (!fs.existsSync(dataDir)) return;

      const files = fs.readdirSync(dataDir);
      const profileFiles = files.filter(f => f.includes('profile') && f.endsWith('.json'));

      for (const file of profileFiles) {
        try {
          const filePath = path.join(dataDir, file);
          const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          
          if (Array.isArray(data)) {
            for (const profile of data) {
              this.db.upsertProfile(profile);
              if (profile.userkeys) {
                this.db.upsertUserKeys(profile.profileId || profile.id, profile.userkeys);
              }
              if (profile.stats) {
                this.db.upsertUserStats(profile.profileId || profile.id, profile.stats);
              }
            }
          }
        } catch (error) {
          console.error(`Error loading cached file ${file}:`, error);
        }
      }

      console.log('📁 Loaded cached profile data');
    } catch (error) {
      console.error('Error loading cached profiles:', error);
    }
  }

  // Sync R4R analysis data
  async syncR4RAnalysis() {
    const logId = this.db.startSyncLog('r4r');
    let recordsProcessed = 0;
    let recordsUpdated = 0;
    let recordsCreated = 0;
    let errorMessage = null;

    try {
      console.log('🔄 Starting R4R analysis sync...');

      // Load cached R4R data
      const r4rCachePath = path.join(__dirname, '../data/r4r-analysis-cache.json');
      if (fs.existsSync(r4rCachePath)) {
        const r4rData = JSON.parse(fs.readFileSync(r4rCachePath, 'utf8'));

        for (const [key, analysis] of Object.entries(r4rData)) {
          try {
            const profileId = analysis.data?.user?.profileId;
            if (profileId) {
              const result = this.db.upsertR4RAnalysis(profileId, analysis.data);
              recordsProcessed++;
              if (result.changes > 0) {
                recordsUpdated++;
              }
            }
          } catch (error) {
            console.error(`Error processing R4R analysis for ${key}:`, error);
          }
        }
      }

      console.log('✅ R4R analysis sync completed');
    } catch (error) {
      console.error('❌ R4R analysis sync failed:', error);
      errorMessage = error.message;
    }

    this.db.completeSyncLog(logId, recordsProcessed, recordsUpdated, recordsCreated, errorMessage);
    return { recordsProcessed, recordsUpdated, recordsCreated };
  }

  // Sync ETH price data
  async syncEthPrice() {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
      const data = await response.json();
      const ethPrice = data.ethereum.usd;
      
      this.db.insertEthPrice(ethPrice);
      console.log(`💰 ETH price updated: $${ethPrice}`);
      return ethPrice;
    } catch (error) {
      console.error('❌ ETH price sync failed:', error);
      return null;
    }
  }

  // Full sync - all data types
  async fullSync() {
    if (this.isRunning) {
      console.log('⚠️ Sync already running, skipping...');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      console.log('🚀 Starting full data synchronization...');

      // 1. Sync profiles and stats
      const profileResults = await this.syncProfiles();

      // 2. Sync R4R analysis
      const r4rResults = await this.syncR4RAnalysis();

      // 3. Sync ETH price
      await this.syncEthPrice();

      // 4. Show summary
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;

      console.log('📊 Sync Summary:');
      console.log(`⏱️ Duration: ${duration.toFixed(2)}s`);
      console.log(`👥 Profiles: ${profileResults.recordsProcessed} processed, ${profileResults.recordsUpdated} updated`);
      console.log(`📈 R4R Analysis: ${r4rResults.recordsProcessed} processed, ${r4rResults.recordsUpdated} updated`);

      // 5. Show database stats
      const dbStats = this.db.getDatabaseStats();
      console.log('📊 Database Statistics:');
      console.log(`   Profiles: ${dbStats.profiles}`);
      console.log(`   User Keys: ${dbStats.user_keys}`);
      console.log(`   User Stats: ${dbStats.user_stats}`);
      console.log(`   R4R Analysis: ${dbStats.r4r_analysis}`);
      console.log(`   Sync Logs: ${dbStats.sync_logs}`);

    } catch (error) {
      console.error('❌ Full sync failed:', error);
    } finally {
      this.isRunning = false;
    }
  }

  // Get sync status
  getSyncStatus() {
    return {
      isRunning: this.isRunning,
      recentLogs: this.db.getSyncLogs(10),
      dbStats: this.db.getDatabaseStats()
    };
  }

  // Close database connection
  close() {
    this.db.close();
  }
}

export default EthosDataSync;
