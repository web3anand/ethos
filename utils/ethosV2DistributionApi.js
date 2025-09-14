// Adapter for Ethos V2 Batch API to maintain compatibility with existing distribution page
import EthosV2BatchApi from './ethosV2BatchApi.js';

class EthosV2DistributionApi {
  constructor() {
    this.batchApi = new EthosV2BatchApi();
    this.cache = new Map();
    
    console.log('[Ethos V2 Distribution API] 🚀 Initialized with V2 batch processing');
  }

  // Get leaderboard data - compatible with existing distribution page
  async getFastLeaderboard(limit = 20000, progressCallback = null) {
    try {
      console.log(`[Ethos V2 Distribution API] 📊 Getting leaderboard (limit: ${limit})`);
      
      // Load from V2 database
      const profiles = await this.batchApi.loadFromDatabase();
      
      if (profiles.length === 0) {
        console.log('[Ethos V2 Distribution API] 📂 No V2 database found, attempting refresh...');
        
        if (progressCallback) {
          progressCallback({
            stage: 'No database found, refreshing...',
            current: 0,
            total: 100
          });
        }
        
        // Attempt to refresh if no data found
        const refreshedProfiles = await this.batchApi.fullRefresh(progressCallback);
        return this.formatLeaderboardData(refreshedProfiles.slice(0, limit));
      }
      
      // Return limited and formatted data
      const limitedProfiles = profiles.slice(0, limit);
      return this.formatLeaderboardData(limitedProfiles);
      
    } catch (error) {
      console.error('[Ethos V2 Distribution API] ❌ Error getting leaderboard:', error.message);
      throw error;
    }
  }

  // Force refresh - rebuild entire database
  async forceRefresh(progressCallback = null) {
    console.log('[Ethos V2 Distribution API] 🔄 Force refresh requested');
    
    try {
      const profiles = await this.batchApi.clearAndRebuildDatabase(progressCallback);
      const formattedData = this.formatLeaderboardData(profiles);
      
      // Clear cache
      this.cache.clear();
      
      console.log(`[Ethos V2 Distribution API] ✅ Force refresh complete: ${profiles.length} profiles`);
      return formattedData;
      
    } catch (error) {
      console.error('[Ethos V2 Distribution API] ❌ Force refresh failed:', error.message);
      throw error;
    }
  }

  // Format profile data to match expected structure for distribution page
  formatLeaderboardData(profiles) {
    return profiles.map((profile, index) => ({
      // Core identifiers
      profileId: profile.profileId,
      id: profile.id,
      username: profile.username,
      displayName: profile.displayName,
      
      // XP and ranking data
      xp: profile.xpTotal || 0,
      xpTotal: profile.xpTotal || 0,
      xpStreakDays: profile.xpStreakDays || 0,
      
      // Score and status
      score: profile.score || 0,
      status: profile.status,
      
      // Validator information
      isValidatorHolder: profile.isValidatorHolder || false,
      userkeys: profile.userkeys || [],
      
      // Visual data
      avatarUrl: profile.avatarUrl,
      description: profile.description,
      
      // Additional V2 data
      socialHandles: profile.socialHandles || {},
      profileUrl: profile.profileUrl,
      scoreBreakdownUrl: profile.scoreBreakdownUrl,
      
      // Season data
      xpInSeasons: profile.xpInSeasons || {},
      xpPerWeek: profile.xpPerWeek || [],
      currentSeasonXP: profile.currentSeasonXP || 0,
      leaderboardRank: profile.leaderboardRank || (index + 1),
      
      // Statistics
      stats: profile.stats || {
        review: { received: { negative: 0, neutral: 0, positive: 0 } },
        vouch: { given: { amountWeiTotal: "0", count: 0 }, received: { amountWeiTotal: "0", count: 0 } }
      },
      
      // Metadata
      fetchedAt: profile.fetchedAt,
      dataSource: 'ethos-v2-api'
    }));
  }

  // Get distribution statistics
  async getDistributionStats() {
    try {
      const profiles = await this.batchApi.loadFromDatabase();
      
      if (profiles.length === 0) {
        return {
          totalProfiles: 0,
          totalXP: 0,
          averageXP: 0,
          medianXP: 0,
          topScorer: null,
          validatorHolders: 0,
          dataSource: 'ethos-v2-api',
          lastUpdated: new Date().toISOString()
        };
      }
      
      const totalXP = profiles.reduce((sum, p) => sum + (p.xpTotal || 0), 0);
      const validatorHolders = profiles.filter(p => p.isValidatorHolder).length;
      const sortedByXP = profiles.map(p => p.xpTotal || 0).sort((a, b) => b - a);
      const medianXP = sortedByXP[Math.floor(sortedByXP.length / 2)];
      
      return {
        totalProfiles: profiles.length,
        totalXP,
        averageXP: Math.round(totalXP / profiles.length),
        medianXP,
        topScorer: profiles[0] ? {
          username: profiles[0].username,
          displayName: profiles[0].displayName,
          xpTotal: profiles[0].xpTotal
        } : null,
        validatorHolders,
        dataSource: 'ethos-v2-api',
        lastUpdated: profiles[0]?.fetchedAt || new Date().toISOString()
      };
      
    } catch (error) {
      console.error('[Ethos V2 Distribution API] ❌ Error getting stats:', error.message);
      throw error;
    }
  }

  // Search profiles
  async searchProfiles(searchTerm, limit = 100) {
    try {
      const profiles = await this.batchApi.loadFromDatabase();
      
      if (!searchTerm || searchTerm.length < 2) {
        return this.formatLeaderboardData(profiles.slice(0, limit));
      }
      
      const lowercaseSearch = searchTerm.toLowerCase();
      const filtered = profiles.filter(profile => 
        (profile.username && profile.username.toLowerCase().includes(lowercaseSearch)) ||
        (profile.displayName && profile.displayName.toLowerCase().includes(lowercaseSearch)) ||
        (profile.profileId && profile.profileId.toString().includes(searchTerm))
      );
      
      return this.formatLeaderboardData(filtered.slice(0, limit));
      
    } catch (error) {
      console.error('[Ethos V2 Distribution API] ❌ Error searching profiles:', error.message);
      return [];
    }
  }

  // Get database status
  async getDatabaseStatus() {
    try {
      const profiles = await this.batchApi.loadFromDatabase();
      const lastProfile = profiles.find(p => p.fetchedAt);
      
      return {
        profileCount: profiles.length,
        lastUpdated: lastProfile?.fetchedAt || null,
        dataSource: 'ethos-v2-api',
        databasePath: this.batchApi.profileDataPath,
        apiVersion: '2.0'
      };
      
    } catch (error) {
      return {
        profileCount: 0,
        lastUpdated: null,
        dataSource: 'ethos-v2-api',
        databasePath: this.batchApi.profileDataPath,
        apiVersion: '2.0',
        error: error.message
      };
    }
  }

  // Alias methods for compatibility
  async getLeaderboard(limit = 20000, progressCallback = null) {
    return await this.getFastLeaderboard(limit, progressCallback);
  }

  async refresh(progressCallback = null) {
    return await this.forceRefresh(progressCallback);
  }
}

export default EthosV2DistributionApi;
