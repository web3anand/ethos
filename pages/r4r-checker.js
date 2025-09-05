import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Navbar from '../components/Navbar';
import { searchUsers, getUserStats } from '../utils/ethosApiClient';
import styles from '../styles/R4RChecker.module.css';

export default function R4RChecker() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userStats, setUserStats] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);

  // Search for users
  const handleSearch = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const results = await searchUsers(query, 8);
      setSearchResults(results || []);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Select user for enhanced analysis via API
  const selectUser = async (user) => {
    setSelectedUser(user);
    setIsLoading(true);
    
    try {
      // Call the R4R analysis API
      const response = await fetch('/api/r4r-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user }),
      });

      if (response.ok) {
        const { analysis: comprehensiveAnalysis } = await response.json();
        
        if (comprehensiveAnalysis) {
          // Transform comprehensive analysis to match existing UI structure
          const transformedAnalysis = transformAnalysisForUI(comprehensiveAnalysis);
          setAnalysis(transformedAnalysis);
          setUserStats(comprehensiveAnalysis.metrics);
        } else {
          throw new Error('No analysis data received');
        }
      } else {
        throw new Error(`API call failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Enhanced analysis failed, falling back to basic analysis:', error);
      try {
        // Fallback to original method
        const userKey = `profileId:${user.profileId}`;
        const stats = await getUserStats(userKey);
        setUserStats(stats);
        const analysisResult = analyzeR4REligibility(user, stats);
        setAnalysis(analysisResult);
      } catch (fallbackError) {
        console.error('Basic analysis also failed:', fallbackError);
        setUserStats(null);
        setAnalysis(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Transform comprehensive analysis to match existing UI
  const transformAnalysisForUI = (comprehensiveAnalysis) => {
    console.log('=== TRANSFORM DEBUG ===');
    console.log('Input Analysis:', JSON.stringify(comprehensiveAnalysis, null, 2));
    
    const { metrics, reviewerReputation, riskAssessment, recommendations } = comprehensiveAnalysis;
    
    const transformed = {
      eligible: riskAssessment.level === 'low' || riskAssessment.level === 'medium',
      score: Math.max(0, 100 - riskAssessment.score),
      farmingRisk: riskAssessment.level,
      credibilityScore: metrics.basic.credibilityScore,
      reasons: recommendations,
      recommendations: recommendations,
      warnings: riskAssessment.factors,
      farmingIndicators: riskAssessment.factors,
      stats: {
        reviewsGiven: metrics.basic.reviewsGiven,
        reviewsReceived: metrics.basic.reviewsReceived,
        vouchesReceived: metrics.basic.vouchesReceived,
        vouchesGiven: metrics.basic.vouchesGiven,
        reciprocityRatio: metrics.ratios.reciprocityRatio,
        positiveReviews: metrics.breakdown.positiveReceived,
        negativeReviews: metrics.breakdown.negativeReceived,
        neutralReviews: metrics.breakdown.neutralReceived,
        positiveRatio: metrics.ratios.positiveRatio,
        negativeRatio: metrics.ratios.negativeRatio,
        credibilityPerXP: metrics.quality.credibilityToXPRatio,
        totalActivity: metrics.balance.totalActivity,
        // Enhanced metrics
        vouchReciprocityRatio: metrics.ratios.vouchReciprocityRatio,
        credibilityPerReview: metrics.quality.credibilityPerReview,
        reviewerReputation: reviewerReputation ? {
          averageCredibility: reviewerReputation.averageReviewerCredibility,
          totalCredibility: reviewerReputation.totalReviewerCredibility,
          reviewerCount: reviewerReputation.reviewerCount,
          highRepPercentage: reviewerReputation.highRepPercentage,
          lowRepPercentage: reviewerReputation.lowRepPercentage
        } : null
      }
    };
    
    console.log('Transformed Analysis:', JSON.stringify(transformed, null, 2));
    return transformed;
  };

  // Advanced R4R Farming Detection Algorithm
  const analyzeR4REligibility = (user, stats) => {
    if (!stats) {
      return {
        eligible: false,
        score: 0,
        farmingRisk: 'high',
        reasons: ['Unable to fetch user statistics'],
        recommendations: ['Try again later or check if user exists on Ethos'],
        warnings: [],
        farmingIndicators: []
      };
    }

    let score = 0;
    const reasons = [];
    const recommendations = [];
    const warnings = [];
    const farmingIndicators = [];
    let farmingRisk = 'low';

    // Basic stats
    const credibilityScore = user.score || 0;
    const reviewsReceived = stats.review?.received || {};
    const reviewsGiven = stats.review?.given || {};
    const totalReceived = (reviewsReceived.positive || 0) + (reviewsReceived.neutral || 0) + (reviewsReceived.negative || 0);
    const totalGiven = (reviewsGiven.positive || 0) + (reviewsGiven.neutral || 0) + (reviewsGiven.negative || 0);
    const vouchesReceived = stats.vouch?.received?.count || 0;
    const vouchesGiven = stats.vouch?.given?.count || 0;
    const xpTotal = user.xpTotal || 0;

    // 🚨 R4R FARMING DETECTION LOGIC 🚨

    // 1. Perfect Reciprocity Red Flag (Most suspicious)
    const reciprocityRatio = totalGiven > 0 ? totalReceived / totalGiven : 0;
    if (totalGiven > 5 && Math.abs(reciprocityRatio - 1) < 0.1) {
      farmingIndicators.push('Perfect 1:1 review reciprocity suggests coordinated farming');
      farmingRisk = 'high';
      score -= 30;
    }

    // 2. High Volume, Low Quality Pattern
    if (totalGiven > 20 && totalReceived > 20) {
      const averageQualityScore = credibilityScore / Math.max(totalReceived, 1);
      if (averageQualityScore < 20) {
        farmingIndicators.push('High review volume with low credibility suggests bulk farming');
        farmingRisk = 'high';
        score -= 25;
      }
    }

    // 3. Excessive R4R Activity Detection
    if (totalGiven > 15 && totalReceived > 15) {
      const r4rSuspicionLevel = Math.min(totalGiven, totalReceived);
      if (r4rSuspicionLevel > 30) {
        farmingIndicators.push(`Extremely high mutual review activity (${r4rSuspicionLevel} pairs)`);
        farmingRisk = 'critical';
        score -= 40;
      } else if (r4rSuspicionLevel > 20) {
        farmingIndicators.push(`High mutual review activity (${r4rSuspicionLevel} pairs)`);
        farmingRisk = 'high';
        score -= 25;
      } else if (r4rSuspicionLevel > 10) {
        farmingIndicators.push(`Moderate mutual review activity (${r4rSuspicionLevel} pairs)`);
        farmingRisk = 'medium';
        score -= 15;
      }
    }

    // 4. Artificial Vouching Pattern
    if (vouchesGiven > 10 && vouchesReceived > 10 && Math.abs(vouchesGiven - vouchesReceived) < 3) {
      farmingIndicators.push('Symmetric vouching pattern indicates possible vouch farming');
      farmingRisk = Math.max(farmingRisk, 'high');
      score -= 20;
    }

    // 5. Low XP to Review Ratio (Gaming without genuine activity)
    if (totalReceived > 10) {
      const xpPerReview = xpTotal / totalReceived;
      if (xpPerReview < 1000) {
        farmingIndicators.push('Low XP relative to reviews suggests artificial inflation');
        farmingRisk = Math.max(farmingRisk, 'medium');
        score -= 15;
      }
    }

    // 6. Negative Review Immunity (Suspicious for heavy R4R users)
    const negativeRatio = totalReceived > 0 ? (reviewsReceived.negative || 0) / totalReceived : 0;
    if (totalReceived > 20 && negativeRatio === 0) {
      farmingIndicators.push('Zero negative reviews despite high activity suggests coordinated positive farming');
      farmingRisk = Math.max(farmingRisk, 'medium');
      score -= 10;
    }

    // 7. Rapid Accumulation Pattern
    if (credibilityScore > 1000 && totalReceived > 50 && xpTotal < 10000) {
      farmingIndicators.push('High score with low platform engagement suggests rapid artificial accumulation');
      farmingRisk = Math.max(farmingRisk, 'high');
      score -= 20;
    }

    // 8. Review Burst Pattern (Suspicious timing)
    if (totalGiven > 20 && totalReceived > 20) {
      const reviewRatio = Math.max(totalGiven, totalReceived) / Math.min(totalGiven, totalReceived);
      if (reviewRatio > 5) {
        farmingIndicators.push('Extreme imbalance in review activity suggests coordinated farming');
        farmingRisk = 'critical';
        score -= 35;
      }
    }

    // 9. Score Inflation Detection
    const expectedScore = Math.min(totalReceived * 30, 3000); // Conservative estimate
    if (credibilityScore > expectedScore * 1.5 && totalReceived > 10) {
      farmingIndicators.push(`Score (${credibilityScore}) significantly higher than expected for review count`);
      farmingRisk = Math.max(farmingRisk, 'high');
      score -= 25;
    }

    // 10. Artificial Engagement Pattern
    if (totalGiven > 0 && totalReceived > 0) {
      const engagementRatio = (totalGiven + totalReceived) / Math.max(xpTotal / 1000, 1);
      if (engagementRatio > 3 && xpTotal < 50000) {
        farmingIndicators.push('High review activity relative to platform engagement suggests artificial behavior');
        farmingRisk = Math.max(farmingRisk, 'medium');
        score -= 15;
      }
    }

    // 11. Network Centrality Abuse (High connectivity with low diversity)
    if (vouchesGiven > 20 && vouchesReceived > 20 && totalGiven > 30) {
      farmingIndicators.push('Excessive vouching combined with high review activity suggests network manipulation');
      farmingRisk = 'critical';
      score -= 40;
    }

    // 12. Quality Dilution Pattern
    if (totalReceived > 15) {
      const qualityPerReview = credibilityScore / totalReceived;
      if (qualityPerReview < 15) {
        farmingIndicators.push(`Low quality per review (${qualityPerReview.toFixed(1)}) suggests mass farming`);
        farmingRisk = Math.max(farmingRisk, 'high');
        score -= 20;
      }
    }

    // 13. Sockpuppet Network Indicators
    if (totalGiven > 25 && vouchesGiven > totalGiven * 0.8) {
      farmingIndicators.push('Vouch-to-review ratio suggests possible sockpuppet network coordination');
      farmingRisk = 'critical';
      score -= 45;
    }

    // 14. Gaming Platform Mechanics
    if (reviewsReceived.positive && reviewsReceived.positive > (totalReceived * 0.95) && totalReceived > 20) {
      farmingIndicators.push('Extremely high positive review ratio indicates coordinated positive farming');
      farmingRisk = Math.max(farmingRisk, 'high');
      score -= 25;
    }

    // 15. Reputation Washing Detection
    if (credibilityScore > 500 && reviewsReceived.negative === 0 && totalReceived > 30) {
      farmingIndicators.push('Zero negative reviews with high activity suggests reputation washing');
      farmingRisk = Math.max(farmingRisk, 'medium');
      score -= 15;
    }

    // 16. Behavioral Consistency Analysis
    if (totalGiven > 0 && totalReceived > 0) {
      const activityVariance = Math.abs(totalGiven - totalReceived);
      const activityTotal = totalGiven + totalReceived;
      if (activityVariance < 2 && activityTotal > 40) {
        farmingIndicators.push('Perfect activity symmetry across multiple interactions suggests coordination');
        farmingRisk = 'critical';
        score -= 50;
      }
    }

    // 17. Platform Exploitation Indicators
    if (xpTotal > 0 && credibilityScore > 0) {
      const efficiencyRatio = credibilityScore / Math.max(xpTotal / 1000, 1);
      if (efficiencyRatio > 100 && credibilityScore > 500) {
        farmingIndicators.push('Extremely high credibility-to-XP ratio suggests systematic exploitation');
        farmingRisk = 'critical';
        score -= 35;
      }
    }

    // 18. Review Farm Network Detection
    if (totalGiven > 40 && totalReceived > 40 && vouchesGiven > 15) {
      const networkIntensity = (totalGiven + totalReceived + vouchesGiven) / Math.max(credibilityScore / 100, 1);
      if (networkIntensity > 10) {
        farmingIndicators.push('High network activity relative to credibility suggests farm participation');
        farmingRisk = 'critical';
        score -= 40;
      }
    }

    // 19. Artificial Growth Trajectory
    if (credibilityScore > 2000 && totalReceived > 0) {
      const growthRate = credibilityScore / totalReceived;
      if (growthRate > 150 && totalReceived > 10) {
        farmingIndicators.push(`Unnaturally high growth rate (${growthRate.toFixed(1)} points per review)`);
        farmingRisk = 'critical';
        score -= 30;
      }
    }

    // 20. Multi-Account Coordination Signals
    if (vouchesGiven > 30 && totalGiven > 30 && Math.abs(vouchesGiven - totalGiven) < 5) {
      farmingIndicators.push('Synchronized vouching and reviewing suggests multi-account coordination');
      farmingRisk = 'critical';
      score -= 50;
    }

    // 21. Review Mill Pattern
    if (totalGiven > 100 || totalReceived > 100) {
      farmingIndicators.push(`Industrial-scale review activity (${Math.max(totalGiven, totalReceived)} reviews) indicates mill operation`);
      farmingRisk = 'critical';
      score -= 60;
    }

    // 22. Quality Suppression Detection
    if (totalReceived > 20 && reviewsReceived.neutral && reviewsReceived.neutral > totalReceived * 0.6) {
      farmingIndicators.push('Excessive neutral reviews suggests quality suppression tactics');
      farmingRisk = Math.max(farmingRisk, 'medium');
      score -= 20;
    }

    // 23. Gaming Algorithm Exploitation
    if (credibilityScore > 1500 && xpTotal < credibilityScore * 5) {
      farmingIndicators.push('Score-to-XP ratio suggests algorithm gaming rather than organic growth');
      farmingRisk = Math.max(farmingRisk, 'high');
      score -= 25;
    }

    // 24. Manufactured Consensus Pattern
    if (reviewsReceived.positive && reviewsReceived.negative && totalReceived > 25) {
      const positiveRatio = reviewsReceived.positive / totalReceived;
      const negativeRatio = reviewsReceived.negative / totalReceived;
      if (positiveRatio > 0.9 && negativeRatio < 0.05) {
        farmingIndicators.push('Artificially high positive consensus suggests manufactured reputation');
        farmingRisk = Math.max(farmingRisk, 'high');
        score -= 30;
      }
    }

    // 25. Velocity Anomaly Detection
    if (totalReceived > 50 && xpTotal > 0) {
      const reviewVelocity = totalReceived / Math.max(xpTotal / 10000, 1);
      if (reviewVelocity > 20) {
        farmingIndicators.push('Abnormally high review acquisition rate suggests coordinated farming');
        farmingRisk = 'critical';
        score -= 35;
      }
    }

    // 26. Cross-Platform Gaming Indicators
    if (credibilityScore > 1000 && totalGiven < 5 && totalReceived > 20) {
      farmingIndicators.push('High score with minimal giving suggests one-sided farming arrangement');
      farmingRisk = Math.max(farmingRisk, 'high');
      score -= 30;
    }

    // 27. Reputation Inflation Bubble
    if (credibilityScore > 3000 && totalReceived > 0) {
      const inflationIndicator = credibilityScore / (totalReceived * Math.max(xpTotal / 10000, 1));
      if (inflationIndicator > 50) {
        farmingIndicators.push('Extreme reputation inflation relative to platform engagement');
        farmingRisk = 'critical';
        score -= 45;
      }
    }

    // 28. Systematic Review Exchange Detection
    if (totalGiven > 15 && totalReceived > 15) {
      const exchangePattern = Math.abs(totalGiven - totalReceived);
      const exchangeTotal = totalGiven + totalReceived;
      if (exchangePattern <= 3 && exchangeTotal > 60) {
        farmingIndicators.push('Near-perfect review exchange balance indicates systematic coordination');
        farmingRisk = 'critical';
        score -= 55;
      }
    }

    // 29. Platform Mechanics Abuse
    if (vouchesReceived > 50 || vouchesGiven > 50) {
      farmingIndicators.push('Excessive vouching activity suggests platform mechanics abuse');
      farmingRisk = 'critical';
      score -= 40;
    }

    // 30. Artificial Network Effects
    if (totalGiven > 20 && vouchesGiven > totalGiven * 1.5) {
      farmingIndicators.push('Disproportionate vouching to reviewing suggests artificial network manipulation');
      farmingRisk = 'critical';
      score -= 45;
    }

    // 🟢 LEGITIMATE ACTIVITY INDICATORS

    // Organic Growth Patterns
    if (credibilityScore >= 70 && farmingIndicators.length === 0) {
      score += 30;
      reasons.push(`High credibility score (${credibilityScore}) with no farming indicators`);
    } else if (credibilityScore >= 40) {
      score += 20;
      reasons.push(`Moderate credibility score (${credibilityScore})`);
    }

    // Healthy Review Patterns
    if (totalGiven > 0 && totalReceived > 0) {
      if (reciprocityRatio >= 0.3 && reciprocityRatio <= 2.0 && farmingRisk !== 'high') {
        score += 20;
        reasons.push(`Healthy review balance (${totalGiven} given, ${totalReceived} received)`);
      }
    }

    // Quality over Quantity
    if (totalReceived > 0 && totalReceived <= 15 && credibilityScore > totalReceived * 50) {
      score += 25;
      reasons.push('High quality reviews with good credibility ratio');
    }

    // Genuine Community Engagement
    if (xpTotal > 5000 && totalReceived < xpTotal / 1000) {
      score += 20;
      reasons.push('High platform engagement relative to reviews received');
    }

    // Diverse Interaction Types
    if (vouchesReceived > 0 && vouchesReceived < totalReceived) {
      score += 15;
      reasons.push('Balanced vouch-to-review ratio indicates organic growth');
    }

    // 🔍 ACCEPTABLE R4R THRESHOLDS

    // Minimal R4R is acceptable for community building
    const acceptableR4RLimit = 8; // Up to 8 mutual reviews is considered normal
    const mutualReviewCount = Math.min(totalGiven, totalReceived);
    
    if (mutualReviewCount <= acceptableR4RLimit && mutualReviewCount > 0) {
      score += 10;
      reasons.push(`Minimal R4R activity (${mutualReviewCount} pairs) within acceptable limits`);
    }

    // 📊 FINAL SCORING AND RECOMMENDATIONS

    // Farming Risk Assessment
    if (farmingRisk === 'critical') {
      warnings.push('CRITICAL: Strong evidence of systematic reputation farming');
      recommendations.push('Avoid engaging in review exchanges with this user');
      recommendations.push('Report suspected farming activity to moderators');
    } else if (farmingRisk === 'high') {
      warnings.push('HIGH RISK: Multiple farming indicators detected');
      recommendations.push('Exercise extreme caution in review exchanges');
      recommendations.push('Request evidence of genuine work/contributions');
    } else if (farmingRisk === 'medium') {
      warnings.push('MEDIUM RISK: Some suspicious patterns detected');
      recommendations.push('Verify authenticity before engaging in reviews');
      recommendations.push('Look for genuine contributions beyond reviews');
    }

    // Positive Recommendations
    if (farmingRisk === 'low' && score > 50) {
      recommendations.push('User appears suitable for legitimate review exchanges');
      recommendations.push('Maintain balanced give-and-take in review activity');
    }

    // General Improvement Suggestions
    if (totalGiven === 0) {
      recommendations.push('Start by giving thoughtful reviews to build community trust');
    }
    if (xpTotal < 1000) {
      recommendations.push('Increase platform engagement through genuine activities');
    }
    if (credibilityScore < 30) {
      recommendations.push('Focus on earning organic credibility through quality contributions');
    }

    // Final eligibility determination
    const eligible = score >= 30 && farmingRisk !== 'high' && farmingRisk !== 'critical';

    return {
      eligible,
      score: Math.max(0, Math.min(100, score)),
      farmingRisk,
      credibilityScore,
      reasons,
      recommendations,
      warnings,
      farmingIndicators,
      stats: {
        reviewsGiven: totalGiven,
        reviewsReceived: totalReceived,
        vouchesReceived,
        vouchesGiven,
        xpTotal,
        reciprocityRatio: totalGiven > 0 ? (totalReceived / totalGiven).toFixed(2) : 'N/A',
        mutualReviewCount: Math.min(totalGiven, totalReceived),
        acceptableR4RLimit,
        positiveReviews: reviewsReceived.positive || 0,
        negativeReviews: reviewsReceived.negative || 0,
        neutralReviews: reviewsReceived.neutral || 0,
        positiveRatio: totalReceived > 0 ? ((reviewsReceived.positive || 0) / totalReceived * 100).toFixed(1) : 'N/A',
        negativeRatio: totalReceived > 0 ? ((reviewsReceived.negative || 0) / totalReceived * 100).toFixed(1) : 'N/A',
        credibilityPerXP: xpTotal > 0 ? (credibilityScore / (xpTotal / 1000)).toFixed(1) : 'N/A',
        totalActivity: totalGiven + totalReceived + vouchesGiven + vouchesReceived
      }
    };
  };

  // Get status color based on farming risk and analysis
  const getStatusColor = (analysis) => {
    if (!analysis) return '#666';
    
    if (analysis.farmingRisk === 'critical') return '#dc3545'; // Red
    if (analysis.farmingRisk === 'high') return '#fd7e14'; // Orange
    if (analysis.farmingRisk === 'medium') return '#ffc107'; // Yellow
    
    if (analysis.score >= 70) return '#28a745'; // Green
    if (analysis.score >= 50) return '#17a2b8'; // Blue
    return '#6c757d'; // Gray
  };

  // Get status text with farming risk consideration
  const getStatusText = (analysis) => {
    if (!analysis) return 'Unknown';
    
    if (analysis.farmingRisk === 'critical') return 'FARMING DETECTED';
    if (analysis.farmingRisk === 'high') return 'HIGH RISK';
    if (analysis.farmingRisk === 'medium') return 'SUSPICIOUS';
    
    if (analysis.score >= 70) return 'Excellent';
    if (analysis.score >= 50) return 'Good';
    if (analysis.score >= 30) return 'Fair';
    return 'Poor';
  };

  // Get farming risk badge style
  const getFarmingRiskStyle = (farmingRisk) => {
    switch (farmingRisk) {
      case 'critical':
        return { backgroundColor: '#dc3545', color: 'white', fontWeight: 'bold' };
      case 'high':
        return { backgroundColor: '#fd7e14', color: 'white', fontWeight: 'bold' };
      case 'medium':
        return { backgroundColor: '#ffc107', color: '#000', fontWeight: 'bold' };
      case 'low':
        return { backgroundColor: '#28a745', color: 'white', fontWeight: 'normal' };
      default:
        return { backgroundColor: '#6c757d', color: 'white', fontWeight: 'normal' };
    }
  };

  return (
    <>
      <Head>
        <title>R4R Checker - Ethos Network</title>
        <meta name="description" content="Check Request for Review eligibility and analyze user reputation on Ethos Network" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/ethos.png" />
      </Head>
      
      <Navbar />
      
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>R4R Checker</h1>
          <p className={styles.subtitle}>
            Check Request for Review eligibility and analyze user reputation
          </p>
        </div>

      <div className={styles.content}>
        {/* Search Section */}
        <div className={styles.searchSection}>
          <input
            type="text"
            placeholder="Search for Ethos users (username, Twitter handle, display name...)"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              handleSearch(e.target.value);
            }}
            className={styles.searchInput}
          />
          
          {isLoading && <div className={styles.loading}>Searching...</div>}
          
          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className={styles.searchResults}>
              {searchResults.map((user, index) => (
                <div
                  key={user.profileId || index}
                  className={styles.userCard}
                  onClick={() => selectUser(user)}
                >
                  <img
                    src={user.avatarUrl || '/ethos.png'}
                    alt={user.displayName}
                    className={styles.avatar}
                  />
                  <div className={styles.userInfo}>
                    <div className={styles.userName}>{user.displayName}</div>
                    <div className={styles.userHandle}>@{user.username}</div>
                    <div className={styles.userScore}>Score: {user.score || 0}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Analysis Section */}
        {selectedUser && (
          <div className={styles.analysisSection}>
            <div className={styles.userHeader}>
              <img
                src={selectedUser.avatarUrl || '/ethos.png'}
                alt={selectedUser.displayName}
                className={styles.selectedAvatar}
              />
              <div className={styles.selectedUserInfo}>
                <h2 className={styles.selectedUserName}>{selectedUser.displayName}</h2>
                <p className={styles.selectedUserHandle}>@{selectedUser.username}</p>
                <p className={styles.selectedUserBio}>{selectedUser.bio}</p>
              </div>
            </div>

            {analysis && (
              <div className={styles.analysis}>
                {/* Overall Status */}
                <div className={styles.statusCard}>
                  <div className={styles.statusHeader}>
                    <h3>R4R Eligibility & Farming Risk Assessment</h3>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <div 
                        className={styles.statusBadge}
                        style={{ backgroundColor: getStatusColor(analysis) }}
                      >
                        {getStatusText(analysis)} ({analysis.score}/100)
                      </div>
                      <div 
                        className={styles.statusBadge}
                        style={getFarmingRiskStyle(analysis.farmingRisk)}
                      >
                        {(analysis.farmingRisk || 'unknown').toUpperCase()} RISK
                      </div>
                    </div>
                  </div>
                  <div className={analysis.eligible ? styles.eligible : styles.notEligible}>
                    {analysis.eligible ? '✅ Suitable for review requests' : '❌ Caution advised for review requests'}
                  </div>
                </div>

                {/* Farming Detection Results */}
                {analysis.farmingIndicators.length > 0 && (
                  <div className={styles.factorsSection}>
                    <h4 className={styles.factorsTitle}>🚨 Reputation Farming Indicators</h4>
                    <ul className={styles.factorsList}>
                      {analysis.farmingIndicators.map((indicator, index) => (
                        <li key={index} className={styles.warning} style={{ borderLeft: '4px solid #dc3545', background: 'rgba(220, 53, 69, 0.15)' }}>
                          {indicator}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Enhanced Statistics Grid */}
                <div className={styles.statsGrid}>
                  <div className={styles.statCard}>
                    <h4>Credibility Score</h4>
                    <div className={styles.statValue}>{analysis.credibilityScore}</div>
                  </div>
                  <div className={styles.statCard}>
                    <h4>Reviews Given</h4>
                    <div className={styles.statValue}>{analysis.stats.reviewsGiven}</div>
                  </div>
                  <div className={styles.statCard}>
                    <h4>Reviews Received</h4>
                    <div className={styles.statValue}>{analysis.stats.reviewsReceived}</div>
                  </div>
                  <div className={styles.statCard}>
                    <h4>Reciprocity Ratio</h4>
                    <div className={styles.statValue} style={{ 
                      color: analysis.farmingRisk === 'high' || analysis.farmingRisk === 'critical' ? '#dc3545' : '#58a6ff' 
                    }}>
                      {analysis.stats.reciprocityRatio}
                    </div>
                  </div>
                  <div className={styles.statCard}>
                    <h4>Vouches Received</h4>
                    <div className={styles.statValue}>{analysis.stats.vouchesReceived}</div>
                  </div>
                  <div className={styles.statCard}>
                    <h4>Vouches Given</h4>
                    <div className={styles.statValue}>{analysis.stats.vouchesGiven}</div>
                  </div>
                  <div className={styles.statCard}>
                    <h4>Positive Reviews</h4>
                    <div className={styles.statValue} style={{ color: '#28a745' }}>
                      {analysis.stats.positiveReviews} ({analysis.stats.positiveRatio}%)
                    </div>
                  </div>
                  <div className={styles.statCard}>
                    <h4>Negative Reviews</h4>
                    <div className={styles.statValue} style={{ 
                      color: analysis.stats.negativeReviews === 0 && analysis.stats.reviewsReceived > 20 ? '#ffc107' : '#dc3545' 
                    }}>
                      {analysis.stats.negativeReviews} ({analysis.stats.negativeRatio}%)
                    </div>
                  </div>
                  <div className={styles.statCard}>
                    <h4>Neutral Reviews</h4>
                    <div className={styles.statValue} style={{ color: '#6c757d' }}>
                      {analysis.stats.neutralReviews}
                    </div>
                  </div>
                  <div className={styles.statCard}>
                    <h4>Total Activity</h4>
                    <div className={styles.statValue}>{analysis.stats.totalActivity}</div>
                  </div>
                  {analysis.stats.vouchReciprocityRatio && (
                    <div className={styles.statCard}>
                      <h4>Vouch Reciprocity</h4>
                      <div className={styles.statValue} style={{ 
                        color: parseFloat(analysis.stats.vouchReciprocityRatio) > 0.9 && parseFloat(analysis.stats.vouchReciprocityRatio) < 1.1 ? '#ffc107' : '#58a6ff' 
                      }}>
                        {analysis.stats.vouchReciprocityRatio}
                      </div>
                    </div>
                  )}
                  {analysis.stats.credibilityPerReview && (
                    <div className={styles.statCard}>
                      <h4>Credibility/Review</h4>
                      <div className={styles.statValue}>{analysis.stats.credibilityPerReview}</div>
                    </div>
                  )}
                </div>

                {/* Positive Factors */}
                {analysis.reasons.length > 0 && (
                  <div className={styles.factorsSection}>
                    <h4 className={styles.factorsTitle}>✅ Positive Factors</h4>
                    <ul className={styles.factorsList}>
                      {analysis.reasons.map((reason, index) => (
                        <li key={index} className={styles.positiveReason}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Warnings */}
                {analysis.warnings.length > 0 && (
                  <div className={styles.factorsSection}>
                    <h4 className={styles.factorsTitle}>⚠️ Concerns</h4>
                    <ul className={styles.factorsList}>
                      {analysis.warnings.map((warning, index) => (
                        <li key={index} className={styles.warning}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recommendations */}
                {analysis.recommendations.length > 0 && (
                  <div className={styles.factorsSection}>
                    <h4 className={styles.factorsTitle}>💡 Recommendations</h4>
                    <ul className={styles.factorsList}>
                      {analysis.recommendations.map((rec, index) => (
                        <li key={index} className={styles.recommendation}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Help Section */}
        <div className={styles.helpSection}>
          <h3>Enhanced R4R Analysis with Database Caching</h3>
          <div className={styles.helpGrid}>
            <div className={styles.helpCard}>
              <h4>🚨 Advanced Farming Detection</h4>
              <ul>
                <li>Perfect 1:1 reciprocity patterns</li>
                <li>High volume, low quality reviews</li>
                <li>Excessive mutual review activity</li>
                <li>Artificial vouching patterns</li>
                <li>Low XP-to-review ratios</li>
                <li>Zero negative reviews despite high activity</li>
                <li>Rapid score accumulation</li>
                <li>Review burst patterns & timing anomalies</li>
                <li>Score inflation detection</li>
                <li>Artificial engagement patterns</li>
                <li>Network centrality abuse</li>
                <li>Quality dilution indicators</li>
                <li>Sockpuppet network signals</li>
                <li>Platform mechanics gaming</li>
                <li>Reputation washing schemes</li>
                <li>Behavioral consistency analysis</li>
                <li>Platform exploitation indicators</li>
                <li>Review farm network detection</li>
                <li>Artificial growth trajectories</li>
                <li>Multi-account coordination</li>
                <li>Review mill operations</li>
                <li>Quality suppression tactics</li>
                <li>Algorithm exploitation</li>
                <li>Manufactured consensus</li>
                <li>Velocity anomalies</li>
                <li>Cross-platform gaming</li>
                <li>Reputation inflation bubbles</li>
                <li>Systematic review exchanges</li>
                <li>Vouching mechanics abuse</li>
                <li>Artificial network effects</li>
              </ul>
            </div>
            <div className={styles.helpCard}>
              <h4>📊 Enhanced Metrics Calculated</h4>
              <ul>
                <li><strong>Review Ratios:</strong> Given/Received analysis</li>
                <li><strong>Reciprocity Analysis:</strong> Review & vouch balance</li>
                <li><strong>Quality Metrics:</strong> Credibility per review</li>
                <li><strong>Activity Patterns:</strong> Total engagement score</li>
                <li><strong>Reviewer Reputation:</strong> Average credibility of reviewers</li>
                <li><strong>Network Analysis:</strong> Connection quality assessment</li>
                <li><strong>Efficiency Ratios:</strong> Score-to-effort analysis</li>
                <li><strong>Risk Scoring:</strong> Multi-factor assessment</li>
              </ul>
            </div>
            <div className={styles.helpCard}>
              <h4>🗄️ Database Caching System</h4>
              <ul>
                <li>Automatic data caching (24h expiry)</li>
                <li>Reduced API calls to Ethos</li>
                <li>Enhanced performance</li>
                <li>Offline analysis capability</li>
                <li>Historical data tracking</li>
                <li>Reviewer reputation database</li>
                <li>Comprehensive analysis storage</li>
              </ul>
            </div>
            <div className={styles.helpCard}>
              <h4>🔍 Reviewer Reputation Analysis</h4>
              <ul>
                <li>Total credibility of all reviewers</li>
                <li>Average reviewer reputation</li>
                <li>High vs low reputation reviewer ratios</li>
                <li>Review source quality assessment</li>
                <li>Network trust indicators</li>
                <li>Community standing validation</li>
              </ul>
            </div>
            <div className={styles.helpCard}>
              <h4>✅ Acceptable R4R Limits</h4>
              <ul>
                <li>Up to 8 mutual reviews = Normal</li>
                <li>Reciprocity ratio: 0.3-2.0 = Healthy</li>
                <li>XP per review ≥ 1000 = Genuine</li>
                <li>Mixed review types = Authentic</li>
                <li>Gradual score growth = Organic</li>
                <li>High reviewer reputation = Trusted</li>
                <li>Balanced vouch activity = Natural</li>
              </ul>
            </div>
            <div className={styles.helpCard}>
              <h4>⚠️ Risk Levels</h4>
              <ul>
                <li><strong style={{color:'#28a745'}}>LOW:</strong> Minimal/no farming indicators</li>
                <li><strong style={{color:'#ffc107'}}>MEDIUM:</strong> Some suspicious patterns</li>
                <li><strong style={{color:'#fd7e14'}}>HIGH:</strong> Multiple farming indicators</li>
                <li><strong style={{color:'#dc3545'}}>CRITICAL:</strong> Clear farming evidence</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
