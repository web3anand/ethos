import ethosApiClient from './ethosApiClient.js';

/**
 * Fast Distribution API - File-First Loading System
 * Optimized for instant profile database loading with blockchain enhancement
 */
class FastDistributionApi {
  constructor() {
    this.ethosApi = ethosApiClient;
    this.cache = new Map();
    this.cacheTimeout = 1000 * 60 * 30; // 30 minutes
    this.batchSize = 50;
    this.profileData = null; // Initialize as null
    
    console.log('[Fast API] ⚡ Fast Distribution API initialized with file-first loading');
    
    // Initialize profile data
    this.initializeProfileData();
    
    this.initialized = true;
  }

  // Initialize profile data on startup
  async initializeProfileData() {
    try {
      this.profileData = await this.loadProfilesFromFile();
      console.log('[Fast API] 📊 Profile database initialized with', this.profileData?.length || 0, 'profiles');
    } catch (error) {
      console.error('[Fast API] ❌ Error initializing profile data:', error);
      this.profileData = [];
    }
  }

  // Load profiles from file database (instant loading via API)
  async loadProfilesFromFile() {
    try {
      console.log('[Fast API] 📡 Loading profiles from file database...');
      
      // Server-side: read directly from file system
      if (typeof window === 'undefined') {
        const fs = await import('fs');
        const path = await import('path');
        
        const profilesPath = path.default.join(process.cwd(), 'data', 'user-profiles.json');
        
        if (!fs.default.existsSync(profilesPath)) {
          console.log('[Fast API] 📁 No profile database file found');
          return [];
        }
        
        const fileContent = fs.default.readFileSync(profilesPath, 'utf8');
        const profiles = JSON.parse(fileContent);
        console.log(`[Fast API] 📁 Loaded ${profiles.length} profiles from file database`);
        console.log('[Fast API] 📁 First few profiles:', profiles.slice(0, 3));
        return Array.isArray(profiles) ? profiles : [];
      }
      
      // Client-side: use fetch to API
      const response = await fetch('/api/profiles');
      console.log('[Fast API] 📡 Response status:', response.status);
      
      if (!response.ok) {
        console.log('[Fast API] 📁 No profile database file found or API error');
        return [];
      }
      
      const profiles = await response.json();
      console.log(`[Fast API] 📁 Loaded ${profiles.length} profiles from file database`);
      console.log('[Fast API] 📁 First few profiles:', profiles.slice(0, 3));
      return Array.isArray(profiles) ? profiles : [];
    } catch (error) {
      console.error('[Fast API] Error loading profiles from file:', error);
      return [];
    }
  }

  // Fast leaderboard using file database as primary source
  async getFastLeaderboard(limit = 20000, progressCallback = null) {
    const cacheKey = `fast-leaderboard:${limit}:file-db-v3`;
    
    try {
      // Ensure profile data is loaded
      if (!this.profileData || this.profileData.length === 0) {
        console.log('[Fast API] 🔄 Profile data not loaded, loading now...');
        this.profileData = await this.loadProfilesFromFile();
      }
      
      // Step 1: Use cached profile data (instant)
      if (progressCallback) {
        progressCallback({
          stage: 'Loading profile database...',
          current: 0,
          target: limit,
          percentage: 10
        });
      }
      
      const fileProfiles = this.profileData || [];
      
      if (fileProfiles && fileProfiles.length > 0) {
        console.log(`[Fast API] 📁 File database loaded: ${fileProfiles.length} profiles`);
        
        if (progressCallback) {
          progressCallback({
            stage: 'Database loaded, sorting profiles...',
            current: fileProfiles.length,
            target: limit,
            percentage: 90
          });
        }
        
        // Sort profiles by XP (highest first) for leaderboard
        const sortedProfiles = fileProfiles.sort((a, b) => (b.xpTotal || 0) - (a.xpTotal || 0));
        console.log(`[Fast API] 🏆 Top 5 users by XP:`, sortedProfiles.slice(0, 5).map(u => `${u.username}: ${u.xpTotal?.toLocaleString()} XP`));
        
        // Get top profiles by XP, not score
        const leaderboardData = sortedProfiles.slice(0, limit);
        
        if (progressCallback) {
          progressCallback({
            stage: 'Ready!',
            current: leaderboardData.length,
            target: limit,
            percentage: 100
          });
        }
        
        // Cache the result
        this.setCachedResult(cacheKey, leaderboardData);
        
        console.log(`[Fast API] ✅ File database leaderboard ready: ${leaderboardData.length} profiles`);
        return leaderboardData;
      }
    } catch (error) {
      console.warn('[Fast API] File database loading failed:', error);
    }
    
    // Fallback to cache if file loading fails
    const cached = this.getCachedResult(cacheKey);
    if (cached) {
      console.log(`[Fast API] Cache hit for fast leaderboard (${cached.length} users)`);
      if (progressCallback) {
        progressCallback({
          stage: 'Loaded from cache',
          current: cached.length,
          target: limit,
          percentage: 100
        });
      }
      return cached;
    }
    
    // Final fallback to blockchain method
    console.log('[Fast API] No file database or cache available, using blockchain fallback...');
    return await this.getFastLeaderboardFromBlockchain(limit, progressCallback);
  }

  // Get fast distribution stats from file database
  async getFastDistributionStats(leaderboardData = null) {
    try {
      const profiles = leaderboardData || await this.loadProfilesFromFile();
      
      if (!profiles || profiles.length === 0) {
        return {
          totalUsers: 0,
          totalXp: 0,
          averageScore: 0,
          topScore: 0,
          source: 'none'
        };
      }

      const totalUsers = profiles.length;
      const totalXp = profiles.reduce((sum, p) => sum + (p.xp || p.xpTotal || 0), 0);
      const totalScore = profiles.reduce((sum, p) => sum + (p.score || 0), 0);
      const averageScore = totalScore / totalUsers;
      const topScore = Math.max(...profiles.map(p => p.score || 0));

      const stats = {
        totalUsers,
        totalXp,
        averageScore: Math.round(averageScore * 100) / 100,
        topScore,
        distribution: this.calculateXpDistribution(profiles),
        source: 'file-database'
      };

      // Add season information from ethosApi if available
      try {
        console.log(`[Fast API] 📅 Getting season information...`);
        const seasonStats = await this.ethosApi.getXpDistributionStats();
        if (seasonStats) {
          stats.totalSeasons = seasonStats.totalSeasons;
          stats.currentSeason = seasonStats.currentSeason;
          stats.seasonStats = seasonStats.seasonStats;
          console.log(`[Fast API] ✅ Season data added: ${stats.totalSeasons} seasons`);
        }
      } catch (error) {
        console.warn(`[Fast API] ⚠️ Could not get season info:`, error.message);
      }

      console.log(`[Fast API] 📊 Stats calculated from ${totalUsers} profiles`);
      return stats;

    } catch (error) {
      console.error('[Fast API] Error calculating stats:', error);
      return {
        totalUsers: 0,
        totalXp: 0,
        averageScore: 0,
        topScore: 0,
        source: 'error',
        error: error.message
      };
    }
  }

  // Calculate XP distribution buckets
  calculateXpDistribution(profiles) {
    const buckets = {
      '0-100': 0,
      '101-500': 0,
      '501-1000': 0,
      '1001-2000': 0,
      '2000+': 0
    };

    profiles.forEach(profile => {
      const xp = profile.xp || profile.xpTotal || 0;
      if (xp <= 100) buckets['0-100']++;
      else if (xp <= 500) buckets['101-500']++;
      else if (xp <= 1000) buckets['501-1000']++;
      else if (xp <= 2000) buckets['1001-2000']++;
      else buckets['2000+']++;
    });

    return buckets;
  }

  // Blockchain fallback method for leaderboard (simplified since we have file database)
  async getFastLeaderboardFromBlockchain(limit = 1000, progressCallback = null) {
    try {
      console.log(`[Fast API] 🔗 Blockchain fallback not fully implemented - file database should be used`);
      
      if (progressCallback) {
        progressCallback({
          stage: 'File database preferred over blockchain...',
          current: 0,
          target: limit,
          percentage: 100
        });
      }

      console.log(`[Fast API] ⚠️ Blockchain leaderboard fallback - recommend using file database instead`);
      return [];

    } catch (error) {
      console.error('[Fast API] Error in blockchain fallback:', error);
      if (progressCallback) {
        progressCallback({
          stage: `Error: ${error.message}`,
          current: 0,
          target: limit,
          percentage: 0
        });
      }
      return [];
    }
  }

  // Search profiles in file database
  async searchProfiles(query, limit = 100) {
    try {
      const fileProfiles = await this.loadProfilesFromFile();
      
      if (!fileProfiles || fileProfiles.length === 0) {
        console.log('[Fast API] No file database for search, using blockchain...');
        return await this.searchProfilesBlockchain(query, limit);
      }
      
      const searchQuery = query.toLowerCase();
      const results = fileProfiles.filter(profile => {
        const username = (profile.username || '').toLowerCase();
        const displayName = (profile.displayName || '').toLowerCase();
        const address = (profile.primaryAddr || '').toLowerCase();
        
        return username.includes(searchQuery) || 
               displayName.includes(searchQuery) || 
               address.includes(searchQuery);
      }).slice(0, limit);
      
      console.log(`[Fast API] 🔍 File database search for "${query}": ${results.length} results`);
      return results;
      
    } catch (error) {
      console.error('[Fast API] Error searching file database:', error);
      return await this.searchProfilesBlockchain(query, limit);
    }
  }

  // Blockchain search fallback
  async searchProfilesBlockchain(query, limit = 100) {
    try {
      console.log(`[Fast API] 🔗 Blockchain search for: ${query}`);
      const results = await this.ethosApi.xStyleUserLookup(query, limit);
      return results || [];
    } catch (error) {
      console.error('[Fast API] Blockchain search error:', error);
      return [];
    }
  }

  // Get user stats with file database priority
  async getUserStats(identifier) {
    try {
      // Try file database first
      const fileProfiles = await this.loadProfilesFromFile();
      const profile = fileProfiles.find(p => 
        p.username === identifier || 
        p.displayName === identifier ||
        p.primaryAddr === identifier ||
        p.profileId?.toString() === identifier
      );
      
      if (profile) {
        console.log(`[Fast API] 📁 User stats from file database: ${identifier}`);
        return {
          username: profile.username,
          displayName: profile.displayName,
          score: profile.score || 0,
          reviews: profile.stats?.review?.received || { positive: 0, negative: 0, neutral: 0 },
          vouches: profile.stats?.vouch || { received: { count: 0 }, given: { count: 0 } },
          xp: profile.xpTotal || 0,
          profileId: profile.profileId,
          avatarUrl: profile.avatarUrl,
          userkeys: profile.userkeys || [],
          source: 'file-database'
        };
      }
      
      // Fallback to blockchain
      console.log(`[Fast API] 🔗 Getting user stats from blockchain: ${identifier}`);
      return await this.ethosApi.getUserStats(identifier);
      
    } catch (error) {
      console.error(`[Fast API] Error getting user stats for ${identifier}:`, error);
      return null;
    }
  }

  // Cache management
  setCachedResult(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  getCachedResult(key) {
    const cached = this.cache.get(key);
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      return cached.data;
    }
    if (cached) {
      this.cache.delete(key);
    }
    return null;
  }

  // Get cache stats
  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  // Get profile database stats
  async getDatabaseStats() {
    try {
      const response = await fetch('/api/stats');
      if (!response.ok) {
        return {
          totalProfiles: 0,
          source: 'none',
          lastUpdated: null
        };
      }
      
      const stats = await response.json();
      console.log('[Fast API] 📊 Database stats:', stats);
      return stats;
      
    } catch (error) {
      console.error('[Fast API] Error getting database stats:', error);
      return {
        totalProfiles: 0,
        source: 'error',
        lastUpdated: null,
        error: error.message
      };
    }
  }

  // Get distribution stats from leaderboard data
  getFastDistributionStats(leaderboardData) {
    if (!leaderboardData || leaderboardData.length === 0) {
      return {
        totalUsers: 0,
        averageScore: 0,
        topScore: 0,
        distribution: []
      };
    }

    const scores = leaderboardData.map(p => p.score || 0);
    const totalUsers = leaderboardData.length;
    const averageScore = scores.reduce((sum, score) => sum + score, 0) / totalUsers;
    const topScore = Math.max(...scores);

    // Create score distribution buckets
    const buckets = {
      '0-500': 0,
      '501-1000': 0,
      '1001-1200': 0,
      '1201-1300': 0,
      '1301+': 0
    };

    scores.forEach(score => {
      if (score <= 500) buckets['0-500']++;
      else if (score <= 1000) buckets['501-1000']++;
      else if (score <= 1200) buckets['1001-1200']++;
      else if (score <= 1300) buckets['1201-1300']++;
      else buckets['1301+']++;
    });

    const distribution = Object.entries(buckets).map(([range, count]) => ({
      range,
      count,
      percentage: (count / totalUsers) * 100
    }));

    return {
      totalUsers,
      averageScore: Math.round(averageScore),
      topScore,
      distribution
    };
  }

  // Search in leaderboard data
  searchLeaderboard(leaderboardData, searchTerm) {
    if (!leaderboardData || !searchTerm) return leaderboardData;
    
    const query = searchTerm.toLowerCase();
    return leaderboardData.filter(profile => {
      const username = (profile.username || '').toLowerCase();
      const displayName = (profile.displayName || '').toLowerCase();
      const address = (profile.address || '').toLowerCase();
      
      return username.includes(query) || 
             displayName.includes(query) || 
             address.includes(query);
    });
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
    console.log('[Fast API] Cache cleared');
  }
}

export default new FastDistributionApi();
