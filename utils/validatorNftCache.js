// Cache for known validator NFT holders to improve performance
export const KNOWN_VALIDATOR_NFT_HOLDERS = new Set([
  8,    // serpinxbt - confirmed to have validator NFTs #111, #149, #60
  // Add more known validator NFT holders here as we discover them
]);

// Fast check for known validator NFT holders
export function isKnownValidatorNftHolder(profileId) {
  return KNOWN_VALIDATOR_NFT_HOLDERS.has(profileId);
}

// Enhanced validator NFT checking with pre-cache
export async function checkValidatorNftsWithCache(profiles, batchSize = 10) {
  console.log(`[ValidatorNft] 🔍 Checking ${profiles.length} profiles with cache optimization...`);
  
  const results = new Map();
  const unknownProfiles = [];
  
  // First, check known validator NFT holders
  profiles.forEach(profile => {
    if (isKnownValidatorNftHolder(profile.profileId)) {
      results.set(profile.profileId, true);
      console.log(`[ValidatorNft] ✅ Pre-cached validator NFT for profile ${profile.profileId}`);
    } else {
      unknownProfiles.push(profile);
    }
  });
  
  // Then check unknown profiles via API
  if (unknownProfiles.length > 0) {
    console.log(`[ValidatorNft] 🔍 Checking ${unknownProfiles.length} unknown profiles via API...`);
    
    const { checkValidatorNftsForProfiles } = await import('./validatorNftApi.js');
    const apiResults = await checkValidatorNftsForProfiles(unknownProfiles, batchSize);
    
    // Merge API results
    for (const [profileId, hasNft] of apiResults) {
      results.set(profileId, hasNft);
      
      // Add newly discovered validator NFT holders to cache
      if (hasNft) {
        KNOWN_VALIDATOR_NFT_HOLDERS.add(profileId);
        console.log(`[ValidatorNft] 🆕 Adding profile ${profileId} to validator cache`);
      }
    }
  }
  
  const validatorCount = Array.from(results.values()).filter(Boolean).length;
  console.log(`[ValidatorNft] ✅ Total: ${validatorCount} validator NFT holders found (${KNOWN_VALIDATOR_NFT_HOLDERS.size} cached)`);
  
  return results;
}
