// Comprehensive validator NFT checker that checks ALL connected wallets

/**
 * Fetch all addresses associated with a user profile
 */
export async function fetchAllUserAddresses(profileId) {
  try {
    const formattedProfileId = `profileId:${profileId}`;
    
    const response = await fetch(`https://api.ethos.network/api/v1/addresses/${formattedProfileId}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*'
      }
    });
    
    if (!response.ok) {
      console.error('[ComprehensiveValidator] Failed to fetch addresses:', response.status, response.statusText);
      return [];
    }
    
    const data = await response.json();
    
    // Extract all addresses from the response
    const addresses = [];
    
    if (data?.data?.primaryAddress) {
      addresses.push({
        address: data.data.primaryAddress,
        type: 'primary'
      });
    }
    
    if (data?.data?.addresses && Array.isArray(data.data.addresses)) {
      data.data.addresses.forEach(addr => {
        if (addr.address && addr.address !== data.data.primaryAddress) {
          addresses.push({
            address: addr.address,
            type: 'secondary'
          });
        }
      });
    }
    
    console.log(`[ComprehensiveValidator] Found ${addresses.length} addresses for profile ${profileId}:`, addresses);
    return addresses;
    
  } catch (error) {
    console.error('[ComprehensiveValidator] Error fetching addresses:', error);
    return [];
  }
}

/**
 * Check if a specific address owns a validator NFT
 */
export async function checkAddressForValidatorNft(address) {
  try {
    const response = await fetch(`https://api.ethos.network/api/v2/nfts/user/address:${address}/owns-validator`, {
      method: 'GET',
      headers: {
        'Accept': '*/*'
      }
    });
    
    if (!response.ok) {
      if (response.status !== 404) {
        console.error('[ComprehensiveValidator] Validator NFT check failed for address', address, ':', response.status, response.statusText);
      }
      return null;
    }
    
    const data = await response.json();
    const hasValidatorNft = Array.isArray(data) && data.length > 0;
    
    if (hasValidatorNft) {
      console.log(`[ComprehensiveValidator] ✅ Validator NFT found for address ${address}`);
      return data[0]; // Return the first validator NFT
    }
    
    return null;
  } catch (error) {
    console.error('[ComprehensiveValidator] Error checking validator NFT for address', address, ':', error);
    return null;
  }
}

/**
 * Check ALL connected wallets for validator NFTs
 * Returns the first validator NFT found, or null if none found
 */
export async function checkAllWalletsForValidatorNft(profileId) {
  try {
    console.log(`[ComprehensiveValidator] 🔍 Checking all wallets for validator NFT for profile ${profileId}`);
    
    // Get all addresses for this user
    const addresses = await fetchAllUserAddresses(profileId);
    
    if (addresses.length === 0) {
      console.log(`[ComprehensiveValidator] No addresses found for profile ${profileId}`);
      return null;
    }
    
    // Check each address for validator NFTs concurrently
    const validatorChecks = addresses.map(async (addrInfo) => {
      const validatorNft = await checkAddressForValidatorNft(addrInfo.address);
      return {
        address: addrInfo.address,
        type: addrInfo.type,
        validatorNft
      };
    });
    
    const results = await Promise.all(validatorChecks);
    
    // Find the first address that has a validator NFT
    const validatorResult = results.find(result => result.validatorNft !== null);
    
    if (validatorResult) {
      console.log(`[ComprehensiveValidator] ✅ Found validator NFT on ${validatorResult.type} address: ${validatorResult.address}`);
      return {
        ...validatorResult.validatorNft,
        foundOnAddress: validatorResult.address,
        addressType: validatorResult.type
      };
    }
    
    console.log(`[ComprehensiveValidator] ❌ No validator NFT found on any of ${addresses.length} addresses`);
    return null;
    
  } catch (error) {
    console.error('[ComprehensiveValidator] Error checking all wallets for validator NFT:', error);
    return null;
  }
}

/**
 * Check if user has validator NFT (boolean result)
 */
export async function hasValidatorNft(profileId) {
  const validatorNft = await checkAllWalletsForValidatorNft(profileId);
  return validatorNft !== null;
}
