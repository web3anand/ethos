// Cache management for fast data retrieval
// This module only works on the server side

let fs, path;
let CACHE_DIR;
let isServerSide = false;

// Check if we're on the server side
if (typeof window === 'undefined') {
  fs = require('fs');
  path = require('path');
  CACHE_DIR = path.join(process.cwd(), '.cache');
  isServerSide = true;
  
  // Ensure cache directory exists
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

const CACHE_EXPIRY = 2 * 60 * 60 * 1000; // 2 hours in milliseconds

class CacheManager {
  constructor() {
    this.memoryCache = new Map();
    this.cacheStats = {
      hits: 0,
      misses: 0,
      updates: 0
    };
  }

  // Generate cache key
  getCacheKey(type, id) {
    return `${type}_${id}`;
  }

  // Get cache file path
  getCacheFilePath(key) {
    return path.join(CACHE_DIR, `${key}.json`);
  }

  // Check if cache is expired
  isCacheExpired(timestamp) {
    return Date.now() - timestamp > CACHE_EXPIRY;
  }

  // Get data from memory cache first, then file cache
  async get(type, id) {
    const key = this.getCacheKey(type, id);
    
    // Check memory cache first
    if (this.memoryCache.has(key)) {
      const cached = this.memoryCache.get(key);
      if (!this.isCacheExpired(cached.timestamp)) {
        this.cacheStats.hits++;
        return cached.data;
      } else {
        this.memoryCache.delete(key);
      }
    }

    // Check file cache only on server side
    if (isServerSide && fs) {
      try {
        const filePath = this.getCacheFilePath(key);
        if (fs.existsSync(filePath)) {
          const fileContent = fs.readFileSync(filePath, 'utf8');
          const cached = JSON.parse(fileContent);
          
          if (!this.isCacheExpired(cached.timestamp)) {
            // Restore to memory cache
            this.memoryCache.set(key, cached);
            this.cacheStats.hits++;
            return cached.data;
          } else {
            // Remove expired file
            fs.unlinkSync(filePath);
          }
        }
      } catch (error) {
        console.error(`Cache read error for ${key}:`, error);
      }
    }

    this.cacheStats.misses++;
    return null;
  }

  // Set data in both memory and file cache
  async set(type, id, data) {
    const key = this.getCacheKey(type, id);
    const cached = {
      data,
      timestamp: Date.now()
    };

    // Set in memory cache
    this.memoryCache.set(key, cached);

    // Set in file cache only on server side
    if (isServerSide && fs) {
      try {
        const filePath = this.getCacheFilePath(key);
        fs.writeFileSync(filePath, JSON.stringify(cached, null, 2));
        this.cacheStats.updates++;
      } catch (error) {
        console.error(`Cache write error for ${key}:`, error);
      }
    }
  }

  // Clear specific cache entry
  async clear(type, id) {
    const key = this.getCacheKey(type, id);
    
    // Remove from memory
    this.memoryCache.delete(key);
    
    // Remove file only on server side
    if (isServerSide && fs) {
      try {
        const filePath = this.getCacheFilePath(key);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (error) {
        console.error(`Cache clear error for ${key}:`, error);
      }
    }
  }

  // Clear all cache
  async clearAll() {
    // Clear memory cache
    this.memoryCache.clear();
    
    // Clear file cache only on server side
    if (isServerSide && fs) {
      try {
        const files = fs.readdirSync(CACHE_DIR);
        for (const file of files) {
          if (file.endsWith('.json')) {
            fs.unlinkSync(path.join(CACHE_DIR, file));
          }
        }
      } catch (error) {
        console.error('Cache clear all error:', error);
      }
    }

    // Reset stats
    this.cacheStats = { hits: 0, misses: 0, updates: 0 };
  }

  // Get cache statistics
  getStats() {
    const total = this.cacheStats.hits + this.cacheStats.misses;
    const hitRate = total > 0 ? (this.cacheStats.hits / total * 100).toFixed(2) : 0;
    
    return {
      ...this.cacheStats,
      hitRate: `${hitRate}%`,
      memoryCacheSize: this.memoryCache.size,
      fileCacheSize: this.getFileCacheSize()
    };
  }

  // Get file cache size
  getFileCacheSize() {
    if (!isServerSide || !fs) return 0;
    try {
      const files = fs.readdirSync(CACHE_DIR);
      return files.filter(file => file.endsWith('.json')).length;
    } catch {
      return 0;
    }
  }
}

// Singleton instance
const cache = new CacheManager();

// Specific cache methods for different data types
export async function getUserCache(profileId) {
  return await cache.get('user', profileId);
}

export async function updateUserCache(profileId, data) {
  return await cache.set('user', profileId, data);
}

export async function getStatsCache(profileId) {
  return await cache.get('stats', profileId);
}

export async function updateStatsCache(profileId, data) {
  return await cache.set('stats', profileId, data);
}

export async function getActivitiesCache(profileId) {
  return await cache.get('activities', profileId);
}

export async function updateActivitiesCache(profileId, data) {
  return await cache.set('activities', profileId, data);
}

export async function getAnalysisCache(profileId) {
  return await cache.get('analysis', profileId);
}

export async function updateAnalysisCache(profileId, data) {
  return await cache.set('analysis', profileId, data);
}

export async function clearUserCache(profileId) {
  await Promise.all([
    cache.clear('user', profileId),
    cache.clear('stats', profileId),
    cache.clear('activities', profileId),
    cache.clear('analysis', profileId)
  ]);
}

export async function getCacheStats() {
  return cache.getStats();
}

export async function clearAllCache() {
  return await cache.clearAll();
}

export default cache;
