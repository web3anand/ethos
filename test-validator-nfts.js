// Test script for validator NFT functionality
import { checkValidatorNft, checkValidatorNftsForProfiles } from './utils/validatorNftApi.js';

async function testValidatorNfts() {
  console.log('🧪 Testing validator NFT functionality...');
  
  // Test sample profiles (including top users)
  const testProfiles = [
    { profileId: 8, username: 'serpinxbt' },     // Top XP user
    { profileId: 1337, username: 'testuser2' },
    { profileId: 10000, username: 'testuser3' }
  ];
  
  console.log('Testing individual NFT check...');
  const result1 = await checkValidatorNft(1);
  console.log(`Profile 1 has validator NFT: ${result1}`);
  
  console.log('Testing batch NFT check...');
  const batchResults = await checkValidatorNftsForProfiles(testProfiles, 2);
  console.log('Batch results:', batchResults);
  
  testProfiles.forEach(profile => {
    const hasNft = batchResults.get(profile.profileId);
    console.log(`${profile.username} (ID: ${profile.profileId}): ${hasNft ? '✅ Has validator NFT' : '❌ No validator NFT'}`);
  });
}

testValidatorNfts().catch(console.error);
