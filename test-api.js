// Test script to debug the API issue
import fs from 'fs';
import path from 'path';

const API_BASE_URL = 'https://api.ethos.network/api/v2';
const HEADERS = {
  'Content-Type': 'application/json',
  'X-Ethos-Client': 'ethos-website-incremental-updater'
};

async function testProfileFetch(profileId) {
  try {
    console.log(`Testing profile ${profileId}...`);
    const response = await fetch(`${API_BASE_URL}/users/by/profile-id`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ profileIds: [profileId] })
    });
    
    if (!response.ok) {
      console.log(`❌ Profile ${profileId}: HTTP ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    const profile = Array.isArray(data) && data.length > 0 ? data[0] : null;
    
    if (profile) {
      console.log(`✅ Profile ${profileId}: ${profile.displayName} (${profile.username})`);
      return profile;
    } else {
      console.log(`❌ Profile ${profileId}: No data returned`);
      return null;
    }
  } catch (error) {
    console.log(`❌ Profile ${profileId}: ${error.message}`);
    return null;
  }
}

async function testXpFetch(profileId) {
  try {
    console.log(`Testing XP for profile ${profileId}...`);
    const response = await fetch(`${API_BASE_URL}/xp/user/profileId:${profileId}`, {
      headers: HEADERS
    });
    
    if (!response.ok) {
      console.log(`❌ XP ${profileId}: HTTP ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    console.log(`✅ XP ${profileId}:`, data);
    return data;
  } catch (error) {
    console.log(`❌ XP ${profileId}: ${error.message}`);
    return null;
  }
}

async function testWeeklyXp(profileId, season) {
  try {
    console.log(`Testing weekly XP for profile ${profileId}, season ${season}...`);
    const response = await fetch(`${API_BASE_URL}/xp/user/profileId:${profileId}/season/${season}/weekly`, {
      headers: HEADERS
    });
    
    if (!response.ok) {
      console.log(`❌ Weekly XP ${profileId} s${season}: HTTP ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    console.log(`✅ Weekly XP ${profileId} s${season}: ${Array.isArray(data) ? data.length : 'not array'} records`);
    return data;
  } catch (error) {
    console.log(`❌ Weekly XP ${profileId} s${season}: ${error.message}`);
    return null;
  }
}

async function main() {
  console.log('🧪 Testing API endpoints...\n');
  
  // Test profiles 1-5
  for (let i = 1; i <= 5; i++) {
    const profile = await testProfileFetch(i);
    if (profile) {
      await testXpFetch(i);
      await testWeeklyXp(i, 0);
      await testWeeklyXp(i, 1);
    }
    console.log('---');
  }
  
  console.log('✅ Test complete');
}

main().catch(console.error);
