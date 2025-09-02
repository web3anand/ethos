// Profile database builder using sequential profile ID approach
import { getUserByProfileId } from './utils/ethosApiClient.js';
import fs from 'fs';
import path from 'path';

class DirectProfileIdBuilder {
  constructor() {
    this.dataDir = './data';
    this.profilesFile = path.join(this.dataDir, 'user-profiles.json');
    this.metadataFile = path.join(this.dataDir, 'database-metadata.json');
    this.profiles = new Map();
    this.buildMeta = {
      lastProfileId: 0,
      consecutiveNotFound: 0,
      maxConsecutiveNotFound: 1000, // Stop after 1000 consecutive not found
      totalAttempts: 0,
      successfulFetches: 0,
      lastUpdated: null
    };
  }

  // Initialize data directory and load existing profiles
  async initialize() {
    console.log('🔧 Initializing Sequential Profile ID Builder...');
    
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
      console.log(`📁 Created data directory: ${this.dataDir}`);
    }
    
    await this.loadExistingProfiles();
    await this.loadBuildMeta();
    console.log(`✅ Initialized with ${this.profiles.size} existing profiles`);
    console.log(`📊 Will resume from profile ID: ${this.buildMeta.lastProfileId + 1}`);
  }

  // Load existing profiles from file
  async loadExistingProfiles() {
    try {
      if (fs.existsSync(this.profilesFile)) {
        const data = fs.readFileSync(this.profilesFile, 'utf8');
        const profilesArray = JSON.parse(data);
        
        profilesArray.forEach(profile => {
          const key = profile.primaryAddr || profile.address || profile.profileId;
          this.profiles.set(key, profile);
        });
        
        console.log(`📄 Loaded ${profilesArray.length} existing profiles from file`);
      } else {
        console.log('📄 No existing profiles file found, starting fresh');
      }
    } catch (error) {
      console.warn('⚠️ Error loading existing profiles:', error.message);
    }
  }

  // Load build metadata
  async loadBuildMeta() {
    try {
      if (fs.existsSync(this.metadataFile)) {
        const data = fs.readFileSync(this.metadataFile, 'utf8');
        const metadata = JSON.parse(data);
        
        if (metadata.buildMeta) {
          this.buildMeta = { ...this.buildMeta, ...metadata.buildMeta };
          console.log(`📊 Loaded build metadata: Last ID ${this.buildMeta.lastProfileId}, ${this.buildMeta.consecutiveNotFound} consecutive not found`);
        }
      }
    } catch (error) {
      console.warn('⚠️ Error loading build metadata:', error.message);
    }
  }

  // Fetch a single profile by ID using the correct V2 API endpoint
  async fetchProfileById(profileId) {
    try {
      this.buildMeta.totalAttempts++;
      
      console.log(`Fetching profile ${profileId}...`);
      
      // Use the V2 API endpoint that returns complete user data with scores
      const userData = await getUserByProfileId(profileId);
      
      if (!userData) {
        console.log(`Profile ${profileId} not found`);
        return null;
      }

      // Normalize the response to our format
      const profile = {
        profileId: userData.profileId,
        id: userData.id,
        username: userData.username,
        displayName: userData.displayName,
        avatarUrl: userData.avatarUrl,
        description: userData.description,
        score: userData.score || 0,
        xpTotal: userData.xpTotal || 0,
        xpStreakDays: userData.xpStreakDays || 0,
        status: userData.status,
        userkeys: userData.userkeys || [],
        links: userData.links || {},
        stats: userData.stats || {},
        source: 'profile-id-v2-api',
        fetchedAt: new Date().toISOString(),
        primaryAddr: userData.userkeys?.[0] || `profile_${profileId}`
      };

      console.log(`Profile ${profileId}: ${profile.displayName || profile.username} (Score: ${profile.score})`);
      this.buildMeta.successfulFetches++;
      return profile;

    } catch (error) {
      // Check if it's a "not found" error vs other errors
      if (error.message.includes('404') || 
          error.message.includes('not found') ||
          error.message.includes('User not found')) {
        return null; // User doesn't exist
      }
      
      // For other errors, log and continue
      console.warn(`   ⚠️ Error fetching profile ID ${profileId}:`, error.message);
      return null;
    }
  }

  // Build database using sequential profile IDs
  async buildDatabase(maxProfiles = 50000) {
    console.log(`\n🔢 Building database using sequential profile IDs (target: ${maxProfiles.toLocaleString()})...`);
    console.log(`📊 Starting from profile ID: ${this.buildMeta.lastProfileId + 1}`);
    console.log(`🛑 Will stop after ${this.buildMeta.maxConsecutiveNotFound} consecutive not found`);
    
    let newProfilesCount = 0;
    let batchSize = 100; // Process 100 IDs at a time
    let currentBatch = 0;
    const startTime = Date.now();
    
    // Continue from where we left off
    let profileId = this.buildMeta.lastProfileId + 1;
    
    while (profileId <= maxProfiles && this.buildMeta.consecutiveNotFound < this.buildMeta.maxConsecutiveNotFound) {
      currentBatch++;
      const batchEnd = Math.min(profileId + batchSize - 1, maxProfiles);
      
      console.log(`\n📦 Batch ${currentBatch}: Processing profile IDs ${profileId}-${batchEnd}`);
      console.log(`📊 Current: ${this.profiles.size.toLocaleString()} profiles | Consecutive not found: ${this.buildMeta.consecutiveNotFound}`);
      
      const batchStartTime = Date.now();
      let batchNewProfiles = 0;
      let batchNotFound = 0;
      
      // Process each profile ID in the batch
      for (let id = profileId; id <= batchEnd; id++) {
        console.log(`� Checking profile ID: ${id}`);
        
        // Check if we already have this profile
        const existingProfile = Array.from(this.profiles.values()).find(p => p.profileId === id);
        if (existingProfile) {
          console.log(`   ⏭️ Already have profile ID ${id}, skipping`);
          this.buildMeta.consecutiveNotFound = 0; // Reset counter
          this.buildMeta.lastProfileId = id;
          continue;
        }
        
        const profile = await this.fetchProfileById(id);
        
        if (profile && (profile.id || profile.userkeys || profile.username)) {
          // Found a valid profile
          const profileKey = profile.primaryAddr || profile.id?.toString() || profileId.toString();
          
          this.profiles.set(profileKey, profile);
          batchNewProfiles++;
          newProfilesCount++;
          
          // Reset consecutive not found counter
          this.buildMeta.consecutiveNotFound = 0;
          
          console.log(`   ✅ Found profile ID ${id}: ${profile.username || profile.displayName || profile.primaryAddr} (Score: ${profile.score || 0}, ID: ${profile.id})`);
          
        } else {
          // Profile not found
          batchNotFound++;
          this.buildMeta.consecutiveNotFound++;
          console.log(`   ❌ Profile ID ${id}: Not found (consecutive: ${this.buildMeta.consecutiveNotFound})`);
          
          // If we've hit too many consecutive not found, we might be done
          if (this.buildMeta.consecutiveNotFound >= this.buildMeta.maxConsecutiveNotFound) {
            console.log(`\n🛑 Stopping: ${this.buildMeta.consecutiveNotFound} consecutive profiles not found`);
            console.log(`   This likely means we've reached the end of valid profile IDs`);
            break;
          }
        }
        
        // Update last processed ID
        this.buildMeta.lastProfileId = id;
        
        // Rate limiting between requests
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Save progress every 50 profiles
        if ((id - profileId) % 50 === 0) {
          await this.saveProfiles();
          await this.saveBuildMeta();
          console.log(`     💾 Progress saved: ${this.profiles.size.toLocaleString()} profiles`);
        }
      }
      
      const batchTime = Date.now() - batchStartTime;
      console.log(`📊 Batch ${currentBatch} complete: +${batchNewProfiles} profiles, ${batchNotFound} not found in ${(batchTime/1000).toFixed(1)}s`);
      console.log(`📈 Progress: ${this.profiles.size.toLocaleString()}/${maxProfiles.toLocaleString()} profiles`);
      
      // Save progress after each batch
      await this.saveProfiles();
      await this.saveBuildMeta();
      
      // Move to next batch
      profileId = batchEnd + 1;
      
      // Rate limiting between batches
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Break if we've hit the consecutive limit
      if (this.buildMeta.consecutiveNotFound >= this.buildMeta.maxConsecutiveNotFound) {
        break;
      }
    }
    
    const totalTime = Date.now() - startTime;
    
    console.log(`\n🎉 Sequential ID database building complete!`);
    console.log(`✅ Total profiles: ${this.profiles.size.toLocaleString()}`);
    console.log(`✅ New profiles added: ${newProfilesCount.toLocaleString()}`);
    console.log(`✅ Last profile ID checked: ${this.buildMeta.lastProfileId}`);
    console.log(`✅ Successful fetches: ${this.buildMeta.successfulFetches}/${this.buildMeta.totalAttempts}`);
    console.log(`✅ Success rate: ${((this.buildMeta.successfulFetches / this.buildMeta.totalAttempts) * 100).toFixed(1)}%`);
    console.log(`✅ Time taken: ${(totalTime / 1000 / 60).toFixed(1)} minutes`);
    console.log(`✅ Consecutive not found: ${this.buildMeta.consecutiveNotFound}`);
    
    // Final save
    await this.saveProfiles();
    await this.saveBuildMeta();
    
    return this.profiles;
  }

  // Save profiles to file
  async saveProfiles() {
    try {
      const profilesArray = Array.from(this.profiles.values());
      profilesArray.sort((a, b) => (b.score || 0) - (a.score || 0));
      
      fs.writeFileSync(this.profilesFile, JSON.stringify(profilesArray, null, 2));
      console.log(`💾 Saved ${profilesArray.length.toLocaleString()} profiles to ${this.profilesFile}`);
    } catch (error) {
      console.error('❌ Error saving profiles:', error.message);
    }
  }

  // Save build metadata
  async saveBuildMeta() {
    try {
      const metadata = {
        totalProfiles: this.profiles.size,
        buildMeta: {
          ...this.buildMeta,
          lastUpdated: new Date().toISOString()
        },
        lastUpdated: new Date().toISOString()
      };
      
      fs.writeFileSync(this.metadataFile, JSON.stringify(metadata, null, 2));
    } catch (error) {
      console.error('❌ Error saving build metadata:', error.message);
    }
  }

  // Get database stats
  getStats() {
    const profiles = Array.from(this.profiles.values());
    
    return {
      totalProfiles: profiles.length,
      withScores: profiles.filter(p => p.score > 0).length,
      withReviews: profiles.filter(p => (p.positiveReviews || 0) + (p.negativeReviews || 0) > 0).length,
      averageScore: profiles.reduce((sum, p) => sum + (p.score || 0), 0) / profiles.length,
      topScore: Math.max(...profiles.map(p => p.score || 0)),
      discoveryMethods: [...new Set(profiles.map(p => p.discoveredBy))]
    };
  }
}

async function buildProfileDatabase() {
  console.log('🚀 Starting Sequential Profile ID Database Builder...\n');
  console.log('🔢 Strategy: Fetch profiles by sequential ID (1, 2, 3, 4, ...)');
  console.log('   - Systematic coverage of ALL Ethos profiles');
  console.log('   - No missed profiles, complete database');
  console.log('   - Resumes automatically from last checked ID');
  console.log('   - Stops when no more profiles exist\n');
  
  try {
    const builder = new DirectProfileIdBuilder();
    await builder.initialize();
    
    console.log('📊 Current database stats:');
    const initialStats = builder.getStats();
    console.log(`   Profiles: ${initialStats.totalProfiles.toLocaleString()}`);
    console.log(`   With scores: ${initialStats.withScores.toLocaleString()}`);
    console.log(`   Average score: ${initialStats.averageScore.toFixed(1)}`);
    console.log(`   Last checked ID: ${builder.buildMeta.lastProfileId}`);
    
    // Build the database starting from ID 1 (or resume)
    await builder.buildDatabase(50000); // Check up to 50,000 IDs
    
    console.log('\n📊 Final database stats:');
    const finalStats = builder.getStats();
    console.log(`   Total profiles: ${finalStats.totalProfiles.toLocaleString()}`);
    console.log(`   With scores: ${finalStats.withScores.toLocaleString()}`);
    console.log(`   With reviews: ${finalStats.withReviews.toLocaleString()}`);
    console.log(`   Average score: ${finalStats.averageScore.toFixed(1)}`);
    console.log(`   Top score: ${finalStats.topScore}`);
    console.log(`   Last checked ID: ${builder.buildMeta.lastProfileId}`);
    console.log(`   Success rate: ${((builder.buildMeta.successfulFetches / builder.buildMeta.totalAttempts) * 100).toFixed(1)}%`);
    
    console.log('\n🎉 Sequential Profile ID database ready for use!');
    console.log('📁 Files created:');
    console.log(`   - ./data/user-profiles.json (${finalStats.totalProfiles.toLocaleString()} profiles)`);
    console.log(`   - ./data/database-metadata.json (build info + resume data)`);
    
    if (builder.buildMeta.consecutiveNotFound < builder.buildMeta.maxConsecutiveNotFound) {
      console.log('\n🔄 Database building can continue:');
      console.log(`   - Run this script again to continue from ID ${builder.buildMeta.lastProfileId + 1}`);
      console.log(`   - Will automatically resume where it left off`);
    } else {
      console.log('\n✅ Database building complete:');
      console.log(`   - Reached end of valid profile IDs`);
      console.log(`   - Found ${builder.buildMeta.consecutiveNotFound} consecutive not found`);
      console.log(`   - Database contains all available Ethos profiles!`);
    }
    
  } catch (error) {
    console.error('\n❌ Database building failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the database builder
buildProfileDatabase();
