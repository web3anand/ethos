#!/usr/bin/env node

// Test script for finding XP leaderboard/distribution endpoints
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testLeaderboardEndpoints() {
  const baseUrl = 'https://api.ethos.network';
  const endpoints = [
    '/api/v2/xp/leaderboard',
    '/api/v2/xp/stats', 
    '/api/v2/users/search?limit=100&orderBy=xpTotal&direction=desc',
    '/api/v2/users/search?limit=50&orderBy=score&direction=desc',
    '/api/v1/leaderboard',
    '/api/v1/stats'
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`\nTesting: ${endpoint}`);
      const response = await fetch(baseUrl + endpoint, {
        headers: {
          'X-Ethos-Client': 'ethos-app-dev',
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ SUCCESS: ${endpoint}`);
        console.log(`Response keys:`, Object.keys(data));
        if (data.values) {
          console.log(`Found ${data.values.length} items`);
          if (data.values[0]) {
            console.log(`Sample item keys:`, Object.keys(data.values[0]));
          }
        }
        if (Array.isArray(data)) {
          console.log(`Array length: ${data.length}`);
        }
      } else {
        console.log(`❌ FAILED: ${endpoint} - ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ ERROR: ${endpoint} - ${error.message}`);
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

console.log('🧪 Testing Ethos API for leaderboard/distribution endpoints...\n');
testLeaderboardEndpoints().catch(console.error);
