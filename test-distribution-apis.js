#!/usr/bin/env node

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testDistributionApis() {
  const baseUrl = 'https://api.ethos.network/api/v2';
  
  console.log('🧪 Testing Ethos XP Distribution APIs...\n');
  
  // Test 1: Get seasons info
  console.log('1. Testing /xp/seasons');
  try {
    const response = await fetch(`${baseUrl}/xp/seasons`);
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Seasons data:');
      console.log('Current season:', data.currentSeason);
      console.log('Total seasons:', data.seasons.length);
      
      // Test 2: Get users search (for leaderboard)
      console.log('\n2. Testing /users/search with crypto query');
      const usersResponse = await fetch(`${baseUrl}/users/search?query=crypto&limit=50`);
      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        console.log('✅ Users search data:');
        console.log('Total users found:', usersData.total);
        console.log('Users returned:', usersData.values.length);
        if (usersData.values[0]) {
          console.log('Sample user fields:', Object.keys(usersData.values[0]));
          console.log('Sample user XP total:', usersData.values[0].xpTotal);
          console.log('Sample user score:', usersData.values[0].score);
        }
      } else {
        console.log('❌ Users search failed:', usersResponse.status);
      }
      
      // Test 3: Get week data for current season
      const currentSeason = data.currentSeason;
      if (currentSeason) {
        console.log(`\n3. Testing /xp/season/${currentSeason.id}/weeks`);
        const weeksResponse = await fetch(`${baseUrl}/xp/season/${currentSeason.id}/weeks`);
        if (weeksResponse.ok) {
          const weeksData = await weeksResponse.json();
          console.log('✅ Weeks data:');
          console.log('Total weeks:', weeksData.length);
          console.log('Sample week:', weeksData[0]);
        } else {
          console.log('❌ Weeks data failed:', weeksResponse.status);
        }
      }
      
    } else {
      console.log('❌ Seasons failed:', response.status);
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  
  // Test 4: Try to get larger user sample using different queries
  console.log('\n4. Testing user searches for leaderboard building');
  const queries = ['eth', 'web3', 'crypto', 'defi', 'nft'];
  let allUsers = new Map(); // Use Map to avoid duplicates by profileId
  
  for (const query of queries) {
    try {
      const response = await fetch(`${baseUrl}/users/search?query=${query}&limit=50`);
      if (response.ok) {
        const data = await response.json();
        console.log(`Query "${query}": ${data.values.length} users`);
        
        // Add users to our collection
        data.values.forEach(user => {
          allUsers.set(user.profileId, user);
        });
      }
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.log(`Error with query "${query}":`, error.message);
    }
  }
  
  console.log(`\nTotal unique users collected: ${allUsers.size}`);
  
  // Show top users by XP
  const sortedUsers = Array.from(allUsers.values())
    .filter(user => user.xpTotal > 0)
    .sort((a, b) => b.xpTotal - a.xpTotal)
    .slice(0, 10);
    
  console.log('\nTop 10 users by XP:');
  sortedUsers.forEach((user, index) => {
    console.log(`${index + 1}. ${user.displayName || user.username} - ${user.xpTotal} XP`);
  });
}

testDistributionApis().catch(console.error);
