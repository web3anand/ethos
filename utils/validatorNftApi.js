// Utility functions for validator NFT detection

// Check validator NFT for a single profile
export async function checkValidatorNft(profileId) {
  try {
    const formattedProfileId = `profileId:${profileId}`;
    
    const nftRes = await fetch(`https://api.ethos.network/api/v2/nfts/user/${formattedProfileId}/owns-validator`, {
      method: 'GET',
      headers: {
        'Accept': '*/*'
      }
    });
    
    if (!nftRes.ok) {
      if (nftRes.status !== 404) { // 404 is expected for users without validator NFTs
        console.error('[ValidatorNft] Check failed for', profileId, ':', nftRes.status, nftRes.statusText);
      }
      return false;
    }
    
    const data = await nftRes.json();
    const hasValidatorNft = Array.isArray(data) && data.length > 0;
    
    if (hasValidatorNft) {
      console.log('[ValidatorNft] ✅ Validator NFT found for', profileId);
    }
    
    return hasValidatorNft;
  } catch (error) {
    console.error('[ValidatorNft] Error checking validator NFT for', profileId, ':', error);
    return false;
  }
}

// Check validator NFTs for multiple profiles concurrently (in batches)
export async function checkValidatorNftsForProfiles(profiles, batchSize = 50) {
  console.log(`[ValidatorNft] 🔍 Checking validator NFTs for ${profiles.length} profiles...`);
  
  const results = new Map(); // profileId -> boolean
  const totalBatches = Math.ceil(profiles.length / batchSize);
  
  for (let i = 0; i < profiles.length; i += batchSize) {
    const batch = profiles.slice(i, i + batchSize);
    const batchIndex = Math.floor(i / batchSize) + 1;
    
    console.log(`[ValidatorNft] Processing batch ${batchIndex}/${totalBatches} (${batch.length} profiles)`);
    
    // Process batch concurrently
    const batchPromises = batch.map(async (profile) => {
      const hasNft = await checkValidatorNft(profile.profileId);
      results.set(profile.profileId, hasNft);
      return { profileId: profile.profileId, hasValidatorNft: hasNft };
    });
    
    try {
      await Promise.all(batchPromises);
    } catch (error) {
      console.error(`[ValidatorNft] Error in batch ${batchIndex}:`, error);
    }
    
    // Reduced delay between batches for faster response (was 200ms)
    if (i + batchSize < profiles.length) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
  
  const validatorCount = Array.from(results.values()).filter(Boolean).length;
  console.log(`[ValidatorNft] ✅ Found ${validatorCount} validator NFT holders out of ${profiles.length} profiles`);
  
  return results;
}

// Add validator symbols to usernames
export function addValidatorSymbolToUsername(username, hasValidatorNft) {
  // Keep the original username unchanged - we'll handle display in the component
  return username;
}

// Check if user has validator NFT
export function hasValidatorNft(profileId, validatorNfts) {
  return validatorNfts.get(profileId) || false;
}
