#!/usr/bin/env node

// Test script for the Ethos influencer score API endpoint
// GET /api/v1/users/:userkey/stats

const { getUserStats } = require('../utils/ethosApiClient.js');

async function testInfluencerScoreApi() {
  console.log('🚀 Testing Ethos Influencer Score API...\n');

  // Test cases with known X users
  const testCases = [
    'service:x.com:naval',      // Naval Ravikant
    'service:x.com:balajis',    // Balaji Srinivasan
    'service:x.com:elonmusk',   // Elon Musk
    'service:x.com:vitalikbuterin', // Vitalik Buterin
  ];

  for (const userkey of testCases) {
    console.log(`📊 Testing userkey: ${userkey}`);
    
    try {
      const stats = await getUserStats(userkey);
      
      if (stats) {
        console.log('✅ Success!');
        console.log(`   Influence Factor: ${stats.influenceFactor}`);
        console.log(`   Full stats:`, JSON.stringify(stats, null, 2));
      } else {
        console.log('❌ No stats returned');
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
    
    console.log(''); // Empty line for readability
  }

  // Test profileId format as fallback
  console.log('📊 Testing profileId format...');
  try {
    const stats = await getUserStats('profileId:12345');
    console.log('✅ ProfileId test result:', stats);
  } catch (error) {
    console.log(`❌ ProfileId test error: ${error.message}`);
  }
}

// Run the test
testInfluencerScoreApi().catch(console.error);
