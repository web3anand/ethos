// Enhanced Ethos API client for comprehensive user search and lookup
// Uses both v1 (deprecated) and v2 APIs for maximum coverage

class EthosApiClient {
  constructor() {
    this.baseUrlV1 = 'https://api.ethos.network/api/v1';
    this.baseUrlV2 = 'https://api.ethos.network/api/v2';
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

  // V2 API: Search users by query string (most comprehensive)
  async searchUsersV2(query, limit = 10, userKeyType = null) {
    const cacheKey = `v2search:${query}:${limit}:${userKeyType}`;
    const cached = this.getCachedResult(cacheKey);
    
    if (cached) {
      console.log(`[Ethos API v2] Cache hit for search: ${query}`);
      return cached;
    }

    try {
      let url = `${this.baseUrlV2}/users/search?query=${encodeURIComponent(query)}&limit=${limit}`;
      if (userKeyType) {
        url += `&userKeyType=${userKeyType}`;
      }
      
      const data = await this.makeRequest(url);
      
      if (data.values && Array.isArray(data.values)) {
        this.setCachedResult(cacheKey, data.values);
        console.log(`[Ethos API v2] Successfully searched users for: ${query}`);
        return data.values;
      }
      
      return [];
    } catch (error) {
      console.error(`[Ethos API v2] Error searching users for ${query}:`, error);
      throw error;
    }
  }

  // V1 API: General search (searches across profiles, Twitter, ENS)
  async searchV1(query, limit = 10) {
    const cacheKey = `v1search:${query}:${limit}`;
    const cached = this.getCachedResult(cacheKey);
    
    if (cached) {
      console.log(`[Ethos API v1] Cache hit for search: ${query}`);
      return cached;
    }

    try {
      const url = `${this.baseUrlV1}/search?query=${encodeURIComponent(query)}&limit=${limit}`;
      const data = await this.makeRequest(url);
      
      if (data.ok && data.data && data.data.values && Array.isArray(data.data.values)) {
        this.setCachedResult(cacheKey, data.data.values);
        console.log(`[Ethos API v1] Successfully searched for: ${query}`);
        return data.data.values;
      }
      
      return [];
    } catch (error) {
      console.error(`[Ethos API v1] Error searching for ${query}:`, error);
      throw error;
    }
  }

  // V1 API: Search users specifically
  async searchUsersV1(query, limit = 10) {
    const cacheKey = `v1users:${query}:${limit}`;
    const cached = this.getCachedResult(cacheKey);
    
    if (cached) {
      console.log(`[Ethos API v1] Cache hit for users search: ${query}`);
      return cached;
    }

    try {
      const url = `${this.baseUrlV1}/users/search?query=${encodeURIComponent(query)}&limit=${limit}`;
      const data = await this.makeRequest(url);
      
      if (data.ok && data.data && data.data.values && Array.isArray(data.data.values)) {
        this.setCachedResult(cacheKey, data.data.values);
        console.log(`[Ethos API v1] Successfully searched users for: ${query}`);
        return data.data.values;
      }
      
      return [];
    } catch (error) {
      console.error(`[Ethos API v1] Error searching users for ${query}:`, error);
      throw error;
    }
  }

  // V2 API: Get user by Twitter/X username or ID
  async getUserByXUsernameV2(username) {
    const cacheKey = `v2x:${username}`;
    const cached = this.getCachedResult(cacheKey);
    
    if (cached) {
      console.log(`[Ethos API v2] Cache hit for X user: ${username}`);
      return cached;
    }

    try {
      const url = `${this.baseUrlV2}/user/by/x/${encodeURIComponent(username)}`;
      const data = await this.makeRequest(url);
      
      if (data) {
        this.setCachedResult(cacheKey, data);
        console.log(`[Ethos API v2] Successfully fetched X user: ${username}`);
        return data;
      }
      
      return null;
    } catch (error) {
      // 404 is expected for users not found
      if (error.message.includes('404')) {
        return null;
      }
      console.error(`[Ethos API v2] Error fetching X user ${username}:`, error);
      throw error;
    }
  }

  // V2 API: Get user by username
  async getUserByUsernameV2(username) {
    const cacheKey = `v2username:${username}`;
    const cached = this.getCachedResult(cacheKey);
    
    if (cached) {
      console.log(`[Ethos API v2] Cache hit for username: ${username}`);
      return cached;
    }

    try {
      const url = `${this.baseUrlV2}/user/by/username/${encodeURIComponent(username)}`;
      const data = await this.makeRequest(url);
      
      if (data) {
        this.setCachedResult(cacheKey, data);
        console.log(`[Ethos API v2] Successfully fetched user: ${username}`);
        return data;
      }
      
      return null;
    } catch (error) {
      // 404 is expected for users not found
      if (error.message.includes('404')) {
        return null;
      }
      console.error(`[Ethos API v2] Error fetching user ${username}:`, error);
      throw error;
    }
  }

  // V2 API: Bulk lookup by X usernames
  async getUsersByXUsernamesV2(usernames) {
    if (!Array.isArray(usernames) || usernames.length === 0) {
      return [];
    }

    const cacheKey = `v2xbulk:${usernames.sort().join(',')}`;
    const cached = this.getCachedResult(cacheKey);
    
    if (cached) {
      console.log(`[Ethos API v2] Cache hit for X bulk lookup`);
      return cached;
    }

    try {
      const url = `${this.baseUrlV2}/users/by/x`;
      const data = await this.makeRequest(url, {
        method: 'POST',
        body: JSON.stringify({ accountIdsOrUsernames: usernames }),
      });
      
      if (Array.isArray(data)) {
        this.setCachedResult(cacheKey, data);
        console.log(`[Ethos API v2] Successfully fetched X users bulk`);
        return data;
      }
      
      return [];
    } catch (error) {
      console.error(`[Ethos API v2] Error fetching X users bulk:`, error);
      throw error;
    }
  }

  // V1 API: Official search endpoint from documentation
  async officialSearchV1(query, limit = 10) {
    const cacheKey = `v1official:${query}:${limit}`;
    const cached = this.getCachedResult(cacheKey);
    
    if (cached) {
      console.log(`[Ethos API v1] Cache hit for official search: ${query}`);
      return cached;
    }

    try {
      // Using the official search API from documentation
      const url = `${this.baseUrlV1}/search?query=${encodeURIComponent(query)}&limit=${limit}`;
      const data = await this.makeRequest(url);
      
      if (data && data.ok && data.data && data.data.values && Array.isArray(data.data.values)) {
        this.setCachedResult(cacheKey, data.data.values);
        console.log(`[Ethos API v1] Official search success for: ${query} (${data.data.values.length} results)`);
        return data.data.values;
      }
      
      return [];
    } catch (error) {
      console.error(`[Ethos API v1] Official search error for ${query}:`, error);
      throw error;
    }
  }

  // Enhanced X-style user lookup similar to Twitter search
  async xStyleUserLookup(query, limit = 8) {
    const results = new Map();
    const cleanQuery = query.replace(/^@/, '').trim().toLowerCase();

    try {
      // 1. Official Ethos search API (primary source)
      try {
        const officialResults = await this.officialSearchV1(cleanQuery, limit);
        officialResults.forEach(user => {
          if (user.profileId || user.userkey) {
            const key = user.profileId || user.userkey;
            results.set(key, this.normalizeOfficialSearchResult(user));
          }
        });
        console.log(`[X-Style Search] Official search returned ${officialResults.length} results`);
      } catch (error) {
        console.warn('[X-Style Search] Official search failed:', error);
      }

      // 2. V2 Users Search for additional coverage
      if (results.size < limit) {
        try {
          const v2Users = await this.searchUsersV2(cleanQuery, limit - results.size);
          v2Users.forEach(user => {
            if (user.profileId && !results.has(user.profileId)) {
              results.set(user.profileId, this.normalizeUserV2(user));
            }
          });
          console.log(`[X-Style Search] V2 search added ${v2Users.length} more results`);
        } catch (error) {
          console.warn('[X-Style Search] V2 search failed:', error);
        }
      }

      // 3. Direct username/X username lookup for exact matches
      if (results.size < limit && /^[a-zA-Z0-9_]+$/.test(cleanQuery)) {
        try {
          // Try X username lookup
          const xUser = await this.getUserByXUsernameV2(cleanQuery);
          if (xUser && xUser.profileId && !results.has(xUser.profileId)) {
            results.set(xUser.profileId, {
              ...this.normalizeUserV2(xUser),
              isExactMatch: true
            });
          }

          // Try regular username lookup
          const user = await this.getUserByUsernameV2(cleanQuery);
          if (user && user.profileId && !results.has(user.profileId)) {
            results.set(user.profileId, {
              ...this.normalizeUserV2(user),
              isExactMatch: true
            });
          }
        } catch (error) {
          console.warn('[X-Style Search] Direct lookup failed:', error);
        }
      }

      // Sort results X-style: exact matches first, then by relevance/score
      const finalResults = Array.from(results.values()).sort((a, b) => {
        // Exact matches first
        if (a.isExactMatch && !b.isExactMatch) return -1;
        if (!a.isExactMatch && b.isExactMatch) return 1;

        // Username exact matches
        const aUsernameMatch = a.username?.toLowerCase() === cleanQuery;
        const bUsernameMatch = b.username?.toLowerCase() === cleanQuery;
        if (aUsernameMatch && !bUsernameMatch) return -1;
        if (!aUsernameMatch && bUsernameMatch) return 1;

        // Display name exact matches
        const aDisplayMatch = a.displayName?.toLowerCase() === cleanQuery;
        const bDisplayMatch = b.displayName?.toLowerCase() === cleanQuery;
        if (aDisplayMatch && !bDisplayMatch) return -1;
        if (!aDisplayMatch && bDisplayMatch) return 1;

        // Username starts with query
        const aStartsWith = a.username?.toLowerCase().startsWith(cleanQuery);
        const bStartsWith = b.username?.toLowerCase().startsWith(cleanQuery);
        if (aStartsWith && !bStartsWith) return -1;
        if (!aStartsWith && bStartsWith) return 1;

        // Finally by score (higher is better)
        return (b.score || 0) - (a.score || 0);
      }).slice(0, limit);

      console.log(`[X-Style Search] Final results for "${query}": ${finalResults.length} users`);
      return finalResults;

    } catch (error) {
      console.error('[X-Style Search] Failed:', error);
      return [];
    }
  }

  // Normalize official search API results
  normalizeOfficialSearchResult(result) {
    return {
      username: result.username || result.userkey,
      displayName: result.name || result.displayName || result.username,
      avatarUrl: result.avatar || result.avatarUrl,
      profileId: result.profileId || result.userkey,
      score: result.score || result.scoreXpMultiplier * 10 || 0,
      verified: result.verified || false,
      followers: this.calculateFollowersFromOfficialResult(result),
      isEthos: true,
      bio: result.description || result.bio,
      userkey: result.userkey,
      primaryAddress: result.primaryAddress,
      // Additional fields from official API
      xpTotal: result.xpTotal || 0,
      reputation: this.calculateReputation(result.score),
      isActive: true,
      platform: 'ethos'
    };
  }

  // Calculate followers from official search result
  calculateFollowersFromOfficialResult(result) {
    if (result.followers) return result.followers;
    
    let estimatedFollowers = 0;
    if (result.score) {
      // Estimate followers based on score (rough approximation)
      estimatedFollowers = Math.floor(result.score / 10);
    }
    if (result.vouchCount) {
      estimatedFollowers += result.vouchCount * 25;
    }
    
    return Math.max(0, estimatedFollowers);
  }

  // Calculate reputation tier based on score
  calculateReputation(score) {
    if (!score) return 'New';
    if (score >= 2000) return 'Elite';
    if (score >= 1000) return 'Established';
    if (score >= 500) return 'Growing';
    return 'Newcomer';
  }

  // Legacy comprehensive search method for backward compatibility
  async comprehensiveUserSearch(query, limit = 8) {
    const results = new Map(); // Use Map to avoid duplicates by profileId

    try {
      // 1. V2 Users Search (most comprehensive)
      try {
        const v2Users = await this.searchUsersV2(query, limit);
        v2Users.forEach(user => {
          if (user.profileId) {
            results.set(user.profileId, this.normalizeUserV2(user));
          }
        });
      } catch (error) {
        console.warn('[Ethos API] V2 search failed:', error);
      }

      // 2. V1 General Search (includes Twitter cross-references)
      if (results.size < limit) {
        try {
          const v1Results = await this.searchV1(query, limit - results.size);
          v1Results.forEach(user => {
            if (user.profileId && !results.has(user.profileId)) {
              results.set(user.profileId, this.normalizeUserV1(user));
            }
          });
        } catch (error) {
          console.warn('[Ethos API] V1 search failed:', error);
        }
      }

      // 3. V1 Users Search (specific user search)
      if (results.size < limit) {
        try {
          const v1Users = await this.searchUsersV1(query, limit - results.size);
          v1Users.forEach(user => {
            if (user.id && !results.has(user.id)) {
              results.set(user.id, this.normalizeUserV1Users(user));
            }
          });
        } catch (error) {
          console.warn('[Ethos API] V1 users search failed:', error);
        }
      }

      // 4. Direct X username lookup (if query looks like username)
      if (results.size < limit && /^[a-zA-Z0-9_]+$/.test(query)) {
        try {
          const xUser = await this.getUserByXUsernameV2(query);
          if (xUser && xUser.profileId && !results.has(xUser.profileId)) {
            results.set(xUser.profileId, this.normalizeUserV2(xUser));
          }
        } catch (error) {
          console.warn('[Ethos API] X user lookup failed:', error);
        }
      }

      // 5. Direct username lookup
      if (results.size < limit && /^[a-zA-Z0-9_]+$/.test(query)) {
        try {
          const user = await this.getUserByUsernameV2(query);
          if (user && user.profileId && !results.has(user.profileId)) {
            results.set(user.profileId, this.normalizeUserV2(user));
          }
        } catch (error) {
          console.warn('[Ethos API] Username lookup failed:', error);
        }
      }

      const finalResults = Array.from(results.values());
      console.log(`[Ethos API] Comprehensive search for "${query}" returned ${finalResults.length} results`);
      return finalResults;

    } catch (error) {
      console.error('[Ethos API] Comprehensive search failed:', error);
      return [];
    }
  }

  // Normalize V2 API user response to common format
  normalizeUserV2(user) {
    return {
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      profileId: user.profileId,
      score: user.score || 0,
      verified: false, // Ethos doesn't have Twitter verification info
      followers: this.calculateFollowersFromStats(user.stats),
      isEthos: true,
      bio: user.description,
      xpTotal: user.xpTotal,
      links: user.links,
      userkeys: user.userkeys,
    };
  }

  // Normalize V1 API search response to common format
  normalizeUserV1(user) {
    return {
      username: user.username,
      displayName: user.name,
      avatarUrl: user.avatar,
      profileId: user.profileId,
      score: user.score || user.scoreXpMultiplier * 10 || 0,
      verified: false,
      followers: 0, // V1 search doesn't include follower info
      isEthos: true,
      bio: user.description,
      userkey: user.userkey,
      primaryAddress: user.primaryAddress,
    };
  }

  // Normalize V1 API users search response to common format
  normalizeUserV1Users(user) {
    return {
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatar,
      profileId: user.id, // Note: different field name in users search
      score: user.score || 0,
      verified: false,
      followers: 0,
      isEthos: true,
      bio: user.bio,
      userkeys: user.userkeys,
    };
  }

  // Calculate pseudo-follower count from Ethos stats
  calculateFollowersFromStats(stats) {
    if (!stats) return 0;
    
    let followers = 0;
    if (stats.vouch?.received?.count) {
      followers += stats.vouch.received.count * 50; // 50 followers per vouch received
    }
    if (stats.review?.received?.positive) {
      followers += stats.review.received.positive * 20; // 20 followers per positive review
    }
    
    return followers;
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
    console.log('[Ethos API] Cache cleared');
  }

  // Get cache statistics
  getCacheStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    };
  }

  // V2 API: Get users by profile IDs (batch lookup with scores)
  async getUsersByProfileIds(profileIds) {
    if (!Array.isArray(profileIds) || profileIds.length === 0) {
      return [];
    }

    // Limit to 500 profile IDs per API documentation
    const batchSize = 500;
    const batches = [];
    for (let i = 0; i < profileIds.length; i += batchSize) {
      batches.push(profileIds.slice(i, i + batchSize));
    }

    const allResults = [];

    for (const batch of batches) {
      const cacheKey = `v2profileIds:${batch.sort().join(',')}`;
      const cached = this.getCachedResult(cacheKey);
      
      if (cached) {
        console.log(`[Ethos API v2] Cache hit for profile IDs batch of ${batch.length}`);
        allResults.push(...cached);
        continue;
      }

      try {
        const url = `${this.baseUrlV2}/users/by/profile-id`;
        const data = await this.makeRequest(url, {
          method: 'POST',
          body: JSON.stringify({ profileIds: batch }),
        });
        
        if (Array.isArray(data)) {
          this.setCachedResult(cacheKey, data);
          console.log(`[Ethos API v2] Successfully fetched ${data.length} users by profile IDs`);
          allResults.push(...data);
        }
      } catch (error) {
        console.error(`[Ethos API v2] Error fetching users by profile IDs:`, error);
        throw error;
      }
    }

    return allResults;
  }

  // V2 API: Get single user by profile ID
  async getUserByProfileId(profileId) {
    const cacheKey = `v2profileId:${profileId}`;
    const cached = this.getCachedResult(cacheKey);
    
    if (cached) {
      console.log(`[Ethos API v2] Cache hit for profile ID: ${profileId}`);
      return cached;
    }

    try {
      const url = `${this.baseUrlV2}/user/by/profile-id/${profileId}`;
      const data = await this.makeRequest(url);
      
      if (data) {
        this.setCachedResult(cacheKey, data);
        console.log(`[Ethos API v2] Successfully fetched user by profile ID: ${profileId}`);
        return data;
      }
      
      return null;
    } catch (error) {
      // 404 is expected for users not found
      if (error.message.includes('404')) {
        console.log(`[Ethos API v2] User not found for profile ID: ${profileId}`);
        return null;
      }
      console.error(`[Ethos API v2] Error fetching user by profile ID ${profileId}:`, error);
      throw error;
    }
  }

  // V1 API: Get user stats including influencer score
  async getUserStats(userkey) {
    const cacheKey = `v1stats:${userkey}`;
    const cached = this.getCachedResult(cacheKey);
    
    if (cached) {
      console.log(`[Ethos API v1] Cache hit for user stats: ${userkey}`);
      return cached;
    }

    try {
      const url = `${this.baseUrlV1}/users/${encodeURIComponent(userkey)}/stats`;
      const data = await this.makeRequest(url);
      
      if (data && data.ok && data.data) {
        this.setCachedResult(cacheKey, data.data);
        console.log(`[Ethos API v1] Successfully fetched user stats for: ${userkey}`);
        return data.data;
      }
      
      return null;
    } catch (error) {
      // 404 is expected for users not found
      if (error.message.includes('404')) {
        console.log(`[Ethos API v1] User stats not found for: ${userkey}`);
        return null;
      }
      console.error(`[Ethos API v1] Error fetching user stats for ${userkey}:`, error);
      throw error;
    }
  }
}

// Create singleton instance
const ethosApiClient = new EthosApiClient();

// Export functions for use in other modules
export default ethosApiClient;

// Convenience functions
export const searchUsers = (query, limit) => ethosApiClient.xStyleUserLookup(query, limit);
export const getUserByXUsername = (username) => ethosApiClient.getUserByXUsernameV2(username);
export const getUserByUsername = (username) => ethosApiClient.getUserByUsernameV2(username);
export const getUserByProfileId = (profileId) => ethosApiClient.getUserByProfileId(profileId);
export const getUsersByProfileIds = (profileIds) => ethosApiClient.getUsersByProfileIds(profileIds);
export const getUserStats = (userkey) => ethosApiClient.getUserStats(userkey);
export const clearEthosCache = () => ethosApiClient.clearCache();
export const getEthosCacheStats = () => ethosApiClient.getCacheStats();
