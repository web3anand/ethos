// Test the validator NFT cache system
import { checkValidatorNftsWithCache, isKnownValidatorNftHolder, KNOWN_VALIDATOR_NFT_HOLDERS } from './utils/validatorNftCache.js';

async function testValidatorCache() {
  console.log('🧪 Testing validator NFT cache system...');
  
  // Test immediate cache hits
  console.log('Known validator NFT holders:', Array.from(KNOWN_VALIDATOR_NFT_HOLDERS));
  console.log('serpinxbt (ID: 8) is known validator:', isKnownValidatorNftHolder(8));
  
  // Test mixed profiles (some cached, some not)
  const testProfiles = [
    { profileId: 8, username: 'serpinxbt' },     // Should be cached
    { profileId: 1337, username: 'testuser2' },  // Not cached
    { profileId: 10000, username: 'testuser3' }  // Not cached
  ];
  
  console.log('Testing with mixed profiles...');
  const startTime = Date.now();
  const results = await checkValidatorNftsWithCache(testProfiles, 5);
  const duration = Date.now() - startTime;
  
  console.log(`Results (${duration}ms):`, results);
  testProfiles.forEach(profile => {
    const hasNft = results.get(profile.profileId);
    console.log(`${profile.username} (ID: ${profile.profileId}): ${hasNft ? '✅ Has validator NFT' : '❌ No validator NFT'}`);
  });
  
  console.log('Updated cache:', Array.from(KNOWN_VALIDATOR_NFT_HOLDERS));
}

testValidatorCache().catch(console.error);
