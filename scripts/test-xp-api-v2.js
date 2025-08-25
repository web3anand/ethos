#!/usr/bin/env node

// Test script for V2 XP API endpoints
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const BASE_URL = 'https://api.ethos.network';

async function makeRequest(url) {
  console.log(`Making request to: ${url}`);
  
  try {
    const response = await fetch(url, {
      headers: {
        'X-Ethos-Client': 'ethos-app-dev',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`✅ Success! Response:`, JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    console.error(`❌ Error:`, error.message);
    return null;
  }
}

async function testXpApis() {
  console.log('🧪 Testing Ethos V2 XP API Endpoints...\n');

  // Test 1: Get seasons
  console.log('1. Testing /v2/xp/seasons');
  const seasons = await makeRequest(`${BASE_URL}/v2/xp/seasons`);
  
  if (seasons && seasons.length > 0) {
    const latestSeason = seasons[seasons.length - 1];
    console.log(`Found ${seasons.length} seasons. Latest: ${latestSeason.id}`);
    
    // Test 2: Get weeks for latest season
    console.log(`\n2. Testing /v2/xp/seasons/${latestSeason.id}/weeks`);
    const weeks = await makeRequest(`${BASE_URL}/v2/xp/seasons/${latestSeason.id}/weeks`);
    
    if (weeks && weeks.length > 0) {
      console.log(`Found ${weeks.length} weeks for season ${latestSeason.id}`);
    }
    
    // Test 3: Test user XP endpoints (using a sample userkey)
    const testUserkey = 'https://x.com/ethosDotNetwork'; // Ethos Network's own account
    
    console.log(`\n3. Testing /v2/xp/users/${encodeURIComponent(testUserkey)}`);
    await makeRequest(`${BASE_URL}/v2/xp/users/${encodeURIComponent(testUserkey)}`);
    
    console.log(`\n4. Testing /v2/xp/users/${encodeURIComponent(testUserkey)}/seasons/${latestSeason.id}/weeks`);
    await makeRequest(`${BASE_URL}/v2/xp/users/${encodeURIComponent(testUserkey)}/seasons/${latestSeason.id}/weeks`);
    
    console.log(`\n5. Testing /v2/xp/users/${encodeURIComponent(testUserkey)}/leaderboard-rank`);
    await makeRequest(`${BASE_URL}/v2/xp/users/${encodeURIComponent(testUserkey)}/leaderboard-rank`);
  }
  
  console.log('\n🏁 XP API testing complete!');
}

// Run the tests
testXpApis().catch(console.error);
