// Client-side API for comprehensive Ethos user data
// Simple interface to get leaderboard and seasons from comprehensive database

class EthosV2ClientApi {
  constructor() {
    this.baseUrl = '/api/v2-batch';
    console.log('[Ethos V2 Client API] 🚀 Initialized comprehensive data client');
  }

  // Get leaderboard data from comprehensive database
  async getFastLeaderboard(limit = 20000, progressCallback = null) {
    try {
      console.log(`[Ethos V2 Client API] 📊 Getting comprehensive leaderboard (limit: ${limit})`);
      
      if (progressCallback) {
        progressCallback({
          stage: 'Loading from comprehensive database...',
          current: 25,
          total: 100
        });
      }
      
      const response = await fetch(`${this.baseUrl}?action=leaderboard&limit=${limit}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const leaderboard = await response.json();
      
      if (progressCallback) {
        progressCallback({
          stage: 'Complete!',
          current: 100,
          total: 100
        });
      }
      
      console.log(`[Ethos V2 Client API] ✅ Leaderboard loaded: ${leaderboard.length} users`);
      return leaderboard;
      
    } catch (error) {
      console.error('[Ethos V2 Client API] ❌ Error getting leaderboard:', error.message);
      return [];
    }
  }

  // Get seasons data from comprehensive database
  async getFastSeasons(progressCallback = null) {
    try {
      console.log('[Ethos V2 Client API] 📅 Getting comprehensive seasons data');
      
      if (progressCallback) {
        progressCallback({
          stage: 'Loading seasons from database...',
          current: 25,
          total: 100
        });
      }
      
      const response = await fetch(`${this.baseUrl}?action=seasons`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const seasons = await response.json();
      
      if (progressCallback) {
        progressCallback({
          stage: 'Complete!',
          current: 100,
          total: 100
        });
      }
      
      console.log(`[Ethos V2 Client API] ✅ Seasons loaded: ${seasons.length} seasons`);
      return seasons;
      
    } catch (error) {
      console.error('[Ethos V2 Client API] ❌ Error getting seasons:', error.message);
      return [];
    }
  }

  // Get fast distribution stats
  async getFastDistributionStats() {
    try {
      console.log('[Ethos V2 Client API] 📈 Getting distribution stats');
      
      const response = await fetch(`${this.baseUrl}?action=stats`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const stats = await response.json();
      
      console.log('[Ethos V2 Client API] ✅ Distribution stats loaded');
      return stats;
      
    } catch (error) {
      console.error('[Ethos V2 Client API] ❌ Error getting distribution stats:', error.message);
      return {
        totalUsers: 0,
        totalXP: 0,
        averageXP: 0,
        topUserXP: 0
      };
    }
  }

  // Force refresh - triggers comprehensive data update
  async forceRefresh(progressCallback = null) {
    try {
      console.log('[Ethos V2 Client API] 🔄 Starting comprehensive data refresh...');
      
      if (progressCallback) {
        progressCallback({
          stage: 'Starting comprehensive refresh...',
          current: 0,
          total: 100
        });
      }
      
      const response = await fetch(`${this.baseUrl}?action=refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (progressCallback) {
        progressCallback({
          stage: 'Refresh complete!',
          current: 100,
          total: 100
        });
      }
      
      console.log('[Ethos V2 Client API] ✅ Comprehensive refresh complete:', result);
      return result;
      
    } catch (error) {
      console.error('[Ethos V2 Client API] ❌ Error during refresh:', error.message);
      throw error;
    }
  }

  // Get cache stats - compatibility method for existing frontend
  getCacheStats() {
    return {
      source: 'comprehensive-database',
      cached: true,
      lastUpdated: new Date().toISOString(),
      status: 'active'
    };
  }

  // Search leaderboard - compatibility method
  searchLeaderboard(leaderboard, searchTerm) {
    if (!searchTerm || searchTerm.trim() === '') {
      return leaderboard;
    }
    
    const term = searchTerm.toLowerCase().trim();
    return leaderboard.filter(user => 
      user.username?.toLowerCase().includes(term) ||
      user.displayName?.toLowerCase().includes(term) ||
      user.profileId?.toString().includes(term)
    );
  }

  // Get database status - compatibility method
  async getDatabaseStatus() {
    try {
      const response = await fetch(`${this.baseUrl}?action=stats`);
      if (response.ok) {
        const stats = await response.json();
        return {
          connected: true,
          totalUsers: stats.totalUsers,
          lastUpdated: new Date().toISOString()
        };
      }
      return { connected: false };
    } catch (error) {
      return { connected: false, error: error.message };
    }
  }

  // Alias for compatibility
  async getDistributionStats() {
    return await this.getFastDistributionStats();
  }
}

export default EthosV2ClientApi;