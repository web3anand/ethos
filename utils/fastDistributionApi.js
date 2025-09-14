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
    
    this.initialized = true;
  }

  // Load profiles from SQLite database (instant loading)
  async loadProfilesFromFile(progressCallback = null) {
    try {
      console.log('[Fast API] 📡 Loading profiles from database via paginated API...');
      
      const allProfiles = [];
      const batchSize = 5000;
      let offset = 0;
      let hasMore = true;
      let batchCount = 0;
      const maxBatches = 10; // Safety limit
      
      while (hasMore && batchCount < maxBatches) {
        const batchNumber = Math.floor(offset / batchSize) + 1;
        console.log(`[Fast API] 📡 Loading batch ${batchNumber}, offset: ${offset}`);
        
        const response = await fetch(`/api/comprehensive-profiles?limit=${batchSize}&offset=${offset}`);
        
        if (!response.ok) {
          console.log('[Fast API] 📁 API error, status:', response.status);
          break;
        }
        
        const batchData = await response.json();
        const rawProfiles = batchData.profiles || [];
        
        // Map API fields to frontend expected field names
        const profiles = rawProfiles.map(profile => ({
          profileId: profile.profile_id,
          userkey: profile.profile_id, // Use profile_id as userkey
          username: profile.username,
          displayName: profile.display_name,
          avatarUrl: profile.avatar_url,
          description: profile.description,
          score: profile.score || 0,
          xpStreakDays: profile.streak_days || 0,
          xpTotal: profile.total_xp || 0,
          isValidator: profile.is_validator || false,
          season0Xp: profile.season_0_xp || 0,
          season1Xp: profile.season_1_xp || 0,
          status: profile.status,
          userkeysCount: profile.userkeys_count || 0,
          ethAddresses: profile.eth_addresses || 0,
          rank: profile.rank || 0
        }));
        
        console.log(`[Fast API] 📁 Batch ${batchNumber} response:`, {
          profilesLength: profiles.length,
          batchDataKeys: Object.keys(batchData),
          hasProfiles: !!batchData.profiles,
          firstProfile: profiles[0]
        });
        
        if (profiles.length === 0) {
          console.log(`[Fast API] 📁 No more profiles at offset ${offset}, stopping pagination`);
          hasMore = false;
        } else {
          allProfiles.push(...profiles);
          offset += batchSize;
          batchCount++;
          
          console.log(`[Fast API] 📁 Loaded ${profiles.length} profiles in this batch, total: ${allProfiles.length}`);
          
          // Continue if we got a full batch (might be more data)
          if (profiles.length < batchSize) {
            console.log(`[Fast API] 📁 Got partial batch (${profiles.length} < ${batchSize}), stopping pagination`);
            hasMore = false;
          }
          
          // Update progress callback if provided
          if (progressCallback) {
            const percentage = Math.min(90, (allProfiles.length / 25000) * 100);
            progressCallback({
              stage: `Loading profiles (batch ${batchNumber})...`,
              current: allProfiles.length,
              target: 25000,
              percentage: percentage
            });
          }
        }
      }
      
      console.log(`[Fast API] 📁 Total loaded: ${allProfiles.length} profiles from database`);
      console.log(`[Fast API] 📁 Processed ${batchCount} batches`);
      console.log('[Fast API] 📁 First few profiles:', allProfiles.slice(0, 3));
      console.log('[Fast API] 📁 Profile data type:', typeof allProfiles, 'is array:', Array.isArray(allProfiles));
      
      // Store in instance variable for caching
      this.profileData = allProfiles;
      console.log('[Fast API] 📁 Stored profiles in this.profileData:', this.profileData?.length);
      
      // Final progress update
      if (progressCallback) {
        progressCallback({
          stage: 'All profiles loaded!',
          current: allProfiles.length,
          target: allProfiles.length,
          percentage: 100
        });
      }
      return allProfiles;
    } catch (error) {
      console.error('[Fast API] Error loading profiles from file:', error);
      if (progressCallback) {
        progressCallback({
          stage: `Error: ${error.message}`,
          current: 0,
          target: 0,
          percentage: 0
        });
      }
      return [];
    }
  }

  // Fast leaderboard using file database as primary source
  async getFastLeaderboard(limit = 20000, progressCallback = null) {
    const cacheKey = `fast-leaderboard:all-profiles:file-db-v10-${Date.now()}`;
    
    try {
      // Ensure profile data is loaded
      if (!this.profileData || this.profileData.length === 0) {
        console.log('[Fast API] 🔄 Profile data not loaded, loading now...');
        console.log('[Fast API] 🔄 this.profileData before load:', this.profileData);
        try {
          this.profileData = await this.loadProfilesFromFile(progressCallback);
          console.log('[Fast API] 🔄 this.profileData after load:', this.profileData?.length);
        } catch (error) {
          console.error('[Fast API] 🔄 Error loading profiles:', error);
          this.profileData = [];
        }
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
      console.log('[Fast API] 🔄 fileProfiles length:', fileProfiles?.length);
      console.log('[Fast API] 🔄 fileProfiles type:', typeof fileProfiles, 'is array:', Array.isArray(fileProfiles));
      
      if (fileProfiles && fileProfiles.length > 0) {
        console.log(`[Fast API] 📁 File database loaded: ${fileProfiles.length} profiles`);
        
        if (progressCallback) {
          progressCallback({
            stage: 'Database loaded, sorting profiles...',
            current: fileProfiles.length,
            target: fileProfiles.length,
            percentage: 90
          });
        }
        
        // Sort profiles by XP (highest first) for leaderboard
        const sortedProfiles = fileProfiles.sort((a, b) => (b.xpTotal || b.total_xp || 0) - (a.xpTotal || a.total_xp || 0));
        console.log(`[Fast API] 🏆 Top 5 users by XP:`, sortedProfiles.slice(0, 5).map(u => `${u.username}: ${(u.xpTotal || u.total_xp || 0)?.toLocaleString()} XP`));
        
        // Return all profiles from database (no limit for complete dataset)
        const leaderboardData = sortedProfiles;
        
        if (progressCallback) {
          progressCallback({
            stage: 'Ready!',
            current: leaderboardData.length,
            target: leaderboardData.length,
            percentage: 100
          });
        }
        
        // Cache the result
        this.setCachedResult(cacheKey, leaderboardData);
        
        console.log(`[Fast API] ✅ File database leaderboard ready: ${leaderboardData.length} profiles`);
        return leaderboardData;
      } else {
        console.log('[Fast API] ⚠️ No profiles loaded from file database');
        return [];
      }
    } catch (error) {
      console.error('[Fast API] File database loading failed:', error);
      if (progressCallback) {
        progressCallback({
          stage: `Error: ${error.message}`,
          current: 0,
          target: 0,
          percentage: 0
        });
      }
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
    
    // No fallback - return empty array if file database fails
    console.log('[Fast API] No file database available, returning empty array');
    return [];
  }

  // Get fast distribution stats from file database
  async getFastDistributionStats(leaderboardData = null) {
    try {
      let profiles;
      if (leaderboardData) {
        profiles = leaderboardData;
      } else {
        // Ensure we have profile data loaded
        if (!this.profileData || this.profileData.length === 0) {
          console.log('[Fast API] Loading profiles for stats calculation...');
          profiles = await this.loadProfilesFromFile();
          console.log('[Fast API] Profiles loaded for stats:', profiles?.length);
        } else {
          profiles = this.profileData;
          console.log('[Fast API] Using cached profiles for stats:', profiles?.length);
        }
        
        // Wait for profiles to be loaded
        if (!profiles || profiles.length === 0) {
          console.log('[Fast API] Waiting for profiles to load...');
          await new Promise(resolve => setTimeout(resolve, 1000));
          profiles = this.profileData;
          console.log('[Fast API] Profiles after wait:', profiles?.length);
        }
      }
      
      if (!profiles || profiles.length === 0) {
        console.log('[Fast API] No profiles available for stats calculation');
        console.log('[Fast API] Profiles value:', profiles);
        console.log('[Fast API] this.profileData:', this.profileData?.length);
        console.log('[Fast API] this.profileData type:', typeof this.profileData);
        console.log('[Fast API] this.profileData is array:', Array.isArray(this.profileData));
        return {
          totalUsers: 0,
          totalXp: 0,
          averageScore: 0,
          topScore: 0,
          source: 'none'
        };
      }

      const totalUsers = profiles.length;
      const totalXp = profiles.reduce((sum, p) => sum + (p.xpTotal || p.total_xp || 0), 0);
      const totalScore = profiles.reduce((sum, p) => sum + (p.score || 0), 0);
      const averageScore = totalUsers > 0 ? totalScore / totalUsers : 0;
      const topScore = Math.max(...profiles.map(p => p.score || 0));

      console.log('[Fast API] getFastDistributionStats - profiles length:', profiles?.length);
      console.log('[Fast API] getFastDistributionStats - first profile sample:', profiles?.[0]);
      console.log('[Fast API] getFastDistributionStats - profiles type:', typeof profiles, 'is array:', Array.isArray(profiles));
      console.log('[Fast API] getFastDistributionStats - leaderboardData parameter:', leaderboardData?.length);
      console.log('[Fast API] getFastDistributionStats - this.profileData length:', this.profileData?.length);
      console.log('[Fast API] Calculated values:', { totalUsers, totalXp, totalScore, averageScore, topScore });

      const stats = {
        totalUsers,
        totalXp,
        averageScore: Math.round(averageScore * 100) / 100,
        topScore,
        distribution: this.calculateXpDistribution(profiles),
        source: 'file-database'
      };

      console.log('[Fast API] Final stats object:', stats);

      // Add season information from seasons API
      try {
        console.log(`[Fast API] 📅 Getting season information...`);
        const response = await fetch('/api/seasons');
        if (response.ok) {
          const seasonData = await response.json();
          stats.totalSeasons = seasonData.totalSeasons;
          stats.currentSeason = seasonData.currentSeason;
          stats.currentWeek = seasonData.currentWeek;
          stats.seasons = seasonData.seasons;
          console.log(`[Fast API] ✅ Season data added: ${stats.totalSeasons} seasons, current week: ${stats.currentWeek?.week || 'none'}`);
        } else {
          console.log(`[Fast API] ⚠️ Season API error: ${response.status}`);
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

  // Force refresh - clear cache and reload data
  async forceRefresh(limit = 20000, progressCallback = null) {
    console.log('[Fast API] 🔄 Force refresh: clearing cache and reloading data...');
    
    // Clear cache
    this.clearCache();
    
    // Force reload profile data
    this.profileData = null;
    this.profileData = await this.loadProfilesFromFile(progressCallback);
    
    // Return fresh leaderboard data
    return await this.getFastLeaderboard(limit, progressCallback);
  }
}

export default new FastDistributionApi();
