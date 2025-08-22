// Fetch user suggestions using comprehensive Ethos API search
// Returns an array of { username, displayName, avatarUrl, profileId, verified, followers, score, influenceScore }

import { searchUsers, getUserStats } from './ethosApiClient';

export default async function fetchUserSuggestions(query) {
  if (!query || query.length < 2) return [];
  
  try {
    // Clean the query - remove @ symbol if present
    const cleanQuery = query.replace(/^@/, '').trim();
    
    console.log(`[fetchUserSuggestions] Searching for: "${cleanQuery}"`);
    
    // Use comprehensive Ethos API search (combines v1 and v2 APIs)
    const ethosResults = await searchUsers(cleanQuery, 8);
    
    // Fetch influence scores for each user
    const resultsWithInfluence = await Promise.all(
      ethosResults.map(async (user) => {
        let influenceScore = null;
        
        try {
          // Try to get userkey for stats API
          let userkey = null;
          
          // Check if user has userkeys array with X service
          if (user.userkeys && Array.isArray(user.userkeys)) {
            const xUserkey = user.userkeys.find(uk => uk.service === 'x.com');
            if (xUserkey) {
              userkey = `service:x.com:${xUserkey.username}`;
            }
          }
          
          // If no X userkey found, try using profileId
          if (!userkey && user.profileId) {
            userkey = `profileId:${user.profileId}`;
          }

          if (userkey) {
            const stats = await getUserStats(userkey);
            if (stats && stats.influenceFactor !== undefined) {
              influenceScore = stats.influenceFactor;
            }
          }
        } catch (error) {
          console.warn(`[fetchUserSuggestions] Could not fetch influence score for ${user.username}:`, error);
        }
        
        return {
          ...user,
          influenceScore
        };
      })
    );
    
    // Sort by relevance and score
    const sortedSuggestions = resultsWithInfluence
      .sort((a, b) => {
        // Exact matches first
        const aExactMatch = a.username?.toLowerCase() === cleanQuery.toLowerCase() ||
                           (a.displayName && a.displayName.toLowerCase() === cleanQuery.toLowerCase());
        const bExactMatch = b.username?.toLowerCase() === cleanQuery.toLowerCase() ||
                           (b.displayName && b.displayName.toLowerCase() === cleanQuery.toLowerCase());
        
        if (aExactMatch && !bExactMatch) return -1;
        if (!aExactMatch && bExactMatch) return 1;
        
        // Then by score (higher is better)
        return (b.score || 0) - (a.score || 0);
      })
      .slice(0, 8);
    
    console.log(`[fetchUserSuggestions] Final suggestions for "${cleanQuery}":`, sortedSuggestions);
    return sortedSuggestions;
    
  } catch (err) {
    console.error('fetchUserSuggestions error:', err);
    // Return empty array on error - no fallback needed since Ethos API is comprehensive
    return [];
  }
}
