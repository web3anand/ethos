import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DebugApiFields {
  constructor() {
    console.log('🔍 Debug API Fields initialized');
  }

  // Fetch batch of profile information
  async fetchProfilesBatch(profileIds) {
    try {
      console.log(`🔄 Fetching profiles: ${profileIds.join(', ')}`);
      
      const response = await fetch(`https://api.ethos.network/api/v2/users/by/profile-id`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Ethos-Client': 'ethoscard.vercel.app'
        },
        body: JSON.stringify({ profileIds: profileIds })
      });

      if (!response.ok) {
        console.error(`❌ Batch fetch failed with status: ${response.status}`);
        return [];
      }

      const data = await response.json();
      console.log(`✅ Raw API response:`, JSON.stringify(data, null, 2));
      
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error(`❌ Error fetching batch:`, error.message);
      return [];
    }
  }

  // Debug known profiles
  async debugKnownProfiles() {
    console.log('🧪 Debugging API fields for known profiles...');
    
    // Test with known profile IDs that should exist
    const testProfiles = [41, 298, 500, 5476];
    
    try {
      const profiles = await this.fetchProfilesBatch(testProfiles);
      
      console.log(`\n📊 Found ${profiles.length} profiles:`);
      
      for (const profile of profiles) {
        console.log(`\n🔍 Profile ID: ${profile.profileId}`);
        console.log(`📝 All fields:`, Object.keys(profile));
        console.log(`👤 Username: ${profile.username}`);
        console.log(`🏷️  Display Name: ${profile.displayName}`);
        console.log(`🎯 Score: ${profile.score}`);
        console.log(`📊 Credibility Score: ${profile.credibilityScore}`);
        console.log(`🔥 Streak Days: ${profile.streakDays}`);
        console.log(`🔥 Streak: ${profile.streak}`);
        console.log(`✅ Validator Holding: ${profile.validatorHolding}`);
        console.log(`🛡️  Is Validator: ${profile.isValidator}`);
        console.log(`🔗 Avatar URL: ${profile.avatarUrl ? 'Present' : 'None'}`);
        console.log(`📄 Description: ${profile.description ? 'Present' : 'None'}`);
        
        // Log the entire profile object for first profile
        if (profile.profileId === testProfiles[0]) {
          console.log(`\n📋 Full profile object for ${profile.profileId}:`);
          console.log(JSON.stringify(profile, null, 2));
        }
      }
      
    } catch (error) {
      console.error('❌ Debug failed:', error);
    }
  }
}

// Run the debug
console.log('🔍 Starting API fields debug...');
const fieldDebugger = new DebugApiFields();
fieldDebugger.debugKnownProfiles()
  .then(() => console.log('✅ Debug completed'))
  .catch(console.error);
