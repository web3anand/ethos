import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class WeeklyXpDataFetcher {
  constructor() {
    this.baseUrl = 'https://api.ethos.network/api/v2';
    this.delay = 1000; // 1 second delay between requests
    this.data = [];
    this.errors = [];
    this.stats = {
      totalProfiles: 0,
      totalFetched: 0,
      validProfiles: 0,
      lastProfileId: 0,
      errors: 0,
      lastUpdated: new Date().toISOString()
    };
    this.outputFile = path.join(__dirname, '..', 'data', 'weekly-xp-data.json');
    this.statsFile = path.join(__dirname, '..', 'data', 'weekly-xp-fetch-stats.json');

    console.log('🚀 Weekly XP Data Fetcher initialized');
    console.log(`📁 Output file: ${this.outputFile}`);
    console.log(`📊 Stats file: ${this.statsFile}`);
  }

  // Sleep function for delays
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Fetch all seasons information
  async fetchSeasons() {
    try {
      console.log('🔍 Fetching seasons information...');
      const response = await fetch(`${this.baseUrl}/xp/seasons`, {
        headers: {
          'X-Ethos-Client': 'ethoscard.vercel.app'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('✅ Seasons fetched successfully:', data);
      return data;
    } catch (error) {
      console.error('❌ Error fetching seasons:', error.message);
      return null;
    }
  }

  // Fetch weeks for a specific season
  async fetchSeasonWeeks(seasonId) {
    try {
      console.log(`🔍 Fetching weeks for season ${seasonId}...`);
      const response = await fetch(`${this.baseUrl}/xp/season/${seasonId}/weeks`, {
        headers: {
          'X-Ethos-Client': 'ethoscard.vercel.app'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`✅ Weeks for season ${seasonId} fetched:`, data);
      return data;
    } catch (error) {
      console.error(`❌ Error fetching weeks for season ${seasonId}:`, error.message);
      return null;
    }
  }

  // Create userkey from profile ID
  createUserkey(profileId) {
    return `profileId:${profileId}`;
  }

  // Fetch user profile by profile ID (we'll use the userkey format directly)
  async fetchUserProfile(profileId) {
    try {
      console.log(`🔍 Using profile ${profileId} with userkey format...`);
      // We'll simulate a profile object since we're working with userkey format
      const userkey = this.createUserkey(profileId);
      return {
        profileId: profileId,
        userkey: userkey,
        username: `User${profileId}`, // Placeholder
        displayName: `User ${profileId}`, // Placeholder
        avatarUrl: null
      };
    } catch (error) {
      console.error(`❌ Error creating profile ${profileId}:`, error.message);
      return null;
    }
  }

  // Fetch total XP for a user
  async fetchUserXp(userkey) {
    try {
      console.log(`🔍 Fetching total XP for userkey ${userkey}...`);
      const response = await fetch(`${this.baseUrl}/xp/user/${userkey}`, {
        headers: {
          'X-Ethos-Client': 'ethoscard.vercel.app'
        }
      });
      
      if (response.status === 404) {
        return null;
      }
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`✅ Total XP for ${userkey}:`, data);
      return data;
    } catch (error) {
      console.error(`❌ Error fetching total XP for ${userkey}:`, error.message);
      return null;
    }
  }

  // Fetch XP data for a specific season
  async fetchSeasonXp(userkey, seasonId) {
    try {
      console.log(`🔍 Fetching season ${seasonId} XP for userkey ${userkey}...`);
      const response = await fetch(`${this.baseUrl}/xp/user/${userkey}/season/${seasonId}`, {
        headers: {
          'X-Ethos-Client': 'ethoscard.vercel.app'
        }
      });
      
      if (response.status === 404) {
        return null;
      }
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`✅ Season ${seasonId} XP for ${userkey}:`, data);
      return data;
    } catch (error) {
      console.error(`❌ Error fetching season ${seasonId} XP for ${userkey}:`, error.message);
      return null;
    }
  }

  // Fetch weekly XP data for a season
  async fetchWeeklyXp(userkey, seasonId) {
    try {
      console.log(`🔍 Fetching weekly XP for season ${seasonId}, userkey ${userkey}...`);
      const response = await fetch(`${this.baseUrl}/xp/user/${userkey}/season/${seasonId}/weekly`, {
        headers: {
          'X-Ethos-Client': 'ethoscard.vercel.app'
        }
      });
      
      if (response.status === 404) {
        return null;
      }
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`✅ Weekly XP for season ${seasonId}, ${userkey}:`, data);
      return data;
    } catch (error) {
      console.error(`❌ Error fetching weekly XP for season ${seasonId}, ${userkey}:`, error.message);
      return null;
    }
  }

  // Process a single profile ID
  async processProfile(profileId) {
    try {
      console.log(`\n🔄 Processing profile ${profileId}...`);
      
      // 1. Fetch user profile
      const profile = await this.fetchUserProfile(profileId);
      if (!profile) {
        return null;
      }
      
      await this.sleep(this.delay);
      
      // 2. Fetch total XP
      const totalXp = await this.fetchUserXp(profile.userkey);
      await this.sleep(this.delay);
      
      // 3. Fetch seasons information
      const seasonsInfo = await this.fetchSeasons();
      if (!seasonsInfo) {
        console.log('❌ Could not fetch seasons info, using default seasons');
        // Use default seasons if API fails
        seasonsInfo = {
          seasons: [
            { id: 0, name: "Season 0", startDate: "2025-01-01T00:00:00.000Z" },
            { id: 1, name: "Season 1", startDate: "2025-05-14T00:00:00.000Z" }
          ],
          currentSeason: { id: 1, name: "Season 1", startDate: "2025-05-14T00:00:00.000Z", week: 13 }
        };
      }
      
      await this.sleep(this.delay);
      
      // 4. Process each season
      const seasonData = [];
      for (const season of seasonsInfo.seasons) {
        console.log(`\n📅 Processing season ${season.id}: ${season.name}`);
        
        // Fetch season XP
        const seasonXp = await this.fetchSeasonXp(profile.userkey, season.id);
        await this.sleep(this.delay);
        
        // Fetch weekly XP for this season
        const weeklyXp = await this.fetchWeeklyXp(profile.userkey, season.id);
        await this.sleep(this.delay);
        
        // Fetch weeks information for this season
        const weeksInfo = await this.fetchSeasonWeeks(season.id);
        await this.sleep(this.delay);
        
        seasonData.push({
          seasonId: season.id,
          seasonName: season.name,
          startDate: season.startDate,
          seasonXp: seasonXp,
          weeklyXp: weeklyXp,
          weeksInfo: weeksInfo
        });
      }
      
      // 5. Compile complete profile data
      const profileData = {
        profileId: profileId,
        userkey: profile.userkey,
        username: profile.username,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
        totalXp: totalXp,
        seasons: seasonData,
        currentSeason: seasonsInfo.currentSeason,
        fetchedAt: new Date().toISOString()
      };
      
      console.log(`✅ Profile ${profileId} processed successfully`);
      return profileData;
      
    } catch (error) {
      console.error(`❌ Error processing profile ${profileId}:`, error.message);
      this.errors.push({ profileId, error: error.message, timestamp: new Date().toISOString() });
      return null;
    }
  }

  // Save data to file
  saveData() {
    try {
      const dataToSave = {
        profiles: this.data,
        stats: this.stats,
        errors: this.errors,
        lastUpdated: new Date().toISOString()
      };
      
      fs.writeFileSync(this.outputFile, JSON.stringify(dataToSave, null, 2));
      fs.writeFileSync(this.statsFile, JSON.stringify(this.stats, null, 2));
      
      console.log(`💾 Data saved to ${this.outputFile}`);
      console.log(`📊 Stats saved to ${this.statsFile}`);
    } catch (error) {
      console.error('❌ Error saving data:', error.message);
    }
  }

  // Log final statistics
  logFinalStats() {
    console.log('\n🎉 Fetch process completed!');
    console.log('📊 Final stats:');
    console.log(`   - Valid profiles: ${this.stats.validProfiles}`);
    console.log(`   - Total fetched: ${this.stats.totalFetched}`);
    console.log(`   - Last profile ID: ${this.stats.lastProfileId}`);
    console.log(`   - Errors: ${this.stats.errors}`);
    console.log(`   - Data saved to: ${this.outputFile}`);
  }

  // Main fetch function
  async fetchWeeklyXpData(profileIds) {
    console.log('🚀 Starting weekly XP data fetch...');
    console.log('📋 Configuration:');
    console.log(`   - Profile IDs: ${profileIds.join(', ')}`);
    console.log(`   - Delay between requests: ${this.delay}ms`);
    console.log(`   - Processing: Sequential`);

    this.stats.totalProfiles = profileIds.length;

    for (const profileId of profileIds) {
      console.log(`\n🔄 Processing profile ${profileId}...`);
      const profileData = await this.processProfile(profileId);
      
      if (profileData) {
        this.data.push(profileData);
        this.stats.validProfiles++;
      }
      
      this.stats.totalFetched++;
      this.stats.lastProfileId = profileId;
      this.saveData();
      
      console.log(`⏳ Waiting ${this.delay}ms before next profile...`);
      await this.sleep(this.delay);
    }

    this.logFinalStats();
  }
}

// Run the script
console.log('🚀 Starting weekly XP data fetcher...');
const fetcher = new WeeklyXpDataFetcher();

// Fetch data for profile ID 5476 as requested
const profileIds = [5476];

fetcher.fetchWeeklyXpData(profileIds)
  .then(() => console.log('✅ Weekly XP data fetch completed'))
  .catch(console.error);
