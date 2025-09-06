// Utility helpers for Ethos API calls using fetch.

import { getUserCache, updateUserCache, getStatsCache, updateStatsCache, getActivitiesCache, updateActivitiesCache } from './cache.js';

/**
 * Fetch Ethos user data by Twitter handle with caching.
 * @param {string} handle Twitter handle without @
 * @returns {Promise<Object|null>} The user data or null if not found.
 */
export async function fetchUserByTwitter(handle) {
  try {
    const url = `https://api.ethos.network/api/v2/user/by/x/${encodeURIComponent(
      handle
    )}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    console.log('fetchUserByTwitter:', json);
    
    // Cache the user data if it has a profileId
    if (json?.profileId) {
      await updateUserCache(json.profileId, json);
    }
    
    return json;
  } catch (err) {
    console.error('fetchUserByTwitter error:', err);
    return null;
  }
}

/**
 * Fetch user stats with caching support.
 * @param {string} userKey The user key (e.g., `profileId:123` or `service:x.com:username`)
 * @param {boolean} useCache Whether to use cached data if available
 * @returns {Promise<Object|null>}
 */
export async function fetchUserStats(userKey, useCache = true) {
  const profileId = userKey.includes('profileId:') ? userKey.split(':')[1] : null;
  
  // Try cache first if enabled and profileId is available
  if (useCache && profileId) {
    const cached = await getStatsCache(profileId);
    if (cached) {
      console.log(`📋 Using cached stats for profile ${profileId}`);
      return cached;
    }
  }

  try {
    const url = `https://api.ethos.network/api/v1/stats/${encodeURIComponent(userKey)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    console.log('fetchUserStats:', json);
    
    // Cache the stats if profileId is available
    if (profileId && json?.data) {
      await updateStatsCache(profileId, json.data);
    }
    
    return json.data;
  } catch (err) {
    console.error('fetchUserStats error:', err);
    return null;
  }
}

/**
 * Fetch all active users (for bulk cache updates)
 * @returns {Promise<Array>} Array of user objects
 */
export async function getAllActiveUsers() {
  try {
    // This would be a custom endpoint to get all users
    // For now, we'll return an empty array as this needs backend implementation
    console.log('getAllActiveUsers: Placeholder - needs backend implementation');
    return [];
  } catch (error) {
    console.error('getAllActiveUsers error:', error);
    return [];
  }
}

/**
 * Fetch bulk user stats (for bulk cache updates)
 * @returns {Promise<Object>} Object with profileId as key and stats as value
 */
export async function fetchBulkUserStats() {
  try {
    // This would be a custom endpoint to get stats for multiple users
    // For now, we'll return an empty object as this needs backend implementation
    console.log('fetchBulkUserStats: Placeholder - needs backend implementation');
    return {};
  } catch (error) {
    console.error('fetchBulkUserStats error:', error);
    return {};
  }
}

/**
 * Fetch bulk activities (for bulk cache updates)
 * @returns {Promise<Object>} Object with profileId as key and activities as value
 */
export async function fetchBulkActivities() {
  try {
    // This would be a custom endpoint to get activities for multiple users
    // For now, we'll return an empty object as this needs backend implementation
    console.log('fetchBulkActivities: Placeholder - needs backend implementation');
    return {};
  } catch (error) {
    console.error('fetchBulkActivities error:', error);
    return {};
  }
}

/**
 * Fetch the current ETH to USD exchange rate.
 * @returns {Promise<number|null>} ETH price in USD or null on error.
 */
export async function fetchExchangeRate() {
  try {
    const res = await fetch(
      'https://api.ethos.network/api/v1/exchange-rates/eth-price'
    );
    if (!res.ok) return null;
    const json = await res.json();
    console.log('fetchExchangeRate:', json);
    return json?.data?.price ?? null;
  } catch (err) {
    console.error('fetchExchangeRate error:', err);
    return null;
  }
}

/**
 * Fetch addresses for a given profile ID.
 * @param {string|number} profileId Profile identifier
 * @returns {Promise<Array>} Array of address objects or [] on error.
 */
export async function fetchUserAddresses(profileId) {
  try {
    const url = `https://api.ethos.network/api/v1/addresses/profileId:${encodeURIComponent(
      profileId
    )}`;
    const res = await fetch(url);
    if (!res.ok) return { primaryAddress: null, allAddresses: [] };
    const json = await res.json();
    console.log('fetchUserAddresses:', json);
    // The API returns { data: { profileId, primaryAddress, allAddresses } }
    return {
      primaryAddress: json?.data?.primaryAddress || null,
      allAddresses: Array.isArray(json?.data?.allAddresses) ? json.data.allAddresses : [],
    };
  } catch (err) {
    console.error('fetchUserAddresses error:', err);
    return { primaryAddress: null, allAddresses: [] };
  }
}

/**
 * Performs an enhanced R4R (Reputation & Reciprocity) analysis for a given user with caching.
 * @param {object} user The user object from a search result.
 * @param {boolean} useCache Whether to use cached analysis if available
 * @returns {Promise<object>} A comprehensive analysis object.
 */
export async function getEnhancedR4RAnalysis(user, useCache = true) {
  // Try cache first if enabled
  if (useCache) {
    const { getAnalysisCache } = await import('./cache.js');
    const cached = await getAnalysisCache(user.profileId);
    if (cached) {
      console.log(`📋 Using cached analysis for profile ${user.profileId}`);
      return cached;
    }
  }

  const userKey = `profileId:${user.profileId}`;
  
  // Fetch raw data in parallel
  const [stats, addresses] = await Promise.all([
    fetchUserStats(userKey, useCache),
    fetchUserAddresses(user.profileId),
  ]);

  if (!stats) {
    throw new Error('Could not retrieve user statistics. The user may not have a complete profile.');
  }

  // --- 1. METRICS CALCULATION ---
  const metrics = {
    basic: {
      credibilityScore: stats.credibilityScore?.score ?? 0,
      reviewsGiven: stats.reviewsGiven?.count ?? 0,
      reviewsReceived: stats.reviewsReceived?.count ?? 0,
      xp: stats.xp?.score ?? 0,
      followers: user.followersCount || 0,
      following: user.followingCount || 0,
    },
    ratios: {
      reciprocityRatio: (stats.reviewsGiven?.count > 0 ? (stats.reviewsReceived?.count || 0) / stats.reviewsGiven.count : 0),
      credibilityToXPRatio: (stats.xp?.score > 0 ? (stats.credibilityScore?.score || 0) / stats.xp.score : 0),
    },
    vouch: {
      vouchesGiven: stats.vouchesGiven?.count ?? 0,
      vouchesReceived: stats.vouchesReceived?.count ?? 0,
      vouchValueGiven: stats.vouchesGiven?.value ?? 0,
      vouchValueReceived: stats.vouchesReceived?.value ?? 0,
      vouchReciprocity: (stats.vouchesGiven?.count > 0 ? (stats.vouchesReceived?.count || 0) / stats.vouchesGiven.count : 1),
    },
    wallet: {
      primaryAddress: addresses.primaryAddress,
      addressCount: addresses.allAddresses.length,
    },
  };

  // --- 2. RISK ASSESSMENT ---
  const riskFactors = [];
  let riskScore = 0; // Lower is better

  // Factor: Low Credibility Score
  if (metrics.basic.credibilityScore < 500) {
    riskFactors.push({ description: 'Credibility score is below the average threshold of 500.', level: 'high' });
    riskScore += 25;
  }

  // Factor: No Reviews Given
  if (metrics.basic.reviewsGiven === 0) {
    riskFactors.push({ description: 'User has not given any reviews, making reciprocity analysis impossible.', level: 'high' });
    riskScore += 20;
  } else if (metrics.ratios.reciprocityRatio < 0.5) {
    // Factor: Poor Reciprocity
    riskFactors.push({ description: `User receives significantly fewer reviews than they give (Ratio: ${metrics.ratios.reciprocityRatio.toFixed(2)}).`, level: 'medium' });
    riskScore += 15;
  }

  // Factor: No Wallet Connected
  if (!metrics.wallet.primaryAddress) {
    riskFactors.push({ description: 'No primary wallet address is connected to the profile.', level: 'high' });
    riskScore += 25;
  }

  // Factor: Low Follower Count (if credibility is also low)
  if (metrics.basic.followers < 100 && metrics.basic.credibilityScore < 600) {
    riskFactors.push({ description: 'Low follower count combined with a modest credibility score may indicate a new or unestablished account.', level: 'medium' });
    riskScore += 10;
  }
  
  // Factor: Zero XP
  if (metrics.basic.xp === 0) {
    riskFactors.push({ description: 'User has zero XP, indicating no engagement with XP-earning activities on the platform.', level: 'critical' });
    riskScore += 30;
  }

  let riskLevel = 'low';
  if (riskScore >= 70) riskLevel = 'critical';
  else if (riskScore >= 50) riskLevel = 'high';
  else if (riskScore >= 25) riskLevel = 'medium';

  const riskAssessment = {
    score: riskScore,
    level: riskLevel,
    summary: `The user profile presents a ${riskLevel} risk based on credibility, reciprocity, and on-chain activity.`,
    factors: riskFactors,
  };

  // --- 3. RECOMMENDATIONS ---
  const recommendations = [];
  if (riskAssessment.level === 'low') {
    recommendations.push('This user appears to be a reliable and reciprocal member of the network.');
    recommendations.push('Continue engaging with this user as they have a positive track record.');
  } else {
    if (metrics.basic.credibilityScore < 500) {
      recommendations.push('Proceed with caution due to a low credibility score.');
    }
    if (metrics.basic.reviewsGiven === 0) {
      recommendations.push('Consider that this user has not yet demonstrated a pattern of giving back reviews.');
    }
    if (!metrics.wallet.primaryAddress) {
      recommendations.push('The lack of a connected wallet is a significant risk factor; on-chain reputation cannot be verified.');
    }
    if (riskFactors.length === 0) {
       recommendations.push('This user meets the minimum requirements, but building more history is recommended.');
    }
  }
  if (metrics.ratios.reciprocityRatio > 1.5) {
      recommendations.push('This user is a "net giver" of reviews, which is a positive signal.');
  }

  const analysis = {
    metrics,
    riskAssessment,
    recommendations,
  };

  // Cache the analysis
  if (useCache) {
    const { updateAnalysisCache } = await import('./cache.js');
    await updateAnalysisCache(user.profileId, analysis);
    console.log(`💾 Cached analysis for profile ${user.profileId}`);
  }

  return analysis;
}
