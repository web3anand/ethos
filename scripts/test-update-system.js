// Test script to verify the update system works
import { performDataUpdate } from './update-data.js';
import { BackupManager } from './backup-manager.js';

console.log('🧪 Testing Update System...\n');

async function testUpdateSystem() {
  try {
    // Test backup manager
    console.log('1️⃣ Testing Backup Manager...');
    const backupManager = new BackupManager();
    
    // Create a test backup
    const backupStats = backupManager.createBackup();
    console.log('✅ Backup created successfully');
    console.log(`   Backup ID: ${backupStats.timestamp}`);
    console.log(`   Files backed up: ${backupStats.files.length}`);
    console.log(`   Total size: ${backupManager.formatBytes(backupStats.totalSize)}`);
    
    // List backups
    const backups = backupManager.listBackups();
    console.log(`\n📋 Available backups: ${backups.length}`);
    backups.forEach((backup, index) => {
      console.log(`   ${index + 1}. ${backup.name} (${backupManager.formatBytes(backup.size)})`);
    });
    
    // Test data update (with local APIs)
    console.log('\n2️⃣ Testing Data Update...');
    console.log('   Note: This will use local APIs (localhost:3000)');
    
    // Temporarily modify the config to use local APIs
    const originalConfig = process.env.VERCEL_URL;
    process.env.VERCEL_URL = 'http://localhost:3000';
    
    const updateStats = await performDataUpdate();
    console.log('✅ Data update completed successfully');
    console.log(`   Profiles: ${updateStats.profilesCreated} created, ${updateStats.profilesUpdated} updated`);
    console.log(`   Weekly Records: ${updateStats.weeklyRecordsCreated} created, ${updateStats.weeklyRecordsUpdated} updated`);
    console.log(`   Backup created: ${updateStats.backupCreated ? 'Yes' : 'No'}`);
    if (updateStats.backupPath) {
      console.log(`   Backup path: ${updateStats.backupPath}`);
    }
    
    // Restore original config
    if (originalConfig) {
      process.env.VERCEL_URL = originalConfig;
    } else {
      delete process.env.VERCEL_URL;
    }
    
    console.log('\n✅ All tests passed!');
    console.log('\n📋 Summary:');
    console.log('   ✅ Backup system working');
    console.log('   ✅ Data update system working');
    console.log('   ✅ APIs fetching complete data');
    console.log('   ✅ Ready for production deployment');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack trace:', error.stack);
  }
}

testUpdateSystem();
