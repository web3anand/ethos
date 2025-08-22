// Demo script to test comprehensive Ethos API integration
// Run with: node scripts/test-ethos-api.js

import { searchUsers, getUserByXUsername, getUserByUsername, getEthosCacheStats } from '../utils/ethosApiClient.js';

async function testEthosApiIntegration() {
  console.log('🚀 Testing Comprehensive Ethos API Integration\n');
  
  // Test 1: General user search
  console.log('📋 Test 1: General User Search');
  try {
    const searchQueries = ['vitalik', 'ethereum', 'crypto', 'has'];
    
    for (const query of searchQueries) {
      console.log(`\n  Searching for: "${query}"`);
      const users = await searchUsers(query, 5);
      
      if (users && users.length > 0) {
        console.log(`  ✅ Found ${users.length} users:`);
        users.forEach((user, index) => {
          console.log(`     ${index + 1}. ${user.displayName || user.username} (@${user.username || 'N/A'})`);
          console.log(`        Score: ${user.score || 0}, ProfileID: ${user.profileId || 'N/A'}`);
          if (user.bio) console.log(`        Bio: ${user.bio.substring(0, 60)}${user.bio.length > 60 ? '...' : ''}`);
        });
      } else {
        console.log(`  ❌ No users found`);
      }
    }
  } catch (error) {
    console.error(`  ❌ Error: ${error.message}`);
  }
  
  // Test 2: X username lookup
  console.log('\n\n📋 Test 2: X Username Lookup');
  try {
    const xUsernames = ['vitalikbuterin', 'elonmusk', 'jack'];
    
    for (const username of xUsernames) {
      console.log(`\n  Looking up X user: @${username}`);
      const user = await getUserByXUsername(username);
      
      if (user) {
        console.log(`  ✅ Found: ${user.displayName} (@${user.username})`);
        console.log(`     Score: ${user.score}, ProfileID: ${user.profileId}`);
        console.log(`     XP Total: ${user.xpTotal || 'N/A'}`);
      } else {
        console.log(`  ❌ User not found (may not be on Ethos)`);
      }
    }
  } catch (error) {
    console.error(`  ❌ Error: ${error.message}`);
  }
  
  // Test 3: Direct username lookup
  console.log('\n\n📋 Test 3: Direct Username Lookup');
  try {
    const usernames = ['vitalik', 'admin', 'test'];
    
    for (const username of usernames) {
      console.log(`\n  Looking up username: ${username}`);
      const user = await getUserByUsername(username);
      
      if (user) {
        console.log(`  ✅ Found: ${user.displayName} (@${user.username})`);
        console.log(`     Score: ${user.score}, ProfileID: ${user.profileId}`);
        if (user.userkeys) {
          console.log(`     Userkeys: ${user.userkeys.slice(0, 2).join(', ')}${user.userkeys.length > 2 ? '...' : ''}`);
        }
      } else {
        console.log(`  ❌ User not found`);
      }
    }
  } catch (error) {
    console.error(`  ❌ Error: ${error.message}`);
  }
  
  // Test 4: Search functionality demo (simulating search bar)
  console.log('\n\n📋 Test 4: Search Bar Simulation');
  try {
    const searchQueries = ['vi', 'eth', 'crypto', 'buterin'];
    
    for (const query of searchQueries) {
      console.log(`\n  User types: "${query}"`);
      const suggestions = await searchUsers(query, 3);
      
      if (suggestions && suggestions.length > 0) {
        console.log(`  ✅ Search suggestions:`);
        suggestions.forEach((suggestion, index) => {
          const displayName = suggestion.displayName || suggestion.username;
          const username = suggestion.username || 'N/A';
          const score = suggestion.score || 0;
          console.log(`     ${index + 1}. ${displayName} (@${username}) - Score: ${score}`);
        });
      } else {
        console.log(`  ❌ No suggestions found`);
      }
    }
  } catch (error) {
    console.error(`  ❌ Error: ${error.message}`);
  }
  
  // Test 5: Cache statistics
  console.log('\n\n📋 Test 5: Cache Performance');
  const cacheStats = getEthosCacheStats();
  console.log(`  Cache size: ${cacheStats.size} entries`);
  if (cacheStats.entries.length > 0) {
    console.log(`  Sample cached keys: ${cacheStats.entries.slice(0, 3).join(', ')}${cacheStats.entries.length > 3 ? '...' : ''}`);
  }
  
  // Test 6: Performance comparison (cache hit vs fresh request)
  console.log('\n\n📋 Test 6: Cache Performance Test');
  try {
    const testQuery = 'vitalik';
    
    console.log(`  First search for "${testQuery}" (cache miss):`);
    const start1 = Date.now();
    await searchUsers(testQuery, 3);
    const time1 = Date.now() - start1;
    console.log(`  ⏱️  Time: ${time1}ms`);
    
    console.log(`  Second search for "${testQuery}" (cache hit):`);
    const start2 = Date.now();
    await searchUsers(testQuery, 3);
    const time2 = Date.now() - start2;
    console.log(`  ⏱️  Time: ${time2}ms`);
    
    console.log(`  🚀 Cache speedup: ${Math.round((time1 / time2) * 100) / 100}x faster`);
  } catch (error) {
    console.error(`  ❌ Error: ${error.message}`);
  }
  
  console.log('\n🎉 Ethos API integration test completed!');
  console.log('\n💡 Key Benefits:');
  console.log('   ✅ No API keys required');
  console.log('   ✅ Comprehensive user search across multiple sources');
  console.log('   ✅ Built-in caching for performance');
  console.log('   ✅ Real Ethos user data with scores and stats');
  console.log('   ✅ Twitter username cross-referencing');
  console.log('   ✅ Multiple API versions for maximum coverage');
}

// Handle async execution
if (import.meta.url === `file://${process.argv[1]}`) {
  testEthosApiIntegration().catch(console.error);
}

export default testEthosApiIntegration;
