// Enhanced Distribution API that combines blockchain data with Ethos profiles
import EthosContractApi from './ethosContractApi.js';
import { ethosApiClient } from './ethosApiClient.js';

class EnhancedDistributionApi {
  constructor() {
    this.contractApi = new EthosContractApi();
    this.cache = new Map();
    this.cacheTimeout = 60 * 60 * 1000; // 1 hour cache
    this.profileCache = new Map();
    
    // Load cache from localStorage if available
    this.loadCacheFromStorage();
  }

  // Initialize the enhanced API
  async initialize() {
    console.log('[Enhanced API] 🚀 Initializing enhanced distribution system...');
    
    try {
      const contractReady = await this.contractApi.initialize();
      if (contractReady) {
        console.log('[Enhanced API] ✅ Contract API ready');
        return true;
      } else {
        console.log('[Enhanced API] ⚠️ Contract API failed, will use fallback methods');
        return false;
      }
    } catch (error) {
      console.error('[Enhanced API] ❌ Initialization failed:', error);
      return false;
    }
  }

  // Load cache from localStorage
  loadCacheFromStorage() {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const stored = localStorage.getItem('enhanced-distribution-cache');
        if (stored) {
          const parsedCache = JSON.parse(stored);
          Object.entries(parsedCache).forEach(([key, value]) => {
            if (Date.now() - value.timestamp < this.cacheTimeout) {
              this.cache.set(key, value);
            }
          });
          console.log(`[Enhanced API] Loaded ${this.cache.size} cached items from localStorage`);
        }
      } catch (error) {
        console.warn('[Enhanced API] Failed to load cache:', error);
      }
    }
  }

  // Save cache to localStorage
  saveCacheToStorage() {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const cacheObject = {};
        this.cache.forEach((value, key) => {
          if (Date.now() - value.timestamp < this.cacheTimeout) {
            cacheObject[key] = value;
          }
        });
        localStorage.setItem('enhanced-distribution-cache', JSON.stringify(cacheObject));
      } catch (error) {
        console.warn('[Enhanced API] Failed to save cache:', error);
      }
    }
  }

  // Get cached result
  getCachedResult(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  // Set cached result
  setCachedResult(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
    this.saveCacheToStorage();
  }

  // Get all blockchain addresses
  async getAllBlockchainAddresses(progressCallback = null) {
    const cacheKey = 'blockchain-addresses:v1';
    const cached = this.getCachedResult(cacheKey);
    
    if (cached) {
      console.log(`[Enhanced API] Cache hit for blockchain addresses (${cached.length} addresses)`);
      if (progressCallback) {
        progressCallback({
          stage: 'Loaded from cache',
          current: cached.length,
          total: cached.length,
          percentage: 100
        });
      }
      return cached;
    }

    try {
      if (progressCallback) {
        progressCallback({
          stage: 'Scanning blockchain for Ethos addresses...',
          current: 0,
          total: 1,
          percentage: 0
        });
      }

      const addresses = await this.contractApi.getAllStakerAddresses();
      
      if (progressCallback) {
        progressCallback({
          stage: 'Blockchain scan complete',
          current: addresses.length,
          total: addresses.length,
          percentage: 100
        });
      }

      console.log(`[Enhanced API] ✅ Found ${addresses.length} blockchain addresses`);
      this.setCachedResult(cacheKey, addresses);
      return addresses;
      
    } catch (error) {
      console.error('[Enhanced API] Error getting blockchain addresses:', error);
      throw error;
    }
  }

  // Get Ethos profile for an address
  async getProfileByAddress(address) {
    // Check profile cache first
    if (this.profileCache.has(address)) {
      return this.profileCache.get(address);
    }

    try {
      // Try to get profile by address using Ethos API
      const profile = await ethosApiClient.getProfileByAddress(address);
      
      if (profile) {
        // Cache the profile
        this.profileCache.set(address, profile);
        return profile;
      }
    } catch (error) {
      // Profile not found is not an error, just return null
      if (!error.message.includes('404')) {
        console.warn(`[Enhanced API] Error getting profile for ${address}:`, error.message);
      }
    }

    return null;
  }

  // Batch get profiles for multiple addresses
  async batchGetProfiles(addressData, progressCallback = null) {
    console.log(`[Enhanced API] 📊 Getting Ethos profiles for ${addressData.length} addresses...`);
    
    const profiles = [];
    const batchSize = 10; // Smaller batches to avoid rate limiting
    
    for (let i = 0; i < addressData.length; i += batchSize) {
      const batch = addressData.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (addrData) => {
        try {
          const profile = await this.getProfileByAddress(addrData.address);
          
          if (profile) {
            return {
              ...profile,
              address: addrData.address,
              tokenBalance: addrData.balance,
              hasTokenBalance: addrData.hasBalance
            };
          }
          
          return null;
        } catch (error) {
          console.warn(`[Enhanced API] Failed to get profile for ${addrData.address}:`, error.message);
          return null;
        }
      });

      try {
        const batchResults = await Promise.all(batchPromises);
        const validProfiles = batchResults.filter(p => p !== null);
        profiles.push(...validProfiles);
        
        if (progressCallback) {
          progressCallback({
            stage: 'Fetching Ethos profiles...',
            current: Math.min(i + batchSize, addressData.length),
            total: addressData.length,
            percentage: ((Math.min(i + batchSize, addressData.length)) / addressData.length) * 100
          });
        }
        
        console.log(`[Enhanced API] Processed ${Math.min(i + batchSize, addressData.length)}/${addressData.length} addresses, found ${validProfiles.length} profiles in this batch`);
        
        // Rate limiting to be respectful to Ethos API
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        console.error(`[Enhanced API] Error processing profile batch ${i}-${i + batchSize}:`, error);
      }
    }

    console.log(`[Enhanced API] ✅ Found ${profiles.length} Ethos profiles out of ${addressData.length} addresses`);
    return profiles;
  }

  // Build comprehensive leaderboard using blockchain + profile data
  async buildComprehensiveLeaderboard(progressCallback = null) {
    const cacheKey = 'comprehensive-leaderboard:v1';
    const cached = this.getCachedResult(cacheKey);
    
    if (cached) {
      console.log(`[Enhanced API] Cache hit for comprehensive leaderboard (${cached.length} users)`);
      if (progressCallback) {
        progressCallback({
          stage: 'Loaded from cache',
          current: cached.length,
          total: cached.length,
          percentage: 100
        });
      }
      return cached;
    }

    try {
      console.log('[Enhanced API] 🏗️ Building comprehensive leaderboard...');
      
      // Step 1: Get all blockchain addresses
      const addressData = await this.getAllBlockchainAddresses((progress) => {
        if (progressCallback) {
          progressCallback({
            ...progress,
            stage: 'Step 1/3: ' + progress.stage
          });
        }
      });

      // Step 2: Get Ethos profiles for addresses
      const profiles = await this.batchGetProfiles(addressData, (progress) => {
        if (progressCallback) {
          progressCallback({
            ...progress,
            stage: 'Step 2/3: ' + progress.stage
          });
        }
      });

      // Step 3: Sort by XP and add rankings
      if (progressCallback) {
        progressCallback({
          stage: 'Step 3/3: Sorting and ranking users...',
          current: profiles.length,
          total: profiles.length,
          percentage: 90
        });
      }

      const sortedProfiles = profiles
        .filter(p => p && p.xpTotal !== undefined)
        .sort((a, b) => (b.xpTotal || 0) - (a.xpTotal || 0));

      const totalXP = sortedProfiles.reduce((sum, p) => sum + (p.xpTotal || 0), 0);
      
      const leaderboard = sortedProfiles.map((profile, index) => ({
        ...profile,
        rank: index + 1,
        xpPercentage: totalXP > 0 ? ((profile.xpTotal || 0) / totalXP) * 100 : 0
      }));

      if (progressCallback) {
        progressCallback({
          stage: 'Complete!',
          current: leaderboard.length,
          total: leaderboard.length,
          percentage: 100
        });
      }

      console.log(`[Enhanced API] ✅ Built comprehensive leaderboard with ${leaderboard.length} ranked users`);
      
      // Cache the result
      this.setCachedResult(cacheKey, leaderboard);
      return leaderboard;
      
    } catch (error) {
      console.error('[Enhanced API] Error building comprehensive leaderboard:', error);
      throw error;
    }
  }

  // Get distribution statistics
  async getDistributionStats(leaderboard) {
    try {
      const totalUsers = leaderboard.length;
      const totalXP = leaderboard.reduce((sum, user) => sum + (user.xpTotal || 0), 0);
      const totalTokens = leaderboard.reduce((sum, user) => sum + (user.tokenBalance || 0), 0);
      
      // XP distribution ranges
      const xpRanges = {
        '1M+': leaderboard.filter(u => u.xpTotal >= 1000000).length,
        '500K-1M': leaderboard.filter(u => u.xpTotal >= 500000 && u.xpTotal < 1000000).length,
        '100K-500K': leaderboard.filter(u => u.xpTotal >= 100000 && u.xpTotal < 500000).length,
        '50K-100K': leaderboard.filter(u => u.xpTotal >= 50000 && u.xpTotal < 100000).length,
        '10K-50K': leaderboard.filter(u => u.xpTotal >= 10000 && u.xpTotal < 50000).length,
        '1K-10K': leaderboard.filter(u => u.xpTotal >= 1000 && u.xpTotal < 10000).length,
        '<1K': leaderboard.filter(u => u.xpTotal < 1000).length
      };

      // Token balance ranges (in wei, convert to ETH)
      const tokenRanges = {
        '100+ ETH': leaderboard.filter(u => (u.tokenBalance || 0) >= 100 * 1e18).length,
        '10-100 ETH': leaderboard.filter(u => (u.tokenBalance || 0) >= 10 * 1e18 && (u.tokenBalance || 0) < 100 * 1e18).length,
        '1-10 ETH': leaderboard.filter(u => (u.tokenBalance || 0) >= 1e18 && (u.tokenBalance || 0) < 10 * 1e18).length,
        '0.1-1 ETH': leaderboard.filter(u => (u.tokenBalance || 0) >= 0.1 * 1e18 && (u.tokenBalance || 0) < 1e18).length,
        '<0.1 ETH': leaderboard.filter(u => (u.tokenBalance || 0) < 0.1 * 1e18).length
      };

      const stats = {
        totalUsers,
        totalXP,
        totalTokens,
        averageXP: totalUsers > 0 ? totalXP / totalUsers : 0,
        averageTokens: totalUsers > 0 ? totalTokens / totalUsers : 0,
        xpRanges,
        tokenRanges,
        topUsers: leaderboard.slice(0, 10),
        usersWithProfiles: leaderboard.filter(u => u.displayName || u.username).length,
        usersWithTokens: leaderboard.filter(u => u.hasTokenBalance).length
      };

      console.log('[Enhanced API] ✅ Distribution statistics calculated');
      return stats;
      
    } catch (error) {
      console.error('[Enhanced API] Error calculating distribution stats:', error);
      throw error;
    }
  }

  // Format numbers for display
  formatXP(xp) {
    if (!xp) return '0';
    if (xp >= 1000000) return `${(xp / 1000000).toFixed(2)}M`;
    if (xp >= 1000) return `${(xp / 1000).toFixed(1)}K`;
    return xp.toLocaleString();
  }

  formatTokens(tokens) {
    if (!tokens) return '0 ETH';
    const eth = tokens / 1e18;
    if (eth >= 1000) return `${(eth / 1000).toFixed(1)}K ETH`;
    if (eth >= 1) return `${eth.toFixed(2)} ETH`;
    return `${eth.toFixed(4)} ETH`;
  }

  // Search in leaderboard
  searchLeaderboard(leaderboard, searchTerm) {
    if (!searchTerm || searchTerm.length < 2) {
      return leaderboard;
    }

    const term = searchTerm.toLowerCase();
    return leaderboard.filter(user =>
      user.displayName?.toLowerCase().includes(term) ||
      user.username?.toLowerCase().includes(term) ||
      user.address?.toLowerCase().includes(term) ||
      user.profileId?.toString().includes(term)
    );
  }

  // Force refresh (clear cache)
  async forceRefresh(progressCallback = null) {
    console.log('[Enhanced API] 🔄 Force refreshing all data...');
    
    // Clear all caches
    this.cache.clear();
    this.profileCache.clear();
    this.contractApi.clearCache();
    
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem('enhanced-distribution-cache');
    }

    // Rebuild leaderboard
    return await this.buildComprehensiveLeaderboard(progressCallback);
  }

  // Get cache statistics
  getCacheStats() {
    return {
      distributionCache: this.cache.size,
      profileCache: this.profileCache.size,
      contractCache: this.contractApi.cache.size
    };
  }
}

export default EnhancedDistributionApi;
