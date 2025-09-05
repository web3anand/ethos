import BaseEthosContractApi from './baseEthosContractApi.js';
import ethosApiClient from './ethosApiClient.js';
import fs from 'fs/promises';
import path from 'path';

class PersistentProfileCache {
  constructor() {
    this.cacheDir = './data';
    this.profilesFile = path.join(this.cacheDir, 'ethos-profiles.json');
    this.addressesFile = path.join(this.cacheDir, 'vouching-addresses.json');
    this.statsFile = path.join(this.cacheDir, 'cache-stats.json');
    
    this.baseContract = new BaseEthosContractApi();
    this.ethosClient = ethosApiClient; // Use the singleton instance
    
    this.profiles = new Map();
    this.vouchingAddresses = new Set();
    this.cacheStats = {
      lastUpdated: null,
      totalProfiles: 0,
      vouchingAddresses: 0,
      nameSearchProfiles: 0,
      successRate: 0
    };
  }

  // Ensure cache directory exists
  async ensureCacheDir() {
    try {
      await fs.access(this.cacheDir);
    } catch {
      await fs.mkdir(this.cacheDir, { recursive: true });
      console.log(`📁 Created cache directory: ${this.cacheDir}`);
    }
  }

  // Load existing data from files
  async loadFromFiles() {
    await this.ensureCacheDir();
    
    try {
      // Load profiles
      const profilesData = await fs.readFile(this.profilesFile, 'utf8');
      const profilesArray = JSON.parse(profilesData);
      this.profiles = new Map(profilesArray.map(p => [p.primaryAddr || p.address, p]));
      console.log(`📂 Loaded ${this.profiles.size} profiles from cache`);
    } catch (error) {
      console.log(`📂 No existing profiles cache found, starting fresh`);
    }

    try {
      // Load vouching addresses
      const addressesData = await fs.readFile(this.addressesFile, 'utf8');
      const addressesArray = JSON.parse(addressesData);
      this.vouchingAddresses = new Set(addressesArray);
      console.log(`📂 Loaded ${this.vouchingAddresses.size} vouching addresses from cache`);
    } catch (error) {
      console.log(`📂 No existing addresses cache found, starting fresh`);
    }

    try {
      // Load stats
      const statsData = await fs.readFile(this.statsFile, 'utf8');
      this.cacheStats = JSON.parse(statsData);
      console.log(`📊 Cache last updated: ${this.cacheStats.lastUpdated}`);
    } catch (error) {
      console.log(`📊 No existing stats found, starting fresh`);
    }
  }

  // Save data to files
  async saveToFiles() {
    await this.ensureCacheDir();
    
    try {
      // Save profiles
      const profilesArray = Array.from(this.profiles.values());
      await fs.writeFile(this.profilesFile, JSON.stringify(profilesArray, null, 2));
      console.log(`💾 Saved ${profilesArray.length} profiles to ${this.profilesFile}`);

      // Save vouching addresses
      const addressesArray = Array.from(this.vouchingAddresses);
      await fs.writeFile(this.addressesFile, JSON.stringify(addressesArray, null, 2));
      console.log(`💾 Saved ${addressesArray.length} vouching addresses to ${this.addressesFile}`);

      // Update and save stats
      this.cacheStats = {
        lastUpdated: new Date().toISOString(),
        totalProfiles: profilesArray.length,
        vouchingAddresses: addressesArray.length,
        nameSearchProfiles: profilesArray.filter(p => p.source === 'nameSearch').length,
        successRate: ((profilesArray.length / Math.max(addressesArray.length, 1)) * 100).toFixed(1)
      };
      await fs.writeFile(this.statsFile, JSON.stringify(this.cacheStats, null, 2));
      console.log(`📊 Updated cache stats`);

    } catch (error) {
      console.error(`❌ Error saving to files:`, error.message);
    }
  }

  // Discover vouching addresses
  async discoverVouchingAddresses(progressCallback = null) {
    console.log(`🔍 Discovering vouching addresses...`);
    
    try {
      const addresses = await this.baseContract.getAllVouchingAddresses(progressCallback);
      
      // Add new addresses to our set
      let newAddresses = 0;
      addresses.forEach(addr => {
        if (!this.vouchingAddresses.has(addr)) {
          this.vouchingAddresses.add(addr);
          newAddresses++;
        }
      });
      
      console.log(`📍 Discovered ${addresses.length} total, ${newAddresses} new vouching addresses`);
      return Array.from(this.vouchingAddresses);
      
    } catch (error) {
      console.error(`❌ Error discovering vouching addresses:`, error.message);
      return Array.from(this.vouchingAddresses);
    }
  }

  // Fetch profiles for addresses
  async fetchProfilesForAddresses(addresses, source = 'vouching', progressCallback = null) {
    console.log(`👥 Fetching profiles for ${addresses.length} addresses (source: ${source})...`);
    
    let processed = 0;
    let successful = 0;
    let errors = 0;

    for (const address of addresses) {
      // Skip if we already have this profile
      if (this.profiles.has(address)) {
        processed++;
        continue;
      }

      try {
        const profile = await this.ethosClient.getProfileByAddress(address);
        
        if (profile) {
          // Add source and timestamp
          profile.source = source;
          profile.cachedAt = new Date().toISOString();
          profile.address = address; // Ensure we have the address
          
          this.profiles.set(address, profile);
          successful++;
        }
        
        processed++;
        
        if (progressCallback && processed % 10 === 0) {
          progressCallback({
            stage: `Fetching profiles (${source})`,
            current: processed,
            total: addresses.length,
            successful,
            errors,
            percentage: (processed / addresses.length) * 100
          });
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        errors++;
        processed++;
        console.warn(`⚠️ Error fetching profile for ${address}:`, error.message);
        
        // Rate limiting on error
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Save periodically
      if (processed % 50 === 0) {
        await this.saveToFiles();
      }
    }

    console.log(`✅ Profile fetching complete: ${successful}/${addresses.length} successful (${errors} errors)`);
    return successful;
  }

  // Name search for additional profiles
  async performNameSearch(searchTerms, progressCallback = null) {
    console.log(`🔍 Performing name search for additional profiles...`);
    
    const defaultSearchTerms = [
      // Popular crypto terms
      'crypto', 'ethereum', 'bitcoin', 'defi', 'nft', 'web3', 'blockchain',
      // Common names
      'alex', 'john', 'mike', 'david', 'chris', 'ryan', 'kevin', 'brian',
      'sarah', 'emily', 'jessica', 'ashley', 'amanda', 'lisa', 'maria',
      // Tech terms
      'dev', 'engineer', 'builder', 'founder', 'ceo', 'cto', 'developer',
      // Crypto personas
      'hodler', 'trader', 'investor', 'whale', 'degen', 'ape', 'diamond',
      // Numbers and combinations
      '0x', 'eth', 'btc', '2024', '2023', 'alpha', 'beta', 'sigma'
    ];

    const terms = searchTerms || defaultSearchTerms;
    let totalFound = 0;
    
    for (let i = 0; i < terms.length; i++) {
      const term = terms[i];
      
      try {
        console.log(`   🔍 Searching for "${term}" (${i + 1}/${terms.length})...`);
        
        const users = await this.ethosClient.xStyleUserLookup(term, 100);
        
        if (users && users.length > 0) {
          let newProfiles = 0;
          
          for (const user of users) {
            const address = user.primaryAddr || user.address;
            if (address && !this.profiles.has(address)) {
              user.source = 'nameSearch';
              user.searchTerm = term;
              user.cachedAt = new Date().toISOString();
              user.address = address;
              
              this.profiles.set(address, user);
              newProfiles++;
            }
          }
          
          totalFound += newProfiles;
          console.log(`      📋 Found ${users.length} users, ${newProfiles} new profiles`);
        }
        
        if (progressCallback) {
          progressCallback({
            stage: `Name search: "${term}"`,
            current: i + 1,
            total: terms.length,
            totalFound,
            percentage: ((i + 1) / terms.length) * 100
          });
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Save periodically
        if ((i + 1) % 10 === 0) {
          await this.saveToFiles();
        }
        
      } catch (error) {
        console.warn(`⚠️ Error searching for "${term}":`, error.message);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log(`✅ Name search complete: ${totalFound} new profiles found`);
    return totalFound;
  }

  // Get all profiles
  getAllProfiles() {
    return Array.from(this.profiles.values());
  }

  // Get profiles with filtering
  getFilteredProfiles(options = {}) {
    const profiles = this.getAllProfiles();
    
    let filtered = profiles;
    
    if (options.minScore !== undefined) {
      filtered = filtered.filter(p => (p.score || 0) >= options.minScore);
    }
    
    if (options.source) {
      filtered = filtered.filter(p => p.source === options.source);
    }
    
    if (options.hasReviews) {
      filtered = filtered.filter(p => (p.positiveReviews || 0) + (p.negativeReviews || 0) > 0);
    }

    if (options.sortBy) {
      if (options.sortBy === 'score') {
        filtered.sort((a, b) => (b.score || 0) - (a.score || 0));
      } else if (options.sortBy === 'reviews') {
        filtered.sort((a, b) => ((b.positiveReviews || 0) + (b.negativeReviews || 0)) - ((a.positiveReviews || 0) + (a.negativeReviews || 0)));
      }
    }
    
    return filtered;
  }

  // Build comprehensive profile database
  async buildComprehensiveDatabase(progressCallback = null) {
    console.log(`🏗️ Building comprehensive profile database...`);
    
    try {
      // Step 1: Load existing data
      await this.loadFromFiles();
      
      if (progressCallback) {
        progressCallback({
          stage: 'Loaded existing cache',
          current: this.profiles.size,
          total: 20000,
          percentage: (this.profiles.size / 20000) * 100
        });
      }

      // Step 2: Discover vouching addresses
      if (this.vouchingAddresses.size < 1000) {
        console.log(`\n📍 Discovering vouching addresses...`);
        await this.discoverVouchingAddresses((progress) => {
          if (progressCallback) {
            progressCallback({
              stage: `Vouching discovery: ${progress.stage}`,
              current: progress.current,
              total: progress.total,
              percentage: progress.percentage
            });
          }
        });
      }

      // Step 3: Fetch profiles for vouching addresses
      const vouchingAddresses = Array.from(this.vouchingAddresses);
      const addressesWithoutProfiles = vouchingAddresses.filter(addr => !this.profiles.has(addr));
      
      if (addressesWithoutProfiles.length > 0) {
        console.log(`\n👥 Fetching profiles for ${addressesWithoutProfiles.length} vouching addresses...`);
        await this.fetchProfilesForAddresses(addressesWithoutProfiles, 'vouching', (progress) => {
          if (progressCallback) {
            progressCallback({
              stage: `Vouching profiles: ${progress.stage}`,
              current: progress.current + this.profiles.size - progress.successful,
              total: 20000,
              percentage: ((progress.current + this.profiles.size - progress.successful) / 20000) * 100
            });
          }
        });
      }

      // Step 4: Name search for additional profiles (if we need more)
      if (this.profiles.size < 15000) {
        console.log(`\n🔍 Performing name search to reach 20K target...`);
        await this.performNameSearch(null, (progress) => {
          if (progressCallback) {
            progressCallback({
              stage: `Name search: ${progress.stage}`,
              current: this.profiles.size,
              total: 20000,
              percentage: (this.profiles.size / 20000) * 100
            });
          }
        });
      }

      // Step 5: Final save
      await this.saveToFiles();
      
      const finalStats = {
        totalProfiles: this.profiles.size,
        vouchingAddresses: this.vouchingAddresses.size,
        vouchingProfiles: this.getFilteredProfiles({ source: 'vouching' }).length,
        nameSearchProfiles: this.getFilteredProfiles({ source: 'nameSearch' }).length,
        avgScore: this.getAllProfiles().reduce((sum, p) => sum + (p.score || 0), 0) / this.profiles.size,
        withReviews: this.getFilteredProfiles({ hasReviews: true }).length
      };

      console.log(`\n🎉 Database building complete!`);
      console.log(`📊 Final stats:`, finalStats);
      
      return finalStats;
      
    } catch (error) {
      console.error(`❌ Error building database:`, error.message);
      throw error;
    }
  }

  // Get cache status
  getCacheStatus() {
    return {
      profilesInMemory: this.profiles.size,
      vouchingAddresses: this.vouchingAddresses.size,
      lastUpdated: this.cacheStats.lastUpdated,
      files: {
        profiles: this.profilesFile,
        addresses: this.addressesFile,
        stats: this.statsFile
      }
    };
  }
}

export default PersistentProfileCache;
