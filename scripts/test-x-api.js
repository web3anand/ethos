// Demo script to test X API integration
// Run with: node scripts/test-x-api.js

import { getUserByUsername, searchUsers, isXApiConfigured, getXApiCacheStats } from '../utils/xApiClient.js';

async function testXApiIntegration() {
  console.log('🚀 Testing X API Integration\n');
  
  // Check if API is configured
  if (!isXApiConfigured()) {
    console.error('❌ X API not configured. Please set your Bearer Token in .env.local');
    console.log('   NEXT_PUBLIC_X_BEARER_TOKEN=your_bearer_token_here\n');
    return;
  }
  
  console.log('✅ X API configured\n');
  
  // Test 1: Direct username lookup
  console.log('📋 Test 1: Direct Username Lookup');
  try {
    const testUsernames = ['elonmusk', 'jack', 'twitter'];
    
    for (const username of testUsernames) {
      console.log(`\n  Looking up: @${username}`);
      const user = await getUserByUsername(username);
      
      if (user) {
        console.log(`  ✅ Found: ${user.name} (@${user.username})`);
        console.log(`     Followers: ${user.public_metrics?.followers_count?.toLocaleString()}`);
        console.log(`     Verified: ${user.verified ? '✅' : '❌'}`);
      } else {
        console.log(`  ❌ User not found`);
      }
    }
  } catch (error) {
    console.error(`  ❌ Error: ${error.message}`);
  }
  
  // Test 2: User search (requires elevated access)
  console.log('\n\n📋 Test 2: User Search (Elevated Access Required)');
  try {
    const searchQueries = ['elon', 'javascript', 'twitter'];
    
    for (const query of searchQueries) {
      console.log(`\n  Searching for: "${query}"`);
      const users = await searchUsers(query, 3);
      
      if (users && users.length > 0) {
        console.log(`  ✅ Found ${users.length} users:`);
        users.forEach((user, index) => {
          console.log(`     ${index + 1}. ${user.name} (@${user.username})`);
          console.log(`        Followers: ${user.public_metrics?.followers_count?.toLocaleString()}`);
        });
      } else {
        console.log(`  ❌ No users found`);
      }
    }
  } catch (error) {
    console.error(`  ❌ Error: ${error.message}`);
    if (error.message.includes('elevated access')) {
      console.log('    💡 This feature requires elevated access (paid plan)');
    }
  }
  
  // Test 3: Cache statistics
  console.log('\n\n📋 Test 3: Cache Statistics');
  const cacheStats = getXApiCacheStats();
  console.log(`  Cache size: ${cacheStats.size} entries`);
  if (cacheStats.entries.length > 0) {
    console.log(`  Cached keys: ${cacheStats.entries.slice(0, 5).join(', ')}${cacheStats.entries.length > 5 ? '...' : ''}`);
  }
  
  console.log('\n🎉 Test completed!');
}

// Handle async execution
if (import.meta.url === `file://${process.argv[1]}`) {
  testXApiIntegration().catch(console.error);
}

export default testXApiIntegration;
