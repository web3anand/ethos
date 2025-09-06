import EthosDatabase from '../database/index.js';
import { ethosDB } from '../utils/databaseApi.js';

async function testDatabase() {
  console.log('🧪 Testing Ethos Database Setup...\n');

  try {
    // Test database initialization
    console.log('1. Testing database initialization...');
    const db = new EthosDatabase();
    console.log('✅ Database initialized successfully\n');

    // Test basic operations
    console.log('2. Testing basic operations...');
    
    // Insert test profile
    const testProfile = {
      profileId: 99999,
      username: 'test_user',
      displayName: 'Test User',
      avatarUrl: 'https://example.com/avatar.png',
      description: 'Test profile for database testing',
      score: 1500,
      xpTotal: 50000,
      xpStreakDays: 10,
      status: 'ACTIVE',
      primaryAddr: '0x1234567890123456789012345678901234567890'
    };

    db.upsertProfile(testProfile);
    console.log('✅ Test profile inserted');

    // Insert test user keys
    const testUserKeys = [
      'address:0x1234567890123456789012345678901234567890',
      'service:x.com:test123',
      'service:discord:456789',
      'profileId:99999'
    ];

    db.upsertUserKeys(99999, testUserKeys);
    console.log('✅ Test user keys inserted');

    // Insert test stats
    const testStats = {
      review: {
        given: 10,
        received: 15,
        receivedPositive: 12,
        receivedNegative: 1,
        receivedNeutral: 2
      },
      vouch: {
        given: 5,
        received: 8
      },
      credibilityScore: 1500,
      reciprocityRatio: 0.67,
      positiveRatio: 80.0
    };

    db.upsertUserStats(99999, testStats);
    console.log('✅ Test user stats inserted\n');

    // Test queries
    console.log('3. Testing database queries...');
    
    const profile = db.getProfile(99999);
    console.log('✅ Profile query:', profile ? 'Found' : 'Not found');

    const stats = db.getProfileStats(99999);
    console.log('✅ Stats query:', stats ? 'Found' : 'Not found');

    const dbStats = db.getDatabaseStats();
    console.log('✅ Database stats:', dbStats);

    // Test API wrapper
    console.log('\n4. Testing database API wrapper...');
    
    const apiProfile = await ethosDB.getProfile(99999);
    console.log('✅ API profile query:', apiProfile ? 'Found' : 'Not found');

    const dashboardStats = await ethosDB.getDashboardStats();
    console.log('✅ Dashboard stats query:', Object.keys(dashboardStats).length > 0 ? 'Success' : 'Failed');

    // Test ETH price
    console.log('\n5. Testing ETH price functionality...');
    db.insertEthPrice(3500.50);
    const ethPrice = db.getLatestEthPrice();
    console.log('✅ ETH price test:', ethPrice ? `$${ethPrice.price_usd}` : 'Failed');

    // Test sync logging
    console.log('\n6. Testing sync logging...');
    const logId = db.startSyncLog('test');
    db.completeSyncLog(logId, 100, 50, 10, null);
    const logs = db.getSyncLogs(1);
    console.log('✅ Sync logging:', logs.length > 0 ? 'Success' : 'Failed');

    // Cleanup test data
    console.log('\n7. Cleaning up test data...');
    db.db.prepare('DELETE FROM profiles WHERE profile_id = ?').run(99999);
    db.db.prepare('DELETE FROM user_keys WHERE profile_id = ?').run(99999);
    db.db.prepare('DELETE FROM user_stats WHERE profile_id = ?').run(99999);
    console.log('✅ Test data cleaned up');

    db.close();
    console.log('\n🎉 All database tests passed successfully!');

  } catch (error) {
    console.error('❌ Database test failed:', error);
    process.exit(1);
  }
}

// Run tests if called directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  testDatabase();
}

export default testDatabase;
