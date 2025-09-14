import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class TestSmallBatch {
  constructor() {
    this.dataDir = path.join(__dirname, '..', 'data', 'csv');
    this.batchSize = 50; // Small test batch
    this.concurrency = 10; // Lower concurrency for testing
    this.delayMs = 50;
    
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  // Fetch batch of profile information
  async fetchProfilesBatch(profileIds) {
    try {
      const response = await fetch(`https://api.ethos.network/api/v2/users/by/profile-id`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Ethos-Client': 'ethoscard.vercel.app'
        },
        body: JSON.stringify({ profileIds: profileIds })
      });

      if (!response.ok) {
        console.error(`Batch fetch failed with status: ${response.status}`);
        return [];
      }

      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error(`Error fetching batch:`, error.message);
      return [];
    }
  }

  // Fetch season XP for a specific season
  async fetchSeasonXp(profileId, seasonId) {
    try {
      const response = await fetch(`https://api.ethos.network/api/v2/xp/user/profileId:${profileId}/season/${seasonId}`, {
        headers: {
          'X-Ethos-Client': 'ethoscard.vercel.app'
        }
      });

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      return null;
    }
  }

  // Fetch weekly XP for a specific season
  async fetchWeeklyXp(profileId, seasonId) {
    try {
      const response = await fetch(`https://api.ethos.network/api/v2/xp/user/profileId:${profileId}/season/${seasonId}/weekly`, {
        headers: {
          'X-Ethos-Client': 'ethoscard.vercel.app'
        }
      });

      if (!response.ok) {
        return [];
      }

      return await response.json();
    } catch (error) {
      return [];
    }
  }

  // Test batch processing
  async testBatch() {
    console.log('🧪 Testing small batch processing...');
    
    // Test with known profile IDs
    const testBatch = [25, 41, 298, 5476, 100, 200, 300, 400, 500, 600];
    
    console.log(`🔄 Testing batch of ${testBatch.length} profiles`);
    
    try {
      // Fetch basic profiles
      const profiles = await this.fetchProfilesBatch(testBatch);
      console.log(`✅ Found ${profiles.length}/${testBatch.length} profiles`);
      
      if (profiles.length === 0) {
        console.log('❌ No profiles found, stopping test');
        return;
      }

      // Test XP fetching for first few profiles
      for (let i = 0; i < Math.min(3, profiles.length); i++) {
        const profile = profiles[i];
        console.log(`\n🔍 Testing XP data for profile ${profile.profileId} (${profile.username || 'No username'})`);
        
        for (const seasonId of [0, 1]) {
          const seasonXp = await this.fetchSeasonXp(profile.profileId, seasonId);
          const weeklyXp = await this.fetchWeeklyXp(profile.profileId, seasonId);
          
          console.log(`   Season ${seasonId}: ${seasonXp || 0} XP, ${weeklyXp ? weeklyXp.length : 0} weeks`);
          
          // Small delay
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
      
      console.log('\n✅ Small batch test completed successfully!');
      console.log('📊 Summary:');
      console.log(`   - Batch size tested: ${testBatch.length}`);
      console.log(`   - Profiles found: ${profiles.length}`);
      console.log(`   - Success rate: ${((profiles.length / testBatch.length) * 100).toFixed(1)}%`);
      
    } catch (error) {
      console.error('❌ Test failed:', error);
    }
  }
}

// Run the test
console.log('🧪 Starting small batch test...');
const tester = new TestSmallBatch();
tester.testBatch()
  .then(() => console.log('✅ Test completed'))
  .catch(console.error);

