import EthosDatabase from '../database/index.js';
import { EthosDatabaseAPI } from '../utils/databaseApi.js';

class EnhancedR4RAnalyzer {
  constructor() {
    this.db = new EthosDatabaseAPI();
  }

  // Advanced mathematical analysis for R4R patterns
  async calculateAdvancedMetrics(profileId, userStats, user = null) {
    try {
      console.log('=== ANALYZER START ===');
      console.log('profileId:', profileId);
      console.log('userStats exists:', !!userStats);
      console.log('user exists:', !!user);
      
      // Get comprehensive data from database
      const profile = await this.db.getProfile(profileId);
      const stats = await this.db.getProfileStats(profileId);
      const r4rAnalysis = await this.db.getR4RAnalysis(profileId);

      console.log('=== DATABASE RESULTS ===');
      console.log('profile:', !!profile);
      console.log('stats:', !!stats);
      console.log('r4rAnalysis:', !!r4rAnalysis);

      if (!userStats) {
        console.log('⚠️ RETURNING FALLBACK - userStats missing');
        return this.generateFallbackMetrics(userStats);
      }

      // We have userStats, proceed with analysis even if database profile is missing
      console.log('✅ Proceeding with analysis using API data only');

      // Handle both old and new API structures with enhanced data
      console.log('=== ANALYZER DEBUG ===');
      console.log('userStats structure:', JSON.stringify(userStats, null, 2));
      
      // Check if we have enhanced stats with real review counts
      let totalGiven = 0;
      let positiveGiven = 0;
      let negativeGiven = 0;
      let neutralGiven = 0;
      
      if (userStats.realReviewsGiven !== undefined) {
        // Use real enhanced data
        totalGiven = userStats.realReviewsGiven;
        console.log('✅ Using enhanced real reviews given data:', totalGiven);
      } else if (userStats.review?.given) {
        // Old API structure
        positiveGiven = userStats.review.given.positive || 0;
        negativeGiven = userStats.review.given.negative || 0;
        neutralGiven = userStats.review.given.neutral || 0;
        totalGiven = positiveGiven + negativeGiven + neutralGiven;
      } else {
        // Fallback - estimate from activities if available
        if (userStats.activitiesData?.reviewsGiven) {
          totalGiven = userStats.activitiesData.reviewsGiven.length;
          console.log('📊 Estimated reviews given from activities:', totalGiven);
        }
      }
      
      const reviewsReceived = userStats.reviews || userStats.review?.received || {};
      const vouchesReceived = userStats.realVouchesReceived || userStats.vouches?.count?.received || userStats.vouch?.received?.count || 0;
      const vouchesGiven = userStats.realVouchesGiven || userStats.vouches?.count?.deposited || userStats.vouch?.given?.count || 0;

      // Basic counts with proper null handling - handle new API structure
      let totalReceived = 0;
      let positiveReceived = 0;
      let negativeReceived = 0;
      let neutralReceived = 0;

      if (userStats.reviews) {
        // New API structure
        totalReceived = userStats.reviews.received || 0;
        positiveReceived = userStats.reviews.positiveReviewCount || 0;
        negativeReceived = userStats.reviews.negativeReviewCount || 0;
        neutralReceived = userStats.reviews.neutralReviewCount || 0;
      } else if (userStats.review?.received) {
        // Old API structure
        positiveReceived = reviewsReceived.positive || 0;
        negativeReceived = reviewsReceived.negative || 0;
        neutralReceived = reviewsReceived.neutral || 0;
        totalReceived = positiveReceived + negativeReceived + neutralReceived;
      }

      // Remove duplicate const declarations - variables already declared above as let
      // totalGiven already calculated above using enhanced data
      // Calculate breakdown if not already set
      if (positiveGiven === 0 && negativeGiven === 0 && neutralGiven === 0 && totalGiven > 0) {
        positiveGiven = Math.round(totalGiven * 0.7); // Estimated distribution
        negativeGiven = Math.round(totalGiven * 0.2);
        neutralGiven = totalGiven - positiveGiven - negativeGiven;
      }

      console.log('=== PARSED REVIEW DATA ===');
      console.log('totalReceived:', totalReceived);
      console.log('positiveReceived:', positiveReceived);
      console.log('negativeReceived:', negativeReceived);
      console.log('neutralReceived:', neutralReceived);
      console.log('totalGiven:', totalGiven);
      console.log('vouchesReceived:', vouchesReceived);
      console.log('vouchesGiven:', vouchesGiven);

      // Use user data if profile is missing from database
      const credibilityScore = (user && user.score) || (profile && profile.score) || 0;
      const xpTotal = (user && user.xpTotal) || (profile && profile.xp_total) || 0;
      
      console.log('=== USER DATA ===');
      console.log('credibilityScore:', credibilityScore);
      console.log('xpTotal:', xpTotal);

      // Enhanced mathematical calculations
      const metrics = {
        basic: {
          reviewsGiven: totalGiven,
          reviewsReceived: totalReceived,
          vouchesGiven: Math.max(0, vouchesGiven),
          vouchesReceived: Math.max(0, vouchesReceived),
          credibilityScore: Math.max(0, credibilityScore),
          xpTotal: Math.max(0, xpTotal)
        },
        ratios: {
          // Reciprocity ratio with better handling
          reciprocityRatio: this.calculateReciprocityRatio(totalReceived, totalGiven),
          
          // Vouch reciprocity ratio
          vouchReciprocityRatio: this.calculateVouchReciprocityRatio(vouchesReceived, vouchesGiven),
          
          // Vouch to review ratio
          vouchToReviewRatio: this.calculateVouchToReviewRatio(vouchesReceived, totalReceived),
          
          // Percentage ratios
          positiveRatio: this.calculatePercentageRatio(positiveReceived, totalReceived),
          negativeRatio: this.calculatePercentageRatio(negativeReceived, totalReceived),
          neutralRatio: this.calculatePercentageRatio(neutralReceived, totalReceived),
          
          // Advanced ratios
          giveReceiveBalance: this.calculateGiveReceiveBalance(totalGiven, totalReceived),
          mutualEngagementRatio: this.calculateMutualEngagementRatio(totalGiven, totalReceived),
          activityConcentrationRatio: this.calculateActivityConcentration(totalGiven, totalReceived, vouchesGiven, vouchesReceived)
        },
        quality: {
          // Quality metrics with proper calculations
          credibilityPerReview: this.calculateCredibilityPerReview(credibilityScore, totalReceived),
          xpPerReview: this.calculateXpPerReview(xpTotal, totalReceived),
          credibilityToXPRatio: this.calculateCredibilityToXPRatio(credibilityScore, xpTotal),
          activityToCredibilityRatio: this.calculateActivityToCredibilityRatio(totalGiven + totalReceived + vouchesGiven + vouchesReceived, credibilityScore),
          
          // Advanced quality metrics
          reviewEfficiencyScore: this.calculateReviewEfficiency(credibilityScore, totalReceived, xpTotal),
          engagementQualityIndex: this.calculateEngagementQuality(positiveReceived, negativeReceived, neutralReceived, credibilityScore),
          reputationVelocity: this.calculateReputationVelocity(credibilityScore, totalReceived, xpTotal),
          networkValueContribution: this.calculateNetworkValue(totalGiven, vouchesGiven, credibilityScore)
        },
        balance: {
          reviewBalance: Math.abs(totalGiven - totalReceived),
          vouchBalance: Math.abs(vouchesGiven - vouchesReceived),
          mutualReviewCount: Math.min(totalGiven, totalReceived),
          totalActivity: totalGiven + totalReceived + vouchesGiven + vouchesReceived,
          
          // Advanced balance metrics
          symmetryIndex: this.calculateSymmetryIndex(totalGiven, totalReceived, vouchesGiven, vouchesReceived),
          diversityScore: this.calculateDiversityScore(positiveReceived, negativeReceived, neutralReceived, positiveGiven, negativeGiven, neutralGiven),
          engagementDepth: this.calculateEngagementDepth(totalGiven, totalReceived, vouchesGiven, vouchesReceived, credibilityScore)
        },
        breakdown: {
          positiveReceived,
          negativeReceived,
          neutralReceived,
          positiveGiven,
          negativeGiven,
          neutralGiven
        },
        advanced: {
          // R4R risk scoring
          r4rRiskScore: this.calculateR4RRiskScore(totalGiven, totalReceived, vouchesGiven, vouchesReceived, credibilityScore, xpTotal),
          
          // Gaming detection metrics
          artificialityIndex: this.calculateArtificialityIndex(totalGiven, totalReceived, credibilityScore, xpTotal),
          coordinationScore: this.calculateCoordinationScore(totalGiven, totalReceived, vouchesGiven, vouchesReceived),
          
          // Network analysis
          centralityRisk: this.calculateCentralityRisk(vouchesGiven, vouchesReceived, totalGiven),
          inflationDetector: this.calculateInflationDetector(credibilityScore, totalReceived, xpTotal),
          
          // Behavioral patterns
          consistencyScore: this.calculateConsistencyScore(totalGiven, totalReceived, vouchesGiven, vouchesReceived),
          organicGrowthIndicator: this.calculateOrganicGrowthIndicator(credibilityScore, xpTotal, totalReceived),
          
          // Quality assurance
          authenticityScore: this.calculateAuthenticityScore(positiveReceived, negativeReceived, neutralReceived, credibilityScore, totalReceived),
          sustainabilityIndex: this.calculateSustainabilityIndex(credibilityScore, totalReceived, xpTotal, totalGiven)
        }
      };

      return metrics;
    } catch (error) {
      console.error('Error in calculateAdvancedMetrics:', error);
      return this.generateFallbackMetrics(userStats);
    }
  }

  // Reciprocity ratio calculation
  calculateReciprocityRatio(received, given) {
    if (given === 0) return received > 0 ? 999.999 : 0.000;
    const ratio = received / given;
    return parseFloat(ratio.toFixed(3));
  }

  // Vouch reciprocity ratio
  calculateVouchReciprocityRatio(vouchesReceived, vouchesGiven) {
    if (vouchesGiven === 0) return vouchesReceived > 0 ? 999.999 : 0.000;
    const ratio = vouchesReceived / vouchesGiven;
    return parseFloat(ratio.toFixed(3));
  }

  // Vouch to review ratio
  calculateVouchToReviewRatio(vouchesReceived, totalReceived) {
    if (totalReceived === 0) return vouchesReceived > 0 ? 999.999 : 0.000;
    const ratio = vouchesReceived / totalReceived;
    return parseFloat(ratio.toFixed(3));
  }

  // Percentage ratio calculation
  calculatePercentageRatio(part, total) {
    if (total === 0) return 0.0;
    const percentage = (part / total) * 100;
    return parseFloat(percentage.toFixed(1));
  }

  // Give-receive balance (0 = perfect balance, higher = more imbalanced)
  calculateGiveReceiveBalance(given, received) {
    const total = given + received;
    if (total === 0) return 0.0;
    const balance = Math.abs(given - received) / total;
    return parseFloat(balance.toFixed(3));
  }

  // Mutual engagement ratio
  calculateMutualEngagementRatio(given, received) {
    const total = given + received;
    if (total === 0) return 0.0;
    const mutual = 2 * Math.min(given, received);
    const ratio = mutual / total;
    return parseFloat(ratio.toFixed(3));
  }

  // Activity concentration ratio
  calculateActivityConcentration(reviewsGiven, reviewsReceived, vouchesGiven, vouchesReceived) {
    const totalActivity = reviewsGiven + reviewsReceived + vouchesGiven + vouchesReceived;
    if (totalActivity === 0) return 0.0;
    
    const reviewActivity = reviewsGiven + reviewsReceived;
    const vouchActivity = vouchesGiven + vouchesReceived;
    
    const concentration = Math.max(reviewActivity, vouchActivity) / totalActivity;
    return parseFloat(concentration.toFixed(3));
  }

  // Credibility per review
  calculateCredibilityPerReview(credibility, reviews) {
    if (reviews === 0) return credibility > 0 ? 999.9 : 0.0;
    const ratio = credibility / reviews;
    return parseFloat(ratio.toFixed(1));
  }

  // XP per review
  calculateXpPerReview(xp, reviews) {
    if (reviews === 0) return xp > 0 ? 999999 : 0;
    const ratio = xp / reviews;
    return Math.round(ratio);
  }

  // Credibility to XP ratio
  calculateCredibilityToXPRatio(credibility, xp) {
    if (xp === 0) return credibility > 0 ? 999.99 : 0.00;
    const ratio = credibility / (xp / 1000); // Per 1000 XP
    return parseFloat(ratio.toFixed(2));
  }

  // Activity to credibility ratio
  calculateActivityToCredibilityRatio(totalActivity, credibility) {
    if (credibility === 0) return totalActivity > 0 ? 999.999 : 0.000;
    const ratio = totalActivity / credibility;
    return parseFloat(ratio.toFixed(3));
  }

  // Review efficiency score (composite metric)
  calculateReviewEfficiency(credibility, reviews, xp) {
    if (reviews === 0) return 0.0;
    
    const credibilityWeight = 0.4;
    const xpWeight = 0.6;
    
    const credibilityEfficiency = credibility / reviews;
    const xpEfficiency = (xp / 1000) / reviews;
    
    const efficiency = (credibilityEfficiency * credibilityWeight) + (xpEfficiency * xpWeight);
    return parseFloat(efficiency.toFixed(2));
  }

  // Engagement quality index
  calculateEngagementQuality(positive, negative, neutral, credibility) {
    const totalReviews = positive + negative + neutral;
    if (totalReviews === 0) return 0.0;
    
    const positiveWeight = 1.0;
    const neutralWeight = 0.5;
    const negativeWeight = -0.5;
    
    const weightedScore = (positive * positiveWeight) + (neutral * neutralWeight) + (negative * negativeWeight);
    const normalizedScore = weightedScore / totalReviews;
    const credibilityFactor = Math.min(credibility / 1000, 2); // Cap at 2x multiplier
    
    const qualityIndex = normalizedScore * credibilityFactor;
    return parseFloat(qualityIndex.toFixed(2));
  }

  // Reputation velocity (growth rate)
  calculateReputationVelocity(credibility, reviews, xp) {
    if (reviews === 0 || xp === 0) return 0.0;
    
    const timeProxy = Math.max(reviews, xp / 1000); // Use as time proxy
    const velocity = credibility / timeProxy;
    return parseFloat(velocity.toFixed(2));
  }

  // Network value contribution
  calculateNetworkValue(reviewsGiven, vouchesGiven, credibility) {
    const contributionWeight = reviewsGiven + (vouchesGiven * 1.5); // Vouches weighted higher
    const qualityMultiplier = Math.min(credibility / 500, 3); // Cap at 3x
    
    const networkValue = contributionWeight * qualityMultiplier;
    return parseFloat(networkValue.toFixed(1));
  }

  // Symmetry index (0 = perfect asymmetry, 1 = perfect symmetry)
  calculateSymmetryIndex(reviewsGiven, reviewsReceived, vouchesGiven, vouchesReceived) {
    const reviewSymmetry = this.calculatePairSymmetry(reviewsGiven, reviewsReceived);
    const vouchSymmetry = this.calculatePairSymmetry(vouchesGiven, vouchesReceived);
    
    const totalActivity = reviewsGiven + reviewsReceived + vouchesGiven + vouchesReceived;
    if (totalActivity === 0) return 0.0;
    
    const reviewWeight = (reviewsGiven + reviewsReceived) / totalActivity;
    const vouchWeight = (vouchesGiven + vouchesReceived) / totalActivity;
    
    const weightedSymmetry = (reviewSymmetry * reviewWeight) + (vouchSymmetry * vouchWeight);
    return parseFloat(weightedSymmetry.toFixed(3));
  }

  // Helper for pair symmetry calculation
  calculatePairSymmetry(a, b) {
    const total = a + b;
    if (total === 0) return 0.0;
    const difference = Math.abs(a - b);
    return 1 - (difference / total);
  }

  // Diversity score
  calculateDiversityScore(posRec, negRec, neuRec, posGiv, negGiv, neuGiv) {
    const receivedTypes = [posRec > 0 ? 1 : 0, negRec > 0 ? 1 : 0, neuRec > 0 ? 1 : 0].reduce((a, b) => a + b, 0);
    const givenTypes = [posGiv > 0 ? 1 : 0, negGiv > 0 ? 1 : 0, neuGiv > 0 ? 1 : 0].reduce((a, b) => a + b, 0);
    
    const maxDiversity = 6; // 3 types × 2 directions
    const actualDiversity = receivedTypes + givenTypes;
    
    const diversityScore = actualDiversity / maxDiversity;
    return parseFloat(diversityScore.toFixed(3));
  }

  // Engagement depth
  calculateEngagementDepth(reviewsGiven, reviewsReceived, vouchesGiven, vouchesReceived, credibility) {
    const totalEngagement = reviewsGiven + reviewsReceived + vouchesGiven + vouchesReceived;
    if (totalEngagement === 0) return 0.0;
    
    const qualityFactor = Math.min(credibility / 100, 10); // Cap at 10x
    const depth = (totalEngagement / 10) * Math.log(1 + qualityFactor);
    
    return parseFloat(depth.toFixed(2));
  }

  // R4R risk score (0-100, higher = more risky)
  calculateR4RRiskScore(given, received, vouchesGiven, vouchesReceived, credibility, xp) {
    let riskScore = 0;
    
    // Perfect reciprocity risk
    if (given > 0 && received > 0) {
      const reciprocity = Math.abs(1 - (received / given));
      if (reciprocity < 0.1 && given > 10) riskScore += 30;
      else if (reciprocity < 0.2 && given > 5) riskScore += 15;
    }
    
    // High volume risk
    const totalActivity = given + received + vouchesGiven + vouchesReceived;
    if (totalActivity > 100) riskScore += 25;
    else if (totalActivity > 50) riskScore += 15;
    else if (totalActivity > 25) riskScore += 8;
    
    // Low quality risk
    if (received > 0) {
      const qualityRatio = credibility / received;
      if (qualityRatio < 20) riskScore += 20;
      else if (qualityRatio < 40) riskScore += 10;
    }
    
    // XP mismatch risk
    if (xp > 0 && credibility > 0) {
      const xpCredibilityRatio = credibility / (xp / 1000);
      if (xpCredibilityRatio > 50) riskScore += 15;
      else if (xpCredibilityRatio > 25) riskScore += 8;
    }
    
    return Math.min(100, riskScore);
  }

  // Artificiality index
  calculateArtificialityIndex(given, received, credibility, xp) {
    let artificialityScore = 0;
    
    // Check for unnatural patterns
    if (given > 0 && received > 0) {
      const perfectBalance = Math.abs(given - received);
      if (perfectBalance === 0 && given > 15) artificialityScore += 40;
      else if (perfectBalance <= 2 && given > 10) artificialityScore += 25;
    }
    
    // Check credibility inflation
    if (received > 0) {
      const inflationRatio = credibility / (received * 30); // Expected ~30 points per review
      if (inflationRatio > 3) artificialityScore += 30;
      else if (inflationRatio > 2) artificialityScore += 15;
    }
    
    // Check XP-activity mismatch
    if (xp > 0) {
      const activityXpRatio = (given + received) / (xp / 1000);
      if (activityXpRatio > 10) artificialityScore += 20;
      else if (activityXpRatio > 5) artificialityScore += 10;
    }
    
    return Math.min(100, artificialityScore);
  }

  // Coordination score
  calculateCoordinationScore(given, received, vouchesGiven, vouchesReceived) {
    let coordinationScore = 0;
    
    // Review coordination
    if (given > 0 && received > 0) {
      const reviewRatio = Math.min(given, received) / Math.max(given, received);
      if (reviewRatio > 0.9 && given > 10) coordinationScore += 35;
      else if (reviewRatio > 0.8 && given > 5) coordinationScore += 20;
    }
    
    // Vouch coordination
    if (vouchesGiven > 0 && vouchesReceived > 0) {
      const vouchRatio = Math.min(vouchesGiven, vouchesReceived) / Math.max(vouchesGiven, vouchesReceived);
      if (vouchRatio > 0.9 && vouchesGiven > 5) coordinationScore += 25;
      else if (vouchRatio > 0.8 && vouchesGiven > 3) coordinationScore += 15;
    }
    
    // Cross-activity coordination
    if (given > 0 && vouchesGiven > 0) {
      const crossRatio = Math.abs(given - vouchesGiven) / Math.max(given, vouchesGiven);
      if (crossRatio < 0.2 && given > 10) coordinationScore += 20;
    }
    
    return Math.min(100, coordinationScore);
  }

  // Centrality risk
  calculateCentralityRisk(vouchesGiven, vouchesReceived, reviewsGiven) {
    const totalConnections = vouchesGiven + vouchesReceived + reviewsGiven;
    if (totalConnections === 0) return 0;
    
    // High centrality can indicate hub manipulation
    let centralityRisk = 0;
    if (totalConnections > 100) centralityRisk += 40;
    else if (totalConnections > 50) centralityRisk += 25;
    else if (totalConnections > 25) centralityRisk += 10;
    
    // Vouch centrality is particularly risky
    const vouchCentrality = vouchesGiven + vouchesReceived;
    if (vouchCentrality > 50) centralityRisk += 30;
    else if (vouchCentrality > 25) centralityRisk += 15;
    
    return Math.min(100, centralityRisk);
  }

  // Inflation detector
  calculateInflationDetector(credibility, reviews, xp) {
    if (reviews === 0) return 0;
    
    let inflationScore = 0;
    
    // Check credibility inflation
    const expectedCredibility = reviews * 25; // Conservative estimate
    if (credibility > expectedCredibility * 2) inflationScore += 40;
    else if (credibility > expectedCredibility * 1.5) inflationScore += 20;
    
    // Check XP mismatch
    if (xp > 0) {
      const xpCredibilityRatio = credibility / (xp / 1000);
      if (xpCredibilityRatio > 100) inflationScore += 35;
      else if (xpCredibilityRatio > 50) inflationScore += 20;
    }
    
    return Math.min(100, inflationScore);
  }

  // Consistency score
  calculateConsistencyScore(given, received, vouchesGiven, vouchesReceived) {
    const patterns = [
      Math.abs(given - received),
      Math.abs(vouchesGiven - vouchesReceived),
      Math.abs(given - vouchesGiven),
      Math.abs(received - vouchesReceived)
    ];
    
    const maxPattern = Math.max(...patterns);
    const totalActivity = given + received + vouchesGiven + vouchesReceived;
    
    if (totalActivity === 0) return 100; // Perfect consistency for no activity
    
    const inconsistency = (maxPattern / totalActivity) * 100;
    const consistencyScore = Math.max(0, 100 - inconsistency);
    
    return parseFloat(consistencyScore.toFixed(1));
  }

  // Organic growth indicator
  calculateOrganicGrowthIndicator(credibility, xp, reviews) {
    if (reviews === 0 || xp === 0) return 0;
    
    let organicScore = 100;
    
    // Check for natural progression
    const xpPerReview = xp / reviews;
    if (xpPerReview < 500) organicScore -= 30; // Too little platform engagement
    
    const credibilityPerXP = credibility / (xp / 1000);
    if (credibilityPerXP > 50) organicScore -= 25; // Too efficient
    
    // Gradual growth indicator
    if (reviews > 0) {
      const growthRate = credibility / reviews;
      if (growthRate > 100) organicScore -= 20; // Too rapid growth
    }
    
    return Math.max(0, organicScore);
  }

  // Authenticity score
  calculateAuthenticityScore(positive, negative, neutral, credibility, reviews) {
    if (reviews === 0) return 50; // Neutral for no activity
    
    let authenticityScore = 100;
    
    // Check review distribution
    const positiveRatio = positive / reviews;
    const negativeRatio = negative / reviews;
    
    // Too many positives is suspicious
    if (positiveRatio > 0.95 && reviews > 20) authenticityScore -= 30;
    else if (positiveRatio > 0.9 && reviews > 10) authenticityScore -= 15;
    
    // No negatives is suspicious for high activity
    if (negativeRatio === 0 && reviews > 30) authenticityScore -= 20;
    else if (negativeRatio === 0 && reviews > 15) authenticityScore -= 10;
    
    // Check credibility alignment
    const expectedCredibility = (positive * 40) + (neutral * 20) - (negative * 10);
    const credibilityRatio = credibility / Math.max(expectedCredibility, 1);
    
    if (credibilityRatio > 3) authenticityScore -= 25;
    else if (credibilityRatio > 2) authenticityScore -= 15;
    
    return Math.max(0, authenticityScore);
  }

  // Sustainability index
  calculateSustainabilityIndex(credibility, reviews, xp, given) {
    if (reviews === 0) return 50;
    
    let sustainabilityScore = 100;
    
    // Check for sustainable growth patterns
    const giveReceiveRatio = given / Math.max(reviews, 1);
    if (giveReceiveRatio < 0.2) sustainabilityScore -= 20; // Not giving enough back
    
    // Check XP sustainability
    if (xp > 0) {
      const xpSustainability = credibility / (xp / 1000);
      if (xpSustainability > 75) sustainabilityScore -= 25; // Unsustainable credibility growth
    }
    
    // Check review sustainability
    const credibilityPerReview = credibility / reviews;
    if (credibilityPerReview > 150) sustainabilityScore -= 20; // Unsustainable per-review gains
    
    return Math.max(0, sustainabilityScore);
  }

  // Generate fallback metrics when database data is unavailable
  generateFallbackMetrics(userStats) {
    const reviewsReceived = userStats?.review?.received || {};
    const reviewsGiven = userStats?.review?.given || {};
    const vouchesReceived = userStats?.vouch?.received?.count || 0;
    const vouchesGiven = userStats?.vouch?.given?.count || 0;

    const totalReceived = (reviewsReceived.positive || 0) + (reviewsReceived.neutral || 0) + (reviewsReceived.negative || 0);
    const totalGiven = (reviewsGiven.positive || 0) + (reviewsGiven.neutral || 0) + (reviewsGiven.negative || 0);

    return {
      basic: {
        reviewsGiven: totalGiven,
        reviewsReceived: totalReceived,
        vouchesGiven: vouchesGiven,
        vouchesReceived: vouchesReceived,
        credibilityScore: 0,
        xpTotal: 0
      },
      ratios: {
        reciprocityRatio: this.calculateReciprocityRatio(totalReceived, totalGiven),
        vouchReciprocityRatio: this.calculateVouchReciprocityRatio(vouchesReceived, vouchesGiven),
        vouchToReviewRatio: this.calculateVouchToReviewRatio(vouchesReceived, totalReceived),
        positiveRatio: this.calculatePercentageRatio(reviewsReceived.positive || 0, totalReceived),
        negativeRatio: this.calculatePercentageRatio(reviewsReceived.negative || 0, totalReceived),
        neutralRatio: this.calculatePercentageRatio(reviewsReceived.neutral || 0, totalReceived)
      },
      quality: {
        credibilityPerReview: 0.0,
        xpPerReview: 0,
        credibilityToXPRatio: 0.00,
        activityToCredibilityRatio: 0.000
      },
      balance: {
        reviewBalance: Math.abs(totalGiven - totalReceived),
        vouchBalance: Math.abs(vouchesGiven - vouchesReceived),
        mutualReviewCount: Math.min(totalGiven, totalReceived),
        totalActivity: totalGiven + totalReceived + vouchesGiven + vouchesReceived
      },
      breakdown: {
        positiveReceived: reviewsReceived.positive || 0,
        negativeReceived: reviewsReceived.negative || 0,
        neutralReceived: reviewsReceived.neutral || 0,
        positiveGiven: reviewsGiven.positive || 0,
        negativeGiven: reviewsGiven.negative || 0,
        neutralGiven: reviewsGiven.neutral || 0
      }
    };
  }
}

export default EnhancedR4RAnalyzer;
