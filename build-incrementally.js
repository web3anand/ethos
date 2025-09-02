import ethosApiClient from './utils/ethosApiClient.js';
import fs from 'fs/promises';
import path from 'path';

class IncrementalProfileBuilder {
  constructor() {
    this.dataDir = './data';
    this.profilesFile = path.join(this.dataDir, 'user-profiles.json');
    this.metaFile = path.join(this.dataDir, 'build-meta.json');
    this.profiles = new Map();
    this.buildMeta = {
      lastUpdated: null,
      totalProfiles: 0,
      buildHistory: [],
      lastSearchIndex: 0
    };
    
    // Comprehensive username patterns for rapid profile discovery
    this.searchPatterns = [
      // Single letters and numbers
      'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
      'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
      '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
      
      // Two letter combinations (high probability)
      'ab', 'ac', 'ad', 'ae', 'af', 'ag', 'ah', 'ai', 'aj', 'ak', 'al', 'am', 'an', 'ao', 'ap',
      'ba', 'bc', 'bd', 'be', 'bf', 'bg', 'bh', 'bi', 'bj', 'bk', 'bl', 'bm', 'bn', 'bo', 'bp',
      'ca', 'cb', 'cd', 'ce', 'cf', 'cg', 'ch', 'ci', 'cj', 'ck', 'cl', 'cm', 'cn', 'co', 'cp',
      'da', 'db', 'dc', 'de', 'df', 'dg', 'dh', 'di', 'dj', 'dk', 'dl', 'dm', 'dn', 'do', 'dp',
      'ea', 'eb', 'ec', 'ed', 'ef', 'eg', 'eh', 'ei', 'ej', 'ek', 'el', 'em', 'en', 'eo', 'ep',
      
      // Three letter combinations (common patterns)
      'abc', 'abd', 'abe', 'abf', 'abg', 'abh', 'abi', 'abj', 'abk', 'abl', 'abm', 'abn', 'abo', 'abp',
      'acb', 'acd', 'ace', 'acf', 'acg', 'ach', 'aci', 'acj', 'ack', 'acl', 'acm', 'acn', 'aco', 'acp',
      'adb', 'adc', 'ade', 'adf', 'adg', 'adh', 'adi', 'adj', 'adk', 'adl', 'adm', 'adn', 'ado', 'adp',
      'bac', 'bad', 'bae', 'baf', 'bag', 'bah', 'bai', 'baj', 'bak', 'bal', 'bam', 'ban', 'bao', 'bap',
      
      // Four letter combinations (abcd patterns)
      'abcd', 'abce', 'abcf', 'abcg', 'abch', 'abci', 'abcj', 'abck', 'abcl', 'abcm',
      'abdc', 'abde', 'abdf', 'abdg', 'abdh', 'abdi', 'abdj', 'abdk', 'abdl', 'abdm',
      'abec', 'abed', 'abef', 'abeg', 'abeh', 'abei', 'abej', 'abek', 'abel', 'abem',
      'acbd', 'acbe', 'acbf', 'acbg', 'acbh', 'acbi', 'acbj', 'acbk', 'acbl', 'acbm',
      
      // Numbers with letters (very common)
      'a1', 'a2', 'a3', 'a4', 'a5', 'b1', 'b2', 'b3', 'b4', 'b5', 'c1', 'c2', 'c3', 'c4', 'c5',
      'd1', 'd2', 'd3', 'd4', 'd5', 'e1', 'e2', 'e3', 'e4', 'e5', 'f1', 'f2', 'f3', 'f4', 'f5',
      '1a', '1b', '1c', '1d', '1e', '2a', '2b', '2c', '2d', '2e', '3a', '3b', '3c', '3d', '3e',
      '4a', '4b', '4c', '4d', '4e', '5a', '5b', '5c', '5d', '5e', '6a', '6b', '6c', '6d', '6e',
      
      // Common names (high probability)
      'alice', 'bob', 'charlie', 'david', 'eve', 'frank', 'grace', 'henry', 'ivan', 'jack',
      'kate', 'leo', 'mary', 'nick', 'oscar', 'paul', 'queen', 'rose', 'sam', 'tom',
      'alex', 'john', 'mike', 'chris', 'sarah', 'emily', 'anna', 'lisa', 'kevin', 'ryan',
      'brian', 'jason', 'mark', 'steve', 'karen', 'maria', 'amy', 'jen', 'kim', 'dan',
      
      // Web3 and crypto terms (high value targets)
      'crypto', 'ethereum', 'bitcoin', 'web3', 'defi', 'nft', 'dao', 'dex', 'eth', 'btc',
      'yield', 'stake', 'farm', 'pool', 'swap', 'mint', 'alpha', 'beta', 'dev', 'builder',
      'founder', 'trader', 'investor', 'whale', 'hodl', 'moon', 'diamond', 'ape', 'degen',
      
      // Test and demo patterns (often used)
      'test', 'test1', 'test2', 'test3', 'test123', 'user', 'user1', 'user2', 'user3',
      'demo', 'demo1', 'demo2', 'demo3', 'admin', 'temp', 'temp1', 'temp2', 'temp3',
      
      // Years and numbers (common in usernames)
      '2024', '2023', '2022', '2021', '2020', '2019', '2018', '100', '200', '300', '1000',
      '420', '777', '123', '456', '789', '999', '007', '2024', '24', '23', '22', '21',
      
      // Special patterns
      '0x', 'x', 'xx', 'xxx', 'alpha', 'beta', 'gamma', 'delta', 'omega', 'zero', 'one'
    ];
  }

  async ensureDataDirectory() {
    try {
      await fs.access(this.dataDir);
    } catch {
      await fs.mkdir(this.dataDir, { recursive: true });
      console.log(`📁 Created data directory: ${this.dataDir}`);
    }
  }

  async loadExistingData() {
    try {
      // Load existing profiles
      const profilesData = await fs.readFile(this.profilesFile, 'utf8');
      const profilesArray = JSON.parse(profilesData);
      
      this.profiles = new Map();
      profilesArray.forEach(profile => {
        const key = profile.primaryAddr || profile.address || profile.username;
        if (key) {
          this.profiles.set(key.toLowerCase(), profile);
        }
      });
      
      console.log(`📋 Loaded ${this.profiles.size} existing profiles`);
      
      // Load build metadata
      try {
        const metaData = await fs.readFile(this.metaFile, 'utf8');
        this.buildMeta = { ...this.buildMeta, ...JSON.parse(metaData) };
        console.log(`📊 Loaded build metadata - Last search index: ${this.buildMeta.lastSearchIndex}`);
      } catch {
        console.log(`📊 No existing build metadata found, starting fresh`);
      }
      
    } catch {
      console.log(`📋 No existing profiles found, starting fresh`);
    }
  }

  async saveData() {
    const profilesArray = Array.from(this.profiles.values());
    await fs.writeFile(this.profilesFile, JSON.stringify(profilesArray, null, 2));
    
    this.buildMeta.totalProfiles = profilesArray.length;
    this.buildMeta.lastUpdated = new Date().toISOString();
    await fs.writeFile(this.metaFile, JSON.stringify(this.buildMeta, null, 2));
    
    console.log(`💾 Saved ${profilesArray.length} profiles to ${this.profilesFile}`);
  }

  async searchByPattern(pattern, maxAttempts = 15) {
    console.log(`🔍 Searching for users with pattern: "${pattern}"`);
    
    const results = [];
    let attempts = 0;
    
    // Try different search methods for the pattern
    const searchMethods = [
      // Try as username directly
      () => ethosApiClient.getUserByUsernameV2(pattern),
      () => ethosApiClient.getUserByUsername(pattern),
      
      // Try as X username
      () => ethosApiClient.getUserByXUsernameV2(pattern),
      () => ethosApiClient.getUserByXUsername(pattern),
      
      // Try with common suffixes
      () => ethosApiClient.getUserByUsernameV2(pattern + '1'),
      () => ethosApiClient.getUserByUsernameV2(pattern + '2'),
      () => ethosApiClient.getUserByUsernameV2(pattern + '3'),
      () => ethosApiClient.getUserByUsernameV2(pattern + '_eth'),
      () => ethosApiClient.getUserByUsernameV2(pattern + '_crypto'),
      () => ethosApiClient.getUserByUsernameV2(pattern + '_defi'),
      
      // Try variations
      () => ethosApiClient.getUserByUsernameV2(pattern.toUpperCase()),
      () => ethosApiClient.getUserByUsernameV2(pattern + pattern), // double pattern
      () => ethosApiClient.getUserByUsernameV2(pattern + '0'),
      () => ethosApiClient.getUserByUsernameV2('0' + pattern),
      () => ethosApiClient.getUserByUsernameV2(pattern + 'x'),
    ];
    
    for (const searchMethod of searchMethods) {
      if (attempts >= maxAttempts) break;
      
      try {
        const user = await searchMethod();
        if (user && user.primaryAddr) {
          const key = user.primaryAddr.toLowerCase();
          if (!this.profiles.has(key)) {
            results.push(user);
            this.profiles.set(key, user);
            console.log(`   ✅ Found: ${user.username || user.primaryAddr} (Score: ${user.score})`);
          }
        }
        attempts++;
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        attempts++;
        continue; // Skip errors and try next method
      }
    }
    
    return results;
  }

  async buildProfileDatabase(targetProfiles = 5000, patternsPerBatch = 20) {
    console.log(`🔍 Building profile database with username patterns - Target: ${targetProfiles} profiles`);
    console.log(`📊 Starting from search index: ${this.buildMeta.lastSearchIndex}`);
    console.log(`📋 Current profiles: ${this.profiles.size}`);
    console.log(`🔤 Total patterns to search: ${this.searchPatterns.length}`);
    
    const startTime = Date.now();
    let newProfilesCount = 0;
    let currentBatch = 0;
    
    // Start from where we left off
    for (let i = this.buildMeta.lastSearchIndex; i < this.searchPatterns.length; i += patternsPerBatch) {
      if (this.profiles.size >= targetProfiles) {
        console.log(`🎯 Target reached! Found ${this.profiles.size} profiles`);
        break;
      }
      
      currentBatch++;
      const batch = this.searchPatterns.slice(i, i + patternsPerBatch);
      
      console.log(`\n📦 Batch ${currentBatch}: Processing patterns ${i + 1}-${Math.min(i + patternsPerBatch, this.searchPatterns.length)} of ${this.searchPatterns.length}`);
      console.log(`🔤 Patterns: ${batch.slice(0, 10).join(', ')}${batch.length > 10 ? '...' : ''}`);
      
      const batchStartTime = Date.now();
      let batchNewProfiles = 0;
      
      for (const pattern of batch) {
        try {
          const results = await this.searchByPattern(pattern, 10);
          batchNewProfiles += results.length;
          newProfilesCount += results.length;
          
          if (results.length > 0) {
            console.log(`   📈 Pattern "${pattern}": +${results.length} profiles (Total: ${this.profiles.size})`);
          }
          
        } catch (error) {
          console.warn(`   ⚠️ Error with pattern "${pattern}":`, error.message);
        }
        
        // Rate limiting between patterns
        await new Promise(resolve => setTimeout(resolve, 150));
      }
      
      const batchTime = Date.now() - batchStartTime;
      console.log(`📊 Batch ${currentBatch} complete: +${batchNewProfiles} profiles in ${(batchTime/1000).toFixed(1)}s`);
      console.log(`📈 Progress: ${this.profiles.size}/${targetProfiles} profiles (${((this.profiles.size/targetProfiles)*100).toFixed(1)}%)`);
      
      // Update search index and save progress
      this.buildMeta.lastSearchIndex = i + patternsPerBatch;
      this.buildMeta.buildHistory.push({
        batch: currentBatch,
        patterns: batch.slice(0, 5), // Just store first 5 patterns to avoid huge logs
        newProfiles: batchNewProfiles,
        totalProfiles: this.profiles.size,
        timestamp: new Date().toISOString(),
        timeMs: batchTime
      });
      
      // Save progress every batch
      await this.saveData();
      
      // Rate limiting between batches
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // If we're getting very few results, try a different strategy
      if (currentBatch > 5 && batchNewProfiles === 0) {
        console.log(`⚠️ No new profiles found in recent batches, continuing with different patterns...`);
      }
    }
    
    const totalTime = Date.now() - startTime;
    
    console.log(`\n🎉 Profile Database Build Complete!`);
    console.log(`═══════════════════════════════════════════════`);
    console.log(`✅ Total profiles: ${this.profiles.size.toLocaleString()}`);
    console.log(`✅ New profiles this run: ${newProfilesCount.toLocaleString()}`);
    console.log(`✅ Build time: ${(totalTime/1000).toFixed(1)}s`);
    console.log(`✅ Average: ${((totalTime/newProfilesCount) || 0).toFixed(0)}ms per new profile`);
    console.log(`✅ Patterns processed: ${Math.min(this.buildMeta.lastSearchIndex, this.searchPatterns.length)}/${this.searchPatterns.length}`);
    console.log(`✅ Success rate: ${((newProfilesCount / Math.min(this.buildMeta.lastSearchIndex, this.searchPatterns.length)) * 100).toFixed(1)}% patterns found users`);
    
    // Show sample profiles
    if (this.profiles.size > 0) {
      console.log(`\n📋 Sample recent profiles:`);
      Array.from(this.profiles.values()).slice(-10).forEach((profile, i) => {
        console.log(`   ${i + 1}. ${profile.username || 'No username'} - ${profile.primaryAddr} (Score: ${profile.score})`);
      });
    }
    
    return Array.from(this.profiles.values());
  }

  getStats() {
    return {
      totalProfiles: this.profiles.size,
      lastUpdated: this.buildMeta.lastUpdated,
      searchProgress: `${this.buildMeta.lastSearchIndex}/${this.searchPatterns.length}`,
      progressPercentage: ((this.buildMeta.lastSearchIndex / this.searchPatterns.length) * 100).toFixed(1),
      buildHistory: this.buildMeta.buildHistory.slice(-5) // Last 5 builds
    };
  }
}

// Main execution function
async function buildIncrementalDatabase() {
  console.log('🚀 Starting Incremental Username Pattern Profile Builder...\n');
  console.log('🔤 Strategy: Search through comprehensive username patterns');
  console.log('   - Single letters (a, b, c...)');
  console.log('   - Two letter combos (ab, ac, ad...)');
  console.log('   - Three letter combos (abc, abd, abe...)');
  console.log('   - Four letter combos (abcd, abce...)');
  console.log('   - Common names (alice, bob, charlie...)');
  console.log('   - Web3 terms (crypto, ethereum, defi...)');
  console.log('   - Numbers and variations (1a, 2b, test1...)');
  console.log('� Auto-saves progress and resumes from where it left off');
  console.log('🎯 Target: Build up to 5,000+ profiles quickly\n');
  
  try {
    const builder = new IncrementalProfileBuilder();
    
    await builder.ensureDataDirectory();
    await builder.loadExistingData();
    
    // Build database with 5000 profiles target using 20 patterns per batch
    const profiles = await builder.buildProfileDatabase(5000, 20);
    
    console.log('\n📊 Final Statistics:');
    const stats = builder.getStats();
    console.log(`   📁 Total profiles: ${stats.totalProfiles.toLocaleString()}`);
    console.log(`   📅 Last updated: ${stats.lastUpdated}`);
    console.log(`   📈 Search progress: ${stats.searchProgress} (${stats.progressPercentage}%)`);
    
    if (stats.buildHistory.length > 0) {
      console.log('\n📈 Recent build history:');
      stats.buildHistory.forEach((build, i) => {
        console.log(`   ${i + 1}. Batch ${build.batch}: +${build.newProfiles} profiles in ${(build.timeMs/1000).toFixed(1)}s`);
      });
    }
    
    console.log('\n✅ Profile database ready for site loading!');
    console.log(`📁 Profiles file: ${builder.profilesFile}`);
    console.log(`📁 Metadata file: ${builder.metaFile}`);
    
    if (profiles.length >= 1000) {
      console.log('\n🎉 Success! Database has enough profiles for distribution page');
      console.log(`✅ Can integrate with distribution page now`);
      console.log(`✅ No more reloading - profiles stored in file`);
      console.log(`✅ Run again to add more profiles (resumes automatically)`);
    } else {
      console.log('\n📈 Building progress... Run this script again to continue');
      console.log(`🔄 Will resume from pattern ${stats.searchProgress}`);
    }
    
  } catch (error) {
    console.error('\n❌ Build failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run if called directly
console.log('📍 Script loaded, checking if it should run...');
console.log('📍 import.meta.url:', import.meta.url);
console.log('📍 process.argv[1]:', process.argv[1]);

// Fix path comparison for Windows
const scriptPath = import.meta.url;
const runPath = `file:///${process.argv[1].replace(/\\/g, '/')}`;
console.log('📍 Comparing:', scriptPath, 'vs', runPath);

if (scriptPath === runPath || process.argv[1].endsWith('build-incrementally.js')) {
  console.log('🧪 Starting script - testing API connection first...');
  
  // Quick test before running full system
  (async () => {
    try {
      console.log('📡 Testing Ethos API...');
      const testResult = await ethosApiClient.getUserByUsernameV2('test');
      console.log('✅ API test successful');
      console.log('🚀 Starting full database build...\n');
      
      buildIncrementalDatabase();
    } catch (error) {
      console.error('❌ API test failed:', error.message);
      console.log('🔧 Trying to continue anyway...\n');
      buildIncrementalDatabase();
    }
  })();
} else {
  console.log('📍 Script loaded as module, not executing main function');
}

export { IncrementalProfileBuilder, buildIncrementalDatabase };
export default IncrementalProfileBuilder;
