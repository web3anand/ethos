import { getUserStats, getComprehensiveUserData } from './ethosApiClient.js';
import { r4rDatabase } from './simpleR4RDatabase.js';
import ReviewCountEstimator from './reviewCountEstimator.js';

class DataCollector {
  constructor() {
    this.CACHE_DURATION = 5 * 60 * 60 * 1000; // 5 hours in milliseconds
    this.estimator = new ReviewCountEstimator(); // Mathematical estimator for missing data
  }

  // Collect and cache user data when they search
  async collectUserData(user) {
    try {
      console.log(`📊 Collecting data for user: ${user.username} (ID: ${user.profileId})`);
      
      // Check if we have recent cached data
      const cachedData = await this.getCachedUserData(user.profileId);
      if (cachedData && this.isCacheValid(cachedData.lastUpdated)) {
        console.log(`✅ Using cached data for ${user.username} (cached ${new Date(cachedData.lastUpdated).toLocaleString()})`);
        return cachedData;
      }

      // Fetch fresh data from Ethos API with comprehensive details
      console.log(`🔄 Fetching comprehensive data for ${user.username} from Ethos API`);
      const userKey = `profileId:${user.profileId}`;
      const comprehensiveData = await getComprehensiveUserData(userKey);
      
      if (!comprehensiveData || !comprehensiveData.basicStats) {
        throw new Error('Failed to fetch comprehensive user stats from Ethos API');
      }

      // Use enhanced data if available, fallback to basic stats
      const enhancedStats = comprehensiveData.enhanced || {};
      const basicStats = comprehensiveData.basicStats || {};
      
      // Get real review counts from comprehensive data, or estimate if not available
      let realReviewsGiven = enhancedStats.reviewsGiven || 0;
      let realReviewsReceived = enhancedStats.reviewsReceived || 0;
      let realVouchesGiven = enhancedStats.vouchesGiven || 0;
      let realVouchesReceived = enhancedStats.vouchesReceived || 0;
      let realReciprocityRatio = enhancedStats.reciprocityRatio || 0;

      // If we don't have real counts from API (common case), use mathematical estimation
      if (realReviewsGiven === 0 && (user.score > 50 || basicStats.reviews?.received > 0)) {
        console.log('📊 API provided zero review counts - using mathematical estimation...');
        
        const estimatedCounts = this.estimator.estimateReviewCounts({
          score: user.score || 0,
          reviews: basicStats.reviews,
          vouches: basicStats.vouches,
          xpTotal: user.xpTotal || 0
        });

        realReviewsGiven = estimatedCounts.totalGiven;
        
        // Calculate reciprocity ratio with estimated data
        if (basicStats.reviews?.received > 0) {
          realReciprocityRatio = realReviewsGiven / basicStats.reviews.received;
        }

        console.log('✅ Mathematical estimation results:');
        console.log('- Estimated Reviews Given:', realReviewsGiven);
        console.log('- Estimated Reciprocity Ratio:', realReciprocityRatio.toFixed(2));
        console.log('- Confidence Level:', estimatedCounts.confidence + '%');
      }

      // Prepare enhanced data for storage with real or estimated review counts
      const userData = {
        profileId: user.profileId,
        username: user.username,
        displayName: user.displayName,
        score: user.score || 0,
        xpTotal: user.xpTotal || 0,
        rawStats: basicStats,
        enhancedStats: enhancedStats,
        activitiesData: comprehensiveData.activities,
        realReviewsGiven: realReviewsGiven, // Real count from activities OR mathematical estimate
        realReviewsReceived: realReviewsReceived,
        realVouchesGiven: realVouchesGiven,
        realVouchesReceived: realVouchesReceived,
        realReciprocityRatio: realReciprocityRatio,
        dataSource: realReviewsGiven > 0 ? (enhancedStats.reviewsGiven > 0 ? 'api-activities' : 'mathematical-estimate') : 'api-basic',
        lastUpdated: Date.now(),
        nextRefresh: Date.now() + this.CACHE_DURATION
      };

      // Store in database
      await this.cacheUserData(userData);
      console.log(`💾 Cached data for ${user.username} - next refresh: ${new Date(userData.nextRefresh).toLocaleString()}`);

      return userData;

    } catch (error) {
      console.error(`❌ Failed to collect data for user ${user.username}:`, error);
      throw error;
    }
  }

  // Cache user data in database
  async cacheUserData(userData) {
    try {
      await r4rDatabase.initialize();
      
      // Store/update user profile
      await r4rDatabase.upsertProfile({
        profileId: userData.profileId,
        username: userData.username,
        displayName: userData.displayName,
        score: userData.score,
        xp_total: userData.xpTotal,
        last_updated: userData.lastUpdated,
        next_refresh: userData.nextRefresh
      });

      // Store detailed stats
      await r4rDatabase.upsertUserStats(userData.profileId, userData.rawStats);
      
      console.log(`✅ Successfully cached data for profile ${userData.profileId}`);
    } catch (error) {
      console.error('❌ Failed to cache user data:', error);
      throw error;
    }
  }

  // Get cached user data from database
  async getCachedUserData(profileId) {
    try {
      await r4rDatabase.initialize();
      
      const profile = await r4rDatabase.getProfile(profileId);
      const stats = await r4rDatabase.getProfileStats(profileId);
      
      if (!profile) {
        return null;
      }

      return {
        profileId: profile.profileId,
        username: profile.username,
        displayName: profile.displayName,
        score: profile.score,
        xpTotal: profile.xp_total,
        rawStats: stats,
        lastUpdated: profile.last_updated,
        nextRefresh: profile.next_refresh
      };
    } catch (error) {
      console.error('❌ Failed to get cached user data:', error);
      return null;
    }
  }

  // Check if cached data is still valid (within 5 hours)
  isCacheValid(lastUpdated) {
    if (!lastUpdated) return false;
    const now = Date.now();
    const age = now - lastUpdated;
    return age < this.CACHE_DURATION;
  }

  // Auto-refresh stale cached data
  async refreshStaleData() {
    try {
      console.log('🔄 Starting auto-refresh of stale cached data...');
      await r4rDatabase.initialize();
      
      const staleProfiles = await r4rDatabase.getStaleProfiles();
      console.log(`Found ${staleProfiles.length} profiles needing refresh`);
      
      for (const profile of staleProfiles) {
        try {
          console.log(`🔄 Refreshing data for ${profile.username} (ID: ${profile.profileId})`);
          
          // Fetch fresh data
          const userKey = `profileId:${profile.profileId}`;
          const freshUserStats = await getUserStats(userKey);
          
          if (freshUserStats) {
            const userData = {
              profileId: profile.profileId,
              username: profile.username,
              displayName: profile.displayName,
              score: profile.score,
              xpTotal: profile.xp_total,
              rawStats: freshUserStats,
              lastUpdated: Date.now(),
              nextRefresh: Date.now() + this.CACHE_DURATION
            };
            
            await this.cacheUserData(userData);
            console.log(`✅ Refreshed data for ${profile.username}`);
          }
        } catch (error) {
          console.error(`❌ Failed to refresh data for ${profile.username}:`, error);
        }
        
        // Add small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      console.log('✅ Auto-refresh completed');
    } catch (error) {
      console.error('❌ Auto-refresh failed:', error);
    }
  }

  // Get all users for R4R pattern analysis
  async getAllCachedUsers() {
    try {
      await r4rDatabase.initialize();
      return await r4rDatabase.getAllProfiles();
    } catch (error) {
      console.error('❌ Failed to get all cached users:', error);
      return [];
    }
  }

  // Analyze R4R patterns across all cached users
  async analyzeR4RPatterns() {
    try {
      console.log('🔍 Analyzing R4R patterns across all cached users...');
      const allUsers = await this.getAllCachedUsers();
      
      const patterns = {
        reciprocal_pairs: [],
        circular_groups: [],
        high_reciprocity_users: [],
        suspicious_patterns: []
      };

      // Find users with suspiciously high reciprocity
      for (const user of allUsers) {
        const stats = await r4rDatabase.getProfileStats(user.profileId);
        if (stats && stats.reviews) {
          const received = stats.reviews.received || 0;
          const given = stats.review?.given ? 
            (stats.review.given.positive || 0) + (stats.review.given.negative || 0) + (stats.review.given.neutral || 0) : 0;
          
          if (received > 10 && given > 10) {
            const reciprocityRatio = received / given;
            if (reciprocityRatio >= 0.8 && reciprocityRatio <= 1.2) {
              patterns.high_reciprocity_users.push({
                user: user,
                received: received,
                given: given,
                ratio: reciprocityRatio
              });
            }
          }
        }
      }

      console.log(`🔍 Found ${patterns.high_reciprocity_users.length} users with high reciprocity patterns`);
      return patterns;
    } catch (error) {
      console.error('❌ Failed to analyze R4R patterns:', error);
      return null;
    }
  }
}

// Create singleton instance
export const dataCollector = new DataCollector();
export default DataCollector;
