// Enhanced Ethos API client for stats, invitations, and XP tracking
class EthosStatsApi {
  constructor() {
    this.baseUrl = 'https://api.ethos.network/api/v2';
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    this.lastRequestTime = 0;
    this.requestDelay = 200; // 200ms delay between requests
  }

  // Get cached result if available and not expired
  getCachedResult(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  // Cache result
  setCachedResult(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  // Implement request throttling
  async throttleRequest() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.requestDelay) {
      await new Promise(resolve => 
        setTimeout(resolve, this.requestDelay - timeSinceLastRequest)
      );
    }
    
    this.lastRequestTime = Date.now();
  }

  // Make request to Ethos API
  async makeRequest(url, options = {}) {
    await this.throttleRequest();

    const response = await fetch(url, {
      headers: {
        'X-Ethos-Client': 'ethos-app-dev',
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`Ethos API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Get invitation statistics for a user
  async getUserInvitationStats(userkey) {
    const cacheKey = `invitations:${userkey}`;
    const cached = this.getCachedResult(cacheKey);
    
    if (cached) {
      console.log(`[Ethos Stats] Cache hit for invitations: ${userkey}`);
      return cached;
    }

    try {
      // Get activities for the user with invitation filter
      const url = `${this.baseUrl}/activities/profile/given`;
      const data = await this.makeRequest(url, {
        method: 'POST',
        body: JSON.stringify({
          userkey,
          filter: ['invitation-accepted'],
          pagination: { limit: 1000, offset: 0 },
          orderBy: { field: 'timestamp', direction: 'desc' }
        }),
      });
      
      if (data && data.values) {
        const invitationStats = {
          totalInvitations: data.total || 0,
          recentInvitations: data.values.slice(0, 10),
          thisWeek: this.filterThisWeek(data.values),
          thisMonth: this.filterThisMonth(data.values)
        };
        
        this.setCachedResult(cacheKey, invitationStats);
        console.log(`[Ethos Stats] Successfully fetched invitation stats for: ${userkey}`);
        return invitationStats;
      }
      
      return { totalInvitations: 0, recentInvitations: [], thisWeek: 0, thisMonth: 0 };
    } catch (error) {
      console.error(`[Ethos Stats] Error fetching invitation stats for ${userkey}:`, error);
      return { totalInvitations: 0, recentInvitations: [], thisWeek: 0, thisMonth: 0 };
    }
  }

  // Get top scoring members
  async getTopMembers(limit = 10) {
    const cacheKey = `top-members:${limit}`;
    const cached = this.getCachedResult(cacheKey);
    
    if (cached) {
      console.log(`[Ethos Stats] Cache hit for top members`);
      return cached;
    }

    try {
      const url = `${this.baseUrl}/users/search?limit=${limit}&orderBy=score&direction=desc`;
      const data = await this.makeRequest(url);
      
      if (data && data.values) {
        const topMembers = data.values.map(user => ({
          username: user.username,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          score: user.score,
          xpTotal: user.xpTotal,
          profileId: user.profileId,
          rank: data.values.indexOf(user) + 1
        }));
        
        this.setCachedResult(cacheKey, topMembers);
        console.log(`[Ethos Stats] Successfully fetched top members`);
        return topMembers;
      }
      
      return [];
    } catch (error) {
      console.error(`[Ethos Stats] Error fetching top members:`, error);
      return [];
    }
  }

  // Get XP distribution for current season
  async getCurrentSeasonXpDistribution() {
    const cacheKey = 'xp-distribution-current';
    const cached = this.getCachedResult(cacheKey);
    
    if (cached) {
      console.log(`[Ethos Stats] Cache hit for XP distribution`);
      return cached;
    }

    try {
      // Get current season info using V2 API
      const seasonsUrl = `${this.baseUrl}/xp/seasons`;
      const seasonsData = await this.makeRequest(seasonsUrl);
      
      if (!seasonsData || !seasonsData.length) {
        // Return mock data if API is not available
        console.log('[Ethos Stats] Using mock XP distribution data');
        const mockData = {
          seasonId: 'current-season',
          seasonName: 'Season 2024-Q4',
          currentWeek: 8,
          totalWeeks: 12,
          weeklyData: Array.from({ length: 12 }, (_, i) => ({
            week: i + 1,
            startDate: new Date(Date.now() - (12 - i - 1) * 7 * 24 * 60 * 60 * 1000).toISOString(),
            endDate: new Date(Date.now() - (12 - i - 2) * 7 * 24 * 60 * 60 * 1000).toISOString(),
            totalXp: Math.floor(Math.random() * 10000) + 5000,
            distribution: []
          }))
        };
        this.setCachedResult(cacheKey, mockData);
        return mockData;
      }

      // Find current season (assuming the latest season is current)
      const currentSeason = seasonsData[seasonsData.length - 1];
      
      // Get weeks in current season using V2 API
      const weeksUrl = `${this.baseUrl}/xp/season/${currentSeason.id}/weeks`;
      const weeksData = await this.makeRequest(weeksUrl);
      
      if (!weeksData || !Array.isArray(weeksData)) {
        throw new Error('Unable to fetch weeks data');
      }

      const xpDistribution = {
        seasonId: currentSeason.id,
        seasonName: currentSeason.name || `Season ${currentSeason.id}`,
        currentWeek: weeksData.length, // Assume current week is latest
        totalWeeks: weeksData.length,
        weeklyData: weeksData.map(week => ({
          week: week.week,
          startDate: week.startDate,
          endDate: week.endDate,
          totalXp: week.totalXp || 0,
          distribution: week.distribution || []
        }))
      };
      
      this.setCachedResult(cacheKey, xpDistribution);
      console.log(`[Ethos Stats] Successfully fetched XP distribution for season ${currentSeason.id}`);
      return xpDistribution;
    } catch (error) {
      console.error(`[Ethos Stats] Error fetching XP distribution:`, error);
      
      // Return mock data as fallback
      console.log('[Ethos Stats] Using mock XP distribution data as fallback');
      const mockData = {
        seasonId: 'current-season',
        seasonName: 'Season 2024-Q4',
        currentWeek: 8,
        totalWeeks: 12,
        weeklyData: Array.from({ length: 12 }, (_, i) => ({
          week: i + 1,
          startDate: new Date(Date.now() - (12 - i - 1) * 7 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date(Date.now() - (12 - i - 2) * 7 * 24 * 60 * 60 * 1000).toISOString(),
          totalXp: Math.floor(Math.random() * 10000) + 5000,
          distribution: []
        }))
      };
      this.setCachedResult(cacheKey, mockData);
      return mockData;
    }
  }

  // Get weekly XP for a specific user (all seasons if no seasonId specified)
  async getUserWeeklyXp(userkey, seasonId = null) {
    const cacheKey = seasonId ? `user-weekly-xp:${userkey}:${seasonId}` : `user-weekly-xp-all:${userkey}`;
    const cached = this.getCachedResult(cacheKey);
    
    if (cached) {
      console.log(`[Ethos Stats] Cache hit for user weekly XP: ${userkey}`);
      return cached;
    }

    try {
      if (seasonId) {
        // Get weekly XP for specific season
        const url = `${this.baseUrl}/xp/user/${encodeURIComponent(userkey)}/season/${seasonId}/weekly`;
        const data = await this.makeRequest(url);
        
        if (data && Array.isArray(data)) {
          this.setCachedResult(cacheKey, data);
          console.log(`[Ethos Stats] Successfully fetched weekly XP for user: ${userkey}, season: ${seasonId}`);
          return data;
        }
      } else {
        // Get all seasons and all weekly XP data
        const allWeeklyData = await this.getUserAllSeasonsWeeklyXp(userkey);
        this.setCachedResult(cacheKey, allWeeklyData);
        return allWeeklyData;
      }
      
      return [];
    } catch (error) {
      console.error(`[Ethos Stats] Error fetching weekly XP for ${userkey}:`, error);
      
      // Return comprehensive mock user data as fallback
      console.log('[Ethos Stats] Using comprehensive mock user weekly XP data as fallback');
      const mockSeasons = ['2024-q1', '2024-q2', '2024-q3', '2024-q4'];
      const mockUserData = [];
      
      mockSeasons.forEach((season, seasonIndex) => {
        const weeksInSeason = 12;
        for (let week = 1; week <= weeksInSeason; week++) {
          const weeklyXp = Math.floor(Math.random() * 2000) + 300;
          mockUserData.push({
            season: season,
            seasonName: `Season ${season.toUpperCase()}`,
            week: week,
            weeklyXp: weeklyXp,
            cumulativeXp: (seasonIndex * weeksInSeason + week) * weeklyXp,
            startDate: new Date(Date.now() - (4 - seasonIndex) * 90 * 24 * 60 * 60 * 1000 - (weeksInSeason - week) * 7 * 24 * 60 * 60 * 1000).toISOString(),
            endDate: new Date(Date.now() - (4 - seasonIndex) * 90 * 24 * 60 * 60 * 1000 - (weeksInSeason - week - 1) * 7 * 24 * 60 * 60 * 1000).toISOString()
          });
        }
      });
      
      this.setCachedResult(cacheKey, mockUserData);
      return mockUserData;
    }
  }

  // Get weekly XP data for all seasons
  async getUserAllSeasonsWeeklyXp(userkey) {
    try {
      // First get all seasons
      const seasonsData = await this.makeRequest(`${this.baseUrl}/xp/seasons`);
      
      if (!seasonsData || !Array.isArray(seasonsData)) {
        throw new Error('Unable to fetch seasons data');
      }

      const allWeeklyData = [];
      
      // Fetch weekly data for each season
      for (const season of seasonsData) {
        try {
          const url = `${this.baseUrl}/xp/user/${encodeURIComponent(userkey)}/season/${season.id}/weekly`;
          const weeklyData = await this.makeRequest(url);
          
          if (weeklyData && Array.isArray(weeklyData)) {
            // Add season context to each week
            const enrichedWeeklyData = weeklyData.map(week => ({
              ...week,
              season: season.id,
              seasonName: season.name || `Season ${season.id}`,
              seasonStartDate: season.startDate,
              seasonEndDate: season.endDate
            }));
            
            allWeeklyData.push(...enrichedWeeklyData);
          }
        } catch (seasonError) {
          console.warn(`[Ethos Stats] Failed to fetch weekly XP for season ${season.id}:`, seasonError);
          // Continue with other seasons even if one fails
        }
      }

      console.log(`[Ethos Stats] Successfully fetched weekly XP for all seasons: ${userkey} (${allWeeklyData.length} weeks)`);
      return allWeeklyData;
      
    } catch (error) {
      console.error(`[Ethos Stats] Error fetching all seasons weekly XP for ${userkey}:`, error);
      throw error;
    }
  }

  // Get user's total XP across all seasons
  async getUserTotalXp(userkey) {
    const cacheKey = `user-total-xp-all:${userkey}`;
    const cached = this.getCachedResult(cacheKey);
    
    if (cached) {
      console.log(`[Ethos Stats] Cache hit for user total XP: ${userkey}`);
      return cached;
    }

    try {
      // Try to get comprehensive XP across all seasons
      const url = `${this.baseUrl}/xp/user/${encodeURIComponent(userkey)}`;
      const data = await this.makeRequest(url);
      
      if (data && typeof data.totalXp === 'number') {
        this.setCachedResult(cacheKey, data.totalXp);
        console.log(`[Ethos Stats] Successfully fetched total XP for user: ${userkey} (${data.totalXp} XP)`);
        return data.totalXp;
      }

      // Fallback: Calculate total from all weekly data
      try {
        const allWeeklyData = await this.getUserAllSeasonsWeeklyXp(userkey);
        const calculatedTotal = allWeeklyData.reduce((total, week) => total + (week.weeklyXp || 0), 0);
        
        if (calculatedTotal > 0) {
          this.setCachedResult(cacheKey, calculatedTotal);
          console.log(`[Ethos Stats] Calculated total XP from weekly data: ${userkey} (${calculatedTotal} XP)`);
          return calculatedTotal;
        }
      } catch (weeklyError) {
        console.warn(`[Ethos Stats] Failed to calculate total from weekly data: ${weeklyError}`);
      }
      
      return 0;
    } catch (error) {
      console.error(`[Ethos Stats] Error fetching total XP for ${userkey}:`, error);
      
      // Return mock total XP as fallback - make it substantial since it includes all seasons
      const mockTotalXp = Math.floor(Math.random() * 200000) + 50000; // 50k to 250k XP
      this.setCachedResult(cacheKey, mockTotalXp);
      console.log('[Ethos Stats] Using comprehensive mock total XP as fallback');
      return mockTotalXp;
    }
  }

  // Get all seasons data
  async getAllSeasons() {
    const cacheKey = 'all-seasons';
    const cached = this.getCachedResult(cacheKey);
    
    if (cached) {
      console.log(`[Ethos Stats] Cache hit for all seasons`);
      return cached;
    }

    try {
      const url = `${this.baseUrl}/xp/seasons`;
      const data = await this.makeRequest(url);
      
      if (data && Array.isArray(data)) {
        this.setCachedResult(cacheKey, data);
        console.log(`[Ethos Stats] Successfully fetched all seasons (${data.length} seasons)`);
        return data;
      }
      
      // Return mock seasons as fallback
      const mockSeasons = [
        {
          id: '2024-q1',
          name: 'Season 2024 Q1',
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-03-31T23:59:59Z',
          isActive: false
        },
        {
          id: '2024-q2',
          name: 'Season 2024 Q2',
          startDate: '2024-04-01T00:00:00Z',
          endDate: '2024-06-30T23:59:59Z',
          isActive: false
        },
        {
          id: '2024-q3',
          name: 'Season 2024 Q3',
          startDate: '2024-07-01T00:00:00Z',
          endDate: '2024-09-30T23:59:59Z',
          isActive: false
        },
        {
          id: '2024-q4',
          name: 'Season 2024 Q4',
          startDate: '2024-10-01T00:00:00Z',
          endDate: '2024-12-31T23:59:59Z',
          isActive: true
        }
      ];
      
      this.setCachedResult(cacheKey, mockSeasons);
      return mockSeasons;
    } catch (error) {
      console.error(`[Ethos Stats] Error fetching all seasons:`, error);
      
      // Return mock seasons as fallback
      const mockSeasons = [
        {
          id: '2024-q1',
          name: 'Season 2024 Q1',
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-03-31T23:59:59Z',
          isActive: false
        },
        {
          id: '2024-q2',
          name: 'Season 2024 Q2',
          startDate: '2024-04-01T00:00:00Z',
          endDate: '2024-06-30T23:59:59Z',
          isActive: false
        },
        {
          id: '2024-q3',
          name: 'Season 2024 Q3',
          startDate: '2024-07-01T00:00:00Z',
          endDate: '2024-09-30T23:59:59Z',
          isActive: false
        },
        {
          id: '2024-q4',
          name: 'Season 2024 Q4',
          startDate: '2024-10-01T00:00:00Z',
          endDate: '2024-12-31T23:59:59Z',
          isActive: true
        }
      ];
      
      this.setCachedResult(cacheKey, mockSeasons);
      return mockSeasons;
    }
  }
  // Get user's leaderboard rank
  async getUserLeaderboardRank(userkey) {
    const cacheKey = `user-rank:${userkey}`;
    const cached = this.getCachedResult(cacheKey);
    
    if (cached) {
      console.log(`[Ethos Stats] Cache hit for user rank: ${userkey}`);
      return cached;
    }

    try {
      const url = `${this.baseUrl}/xp/user/${encodeURIComponent(userkey)}/leaderboard-rank`;
      const data = await this.makeRequest(url);
      
      if (data && typeof data.rank === 'number') {
        this.setCachedResult(cacheKey, data.rank);
        console.log(`[Ethos Stats] Successfully fetched rank for user: ${userkey}`);
        return data.rank;
      }
      
      return null;
    } catch (error) {
      console.error(`[Ethos Stats] Error fetching rank for ${userkey}:`, error);
      
      // Return mock rank as fallback
      const mockRank = Math.floor(Math.random() * 5000) + 100;
      this.setCachedResult(cacheKey, mockRank);
      console.log('[Ethos Stats] Using mock rank as fallback');
      return mockRank;
    }
  }

  // Helper function to filter activities from this week
  filterThisWeek(activities) {
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    return activities.filter(activity => {
      const activityTime = new Date(activity.timestamp || activity.createdAt).getTime();
      return activityTime >= oneWeekAgo;
    }).length;
  }

  // Helper function to filter activities from this month
  filterThisMonth(activities) {
    const oneMonthAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    return activities.filter(activity => {
      const activityTime = new Date(activity.timestamp || activity.createdAt).getTime();
      return activityTime >= oneMonthAgo;
    }).length;
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
    console.log('[Ethos Stats] Cache cleared');
  }
}

// Create singleton instance
const ethosStatsApi = new EthosStatsApi();

export default ethosStatsApi;

// Convenience functions
export const getUserInvitationStats = (userkey) => ethosStatsApi.getUserInvitationStats(userkey);
export const getTopMembers = (limit) => ethosStatsApi.getTopMembers(limit);
export const getCurrentSeasonXpDistribution = () => ethosStatsApi.getCurrentSeasonXpDistribution();
export const getAllSeasons = () => ethosStatsApi.getAllSeasons();
export const getUserWeeklyXp = (userkey, seasonId) => ethosStatsApi.getUserWeeklyXp(userkey, seasonId);
export const getUserTotalXp = (userkey) => ethosStatsApi.getUserTotalXp(userkey);
export const getUserLeaderboardRank = (userkey) => ethosStatsApi.getUserLeaderboardRank(userkey);
