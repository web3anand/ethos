import { searchUsers, getUserByUsername } from '../utils/ethosApiClient.js';

async function findValidUser() {
  console.log('🔍 FINDING VALID ETHOS USERS FOR TESTING');
  console.log('=======================================');

  try {
    // Search for common usernames that likely exist
    const searchQueries = ['test', 'admin', 'user', 'demo', 'vitalik', 'ethereum'];
    
    for (const query of searchQueries) {
      console.log(`\n📋 Searching for: "${query}"`);
      const users = await searchUsers(query, 5);
      
      if (users && users.length > 0) {
        console.log(`✅ Found ${users.length} users:`);
        users.forEach((user, index) => {
          console.log(`   ${index + 1}. ${user.displayName || user.username} (@${user.username || 'N/A'})`);
          console.log(`      ProfileID: ${user.profileId}, Score: ${user.score || 0}`);
          
          // Show userkeys if available
          if (user.userkeys && user.userkeys.length > 0) {
            console.log(`      Userkeys: ${user.userkeys.slice(0, 2).join(', ')}${user.userkeys.length > 2 ? '...' : ''}`);
          }
        });
        
        // Return the first user with a good score for testing
        const testUser = users.find(user => user.score > 100);
        if (testUser) {
          console.log(`\n🎯 Selected test user: ${testUser.displayName} (ID: ${testUser.profileId}, Score: ${testUser.score})`);
          return testUser;
        }
      } else {
        console.log(`❌ No users found for "${query}"`);
      }
    }

    // Try direct username lookups
    console.log('\n📋 Trying direct username lookups:');
    const directUsernames = ['admin', 'test', 'demo'];
    
    for (const username of directUsernames) {
      try {
        console.log(`\n🔍 Looking up username: ${username}`);
        const user = await getUserByUsername(username);
        
        if (user) {
          console.log(`✅ Found: ${user.displayName} (@${user.username})`);
          console.log(`   ProfileID: ${user.profileId}, Score: ${user.score}`);
          return user;
        }
      } catch (error) {
        console.log(`❌ Failed to lookup ${username}:`, error.message);
      }
    }

    console.log('\n⚠️ No valid users found for testing');
    return null;

  } catch (error) {
    console.error('❌ Error finding valid user:', error);
    return null;
  }
}

// Run the search
findValidUser().then(user => {
  if (user) {
    console.log('\n✅ Test user found - you can use this for testing the R4R system');
  } else {
    console.log('\n❌ No test user found - the API might require different approaches');
  }
});
