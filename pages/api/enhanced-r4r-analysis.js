import { r4rDatabase } from '../../utils/simpleR4RDatabase.js';
import EnhancedR4RAnalyzer from '../../utils/enhancedR4RAnalyzer.js';
import { dataCollector } from '../../utils/dataCollector.js';

export default async function handler(req, res) {
  console.log('🚀 ENHANCED R4R ANALYSIS ENDPOINT CALLED');
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { user, useCache = true } = req.body;
    
    if (!user || !user.profileId) {
      return res.status(400).json({ error: 'User data with profileId is required' });
    }

    console.log(`🔍 Starting enhanced R4R analysis for user: ${user.username} (ID: ${user.profileId}) - Cache: ${useCache}`);

    // Check cache first if enabled
    if (useCache) {
      const { getAnalysisCache } = await import('../../lib/cache.js');
      const cachedAnalysis = await getAnalysisCache(user.profileId);
      if (cachedAnalysis) {
        console.log(`📋 Using cached analysis for profile ${user.profileId}`);
        return res.status(200).json({ 
          analysis: cachedAnalysis,
          cached: true,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Initialize enhanced analyzer
    const enhancedAnalyzer = new EnhancedR4RAnalyzer();
    console.log('✅ Enhanced analyzer initialized');
    
    // Collect and cache user data (fetches comprehensive data including activities)
    console.log('📊 Collecting/caching comprehensive user data...');
    const userData = await dataCollector.collectUserData(user);
    
    if (!userData || !userData.rawStats) {
      console.log('⚠️ No user stats found, providing basic analysis');
      return res.status(200).json({
        analysis: {
          timestamp: Date.now(),
          user: {
            profileId: user.profileId,
            username: user.username,
            displayName: user.displayName,
            credibilityScore: user.score || 0
          },
          metrics: enhancedAnalyzer.generateFallbackMetrics(null),
          reviewerReputation: null,
          riskAssessment: {
            level: 'unknown',
            factors: ['Unable to fetch user statistics'],
            score: 50
          },
          recommendations: ['Try again later or verify user exists on Ethos Network'],
          dataSource: 'fallback'
        }
      });
    }

    console.log(`💾 Using ${userData.lastUpdated ? 'cached' : 'fresh'} comprehensive data for analysis`);
    console.log(`📅 Data age: ${userData.lastUpdated ? Math.round((Date.now() - userData.lastUpdated) / (1000 * 60)) + ' minutes' : 'fresh'}`);
    
    // Log comprehensive data details
    console.log('🔍 COMPREHENSIVE DATA SUMMARY:');
    console.log('- Real Reviews Given:', userData.realReviewsGiven || 'N/A');
    console.log('- Real Reviews Received:', userData.realReviewsReceived || 'N/A');
    console.log('- Real Vouches Given:', userData.realVouchesGiven || 'N/A');
    console.log('- Real Vouches Received:', userData.realVouchesReceived || 'N/A');
    console.log('- Real Reciprocity Ratio:', userData.realReciprocityRatio || 'N/A');

    // Prepare enhanced stats for analyzer
    const enhancedStatsForAnalysis = {
      ...userData.rawStats,
      realReviewsGiven: userData.realReviewsGiven,
      realReviewsReceived: userData.realReviewsReceived,
      realVouchesGiven: userData.realVouchesGiven,
      realVouchesReceived: userData.realVouchesReceived,
      realReciprocityRatio: userData.realReciprocityRatio,
      enhancedStats: userData.enhancedStats,
      activitiesData: userData.activitiesData
    };

    // Calculate enhanced metrics using comprehensive cached data
    console.log('📊 Calculating enhanced metrics from comprehensive cached data...');
    const enhancedMetrics = await enhancedAnalyzer.calculateAdvancedMetrics(user.profileId, enhancedStatsForAnalysis, userData);
    console.log('=== METRICS CALCULATED FROM COMPREHENSIVE DATA ===');
    
    // Get reviewer reputation analysis from database cache
    console.log('👥 Analyzing reviewer reputation...');
    await r4rDatabase.initialize();
    const reviewerReputation = await r4rDatabase.calculateReviewerReputation(user.profileId);
    
    // Enhanced risk assessment
    console.log('🔍 Performing enhanced risk assessment...');
    const riskAssessment = calculateEnhancedRiskAssessment(enhancedMetrics, reviewerReputation, user);
    
    // Generate comprehensive recommendations
    console.log('💡 Generating recommendations...');
    const recommendations = generateEnhancedRecommendations(enhancedMetrics, riskAssessment, reviewerReputation);
    
    // Compile comprehensive analysis
    const comprehensiveAnalysis = {
      timestamp: Date.now(),
      user: {
        profileId: user.profileId,
        username: user.username,
        displayName: user.displayName,
        credibilityScore: user.score || 0,
        xpTotal: user.xpTotal || 0
      },
      metrics: enhancedMetrics,
      reviewerReputation,
      riskAssessment,
      recommendations,
      analysisVersion: '2.0.0',
      dataSource: 'cached_database_analyzer',
      cacheInfo: {
        lastUpdated: userData.lastUpdated,
        nextRefresh: userData.nextRefresh,
        dataAge: userData.lastUpdated ? Date.now() - userData.lastUpdated : 0
      }
    };

    console.log(`✅ Enhanced R4R analysis completed for ${user.username}`);
    
    // Cache the analysis in both database and new cache system
    try {
      await r4rDatabase.upsertR4RAnalysis(user.profileId, comprehensiveAnalysis);
      console.log('💾 Analysis cached in database');
      
      // Also cache in new cache system if enabled
      if (useCache) {
        const { updateAnalysisCache } = await import('../../lib/cache.js');
        await updateAnalysisCache(user.profileId, comprehensiveAnalysis);
        console.log('💾 Analysis cached in file system');
      }
    } catch (cacheError) {
      console.error('Failed to cache analysis:', cacheError);
    }

    res.status(200).json({ 
      analysis: comprehensiveAnalysis,
      cached: useCache,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Enhanced R4R analysis failed:', error);
    res.status(500).json({ 
      error: 'Analysis failed',
      details: error.message 
    });
  }
}

// Enhanced risk assessment with mathematical scoring
function calculateEnhancedRiskAssessment(metrics, reviewerReputation, user) {
  const factors = [];
  let riskScore = 0;
  let level = 'low';

  if (!metrics || !metrics.basic) {
    return {
      level: 'unknown',
      factors: ['Insufficient data for analysis'],
      score: 50
    };
  }

  const { basic, ratios, quality, balance, advanced } = metrics;

  // 1. Advanced Reciprocity Analysis
  if (ratios.reciprocityRatio >= 0.95 && ratios.reciprocityRatio <= 1.05 && basic.reviewsReceived > 15) {
    factors.push(`🚨 CRITICAL: Near-perfect reciprocity ratio (${ratios.reciprocityRatio}) with high activity suggests coordinated farming`);
    riskScore += 45;
  } else if (ratios.reciprocityRatio >= 0.9 && ratios.reciprocityRatio <= 1.1 && basic.reviewsReceived > 10) {
    factors.push(`⚠️ HIGH: Very balanced reciprocity ratio (${ratios.reciprocityRatio}) may indicate systematic review exchange`);
    riskScore += 30;
  }

  // 2. Enhanced Vouch Analysis
  if (ratios.vouchReciprocityRatio >= 0.9 && ratios.vouchReciprocityRatio <= 1.1 && basic.vouchesReceived > 10) {
    factors.push(`🚨 CRITICAL: Perfect vouch reciprocity (${ratios.vouchReciprocityRatio}) indicates coordinated vouching`);
    riskScore += 40;
  }

  // 3. Advanced Quality Metrics Analysis
  if (quality.credibilityToXPRatio > 75 && basic.credibilityScore > 1000) {
    factors.push(`🚨 CRITICAL: Extremely high credibility-to-XP ratio (${quality.credibilityToXPRatio}) suggests reputation inflation`);
    riskScore += 35;
  } else if (quality.credibilityToXPRatio > 50 && basic.credibilityScore > 500) {
    factors.push(`⚠️ HIGH: High credibility-to-XP ratio (${quality.credibilityToXPRatio}) may indicate artificial growth`);
    riskScore += 25;
  }

  // 4. Review Efficiency Analysis
  if (quality.credibilityPerReview > 150 && basic.reviewsReceived > 10) {
    factors.push(`🚨 CRITICAL: Extremely high credibility per review (${quality.credibilityPerReview}) indicates inflated review values`);
    riskScore += 30;
  }

  // 5. Advanced Balance Analysis
  if (balance.symmetryIndex > 0.95 && balance.totalActivity > 40) {
    factors.push(`🚨 CRITICAL: Near-perfect activity symmetry (${balance.symmetryIndex}) across high volume suggests coordination`);
    riskScore += 50;
  }

  // 6. Network Centrality Risk
  if (advanced && advanced.centralityRisk > 70) {
    factors.push(`🚨 CRITICAL: Extremely high network centrality risk (${advanced.centralityRisk}) indicates hub manipulation`);
    riskScore += 35;
  }

  // 7. Artificiality Detection
  if (advanced && advanced.artificialityIndex > 80) {
    factors.push(`🚨 CRITICAL: High artificiality index (${advanced.artificialityIndex}) indicates systematic gaming`);
    riskScore += 40;
  }

  // 8. Coordination Patterns
  if (advanced && advanced.coordinationScore > 75) {
    factors.push(`🚨 CRITICAL: High coordination score (${advanced.coordinationScore}) suggests organized farming network`);
    riskScore += 45;
  }

  // 9. Inflation Detection
  if (advanced && advanced.inflationDetector > 60) {
    factors.push(`⚠️ HIGH: Reputation inflation detected (${advanced.inflationDetector}) - artificial score growth`);
    riskScore += 25;
  }

  // 10. R4R Risk Score
  if (advanced && advanced.r4rRiskScore > 70) {
    factors.push(`🚨 CRITICAL: High R4R risk score (${advanced.r4rRiskScore}) indicates systematic review farming`);
    riskScore += 30;
  }

  // 11. Reviewer Reputation Analysis
  if (reviewerReputation) {
    if (parseFloat(reviewerReputation.lowRepPercentage) > 60) {
      factors.push(`⚠️ HIGH: ${reviewerReputation.lowRepPercentage}% of reviewers have low reputation - questionable review sources`);
      riskScore += 25;
    }
    
    if (parseFloat(reviewerReputation.averageReviewerCredibility) < 30 && reviewerReputation.reviewerCount > 10) {
      factors.push(`⚠️ MEDIUM: Low average reviewer credibility (${reviewerReputation.averageReviewerCredibility}) suggests poor quality reviewers`);
      riskScore += 15;
    }
  }

  // 12. Zero Negative Review Red Flag
  if (basic.reviewsReceived > 25 && ratios.negativeRatio === 0) {
    factors.push(`⚠️ MEDIUM: Zero negative reviews despite high activity (${basic.reviewsReceived} reviews) is statistically unusual`);
    riskScore += 20;
  }

  // 13. Excessive Activity Patterns
  if (balance.totalActivity > 200) {
    factors.push(`🚨 CRITICAL: Industrial-scale activity (${balance.totalActivity} total actions) indicates professional farming operation`);
    riskScore += 60;
  } else if (balance.totalActivity > 100) {
    factors.push(`⚠️ HIGH: Very high activity volume (${balance.totalActivity} total actions) requires careful verification`);
    riskScore += 30;
  }

  // 14. Quality Dilution
  if (quality.credibilityPerReview < 15 && basic.reviewsReceived > 20) {
    factors.push(`⚠️ MEDIUM: Low quality per review (${quality.credibilityPerReview}) suggests mass low-quality farming`);
    riskScore += 20;
  }

  // 15. Organic Growth Analysis
  if (advanced && advanced.organicGrowthIndicator < 30) {
    factors.push(`⚠️ HIGH: Low organic growth indicator (${advanced.organicGrowthIndicator}) suggests artificial reputation building`);
    riskScore += 25;
  }

  // 16. Authenticity Score
  if (advanced && advanced.authenticityScore < 40) {
    factors.push(`⚠️ HIGH: Low authenticity score (${advanced.authenticityScore}) indicates manufactured reputation patterns`);
    riskScore += 25;
  }

  // 17. Sustainability Analysis
  if (advanced && advanced.sustainabilityIndex < 50) {
    factors.push(`⚠️ MEDIUM: Low sustainability index (${advanced.sustainabilityIndex}) suggests unsustainable growth patterns`);
    riskScore += 15;
  }

  // 18. Cross-Platform Gaming
  if (basic.reviewsGiven < 5 && basic.reviewsReceived > 30) {
    factors.push(`🚨 CRITICAL: Extreme receiving bias (${basic.reviewsReceived} received vs ${basic.reviewsGiven} given) indicates one-sided farming`);
    riskScore += 40;
  }

  // 19. Mathematical Anomalies
  if (ratios.mutualEngagementRatio > 0.95 && balance.totalActivity > 50) {
    factors.push(`🚨 CRITICAL: Near-perfect mutual engagement (${ratios.mutualEngagementRatio}) indicates systematic coordination`);
    riskScore += 45;
  }

  // 20. Network Value Exploitation
  if (quality.networkValueContribution < 10 && basic.credibilityScore > 1000) {
    factors.push(`⚠️ HIGH: Low network value contribution (${quality.networkValueContribution}) relative to high credibility suggests exploitation`);
    riskScore += 20;
  }

  // Determine risk level based on score
  if (riskScore >= 100) level = 'critical';
  else if (riskScore >= 70) level = 'high';
  else if (riskScore >= 40) level = 'medium';
  else level = 'low';

  // Positive indicators to reduce risk
  if (factors.length === 0) {
    if (basic.credibilityScore > 100 && basic.reviewsReceived > 5) {
      factors.push(`✅ No farming indicators detected with meaningful activity`);
      riskScore = Math.max(0, riskScore - 20);
    }
  }

  return {
    level,
    factors,
    score: Math.min(100, Math.max(0, riskScore)),
    enhancedMetrics: {
      reciprocityPattern: ratios.reciprocityRatio,
      vouchPattern: ratios.vouchReciprocityRatio,
      qualityEfficiency: quality.credibilityToXPRatio,
      activitySymmetry: balance.symmetryIndex,
      networkCentrality: advanced?.centralityRisk || 0,
      artificialityLevel: advanced?.artificialityIndex || 0,
      coordinationLevel: advanced?.coordinationScore || 0,
      organicGrowth: advanced?.organicGrowthIndicator || 100,
      authenticityLevel: advanced?.authenticityScore || 100
    }
  };
}

// Generate enhanced recommendations
function generateEnhancedRecommendations(metrics, riskAssessment, reviewerReputation) {
  const recommendations = [];
  
  if (!metrics || !metrics.basic) {
    return ['Unable to generate recommendations - insufficient data'];
  }

  const { basic, ratios, quality, balance, advanced } = metrics;
  const { level, score } = riskAssessment;

  // Risk-based recommendations
  if (level === 'critical') {
    recommendations.push('🚨 CRITICAL RISK: Avoid all review exchanges with this user');
    recommendations.push('🚨 Report suspected farming activity to Ethos Network moderators');
    recommendations.push('🚨 This user shows strong evidence of systematic reputation manipulation');
  } else if (level === 'high') {
    recommendations.push('⚠️ HIGH RISK: Exercise extreme caution before engaging');
    recommendations.push('⚠️ Request verified evidence of genuine work/contributions');
    recommendations.push('⚠️ Consider smaller test exchanges before major commitments');
  } else if (level === 'medium') {
    recommendations.push('⚠️ MEDIUM RISK: Verify authenticity through multiple channels');
    recommendations.push('⚠️ Look for genuine contributions beyond review metrics');
    recommendations.push('⚠️ Start with small, low-stakes interactions');
  } else {
    recommendations.push('✅ User appears suitable for legitimate review exchanges');
    recommendations.push('✅ Maintain balanced give-and-take in review activity');
  }

  // Specific metric-based recommendations
  if (ratios.reciprocityRatio > 2.0) {
    recommendations.push(`📊 User receives much more than they give (${ratios.reciprocityRatio}:1 ratio) - encourage more giving`);
  } else if (ratios.reciprocityRatio < 0.5) {
    recommendations.push(`📊 User gives much more than they receive (${ratios.reciprocityRatio}:1 ratio) - may be overgiving`);
  }

  if (basic.reviewsGiven === 0 && basic.reviewsReceived > 10) {
    recommendations.push('📈 User should start contributing reviews to build community trust');
  }

  if (quality.credibilityToXPRatio > 50) {
    recommendations.push(`⚡ Very high credibility-to-XP ratio (${quality.credibilityToXPRatio}) - verify through platform engagement`);
  }

  if (basic.xpTotal < 1000 && basic.credibilityScore > 500) {
    recommendations.push('🎮 Low platform XP relative to credibility - encourage more genuine platform activity');
  }

  // Reviewer reputation recommendations
  if (reviewerReputation) {
    if (parseFloat(reviewerReputation.averageReviewerCredibility) > 100) {
      recommendations.push(`👥 Reviews come from credible community members (avg: ${reviewerReputation.averageReviewerCredibility})`);
    } else if (parseFloat(reviewerReputation.averageReviewerCredibility) < 50) {
      recommendations.push(`👥 Reviews come from low-credibility reviewers (avg: ${reviewerReputation.averageReviewerCredibility}) - verify quality`);
    }
  }

  // Advanced metrics recommendations
  if (advanced) {
    if (advanced.organicGrowthIndicator > 80) {
      recommendations.push(`🌱 Strong organic growth pattern (${advanced.organicGrowthIndicator}) indicates natural development`);
    }
    
    if (advanced.authenticityScore > 80) {
      recommendations.push(`✨ High authenticity score (${advanced.authenticityScore}) suggests genuine reputation`);
    }
    
    if (advanced.sustainabilityIndex > 80) {
      recommendations.push(`♻️ Sustainable growth pattern (${advanced.sustainabilityIndex}) indicates healthy engagement`);
    }
  }

  // Activity level recommendations
  if (balance.totalActivity < 10) {
    recommendations.push('📊 Very low activity - consider users with more established track records');
  } else if (balance.totalActivity > 100) {
    recommendations.push('📊 Very high activity volume - extra verification recommended');
  }

  // Quality recommendations
  if (ratios.positiveRatio > 95 && basic.reviewsReceived > 20) {
    recommendations.push('⚠️ Unusually high positive ratio - verify review authenticity');
  }

  if (ratios.negativeRatio === 0 && basic.reviewsReceived > 30) {
    recommendations.push('⚠️ Zero negative reviews despite high activity - statistically unusual');
  }

  return recommendations;
}
