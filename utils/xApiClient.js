// X API utility functions with rate limiting and caching
// This provides a more robust implementation for production use

class XApiClient {
  constructor() {
    this.bearerToken = process.env.NEXT_PUBLIC_X_BEARER_TOKEN || process.env.X_BEARER_TOKEN;
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    this.lastRequestTime = 0;
    this.requestDelay = 500; // 500ms delay between requests
  }

  // Check if bearer token is available
  isConfigured() {
    return !!this.bearerToken;
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

  // Make authenticated request to X API
  async makeRequest(url, options = {}) {
    if (!this.isConfigured()) {
      throw new Error('X API Bearer token not configured');
    }

    await this.throttleRequest();

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.bearerToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    // Log rate limit information
    const remaining = response.headers.get('x-rate-limit-remaining');
    const reset = response.headers.get('x-rate-limit-reset');
    
    if (remaining !== null) {
      console.log(`[X API] Rate limit remaining: ${remaining}, resets at: ${new Date(reset * 1000)}`);
    }

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('X API rate limit exceeded. Please try again later.');
      }
      throw new Error(`X API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Lookup user by exact username
  async getUserByUsername(username) {
    const cacheKey = `user:${username.toLowerCase()}`;
    const cached = this.getCachedResult(cacheKey);
    
    if (cached) {
      console.log(`[X API] Cache hit for username: ${username}`);
      return cached;
    }

    try {
      const url = `https://api.twitter.com/2/users/by/username/${encodeURIComponent(username)}?user.fields=id,name,username,description,public_metrics,profile_image_url,verified,verified_type`;
      
      const data = await this.makeRequest(url);
      
      if (data.data) {
        this.setCachedResult(cacheKey, data.data);
        console.log(`[X API] Successfully fetched user: ${username}`);
        return data.data;
      }
      
      return null;
    } catch (error) {
      console.error(`[X API] Error fetching user ${username}:`, error);
      throw error;
    }
  }

  // Search users (requires elevated access)
  async searchUsers(query, count = 5) {
    const cacheKey = `search:${query.toLowerCase()}:${count}`;
    const cached = this.getCachedResult(cacheKey);
    
    if (cached) {
      console.log(`[X API] Cache hit for search: ${query}`);
      return cached;
    }

    try {
      // Using v1.1 API for user search (requires elevated access)
      const url = `https://api.twitter.com/1.1/users/search.json?q=${encodeURIComponent(query)}&count=${count}`;
      
      const data = await this.makeRequest(url);
      
      if (Array.isArray(data)) {
        // Convert v1.1 format to v2 format for consistency
        const convertedUsers = data.map(user => ({
          id: user.id_str,
          name: user.name,
          username: user.screen_name,
          description: user.description,
          public_metrics: {
            followers_count: user.followers_count,
            following_count: user.friends_count,
            tweet_count: user.statuses_count,
            listed_count: user.listed_count,
          },
          profile_image_url: user.profile_image_url_https,
          verified: user.verified,
          verified_type: user.verified ? 'blue' : null,
        }));
        
        this.setCachedResult(cacheKey, convertedUsers);
        console.log(`[X API] Successfully searched users for: ${query}`);
        return convertedUsers;
      }
      
      return [];
    } catch (error) {
      console.error(`[X API] Error searching users for ${query}:`, error);
      throw error;
    }
  }

  // Get multiple users by usernames (batch lookup)
  async getUsersByUsernames(usernames) {
    if (!Array.isArray(usernames) || usernames.length === 0) {
      return [];
    }

    // X API allows up to 100 usernames per request
    const batchSize = 100;
    const batches = [];
    
    for (let i = 0; i < usernames.length; i += batchSize) {
      batches.push(usernames.slice(i, i + batchSize));
    }

    const results = [];
    
    for (const batch of batches) {
      const cacheKey = `batch:${batch.sort().join(',')}`;
      const cached = this.getCachedResult(cacheKey);
      
      if (cached) {
        results.push(...cached);
        continue;
      }

      try {
        const url = `https://api.twitter.com/2/users/by?usernames=${batch.map(u => encodeURIComponent(u)).join(',')}&user.fields=id,name,username,description,public_metrics,profile_image_url,verified,verified_type`;
        
        const data = await this.makeRequest(url);
        
        if (data.data && Array.isArray(data.data)) {
          this.setCachedResult(cacheKey, data.data);
          results.push(...data.data);
        }
      } catch (error) {
        console.error(`[X API] Error fetching batch:`, error);
        // Continue with other batches even if one fails
      }
    }

    return results;
  }

  // Clear cache (useful for development)
  clearCache() {
    this.cache.clear();
    console.log('[X API] Cache cleared');
  }

  // Get cache statistics
  getCacheStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    };
  }
}

// Create singleton instance
const xApiClient = new XApiClient();

// Export functions for use in other modules
export default xApiClient;

// Convenience functions
export const getUserByUsername = (username) => xApiClient.getUserByUsername(username);
export const searchUsers = (query, count) => xApiClient.searchUsers(query, count);
export const getUsersByUsernames = (usernames) => xApiClient.getUsersByUsernames(usernames);
export const isXApiConfigured = () => xApiClient.isConfigured();
export const clearXApiCache = () => xApiClient.clearCache();
export const getXApiCacheStats = () => xApiClient.getCacheStats();
