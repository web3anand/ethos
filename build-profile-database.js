// Enhanced profile database builder using Ethos API name search
import ethosApiClient from './utils/ethosApiClient.js';
import fs from 'fs';
import path from 'path';

class ProfileDatabaseBuilder {
  constructor() {
    this.dataDir = './data';
    this.profilesFile = path.join(this.dataDir, 'user-profiles.json');
    this.metadataFile = path.join(this.dataDir, 'database-metadata.json');
    this.profiles = new Map();
    this.searchTerms = [
      // Popular crypto/web3 terms
      'crypto', 'defi', 'nft', 'web3', 'ethereum', 'btc', 'eth', 'dao', 'blockchain',
      'trading', 'hodl', 'degen', 'yield', 'farming', 'staking', 'mining',
      
      // Common names and usernames
      'alex', 'mike', 'john', 'sara', 'anna', 'dev', 'user', 'test', 'admin',
      'trader', 'investor', 'builder', 'founder', 'ceo', 'cto',
      
      // Tech terms
      'tech', 'ai', 'ml', 'data', 'code', 'dev', 'engineer', 'startup',
      
      // Social terms  
      'official', 'real', 'verified', 'team', 'community', 'support',
      
      // Numbers and common patterns
      '1', '2', '3', '123', '2024', '2023', 'x', 'the', 'pro', 'max'
    ];
  }

  // Initialize data directory and load existing profiles
  async initialize() {
    console.log('🔧 Initializing Profile Database Builder...');
    
    // Create data directory if it doesn't exist
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
      console.log(`📁 Created data directory: ${this.dataDir}`);
    }
    
    // Load existing profiles
    await this.loadExistingProfiles();
    
    console.log(`✅ Initialized with ${this.profiles.size} existing profiles`);
  }

  // Load existing profiles from file
  async loadExistingProfiles() {
    try {
      if (fs.existsSync(this.profilesFile)) {
        const data = fs.readFileSync(this.profilesFile, 'utf8');
        const profilesArray = JSON.parse(data);
        
        profilesArray.forEach(profile => {
          this.profiles.set(profile.primaryAddr || profile.address, profile);
        });
        
        console.log(`📄 Loaded ${profilesArray.length} existing profiles from file`);
      } else {
        console.log('📄 No existing profiles file found, starting fresh');
      }
    } catch (error) {
      console.warn('⚠️ Error loading existing profiles:', error.message);
    }
  }

  // Search for users using name/username search
  async searchUsers(query, limit = 50) {
    try {
      console.log(`🔍 Searching for "${query}" (limit: ${limit})...`);
      
      const results = await ethosApiClient.xStyleUserLookup(query, limit);
      
      if (results && results.length > 0) {
        console.log(`   ✅ Found ${results.length} users for "${query}"`);
        return results;
      } else {
        console.log(`   ⚠️ No users found for "${query}"`);
        return [];
      }
      
    } catch (error) {
      console.warn(`   ❌ Error searching "${query}":`, error.message);
      return [];
    }
  }

  // Get detailed profile for a user
  async getDetailedProfile(user) {
    try {
      let profile = null;
      
      // Try different methods to get profile
      if (user.primaryAddr) {
        profile = await ethosApiClient.getProfileByAddress(user.primaryAddr);
      } else if (user.address) {
        profile = await ethosApiClient.getProfileByAddress(user.address);
      } else if (user.username) {
        profile = await ethosApiClient.getUserByUsernameV2(user.username);
      }
      
      if (profile) {
        // Enhance with user stats
        try {
          const stats = await ethosApiClient.getUserStats(profile.userkey || profile.id);
          if (stats) {
            profile.detailedStats = stats;
          }
        } catch (statsError) {
          // Stats not critical, continue without them
        }
        
        return profile;
      }
      
      return null;
      
    } catch (error) {
      console.warn(`   ⚠️ Error getting detailed profile:`, error.message);
      return null;
    }
  }

  // Build comprehensive user database
  async buildDatabase(maxProfiles = 20000) {
    console.log(`\n🏗️ Building comprehensive user database (target: ${maxProfiles.toLocaleString()})...`);
    
    let newProfilesCount = 0;
    let searchedTerms = 0;
    const startTime = Date.now();
    
    for (const term of this.searchTerms) {
      if (this.profiles.size >= maxProfiles) {
        console.log(`🎯 Target of ${maxProfiles.toLocaleString()} profiles reached!`);
        break;
      }
      
      searchedTerms++;
      console.log(`\n📊 Progress: ${searchedTerms}/${this.searchTerms.length} terms | ${this.profiles.size.toLocaleString()}/${maxProfiles.toLocaleString()} profiles`);
      
      // Search for users with this term
      const users = await this.searchUsers(term, 100); // Get more results per search
      
      if (users.length > 0) {
        console.log(`   🔍 Processing ${users.length} users from "${term}"...`);
        
        // Process users in batches
        const batchSize = 10;
        for (let i = 0; i < users.length; i += batchSize) {
          const batch = users.slice(i, i + batchSize);
          
          for (const user of batch) {
            const userKey = user.primaryAddr || user.address || user.username;
            
            if (!userKey || this.profiles.has(userKey)) {
              continue; // Skip if no key or already have this user
            }
            
            // Get detailed profile
            const detailedProfile = await this.getDetailedProfile(user);
            
            if (detailedProfile) {
              this.profiles.set(userKey, {
                ...detailedProfile,
                discoveredBy: term,
                discoveredAt: new Date().toISOString(),
                source: 'ethos-name-search'
              });
              
              newProfilesCount++;
              
              if (newProfilesCount % 10 === 0) {
                console.log(`     ✅ Added ${newProfilesCount} new profiles (${this.profiles.size.toLocaleString()} total)`);
              }
            }
            
            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          
          // Save progress periodically
          if (newProfilesCount % 50 === 0) {
            await this.saveProfiles();
            console.log(`     💾 Progress saved: ${this.profiles.size.toLocaleString()} profiles`);
          }
          
          // Batch rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      // Term rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    const totalTime = Date.now() - startTime;
    
    console.log(`\n🎉 Database building complete!`);
    console.log(`✅ Total profiles: ${this.profiles.size.toLocaleString()}`);
    console.log(`✅ New profiles added: ${newProfilesCount.toLocaleString()}`);
    console.log(`✅ Time taken: ${(totalTime / 1000 / 60).toFixed(1)} minutes`);
    
    // Final save
    await this.saveProfiles();
    await this.saveMetadata({ 
      totalProfiles: this.profiles.size,
      newProfilesAdded: newProfilesCount,
      searchTermsUsed: searchedTerms,
      buildTime: totalTime,
      lastUpdated: new Date().toISOString()
    });
    
    return this.profiles;
  }

  // Save profiles to file
  async saveProfiles() {
    try {
      const profilesArray = Array.from(this.profiles.values());
      
      // Sort by score descending
      profilesArray.sort((a, b) => (b.score || 0) - (a.score || 0));
      
      fs.writeFileSync(this.profilesFile, JSON.stringify(profilesArray, null, 2));
      console.log(`💾 Saved ${profilesArray.length.toLocaleString()} profiles to ${this.profilesFile}`);
      
    } catch (error) {
      console.error('❌ Error saving profiles:', error.message);
    }
  }

  // Save metadata
  async saveMetadata(metadata) {
    try {
      fs.writeFileSync(this.metadataFile, JSON.stringify(metadata, null, 2));
      console.log(`📊 Saved metadata to ${this.metadataFile}`);
    } catch (error) {
      console.error('❌ Error saving metadata:', error.message);
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
      sources: [...new Set(profiles.map(p => p.source))],
      discoveryTerms: [...new Set(profiles.map(p => p.discoveredBy))]
    };
  }
}

async function buildProfileDatabase() {
  console.log('🚀 Starting Profile Database Builder (Name Search Method)...\n');
  
  try {
    const builder = new ProfileDatabaseBuilder();
    await builder.initialize();
    
    console.log('📊 Current database stats:');
    const initialStats = builder.getStats();
    console.log(`   Profiles: ${initialStats.totalProfiles.toLocaleString()}`);
    console.log(`   With scores: ${initialStats.withScores.toLocaleString()}`);
    console.log(`   Average score: ${initialStats.averageScore.toFixed(1)}`);
    
    // Build the database
    await builder.buildDatabase(20000); // Target 20K profiles
    
    console.log('\n📊 Final database stats:');
    const finalStats = builder.getStats();
    console.log(`   Total profiles: ${finalStats.totalProfiles.toLocaleString()}`);
    console.log(`   With scores: ${finalStats.withScores.toLocaleString()}`);
    console.log(`   With reviews: ${finalStats.withReviews.toLocaleString()}`);
    console.log(`   Average score: ${finalStats.averageScore.toFixed(1)}`);
    console.log(`   Top score: ${finalStats.topScore}`);
    console.log(`   Discovery terms used: ${finalStats.discoveryTerms.length}`);
    
    console.log('\n🎉 Profile database ready for use!');
    console.log('� Files created:');
    console.log(`   - ./data/user-profiles.json (${finalStats.totalProfiles.toLocaleString()} profiles)`);
    console.log(`   - ./data/database-metadata.json (build info)`);
    
  } catch (error) {
    console.error('\n❌ Database building failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the database builder
buildProfileDatabase();
