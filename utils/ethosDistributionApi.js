// Enhanced Ethos Distribution API client for leaderboard and XP statistics
class EthosDistributionApi {
  constructor() {
    this.baseUrl = 'https://api.ethos.network/api/v2';
    this.cache = new Map();
    this.cacheTimeout = 60 * 60 * 1000; // 1 hour for distribution data
    this.quickCacheTimeout = 30 * 60 * 1000; // 30 minutes for quick data
    this.requestDelay = 100; // 100ms between requests
    this.lastRequestTime = 0;
    
    // Load cached data from localStorage on initialization
    this.loadCacheFromStorage();
  }

  // Load cache from localStorage (browser persistence)
  loadCacheFromStorage() {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const stored = localStorage.getItem('ethos-distribution-cache');
        if (stored) {
          const parsedCache = JSON.parse(stored);
          Object.entries(parsedCache).forEach(([key, value]) => {
            // Only load if not expired
            if (Date.now() - value.timestamp < this.cacheTimeout) {
              this.cache.set(key, value);
            }
          });
          console.log(`[Distribution API] Loaded ${this.cache.size} cached items from localStorage`);
        }
      } catch (error) {
        console.warn('[Distribution API] Failed to load cache from localStorage:', error);
      }
    }
  }

  // Save cache to localStorage
  saveCacheToStorage() {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const cacheObject = {};
        this.cache.forEach((value, key) => {
          // Only save non-expired items
          if (Date.now() - value.timestamp < this.cacheTimeout) {
            cacheObject[key] = value;
          }
        });
        localStorage.setItem('ethos-distribution-cache', JSON.stringify(cacheObject));
        console.log(`[Distribution API] Saved ${Object.keys(cacheObject).length} items to localStorage`);
      } catch (error) {
        console.warn('[Distribution API] Failed to save cache to localStorage:', error);
      }
    }
  }

  // Get cached result if available and not expired
  getCachedResult(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  // Cache result with automatic localStorage save
  setCachedResult(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
    
    // Save to localStorage for persistence
    this.saveCacheToStorage();
  }

  // Clear expired cache entries
  clearExpiredCache() {
    const now = Date.now();
    const toDelete = [];
    
    this.cache.forEach((value, key) => {
      if (now - value.timestamp >= this.cacheTimeout) {
        toDelete.push(key);
      }
    });
    
    toDelete.forEach(key => this.cache.delete(key));
    
    if (toDelete.length > 0) {
      console.log(`[Distribution API] Cleared ${toDelete.length} expired cache entries`);
      this.saveCacheToStorage();
    }
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
  async makeRequest(url) {
    await this.throttleRequest();
    
    const response = await fetch(url, {
      headers: {
        'X-Ethos-Client': 'ethos-app-distribution',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  // Get comprehensive user leaderboard data with progressive loading
  async getLeaderboardData(limit = 10000, progressCallback = null) {
    // Use versioned cache key to allow manual cache invalidation
    const cacheKey = `leaderboard:${limit}:v1`;
    const cached = this.getCachedResult(cacheKey);
    
    if (cached) {
      console.log(`[Distribution API] Cache hit for leaderboard data (${cached.length} users)`);
      if (progressCallback) {
        progressCallback({
          processed: cached.length,
          target: limit,
          query: 'cached',
          addedThisBatch: 0,
          percentage: 100
        });
      }
      return cached;
    }

    // Clear expired cache before making new requests
    this.clearExpiredCache();

    try {
      console.log(`[Distribution API] Fetching leaderboard data for ${limit} users...`);
      
      // Optimized search strategy: Use high-volume, broad search terms (min 2 chars for Ethos API)
      const searchQueries = [
        // High-volume two-letter combinations
        'ab', 'ac', 'ad', 'ae', 'ag', 'ai', 'al', 'am', 'an', 'ap', 'ar', 'as', 'at', 'au', 'av', 'aw',
        'ba', 'be', 'bi', 'bl', 'bo', 'br', 'bu', 'by',
        'ca', 'ch', 'cl', 'co', 'cr', 'cu', 'cy',
        'da', 'de', 'di', 'do', 'dr', 'du',
        'ea', 'ed', 'el', 'em', 'en', 'er', 'es', 'et', 'ev', 'ex',
        'fa', 'fe', 'fi', 'fl', 'fo', 'fr', 'fu',
        'ga', 'ge', 'gi', 'gl', 'go', 'gr', 'gu',
        'ha', 'he', 'hi', 'ho', 'hu', 'hy',
        'id', 'il', 'im', 'in', 'io', 'ir', 'is', 'it', 'iv',
        'ja', 'je', 'jo', 'ju',
        'ka', 'ke', 'ki', 'ko', 'ku',
        'la', 'le', 'li', 'lo', 'lu', 'ly',
        'ma', 'me', 'mi', 'mo', 'mu', 'my',
        'na', 'ne', 'ni', 'no', 'nu', 'ny',
        'ob', 'oc', 'od', 'of', 'og', 'oh', 'ok', 'ol', 'om', 'on', 'op', 'or', 'os', 'ot', 'ou', 'ov', 'ow', 'ox', 'oy',
        'pa', 'pe', 'ph', 'pi', 'pl', 'po', 'pr', 'pu', 'py',
        'qu',
        'ra', 're', 'ri', 'ro', 'ru', 'ry',
        'sa', 'sc', 'se', 'sh', 'si', 'sk', 'sl', 'sm', 'sn', 'so', 'sp', 'st', 'su', 'sw', 'sy',
        'ta', 'te', 'th', 'ti', 'to', 'tr', 'tu', 'tw', 'ty',
        'ub', 'ud', 'ug', 'uk', 'ul', 'um', 'un', 'up', 'ur', 'us', 'ut',
        'va', 've', 'vi', 'vo', 'vy',
        'wa', 'we', 'wh', 'wi', 'wo', 'wr', 'wy',
        'xa', 'xe', 'xi', 'xy',
        'ya', 'ye', 'yi', 'yo', 'yu',
        'za', 'ze', 'zi', 'zo', 'zu',
        // Crypto-specific terms
        'crypto', 'eth', 'web3', 'defi', 'nft', 'blockchain', 'bitcoin',
        // Common words
        'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'boy', 'did', 'man', 'way'
      ];
      
      const allUsers = new Map(); // Use Map to avoid duplicates by profileId
      const maxPerQuery = 50; // API limit
      let processedQueries = 0;
      
      // Process queries in batches for better performance
      for (let i = 0; i < searchQueries.length && allUsers.size < limit; i++) {
        const query = searchQueries[i];
        
        try {
          const url = `${this.baseUrl}/users/search?query=${query}&limit=${maxPerQuery}`;
          const data = await this.makeRequest(url);
          
          if (data && data.values) {
            let addedThisBatch = 0;
            data.values.forEach(user => {
              // Add all users (even with 0 XP for complete leaderboard)
              if (!allUsers.has(user.profileId)) {
                allUsers.set(user.profileId, {
                  profileId: user.profileId,
                  displayName: user.displayName || user.username,
                  username: user.username,
                  avatarUrl: user.avatarUrl,
                  score: user.score,
                  xpTotal: user.xpTotal || 0,
                  xpStreakDays: user.xpStreakDays || 0,
                  userkeys: user.userkeys,
                  stats: user.stats
                });
                addedThisBatch++;
              }
            });
            
            processedQueries++;
            
            // Call progress callback if provided
            if (progressCallback) {
              progressCallback({
                processed: allUsers.size,
                target: limit,
                query: query,
                addedThisBatch: addedThisBatch,
                percentage: Math.min((allUsers.size / limit) * 100, 100)
              });
            }
            
            console.log(`[Distribution API] Query "${query}": ${addedThisBatch} new users (Total: ${allUsers.size})`);
          }
          
          // Early termination if we have enough users
          if (allUsers.size >= limit) {
            console.log(`[Distribution API] Target reached: ${allUsers.size} users`);
            break;
          }
          
        } catch (error) {
          console.warn(`[Distribution API] Search query "${query}" failed:`, error.message);
        }
        
        // Add a small delay to avoid rate limiting
        if (i < searchQueries.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
      
      console.log(`[Distribution API] Collected ${allUsers.size} unique users`);
      
      // Convert to array and sort by XP (highest first)
      const sortedUsers = Array.from(allUsers.values())
        .sort((a, b) => b.xpTotal - a.xpTotal)
        .slice(0, limit);
      
      // Add rank and percentage calculations
      const totalXp = sortedUsers.reduce((sum, user) => sum + user.xpTotal, 0);
      const leaderboardData = sortedUsers.map((user, index) => ({
        ...user,
        rank: index + 1,
        xpPercentage: totalXp > 0 ? ((user.xpTotal / totalXp) * 100) : 0
      }));
      
      console.log(`[Distribution API] Successfully processed ${leaderboardData.length} users for leaderboard`);
      this.setCachedResult(cacheKey, leaderboardData);
      return leaderboardData;
      
    } catch (error) {
      console.error(`[Distribution API] Error fetching leaderboard data:`, error);
      return [];
    }
  }

  // Get initial quick leaderboard (top users) for fast loading
  async getQuickLeaderboard() {
    const cacheKey = 'quick-leaderboard:v1';
    const cached = this.getCachedResult(cacheKey);
    
    if (cached) {
      console.log(`[Distribution API] Cache hit for quick leaderboard (${cached.length} users)`);
      return cached;
    }

    try {
      console.log(`[Distribution API] Fetching quick leaderboard...`);
      
      // Use high-volume search terms to get top users quickly
      const quickQueries = ['crypto', 'eth', 'web3', 'defi', 'nft'];
      const allUsers = new Map();
      
      for (const query of quickQueries) {
        try {
          const url = `${this.baseUrl}/users/search?query=${query}&limit=50`;
          const data = await this.makeRequest(url);
          
          if (data && data.values) {
            data.values.forEach(user => {
              if (user.xpTotal > 0 && !allUsers.has(user.profileId)) {
                allUsers.set(user.profileId, {
                  profileId: user.profileId,
                  displayName: user.displayName || user.username,
                  username: user.username,
                  avatarUrl: user.avatarUrl,
                  score: user.score,
                  xpTotal: user.xpTotal,
                  xpStreakDays: user.xpStreakDays,
                  userkeys: user.userkeys,
                  stats: user.stats
                });
              }
            });
          }
        } catch (error) {
          console.warn(`[Distribution API] Quick query "${query}" failed:`, error.message);
        }
      }
      
      // Sort by XP and add rankings
      const sortedUsers = Array.from(allUsers.values())
        .sort((a, b) => b.xpTotal - a.xpTotal);
      
      const totalXp = sortedUsers.reduce((sum, user) => sum + user.xpTotal, 0);
      const quickData = sortedUsers.map((user, index) => ({
        ...user,
        rank: index + 1,
        xpPercentage: totalXp > 0 ? ((user.xpTotal / totalXp) * 100) : 0
      }));
      
      console.log(`[Distribution API] Quick leaderboard: ${quickData.length} users`);
      this.setCachedResult(cacheKey, quickData);
      return quickData;
      
    } catch (error) {
      console.error(`[Distribution API] Error fetching quick leaderboard:`, error);
      return [];
    }
  }

  // Get XP distribution statistics
  async getXpDistributionStats() {
    const cacheKey = 'xp-distribution-stats';
    const cached = this.getCachedResult(cacheKey);
    
    if (cached) {
      console.log(`[Distribution API] Cache hit for XP distribution stats`);
      return cached;
    }

    try {
      console.log(`[Distribution API] Fetching XP distribution statistics...`);
      
      // Get seasons data
      const seasonsUrl = `${this.baseUrl}/xp/seasons`;
      const seasonsData = await this.makeRequest(seasonsUrl);
      
      if (!seasonsData || !seasonsData.seasons) {
        throw new Error('No seasons data available');
      }
      
      const stats = {
        seasons: seasonsData.seasons,
        currentSeason: seasonsData.currentSeason,
        totalSeasons: seasonsData.seasons.length,
        seasonStats: []
      };
      
      // Get week data for each season
      for (const season of seasonsData.seasons) {
        try {
          const weeksUrl = `${this.baseUrl}/xp/season/${season.id}/weeks`;
          const weeksData = await this.makeRequest(weeksUrl);
          
          stats.seasonStats.push({
            seasonId: season.id,
            seasonName: season.name,
            startDate: season.startDate,
            totalWeeks: weeksData ? weeksData.length : 0,
            weeks: weeksData || []
          });
        } catch (error) {
          console.warn(`[Distribution API] Failed to get weeks for season ${season.id}:`, error.message);
          stats.seasonStats.push({
            seasonId: season.id,
            seasonName: season.name,
            startDate: season.startDate,
            totalWeeks: 0,
            weeks: []
          });
        }
      }
      
      console.log(`[Distribution API] Successfully fetched XP distribution statistics`);
      this.setCachedResult(cacheKey, stats);
      return stats;
      
    } catch (error) {
      console.error(`[Distribution API] Error fetching XP distribution stats:`, error);
      return null;
    }
  }

  // Search users in leaderboard
  searchInLeaderboard(leaderboardData, searchTerm) {
    if (!searchTerm || searchTerm.length < 2) {
      return leaderboardData;
    }
    
    const term = searchTerm.toLowerCase();
    return leaderboardData.filter(user => 
      user.displayName?.toLowerCase().includes(term) ||
      user.username?.toLowerCase().includes(term) ||
      user.profileId?.toString().includes(term)
    );
  }

  // Get user position in leaderboard
  getUserPosition(leaderboardData, searchTerm) {
    const user = leaderboardData.find(user => 
      user.displayName?.toLowerCase() === searchTerm.toLowerCase() ||
      user.username?.toLowerCase() === searchTerm.toLowerCase() ||
      user.profileId?.toString() === searchTerm
    );
    
    return user ? user.rank : null;
  }

  // Format XP number to millions
  formatXpToMillions(xp) {
    if (xp >= 1000000) {
      return (xp / 1000000).toFixed(2) + 'M';
    } else if (xp >= 1000) {
      return (xp / 1000).toFixed(1) + 'K';
    }
    return xp.toString();
  }

  // Calculate total XP across all users
  calculateTotalXp(leaderboardData) {
    return leaderboardData.reduce((total, user) => total + user.xpTotal, 0);
  }

  // Get XP distribution by ranges
  getXpDistributionRanges(leaderboardData) {
    const ranges = {
      '1M+': 0,
      '500K-1M': 0,
      '100K-500K': 0,
      '50K-100K': 0,
      '10K-50K': 0,
      '1K-10K': 0,
      '<1K': 0
    };
    
    leaderboardData.forEach(user => {
      const xp = user.xpTotal;
      if (xp >= 1000000) ranges['1M+']++;
      else if (xp >= 500000) ranges['500K-1M']++;
      else if (xp >= 100000) ranges['100K-500K']++;
      else if (xp >= 50000) ranges['50K-100K']++;
      else if (xp >= 10000) ranges['10K-50K']++;
      else if (xp >= 1000) ranges['1K-10K']++;
      else ranges['<1K']++;
    });
    
    return ranges;
  }

  // Cache management methods
  getCacheStats() {
    const stats = {
      totalItems: this.cache.size,
      items: []
    };
    
    this.cache.forEach((value, key) => {
      const age = Date.now() - value.timestamp;
      const expired = age >= this.cacheTimeout;
      stats.items.push({
        key,
        age: Math.round(age / 1000 / 60), // age in minutes
        expired,
        dataSize: JSON.stringify(value.data).length
      });
    });
    
    return stats;
  }

  // Force clear all cache
  clearAllCache() {
    this.cache.clear();
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem('ethos-distribution-cache');
    }
    console.log('[Distribution API] All cache cleared');
  }

  // Force refresh leaderboard (bypass cache)
  async forceRefreshLeaderboard(limit = 10000, progressCallback = null) {
    // Clear leaderboard cache
    const keys = Array.from(this.cache.keys()).filter(key => key.startsWith('leaderboard:') || key.startsWith('quick-leaderboard:'));
    keys.forEach(key => this.cache.delete(key));
    this.saveCacheToStorage();
    
    console.log('[Distribution API] Leaderboard cache cleared, fetching fresh data...');
    return await this.getLeaderboardData(limit, progressCallback);
  }
}

// Create and export singleton instance
const ethosDistributionApi = new EthosDistributionApi();

export {
  ethosDistributionApi,
  EthosDistributionApi
};
