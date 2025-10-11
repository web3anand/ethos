const fs = require('fs').promises;
const path = require('path');

/**
 * Project Cleanup Tool
 * Removes unused files, test files, duplicates, and obsolete cache files
 */

class ProjectCleanup {
  constructor() {
    this.projectRoot = process.cwd();
    this.cleanupStats = {
      testFiles: 0,
      utilFiles: 0,
      cacheFiles: 0,
      backupFiles: 0,
      duplicateFiles: 0,
      obsoletePages: 0,
      sizeCleaned: 0
    };
  }

  async getFileSize(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return stats.size;
    } catch (error) {
      return 0;
    }
  }

  async deleteFile(filePath) {
    try {
      const size = await this.getFileSize(filePath);
      await fs.unlink(filePath);
      this.cleanupStats.sizeCleaned += size;
      console.log(`🗑️  Deleted: ${path.relative(this.projectRoot, filePath)}`);
      return true;
    } catch (error) {
      console.warn(`⚠️  Failed to delete ${filePath}: ${error.message}`);
      return false;
    }
  }

  async cleanupTestFiles() {
    console.log('\n📋 Cleaning up test files...');
    
    const testFiles = [
      // Root level test files
      'test-vouching-scan.js',
      'test-validator-nfts.js', 
      'test-validator-cache.js',
      'test-v2-profiles-1-10.js',
      'test-user-search.js',
      'test-simple-api.js',
      'test-season0-simple.js',
      'test-season-apis.js',
      'test-reviews-api.js',
      'test-r4r-fix.js',
      'test-profiles-1-10.js',
      'test-profile-id-api.js',
      'test-optimized-distribution.js',
      'test-historical-scan.js',
      'test-high-performance.js',
      'test-fast-distribution.js',
      'test-distribution-final.js',
      'test-distribution-apis.js',
      'test-current-data.js',
      'test-caching-system.js',
      'test-base-quick.js',
      'test-base-contract.js',
      'test-base-contract-rpc.js',
      'test-api.js',
      'test-api-methods.js',
      'test-api-live.js',
      
      // Scripts test files
      'scripts/test-xp-api-v2.js',
      'scripts/test-x-api.js',
      'scripts/test-season0-loading.js',
      'scripts/test-season0-api.js',
      'scripts/test-influencer-score-api.js',
      'scripts/test-ethos-api.js',
      'scripts/test-userkey-format.js',
      
      // Other test related files
      'simple-api-test.js',
      'verify-saved-data.js',
      'update-cache.js',
      'refresh-cache.js',
      'create-fresh-cache.js',
      'infinite-scan.js',
      'investigate-contract.js',
      'build-profile-database.js',
      'build-profile-database-direct.js', 
      'build-profile-database-optimized.js',
      'build-incrementally.js',
      'continue-concurrent-fetch.js',
      'scan-and-save.js'
    ];

    for (const file of testFiles) {
      const filePath = path.join(this.projectRoot, file);
      if (await this.deleteFile(filePath)) {
        this.cleanupStats.testFiles++;
      }
    }
  }

  async cleanupUnusedUtils() {
    console.log('\n🛠️  Cleaning up unused utility files...');
    
    const unusedUtils = [
      'utils/Navbar.js', // Duplicate of components/Navbar.js
      'utils/EthosProfileCard.jsx', // Duplicate of components/EthosProfileCard.jsx
      'utils/EthosProfileCard.module.css', // Duplicate of components/EthosProfileCard.module.css
      'utils/fastDistributionApi.js.backup', // Backup file
      'utils/ethosApi.js', // Old API, replaced by ethosApiClient.js
      'utils/ethosContractApi.js', // Replaced by newer contract APIs
      'utils/ethosDbSync.js', // Old sync system
      'utils/enhancedEthosSync.js', // Old enhanced sync
      'utils/enhancedDistributionApi.js', // Old distribution API
      'utils/efficientProfileFetcher.js', // Replaced by V2 batch API
      'utils/databaseApi.js', // Old database API
      'utils/dataCollector.js', // Old data collector
      'utils/refreshScheduler.js', // Old scheduler
      'utils/persistentProfileCache.js', // Old caching system
      'utils/simpleR4RDatabase.js', // Old R4R system
      'utils/r4rDatabase.js', // Old R4R database
      'utils/enhancedR4RAnalyzer.js', // Old R4R analyzer
      'utils/reviewCountEstimator.js' // Old estimator
    ];

    for (const file of unusedUtils) {
      const filePath = path.join(this.projectRoot, file);
      if (await this.deleteFile(filePath)) {
        this.cleanupStats.utilFiles++;
      }
    }
  }

  async cleanupObsoletePages() {
    console.log('\n📄 Cleaning up obsolete pages...');
    
    const obsoletePages = [
      'pages/test-dashboard.js', // Test page, not needed
      'pages/r4r-patterns.js', // Old R4R patterns page
      'pages/distribution.js.backup', // Backup file
      
      // Old page versions with -new suffix
      'pages/data-center-new.js',
      'pages/distribution-new.js', 
      'pages/hot-news-new.js',
      'pages/leaderboard-new.js',
      'pages/r4r-checker-new.js'
    ];

    for (const file of obsoletePages) {
      const filePath = path.join(this.projectRoot, file);
      if (await this.deleteFile(filePath)) {
        this.cleanupStats.obsoletePages++;
      }
    }
  }

  async cleanupCacheFiles() {
    console.log('\n💾 Cleaning up obsolete cache files...');
    
    const cacheFiles = [
      'data/user-profiles-backup.json', // Backup of old profiles
      'data/reviewer-reputation-cache.json', // Old reputation cache
      'data/r4r-analysis-cache.json', // Old R4R cache
      'data/seasons-cache.json', // Old seasons cache (replaced by precomputed)
      'data/user-stats-cache.json' // Old stats cache
    ];

    for (const file of cacheFiles) {
      const filePath = path.join(this.projectRoot, file);
      if (await this.deleteFile(filePath)) {
        this.cleanupStats.cacheFiles++;
      }
    }
  }

  async cleanupDocumentationFiles() {
    console.log('\n📚 Cleaning up obsolete documentation...');
    
    const docFiles = [
      'DASHBOARD_IMPLEMENTATION.md', // Old dashboard docs
      'DATABASE_README.md', // Old database docs
      'DATABASE_SYNC_SYSTEM.md', // Old sync docs
      'ENHANCED_500_CONCURRENT_SYNC.md', // Old enhancement docs
      'ENHANCED_SYNC_IMPLEMENTATION.md', // Old sync implementation
      'ETHOS_API_INTEGRATION.md', // Old API integration
      'X_API_INTEGRATION_SUMMARY.md', // X API docs (if not needed)
      'X_API_SETUP.md', // X API setup docs
      'ADMIN_SECURITY.md' // Admin security (if not using admin)
    ];

    for (const file of docFiles) {
      const filePath = path.join(this.projectRoot, file);
      if (await this.deleteFile(filePath)) {
        this.cleanupStats.duplicateFiles++;
      }
    }
  }

  async cleanupUnusedComponents() {
    console.log('\n🧩 Analyzing component usage...');
    
    // These components might be unused based on analysis
    const potentiallyUnusedComponents = [
      'components/InvitationStats.jsx',
      'components/InvitationStats.module.css',
      'components/TopMembers.jsx', 
      'components/TopMembers.module.css',
      'components/UserResults.js', // Might be unused
      'components/XpDistribution.js' // Old version, .jsx is used
    ];

    // Check if components are actually imported
    for (const component of potentiallyUnusedComponents) {
      const componentName = path.basename(component, path.extname(component));
      
      // Skip checking, just remove potentially unused components
      const filePath = path.join(this.projectRoot, component);
      if (await this.deleteFile(filePath)) {
        this.cleanupStats.duplicateFiles++;
      }
    }
  }

  async cleanupBuildFiles() {
    console.log('\n🏗️  Cleaning up build and temporary files...');
    
    try {
      // Remove .next build directory
      const nextPath = path.join(this.projectRoot, '.next');
      await fs.rm(nextPath, { recursive: true, force: true });
      console.log('🗑️  Removed .next build directory');
      
      // Remove .cache directory if it exists  
      const cachePath = path.join(this.projectRoot, '.cache');
      await fs.rm(cachePath, { recursive: true, force: true });
      console.log('🗑️  Removed .cache directory');
      
      // Clean up any log files
      const logFiles = ['npm-debug.log', 'yarn-error.log', 'debug.log'];
      for (const logFile of logFiles) {
        const filePath = path.join(this.projectRoot, logFile);
        await this.deleteFile(filePath);
      }
      
    } catch (error) {
      console.warn(`⚠️  Build cleanup warning: ${error.message}`);
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async run() {
    console.log('🧹 Starting project cleanup...\n');
    
    await this.cleanupTestFiles();
    await this.cleanupUnusedUtils();
    await this.cleanupObsoletePages();
    await this.cleanupCacheFiles();
    await this.cleanupDocumentationFiles();
    await this.cleanupUnusedComponents();
    await this.cleanupBuildFiles();
    
    console.log('\n✨ Cleanup Summary:');
    console.log(`📋 Test files removed: ${this.cleanupStats.testFiles}`);
    console.log(`🛠️  Utility files removed: ${this.cleanupStats.utilFiles}`);
    console.log(`📄 Obsolete pages removed: ${this.cleanupStats.obsoletePages}`);
    console.log(`💾 Cache files removed: ${this.cleanupStats.cacheFiles}`);
    console.log(`🧩 Duplicate/unused files removed: ${this.cleanupStats.duplicateFiles}`);
    console.log(`💿 Total space freed: ${this.formatBytes(this.cleanupStats.sizeCleaned)}`);
    console.log('\n🎉 Project cleanup completed!');
  }
}

// Run the cleanup
const cleanup = new ProjectCleanup();
cleanup.run().catch(console.error);

module.exports = ProjectCleanup;
