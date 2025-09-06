// R4R Enhanced Database Manager
import fs from 'fs/promises';
import path from 'path';
import { getUserStats, getDetailedProfile } from './ethosApiClient';

const DATA_DIR = path.join(process.cwd(), 'data');
const USER_PROFILES_FILE = path.join(DATA_DIR, 'user-profiles.json');
const USER_STATS_CACHE = path.join(DATA_DIR, 'user-stats-cache.json');
const R4R_ANALYSIS_CACHE = path.join(DATA_DIR, 'r4r-analysis-cache.json');
const REVIEWER_REPUTATION_CACHE = path.join(DATA_DIR, 'reviewer-reputation-cache.json');

class R4RDatabase {
  constructor() {
    this.userProfiles = null;
    this.userStatsCache = null;
    this.r4rAnalysisCache = null;
    this.reviewerReputationCache = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // Load user profiles
      const profilesData = await fs.readFile(USER_PROFILES_FILE, 'utf8');
      this.userProfiles = JSON.parse(profilesData);
      console.log(`Loaded ${this.userProfiles.length} user profiles`);

      // Load or create user stats cache
      try {
        const statsData = await fs.readFile(USER_STATS_CACHE, 'utf8');
        this.userStatsCache = JSON.parse(statsData);
      } catch (error) {
        this.userStatsCache = {};
        await this.saveUserStatsCache();
      }

      // Load or create R4R analysis cache
      try {
        const analysisData = await fs.readFile(R4R_ANALYSIS_CACHE, 'utf8');
        this.r4rAnalysisCache = JSON.parse(analysisData);
      } catch (error) {
        this.r4rAnalysisCache = {};
        await this.saveR4RAnalysisCache();
      }

      // Load or create reviewer reputation cache
      try {
        const reputationData = await fs.readFile(REVIEWER_REPUTATION_CACHE, 'utf8');
        this.reviewerReputationCache = JSON.parse(reputationData);
      } catch (error) {
        this.reviewerReputationCache = {};
        await this.saveReviewerReputationCache();
      }

      this.initialized = true;
      console.log('R4R Database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize R4R Database:', error);
      throw error;
    }
  }

  async saveUserStatsCache() {
    await fs.writeFile(USER_STATS_CACHE, JSON.stringify(this.userStatsCache, null, 2));
  }

  async saveR4RAnalysisCache() {
    await fs.writeFile(R4R_ANALYSIS_CACHE, JSON.stringify(this.r4rAnalysisCache, null, 2));
  }

  async saveReviewerReputationCache() {
    await fs.writeFile(REVIEWER_REPUTATION_CACHE, JSON.stringify(this.reviewerReputationCache, null, 2));
  }

  // Get user by various identifiers
  findUser(query) {
    if (!this.userProfiles) return null;

    const searchQuery = query.toLowerCase();
    return this.userProfiles.find(user => 
      user.username?.toLowerCase().includes(searchQuery) ||
      user.displayName?.toLowerCase().includes(searchQuery) ||
      user.profileId?.toString() === query ||
      user.twitterUsername?.toLowerCase().includes(searchQuery)
    );
  }

  // Get or fetch user stats with caching
  async getUserStatsWithCache(profileId) {
    await this.initialize();

    const cacheKey = `profile_${profileId}`;
    const now = Date.now();
    const cacheExpiryTime = 24 * 60 * 60 * 1000; // 24 hours

    // Check if we have cached data that's not expired
    if (this.userStatsCache[cacheKey] && 
        (now - this.userStatsCache[cacheKey].timestamp) < cacheExpiryTime) {
      return this.userStatsCache[cacheKey].data;
    }

    try {
      // Fetch fresh data from Ethos API
      const userKey = `profileId:${profileId}`;
      console.log(`=== FETCHING STATS for ${userKey} ===`);
      const stats = await getUserStats(userKey);
      console.log(`=== STATS RESULT ===`, JSON.stringify(stats, null, 2));
      
      // Cache the data
      this.userStatsCache[cacheKey] = {
        data: stats,
        timestamp: now
      };
      
      await this.saveUserStatsCache();
      return stats;
    } catch (error) {
      console.error(`Failed to fetch stats for profile ${profileId}:`, error);
      
      // Return cached data even if expired, if available
      if (this.userStatsCache[cacheKey]) {
        return this.userStatsCache[cacheKey].data;
      }
      
      throw error;
    }
  }

  // Enhanced R4R Analysis with detailed calculations
  async calculateEnhancedR4RMetrics(user, stats) {
    console.log('=== R4R DATABASE CALC DEBUG ===');
    console.log('User:', JSON.stringify(user, null, 2));
    console.log('Stats:', JSON.stringify(stats, null, 2));
    
    if (!stats) return null;

    // Handle both old and new API structures
    const reviewsReceived = stats.reviews || stats.review?.received || {};
    const reviewsGiven = stats.review?.given || {};
    const vouchesReceived = stats.vouches?.count?.received || stats.vouch?.received?.count || 0;
    const vouchesGiven = stats.vouches?.count?.deposited || stats.vouch?.given?.count || 0;

    // Basic counts - handle new API structure
    let totalReceived = 0;
    let positiveReceived = 0;
    let negativeReceived = 0;
    let neutralReceived = 0;

    if (stats.reviews) {
      // New API structure
      totalReceived = stats.reviews.received || 0;
      positiveReceived = stats.reviews.positiveReviewCount || 0;
      negativeReceived = stats.reviews.negativeReviewCount || 0;
      neutralReceived = stats.reviews.neutralReviewCount || 0;
    } else if (stats.review?.received) {
      // Old API structure
      positiveReceived = reviewsReceived.positive || 0;
      negativeReceived = reviewsReceived.negative || 0;
      neutralReceived = reviewsReceived.neutral || 0;
      totalReceived = positiveReceived + negativeReceived + neutralReceived;
    }

    const totalGiven = (reviewsGiven.positive || 0) + (reviewsGiven.neutral || 0) + (reviewsGiven.negative || 0);

    console.log('=== PARSED REVIEW DATA ===');
    console.log('totalReceived:', totalReceived);
    console.log('positiveReceived:', positiveReceived);
    console.log('negativeReceived:', negativeReceived);
    console.log('neutralReceived:', neutralReceived);
    console.log('totalGiven:', totalGiven);
    console.log('vouchesReceived:', vouchesReceived);
    console.log('vouchesGiven:', vouchesGiven);

    // Calculate ratios
    const reciprocityRatio = totalGiven > 0 ? totalReceived / totalGiven : 0;
    const mutualReviewCount = Math.min(totalGiven, totalReceived);
    const positiveRatio = totalReceived > 0 ? (positiveReceived / totalReceived) * 100 : 0;
    const negativeRatio = totalReceived > 0 ? (negativeReceived / totalReceived) * 100 : 0;
    const neutralRatio = totalReceived > 0 ? (neutralReceived / totalReceived) * 100 : 0;

    // Vouch analysis
    const vouchReciprocityRatio = vouchesGiven > 0 ? vouchesReceived / vouchesGiven : 0;
    const vouchToReviewRatio = totalReceived > 0 ? vouchesReceived / totalReceived : 0;

    // Quality metrics
    const credibilityScore = user.score || 0;
    const xpTotal = user.xpTotal || 0;
    const credibilityPerReview = totalReceived > 0 ? credibilityScore / totalReceived : 0;
    const xpPerReview = totalReceived > 0 ? xpTotal / totalReceived : 0;

    // Advanced metrics
    const totalActivity = totalGiven + totalReceived + vouchesGiven + vouchesReceived;
    const reviewBalance = Math.abs(totalGiven - totalReceived);
    const vouchBalance = Math.abs(vouchesGiven - vouchesReceived);
    
    // Efficiency ratios
    const credibilityToXPRatio = xpTotal > 0 ? credibilityScore / (xpTotal / 1000) : 0;
    const activityToCredibilityRatio = credibilityScore > 0 ? totalActivity / credibilityScore : 0;

    console.log('=== DEBUG: calculateEnhancedR4RMetrics ===');
    console.log('User:', JSON.stringify(user, null, 2));
    console.log('Stats:', JSON.stringify(stats, null, 2));
    console.log('Total Received:', totalReceived);
    console.log('Total Given:', totalGiven);
    console.log('Positive Received:', positiveReceived);
    console.log('Negative Received:', negativeReceived);
    console.log('Neutral Received:', neutralReceived);
    console.log('Reciprocity Ratio:', reciprocityRatio);
    console.log('Mutual Review Count:', mutualReviewCount);
    console.log('Credibility Per Review:', credibilityPerReview);
    console.log('XP Per Review:', xpPerReview);
    console.log('Credibility to XP Ratio:', credibilityToXPRatio);
    console.log('Activity to Credibility Ratio:', activityToCredibilityRatio);

    return {
      basic: {
        reviewsGiven: totalGiven,
        reviewsReceived: totalReceived,
        vouchesGiven,
        vouchesReceived,
        credibilityScore,
        xpTotal
      },
      ratios: {
        reciprocityRatio: reciprocityRatio.toFixed(3),
        vouchReciprocityRatio: vouchReciprocityRatio.toFixed(3),
        vouchToReviewRatio: vouchToReviewRatio.toFixed(3),
        positiveRatio: positiveRatio.toFixed(1),
        negativeRatio: negativeRatio.toFixed(1),
        neutralRatio: neutralRatio.toFixed(1)
      },
      quality: {
        credibilityPerReview: credibilityPerReview.toFixed(1),
        xpPerReview: xpPerReview.toFixed(0),
        credibilityToXPRatio: credibilityToXPRatio.toFixed(2),
        activityToCredibilityRatio: activityToCredibilityRatio.toFixed(3)
      },
      balance: {
        reviewBalance,
        vouchBalance,
        mutualReviewCount,
        totalActivity
      },
      breakdown: {
        positiveReceived,
        negativeReceived,
        neutralReceived,
        positiveGiven: reviewsGiven.positive || 0,
        negativeGiven: reviewsGiven.negative || 0,
        neutralGiven: reviewsGiven.neutral || 0
      }
    };
  }

  // Calculate reputation of reviewers (people who gave reviews to this user)
  async calculateReviewerReputation(profileId) {
    const cacheKey = `reviewer_rep_${profileId}`;
    const now = Date.now();
    const cacheExpiryTime = 6 * 60 * 60 * 1000; // 6 hours

    // Check cache first
    if (this.reviewerReputationCache[cacheKey] && 
        (now - this.reviewerReputationCache[cacheKey].timestamp) < cacheExpiryTime) {
      return this.reviewerReputationCache[cacheKey].data;
    }

    try {
      // Get detailed profile data to find reviewers
      const detailedProfile = await getDetailedProfile(profileId);
      const reviews = detailedProfile?.reviews || [];
      
      let totalReviewerCredibility = 0;
      let reviewerCount = 0;
      let highReputationReviewers = 0;
      let lowReputationReviewers = 0;
      const reviewerStats = [];

      for (const review of reviews) {
        if (review.author?.profileId) {
          const reviewerProfile = this.findUser(review.author.profileId.toString());
          if (reviewerProfile) {
            const reviewerCredibility = reviewerProfile.score || 0;
            totalReviewerCredibility += reviewerCredibility;
            reviewerCount++;

            if (reviewerCredibility > 100) highReputationReviewers++;
            if (reviewerCredibility < 20) lowReputationReviewers++;

            reviewerStats.push({
              profileId: review.author.profileId,
              username: reviewerProfile.username,
              credibility: reviewerCredibility,
              reviewType: review.rating || 'neutral'
            });
          }
        }
      }

      const averageReviewerCredibility = reviewerCount > 0 ? totalReviewerCredibility / reviewerCount : 0;
      const highRepPercentage = reviewerCount > 0 ? (highReputationReviewers / reviewerCount) * 100 : 0;
      const lowRepPercentage = reviewerCount > 0 ? (lowReputationReviewers / reviewerCount) * 100 : 0;

      const result = {
        totalReviewerCredibility,
        averageReviewerCredibility: averageReviewerCredibility.toFixed(1),
        reviewerCount,
        highReputationReviewers,
        lowReputationReviewers,
        highRepPercentage: highRepPercentage.toFixed(1),
        lowRepPercentage: lowRepPercentage.toFixed(1),
        reviewerStats
      };

      // Cache the result
      this.reviewerReputationCache[cacheKey] = {
        data: result,
        timestamp: now
      };
      await this.saveReviewerReputationCache();

      return result;
    } catch (error) {
      console.error(`Failed to calculate reviewer reputation for profile ${profileId}:`, error);
      return null;
    }
  }

  // Generate comprehensive R4R analysis
  async generateComprehensiveR4RAnalysis(user) {
    const profileId = user.profileId;
    const cacheKey = `comprehensive_${profileId}`;
    const now = Date.now();
    const cacheExpiryTime = 30 * 1000; // 30 seconds for debugging

    // TEMPORARILY DISABLE CACHE FOR DEBUGGING
    console.log('🆕 Generating fresh R4R analysis for', profileId, '(cache disabled)');

    try {
      // Get user stats
      const stats = await this.getUserStatsWithCache(profileId);
      if (!stats) return null;

      // Calculate enhanced metrics
      const enhancedMetrics = await this.calculateEnhancedR4RMetrics(user, stats);
      
      // Calculate reviewer reputation
      const reviewerReputation = await this.calculateReviewerReputation(profileId);

      // Comprehensive analysis
      const analysis = {
        timestamp: now,
        user: {
          profileId: user.profileId,
          username: user.username,
          displayName: user.displayName,
          credibilityScore: user.score || 0,
          xpTotal: user.xpTotal || 0
        },
        metrics: enhancedMetrics,
        reviewerReputation,
        riskAssessment: this.assessR4RRisk(enhancedMetrics, reviewerReputation),
        recommendations: this.generateRecommendations(enhancedMetrics, reviewerReputation)
      };

      // Cache the analysis
      this.r4rAnalysisCache[cacheKey] = {
        data: analysis,
        timestamp: now
      };
      await this.saveR4RAnalysisCache();

      return analysis;
    } catch (error) {
      console.error(`Failed to generate comprehensive R4R analysis for ${user.username}:`, error);
      return null;
    }
  }

  // Upsert R4R analysis data into the cache
  async upsertR4RAnalysis(profileId, analysisData) {
    const cacheKey = `r4r_analysis_${profileId}`;
    const now = Date.now();

    // Update or insert the analysis data in the cache
    this.r4rAnalysisCache[cacheKey] = {
      data: analysisData,
      timestamp: now
    };

    try {
      await this.saveR4RAnalysisCache();
      console.log(`Successfully cached R4R analysis for profile ${profileId}`);
    } catch (error) {
      console.error(`Failed to cache R4R analysis for profile ${profileId}:`, error);
      throw error;
    }
  }

  // Risk assessment based on enhanced metrics
  assessR4RRisk(metrics, reviewerReputation) {
    if (!metrics) return { level: 'unknown', factors: [] };

    const factors = [];
    let riskScore = 0;

    // Check reciprocity patterns
    if (metrics.ratios.reciprocityRatio > 0.9 && metrics.ratios.reciprocityRatio < 1.1) {
      factors.push('Perfect reciprocity pattern detected');
      riskScore += 30;
    }

    // Check mutual review count
    if (metrics.balance.mutualReviewCount > 15) {
      factors.push('High mutual review activity');
      riskScore += 25;
    }

    // Check reviewer reputation quality
    if (reviewerReputation && reviewerReputation.lowRepPercentage > 50) {
      factors.push('High percentage of low-reputation reviewers');
      riskScore += 20;
    }

    // Check activity balance
    if (metrics.balance.reviewBalance === 0 && metrics.basic.reviewsReceived > 20) {
      factors.push('Perfect review balance with high activity');
      riskScore += 35;
    }

    // Check credibility efficiency
    if (metrics.quality.credibilityToXPRatio > 50) {
      factors.push('Unusually high credibility-to-XP ratio');
      riskScore += 20;
    }

    // Determine risk level
    let level = 'low';
    if (riskScore > 60) level = 'critical';
    else if (riskScore > 40) level = 'high';
    else if (riskScore > 20) level = 'medium';

    return { level, factors, score: riskScore };
  }

  // Generate recommendations
  generateRecommendations(metrics, reviewerReputation) {
    const recommendations = [];

    if (!metrics) return ['Unable to analyze - insufficient data'];

    if (metrics.balance.mutualReviewCount <= 8) {
      recommendations.push('Mutual review activity within acceptable limits');
    }

    if (reviewerReputation && reviewerReputation.averageReviewerCredibility > 50) {
      recommendations.push('Reviews come from credible community members');
    }

    if (metrics.ratios.positiveRatio > 80 && metrics.basic.reviewsReceived > 10) {
      recommendations.push('Monitor for potential positive review coordination');
    }

    if (metrics.quality.credibilityPerReview > 50) {
      recommendations.push('High-quality reviews contributing to good reputation');
    }

    return recommendations;
  }

  // Get profiles that need refreshing (older than 5 hours)
  async getStaleProfiles() {
    await this.initialize();
    const fiveHoursAgo = Date.now() - (5 * 60 * 60 * 1000);
    
    return this.userProfiles.filter(profile => {
      const lastUpdated = profile.last_updated || 0;
      return lastUpdated < fiveHoursAgo;
    });
  }

  // Update profile with new timestamp
  async upsertProfile(profileData) {
    await this.initialize();
    
    const existingIndex = this.userProfiles.findIndex(p => p.profileId === profileData.profileId);
    
    if (existingIndex >= 0) {
      // Update existing profile
      this.userProfiles[existingIndex] = { ...this.userProfiles[existingIndex], ...profileData };
    } else {
      // Add new profile
      this.userProfiles.push(profileData);
    }
    
    await this.saveUserProfiles();
  }

  // Save user profiles to file
  async saveUserProfiles() {
    try {
      await fs.writeFile(USER_PROFILES_FILE, JSON.stringify(this.userProfiles, null, 2));
    } catch (error) {
      console.error('Failed to save user profiles:', error);
    }
  }

  // Update user stats in cache
  async upsertUserStats(profileId, stats) {
    await this.initialize();
    
    this.userStatsCache[profileId] = {
      ...stats,
      cached_at: Date.now()
    };
    
    await this.saveUserStatsCache();
  }

  // Get all profiles for pattern analysis
  async getAllProfiles() {
    await this.initialize();
    return this.userProfiles;
  }
}

// Export singleton instance
export const r4rDatabase = new R4RDatabase();
export default r4rDatabase;
