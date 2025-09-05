#!/usr/bin/env node

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testUserSearchEndpoints() {
  const baseUrl = 'https://api.ethos.network';
  const endpoints = [
    '/api/v2/users/search?limit=50',
    '/api/v2/users/search?query=&limit=100',
    '/api/v1/users/search?limit=100'
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`\nTesting: ${endpoint}`);
      const response = await fetch(baseUrl + endpoint);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ SUCCESS - Found ${data.values?.length || data.length || 0} users`);
        if (data.values?.[0]) {
          console.log('Sample user fields:', Object.keys(data.values[0]));
          console.log('Sample user:', JSON.stringify(data.values[0], null, 2));
        }
      } else {
        console.log(`❌ FAILED: ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ ERROR: ${error.message}`);
    }
  }
}

testUserSearchEndpoints().catch(console.error);
