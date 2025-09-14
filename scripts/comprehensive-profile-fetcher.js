import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ComprehensiveProfileFetcher {
  constructor() {
    this.dataDir = path.join(__dirname, '..', 'data', 'csv');
    this.batchSize = 500;
    this.concurrency = 100;
    this.delayMs = 50;
    this.maxConsecutiveNotFound = 4000;
    this.consecutiveNotFound = 0;
    this.validProfiles = [];
    this.processedCount = 0;
    this.startTime = Date.now();
    this.lastProgressTime = Date.now();
    
    console.log('🚀 Comprehensive Profile Fetcher initialized');
    console.log(`📁 Data directory: ${this.dataDir}`);
    
    // Ensure data directory exists
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  // Fetch batch of profile information (up to 500 profiles)
  async fetchProfilesBatch(profileIds) {
    try {
      const response = await fetch(`https://api.ethos.network/api/v2/users/by/profile-id`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Ethos-Client': 'ethoscard.vercel.app'
        },
        body: JSON.stringify({ profileIds: profileIds })
      });

      if (!response.ok) {
        console.error(`Batch fetch failed with status: ${response.status}`);
        return [];
      }

      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error(`Error fetching batch of ${profileIds.length} profiles:`, error.message);
      return [];
    }
  }

  // Fetch XP data for multiple profiles concurrently
  async fetchXpDataConcurrent(profiles, seasonIds = [0, 1]) {
    const xpResults = new Map();
    
    // Initialize results map
    for (const profile of profiles) {
      xpResults.set(profile.profileId, {
        seasons: {},
        weekly: {}
      });
    }

    // Create all XP fetch promises for concurrent execution
    const xpPromises = [];
    
    for (const profile of profiles) {
      for (const seasonId of seasonIds) {
        // Season XP promise
        xpPromises.push(
          this.fetchSeasonXp(profile.profileId, seasonId)
            .then(xp => ({ profileId: profile.profileId, seasonId, type: 'season', data: xp }))
            .catch(() => ({ profileId: profile.profileId, seasonId, type: 'season', data: null }))
        );
        
        // Weekly XP promise
        xpPromises.push(
          this.fetchWeeklyXp(profile.profileId, seasonId)
            .then(weekly => ({ profileId: profile.profileId, seasonId, type: 'weekly', data: weekly }))
            .catch(() => ({ profileId: profile.profileId, seasonId, type: 'weekly', data: [] }))
        );
      }
    }

    // Execute all XP fetches with concurrency control
    const xpChunks = [];
    for (let i = 0; i < xpPromises.length; i += this.concurrency) {
      xpChunks.push(xpPromises.slice(i, i + this.concurrency));
    }

    for (const chunk of xpChunks) {
      const results = await Promise.all(chunk);
      
      for (const result of results) {
        const profileData = xpResults.get(result.profileId);
        if (profileData) {
          if (result.type === 'season') {
            profileData.seasons[result.seasonId] = result.data || 0;
          } else if (result.type === 'weekly') {
            profileData.weekly[result.seasonId] = result.data || [];
          }
        }
      }
      
      // Delay between chunks
      await new Promise(resolve => setTimeout(resolve, this.delayMs));
    }

    return xpResults;
  }

  // Fetch season XP for a specific season
  async fetchSeasonXp(profileId, seasonId) {
    try {
      const response = await fetch(`https://api.ethos.network/api/v2/xp/user/profileId:${profileId}/season/${seasonId}`, {
        headers: {
          'X-Ethos-Client': 'ethoscard.vercel.app'
        }
      });

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      return null;
    }
  }

  // Fetch weekly XP for a specific season
  async fetchWeeklyXp(profileId, seasonId) {
    try {
      const response = await fetch(`https://api.ethos.network/api/v2/xp/user/profileId:${profileId}/season/${seasonId}/weekly`, {
        headers: {
          'X-Ethos-Client': 'ethoscard.vercel.app'
        }
      });

      if (!response.ok) {
        return [];
      }

      return await response.json();
    } catch (error) {
      return [];
    }
  }

  // Fetch all seasons information
  async fetchSeasons() {
    try {
      const response = await fetch('https://api.ethos.network/api/v2/xp/seasons', {
        headers: {
          'X-Ethos-Client': 'ethoscard.vercel.app'
        }
      });

      if (!response.ok) {
        // Default to seasons 0 and 1 if API fails
        return {
          seasons: [
            { id: 0, name: 'Season 0' },
            { id: 1, name: 'Season 1' }
          ]
        };
      }

      return await response.json();
    } catch (error) {
      return {
        seasons: [
          { id: 0, name: 'Season 0' },
          { id: 1, name: 'Season 1' }
        ]
      };
    }
  }

  // Check if user has validator-related addresses in userkeys
  isValidatorHolder(profile) {
    if (!profile || !profile.userkeys) return false;
    
    // Check if they have Ethereum addresses in userkeys (validators typically have ETH addresses)
    const hasEthAddress = profile.userkeys.some(key => key.startsWith('address:0x'));
    
    // High score + ETH address might indicate validator (this is heuristic)
    if (hasEthAddress && profile.score && profile.score > 1500) {
      return true;
    }
    
    // For now, we'll use a simple heuristic based on score and address presence
    // TODO: Need to find the actual validator holding field in the API
    return false;
  }

  // Process comprehensive data for a batch of profiles
  async processProfilesBatch(profileIds) {
    try {
      console.log(`🔄 Processing batch of ${profileIds.length} profiles (${profileIds[0]} - ${profileIds[profileIds.length - 1]})`);
      
      // Fetch basic profile information for the entire batch
      const profiles = await this.fetchProfilesBatch(profileIds);
      
      if (!profiles || profiles.length === 0) {
        console.log(`❌ No profiles found in batch ${profileIds[0]} - ${profileIds[profileIds.length - 1]}`);
        return [];
      }

      console.log(`✅ Found ${profiles.length}/${profileIds.length} profiles in batch`);

      // Fetch XP data for all valid profiles concurrently
      const xpResults = await this.fetchXpDataConcurrent(profiles);

      // Compile comprehensive profile data
      const comprehensiveProfiles = [];
      
      for (const profile of profiles) {
        const xpData = xpResults.get(profile.profileId) || { seasons: {}, weekly: {} };
        
        // Calculate total XP from seasons
        const totalXp = (xpData.seasons[0] || 0) + (xpData.seasons[1] || 0);
        
        const comprehensiveProfile = {
          profile_id: profile.profileId,
          userkey: profile.profileId, // Use profileId directly as userkey (number)
          username: profile.username || null,
          display_name: profile.displayName || null,
          avatar_url: profile.avatarUrl || null,
          description: profile.description || null,
          score: profile.score || 0, // Direct score from API
          streak_days: profile.xpStreakDays || 0, // Correct field name from API
          total_xp: profile.xpTotal || totalXp, // Use API xpTotal if available, fallback to calculated
          is_validator: this.isValidatorHolder(profile),
          
          // Season XP data
          season_0_xp: xpData.seasons[0] || 0,
          season_1_xp: xpData.seasons[1] || 0,
          
          // Weekly data summary
          season_0_weeks: xpData.weekly[0] ? xpData.weekly[0].length : 0,
          season_1_weeks: xpData.weekly[1] ? xpData.weekly[1].length : 0,
          
          // Additional data from API
          status: profile.status || 'UNKNOWN',
          userkeys_count: profile.userkeys ? profile.userkeys.length : 0,
          eth_addresses: profile.userkeys ? profile.userkeys.filter(k => k.startsWith('address:0x')).length : 0,
          
          // Timestamps
          created_at: new Date().toISOString(),
          last_updated: new Date().toISOString()
        };

        // Store detailed weekly data for later processing
        comprehensiveProfile._weeklyData = xpData.weekly;
        comprehensiveProfiles.push(comprehensiveProfile);
      }

      return comprehensiveProfiles;

    } catch (error) {
      console.error(`Error processing batch ${profileIds[0]} - ${profileIds[profileIds.length - 1]}:`, error.message);
      return [];
    }
  }

  // Process a single batch and update counters
  async processBatch(profileIds) {
    const validResults = await this.processProfilesBatch(profileIds);
    
    // Update counters based on results
    if (validResults.length === 0) {
      this.consecutiveNotFound += profileIds.length;
    } else {
      // Reset consecutive not found counter when we find valid profiles
      this.consecutiveNotFound = Math.max(0, this.consecutiveNotFound - validResults.length);
      this.validProfiles.push(...validResults);
    }

    this.processedCount += profileIds.length;
    
    return validResults;
  }

  // Save progress to CSV files
  async saveProgress() {
    if (this.validProfiles.length === 0) return;

    try {
      // Main profiles CSV
      const profileHeaders = [
        'profile_id', 'userkey', 'username', 'display_name', 'avatar_url',
        'description', 'score', 'streak_days', 'total_xp', 'is_validator',
        'season_0_xp', 'season_1_xp', 'season_0_weeks', 'season_1_weeks',
        'status', 'userkeys_count', 'eth_addresses',
        'created_at', 'last_updated'
      ];
      
      const profilesCsv = this.arrayToCsv(this.validProfiles, profileHeaders);
      const profilesFile = path.join(this.dataDir, 'comprehensive_profiles.csv');
      fs.writeFileSync(profilesFile, profilesCsv, 'utf8');

      // Detailed weekly data CSV
      const weeklyRecords = [];
      for (const profile of this.validProfiles) {
        if (profile._weeklyData) {
          for (const [seasonId, weeks] of Object.entries(profile._weeklyData)) {
            for (const week of weeks) {
              weeklyRecords.push({
                profile_id: profile.profile_id,
                season_id: parseInt(seasonId),
                week: week.week,
                weekly_xp: week.weeklyXp || 0,
                cumulative_xp: week.cumulativeXp || 0,
                created_at: new Date().toISOString()
              });
            }
          }
        }
      }

      if (weeklyRecords.length > 0) {
        const weeklyHeaders = ['profile_id', 'season_id', 'week', 'weekly_xp', 'cumulative_xp', 'created_at'];
        const weeklyCsv = this.arrayToCsv(weeklyRecords, weeklyHeaders);
        const weeklyFile = path.join(this.dataDir, 'comprehensive_weekly_xp.csv');
        fs.writeFileSync(weeklyFile, weeklyCsv, 'utf8');
      }

      console.log(`💾 Saved ${this.validProfiles.length} profiles and ${weeklyRecords.length} weekly records`);

    } catch (error) {
      console.error('❌ Error saving progress:', error);
    }
  }

  // Convert array to CSV
  arrayToCsv(data, headers) {
    if (!data || data.length === 0) return headers.join(',') + '\n';
    
    const csvRows = [headers.join(',')];
    
    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      csvRows.push(values.join(','));
    }
    
    return csvRows.join('\n');
  }

  // Show progress
  showProgress() {
    const now = Date.now();
    const elapsed = Math.round((now - this.startTime) / 1000);
    const rate = this.processedCount / elapsed;
    const validRate = this.validProfiles.length / elapsed;
    
    console.log(`⏱️  Progress: ${this.processedCount} processed, ${this.validProfiles.length} valid profiles found`);
    console.log(`📊 Rate: ${rate.toFixed(1)} profiles/sec, ${validRate.toFixed(1)} valid/sec`);
    console.log(`🔍 Consecutive not found: ${this.consecutiveNotFound}/${this.maxConsecutiveNotFound}`);
    console.log(`⏰ Elapsed: ${elapsed}s`);
  }

  // Main fetching process
  async fetchAllProfiles() {
    console.log('🚀 Starting comprehensive profile fetching...');
    console.log(`🔧 Settings: ${this.batchSize} batch size, ${this.concurrency} concurrency, ${this.delayMs}ms delay`);
    console.log(`🛑 Stop condition: ${this.maxConsecutiveNotFound} consecutive profiles not found`);
    
    let currentProfileId = 1;
    let progressInterval = setInterval(() => this.showProgress(), 10000); // Every 10 seconds

    try {
      while (this.consecutiveNotFound < this.maxConsecutiveNotFound) {
        // Create batch of profile IDs (full batch of 500)
        const batch = [];
        for (let i = 0; i < this.batchSize; i++) {
          batch.push(currentProfileId++);
        }

        // Process the entire batch at once
        await this.processBatch(batch);
        
        // Save progress every 5 batches (2500 profiles)
        if (this.processedCount % (this.batchSize * 5) === 0) {
          await this.saveProgress();
        }

        // Delay between batches
        await new Promise(resolve => setTimeout(resolve, this.delayMs));
        
        // Check if we should stop
        if (this.consecutiveNotFound >= this.maxConsecutiveNotFound) {
          console.log(`\n🛑 Stopping: ${this.consecutiveNotFound} consecutive profiles not found`);
          break;
        }
      }

    } catch (error) {
      console.error('❌ Error during fetching:', error);
    } finally {
      clearInterval(progressInterval);
      
      // Final save
      await this.saveProgress();
      
      const elapsed = Math.round((Date.now() - this.startTime) / 1000);
      const validatorCount = this.validProfiles.filter(p => p.is_validator).length;
      const usersWithNames = this.validProfiles.filter(p => p.username).length;
      
      console.log('\n🎉 Comprehensive profile fetching completed!');
      console.log(`📊 Final stats:`);
      console.log(`   - Total processed: ${this.processedCount}`);
      console.log(`   - Valid profiles: ${this.validProfiles.length}`);
      console.log(`   - Users with names: ${usersWithNames} (${((usersWithNames/this.validProfiles.length)*100).toFixed(1)}%)`);
      console.log(`   - Validators: ${validatorCount} (${((validatorCount/this.validProfiles.length)*100).toFixed(1)}%)`);
      console.log(`   - Duration: ${elapsed} seconds`);
      console.log(`   - Final rate: ${(this.validProfiles.length/elapsed).toFixed(1)} valid profiles/sec`);
      console.log(`   - Files saved to: ${this.dataDir}`);
    }
  }
}

// Run the script
console.log('🚀 Starting comprehensive profile fetching...');
const fetcher = new ComprehensiveProfileFetcher();
fetcher.fetchAllProfiles()
  .then(() => console.log('✅ Comprehensive profile fetching completed'))
  .catch(console.error);

export default ComprehensiveProfileFetcher;
