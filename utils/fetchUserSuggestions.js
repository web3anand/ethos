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
    
    // Skip individual influence score fetching for faster response
    // The search results already contain score data
    const optimizedResults = ethosResults.map(user => ({
      ...user,
      // Use the score from search results as influence score if available
      influenceScore: user.score || user.influenceScore || null
    }));
    
    // Sort by relevance and score
    const sortedSuggestions = optimizedResults
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
