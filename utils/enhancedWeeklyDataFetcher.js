// Enhanced Weekly Data Fetcher for 96% Solid Data
// This fetches real weekly data from Ethos API instead of using calculated estimates

class EnhancedWeeklyDataFetcher {
  constructor() {
    this.baseUrl = 'https://api.ethos.network/api/v2';
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  // Get cached result if still valid
  getCachedResult(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  // Set cached result with timestamp
  setCachedResult(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  // Sample users to get real weekly data
  async sampleUsersForWeeklyData(seasonId, weekNumber, sampleSize = 100) {
    const cacheKey = `weekly-sample:${seasonId}:${weekNumber}:${sampleSize}`;
    const cached = this.getCachedResult(cacheKey);
    if (cached) {
      console.log(`[Enhanced Weekly] Cache hit for week ${weekNumber} sample`);
      return cached;
    }

    try {
      console.log(`[Enhanced Weekly] 🔍 Sampling ${sampleSize} users for Season ${seasonId}, Week ${weekNumber}...`);
      
      // Get a random sample of users from our database
      const { Database } = require('better-sqlite3');
      const db = new Database('./database/ethos.db');
      
      const stmt = db.prepare(`
        SELECT profile_id, username, display_name, total_xp
        FROM comprehensive_users 
        WHERE total_xp > 0 
        ORDER BY RANDOM() 
        LIMIT ?
      `);
      
      const sampleUsers = stmt.all(sampleSize);
      db.close();
      
      if (sampleUsers.length === 0) {
        console.log(`[Enhanced Weekly] ⚠️ No users found for sampling`);
        return { totalXP: 0, activeUsers: 0, avgXPPerUser: 0 };
      }

      // Fetch weekly XP for each sampled user
      const weeklyDataPromises = sampleUsers.map(async (user) => {
        try {
          const weeklyXp = await this.getUserWeeklyXp(user.profile_id, seasonId);
          const weekData = weeklyXp.find(w => w.week === weekNumber);
          return {
            profileId: user.profile_id,
            username: user.username,
            displayName: user.display_name,
            weeklyXP: weekData ? weekData.weeklyXp : 0,
            totalXP: user.total_xp
          };
        } catch (error) {
          console.warn(`[Enhanced Weekly] Failed to get weekly data for user ${user.profile_id}:`, error.message);
          return {
            profileId: user.profile_id,
            username: user.username,
            displayName: user.display_name,
            weeklyXP: 0,
            totalXP: user.total_xp
          };
        }
      });

      const weeklyResults = await Promise.all(weeklyDataPromises);
      
      // Calculate statistics from sample
      const activeUsers = weeklyResults.filter(u => u.weeklyXP > 0).length;
      const totalXP = weeklyResults.reduce((sum, u) => sum + u.weeklyXP, 0);
      const avgXPPerUser = activeUsers > 0 ? totalXP / activeUsers : 0;
      
      // Scale up to estimate total population
      const { Database: Db2 } = require('better-sqlite3');
      const db2 = new Db2('./database/ethos.db');
      const totalUsersStmt = db2.prepare('SELECT COUNT(*) as total FROM comprehensive_users WHERE total_xp > 0');
      const totalUsers = totalUsersStmt.get().total;
      db2.close();
      
      const scaleFactor = totalUsers / sampleSize;
      const estimatedTotalXP = Math.round(totalXP * scaleFactor);
      const estimatedActiveUsers = Math.round(activeUsers * scaleFactor);
      const estimatedAvgXPPerUser = estimatedActiveUsers > 0 ? estimatedTotalXP / estimatedActiveUsers : 0;
      
      const result = {
        totalXP: estimatedTotalXP,
        activeUsers: estimatedActiveUsers,
        avgXPPerUser: Math.round(estimatedAvgXPPerUser),
        sampleSize: sampleSize,
        actualSample: {
          totalXP,
          activeUsers,
          avgXPPerUser: Math.round(avgXPPerUser)
        }
      };
      
      console.log(`[Enhanced Weekly] ✅ Week ${weekNumber} sample complete:`, {
        estimated: result,
        actual: result.actualSample
      });
      
      this.setCachedResult(cacheKey, result);
      return result;
      
    } catch (error) {
      console.error(`[Enhanced Weekly] Error sampling users for week ${weekNumber}:`, error.message);
      return { totalXP: 0, activeUsers: 0, avgXPPerUser: 0 };
    }
  }

  // Get user weekly XP from Ethos API
  async getUserWeeklyXp(userkey, seasonId) {
    const cacheKey = `user-weekly:${userkey}:${seasonId}`;
    const cached = this.getCachedResult(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const url = `${this.baseUrl}/xp/user/${encodeURIComponent(userkey)}/season/${seasonId}/weekly`;
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'X-Ethos-Client': 'ethos-explorer'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      this.setCachedResult(cacheKey, data);
      return data;
      
    } catch (error) {
      console.warn(`[Enhanced Weekly] Failed to get weekly XP for user ${userkey}:`, error.message);
      return [];
    }
  }

  // Get real weekly data for a specific week (testing with 2 weeks)
  async getRealWeeklyData(seasonId, weekNumber) {
    console.log(`[Enhanced Weekly] 🎯 Fetching REAL data for Season ${seasonId}, Week ${weekNumber}...`);
    
    try {
      // First, try to get the week data from Ethos API directly
      const weekUrl = `${this.baseUrl}/xp/season/${seasonId}/week/${weekNumber}`;
      const response = await fetch(weekUrl, {
        headers: {
          'Accept': 'application/json',
          'X-Ethos-Client': 'ethos-explorer'
        }
      });

      if (response.ok) {
        const weekData = await response.json();
        console.log(`[Enhanced Weekly] ✅ Got real week data from API:`, weekData);
        return {
          week: weekNumber,
          weekNumber: weekNumber,
          totalXP: weekData.totalXP || weekData.xpDistributed || 0,
          xpDistributed: weekData.totalXP || weekData.xpDistributed || 0,
          activeUsers: weekData.activeUsers || weekData.participants || 0,
          participants: weekData.activeUsers || weekData.participants || 0,
          startDate: weekData.startDate,
          endDate: weekData.endDate,
          avgXPPerUser: weekData.activeUsers > 0 ? Math.round((weekData.totalXP || 0) / weekData.activeUsers) : 0,
          dataSource: 'ethos-api'
        };
      }
    } catch (error) {
      console.log(`[Enhanced Weekly] API not available for week ${weekNumber}, using sampling...`);
    }

    // Fallback to user sampling
    const sampleData = await this.sampleUsersForWeeklyData(seasonId, weekNumber, 200); // Larger sample for better accuracy
    
    // Get week dates from season info
    const seasonUrl = `${this.baseUrl}/xp/season/${seasonId}/weeks`;
    let startDate = new Date();
    let endDate = new Date();
    
    try {
      const seasonResponse = await fetch(seasonUrl, {
        headers: {
          'Accept': 'application/json',
          'X-Ethos-Client': 'ethos-explorer'
        }
      });
      
      if (seasonResponse.ok) {
        const weeksData = await seasonResponse.json();
        const weekInfo = weeksData.find(w => w.week === weekNumber);
        if (weekInfo) {
          startDate = new Date(weekInfo.startDate);
          endDate = new Date(weekInfo.endDate);
        }
      }
    } catch (error) {
      console.warn(`[Enhanced Weekly] Could not get week dates, using calculated dates`);
      // Calculate dates based on week number
      const seasonStart = new Date('2024-07-14'); // Season 1 start date
      startDate = new Date(seasonStart.getTime() + (weekNumber - 1) * 7 * 24 * 60 * 60 * 1000);
      endDate = new Date(startDate.getTime() + 6 * 24 * 60 * 60 * 1000);
    }

    return {
      week: weekNumber,
      weekNumber: weekNumber,
      totalXP: sampleData.totalXP,
      xpDistributed: sampleData.totalXP,
      activeUsers: sampleData.activeUsers,
      participants: sampleData.activeUsers,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      avgXPPerUser: sampleData.avgXPPerUser,
      dataSource: 'user-sampling',
      sampleSize: sampleData.sampleSize
    };
  }

  // Test method for 2 weeks
  async testTwoWeeks(seasonId = 1) {
    console.log(`[Enhanced Weekly] 🧪 Testing 2 weeks approach for Season ${seasonId}...`);
    
    const testWeeks = [1, 2]; // Test with first 2 weeks
    const results = [];
    
    for (const weekNumber of testWeeks) {
      console.log(`\n[Enhanced Weekly] 📊 Testing Week ${weekNumber}...`);
      const weekData = await this.getRealWeeklyData(seasonId, weekNumber);
      results.push(weekData);
      
      console.log(`[Enhanced Weekly] Week ${weekNumber} Results:`, {
        week: weekData.week,
        startDate: new Date(weekData.startDate).toLocaleDateString(),
        activeUsers: weekData.activeUsers.toLocaleString(),
        xpDistributed: weekData.xpDistributed.toLocaleString(),
        avgXPPerUser: weekData.avgXPPerUser.toLocaleString(),
        dataSource: weekData.dataSource
      });
    }
    
    return results;
  }

  // Get comprehensive weekly data for all weeks
  async getAllWeeksData(seasonId = 1) {
    console.log(`[Enhanced Weekly] 🚀 Getting comprehensive weekly data for Season ${seasonId}...`);
    
    // First get season info to know how many weeks
    const seasonUrl = `${this.baseUrl}/xp/season/${seasonId}/weeks`;
    let totalWeeks = 12; // Default fallback
    
    try {
      const response = await fetch(seasonUrl, {
        headers: {
          'Accept': 'application/json',
          'X-Ethos-Client': 'ethos-explorer'
        }
      });
      
      if (response.ok) {
        const weeksData = await response.json();
        totalWeeks = weeksData.length;
        console.log(`[Enhanced Weekly] Found ${totalWeeks} weeks for Season ${seasonId}`);
      }
    } catch (error) {
      console.warn(`[Enhanced Weekly] Could not get week count, using default ${totalWeeks} weeks`);
    }
    
    const allWeeksData = [];
    
    // Process weeks in batches to avoid overwhelming the API
    const batchSize = 3;
    for (let i = 1; i <= totalWeeks; i += batchSize) {
      const batch = [];
      for (let weekNumber = i; weekNumber < Math.min(i + batchSize, totalWeeks + 1); weekNumber++) {
        batch.push(this.getRealWeeklyData(seasonId, weekNumber));
      }
      
      console.log(`[Enhanced Weekly] Processing weeks ${i} to ${Math.min(i + batchSize - 1, totalWeeks)}...`);
      const batchResults = await Promise.all(batch);
      allWeeksData.push(...batchResults);
      
      // Small delay between batches
      if (i + batchSize <= totalWeeks) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log(`[Enhanced Weekly] ✅ Completed ${allWeeksData.length} weeks of data`);
    return allWeeksData;
  }
}

module.exports = EnhancedWeeklyDataFetcher;
