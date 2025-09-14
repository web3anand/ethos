import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class WeeklyUserDataSync {
  constructor() {
    this.mainDbPath = path.join(__dirname, '..', 'database', 'ethos.db');
    this.weeklyDbPath = path.join(__dirname, '..', 'database', 'weekly-xp.db');
    
    console.log('🔄 Weekly User Data Sync initialized');
    console.log(`📁 Main DB: ${this.mainDbPath}`);
    console.log(`📁 Weekly DB: ${this.weeklyDbPath}`);
  }

  async syncUserData() {
    try {
      console.log('🚀 Starting user data sync...');
      
      const mainDb = new Database(this.mainDbPath);
      const weeklyDb = new Database(this.weeklyDbPath);
      
      // Get profiles from weekly database first
      console.log('🔍 Getting weekly database profile IDs...');
      const weeklyProfileIds = weeklyDb.prepare('SELECT DISTINCT profile_id FROM weekly_xp_data').all();
      const weeklyIds = weeklyProfileIds.map(p => p.profile_id);
      console.log(`Found ${weeklyIds.length} unique profile IDs in weekly database`);
      
      // Find overlapping profiles in main database
      console.log('🔍 Finding overlapping profiles in main database...');
      const overlappingProfiles = [];
      const batchSize = 100;
      
      for (let i = 0; i < weeklyIds.length; i += batchSize) {
        const batch = weeklyIds.slice(i, i + batchSize);
        const placeholders = batch.map(() => '?').join(',');
        const query = `
          SELECT profile_id, username, display_name, avatar_url
          FROM comprehensive_users 
          WHERE profile_id IN (${placeholders})
        `;
        const batchResults = mainDb.prepare(query).all(...batch);
        overlappingProfiles.push(...batchResults);
        
        if (i % 1000 === 0) {
          console.log(`  Processed ${i}/${weeklyIds.length} profile IDs...`);
        }
      }
      console.log(`✅ Found ${overlappingProfiles.length} overlapping profiles`);
      
      // Update weekly database with user information
      console.log('📝 Updating weekly database with user info...');
      const updateStmt = weeklyDb.prepare(`
        UPDATE xp_profiles 
        SET username = ?, display_name = ?, avatar_url = ?
        WHERE profile_id = ?
      `);
      
      let updated = 0;
      for (const profile of overlappingProfiles) {
        try {
          const result = updateStmt.run(
            profile.username,
            profile.display_name,
            profile.avatar_url,
            profile.profile_id
          );
          if (result.changes > 0) {
            updated++;
          }
        } catch (error) {
          console.error(`❌ Error updating profile ${profile.profile_id}:`, error.message);
        }
      }
      
      console.log(`✅ Updated ${updated} profiles in weekly database`);
      
      // Sample some updated profiles to verify
      console.log('📊 Sample of updated profiles:');
      const sampleProfiles = weeklyDb.prepare(`
        SELECT profile_id, username, display_name, avatar_url
        FROM xp_profiles 
        WHERE username IS NOT NULL 
        ORDER BY profile_id 
        LIMIT 5
      `).all();
      
      sampleProfiles.forEach(profile => {
        console.log(`  - Profile ${profile.profile_id}: ${profile.username} (${profile.display_name})`);
      });
      
      // Get stats
      const totalProfiles = weeklyDb.prepare('SELECT COUNT(*) as count FROM xp_profiles').get();
      const withUserData = weeklyDb.prepare('SELECT COUNT(*) as count FROM xp_profiles WHERE username IS NOT NULL').get();
      
      console.log('\n📊 Final stats:');
      console.log(`   - Total profiles in weekly DB: ${totalProfiles.count}`);
      console.log(`   - Profiles with user data: ${withUserData.count}`);
      console.log(`   - Coverage: ${((withUserData.count / totalProfiles.count) * 100).toFixed(2)}%`);
      
      mainDb.close();
      weeklyDb.close();
      
      console.log('🎉 User data sync completed successfully!');
      
    } catch (error) {
      console.error('❌ Error during sync:', error);
    }
  }
}

// Run the script
console.log('🚀 Starting sync script...');
const sync = new WeeklyUserDataSync();
sync.syncUserData()
  .then(() => console.log('✅ Sync process completed'))
  .catch(console.error);

export default WeeklyUserDataSync;
