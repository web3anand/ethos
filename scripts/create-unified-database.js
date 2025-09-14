import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class UnifiedDatabaseBuilder {
  constructor() {
    this.mainDbPath = path.join(__dirname, '..', 'database', 'ethos.db');
    this.weeklyDbPath = path.join(__dirname, '..', 'database', 'weekly-xp.db');
    this.unifiedDbPath = path.join(__dirname, '..', 'database', 'unified-ethos.db');
    
    console.log('🚀 Unified Database Builder initialized');
    console.log(`📁 Main DB: ${this.mainDbPath}`);
    console.log(`📁 Weekly DB: ${this.weeklyDbPath}`);
    console.log(`📁 Unified DB: ${this.unifiedDbPath}`);
  }

  async createUnifiedDatabase() {
    try {
      console.log('🛠️ Creating unified database...');
      
      // Remove existing unified database if it exists
      try {
        const fs = await import('fs');
        if (fs.existsSync(this.unifiedDbPath)) {
          fs.unlinkSync(this.unifiedDbPath);
          console.log('🗑️ Removed existing unified database');
        }
      } catch (error) {
        // File doesn't exist, continue
      }
      
      // Create new unified database
      const unifiedDb = new Database(this.unifiedDbPath);
      const mainDb = new Database(this.mainDbPath);
      const weeklyDb = new Database(this.weeklyDbPath);
      
      console.log('📋 Creating unified database schema...');
      
      // Create comprehensive users table with all user information
      unifiedDb.prepare(`
        CREATE TABLE users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          profile_id INTEGER UNIQUE NOT NULL,
          userkey TEXT,
          username TEXT,
          display_name TEXT,
          avatar_url TEXT,
          description TEXT,
          social_x TEXT,
          score INTEGER DEFAULT 0,
          total_xp INTEGER DEFAULT 0,
          streak_days INTEGER DEFAULT 0,
          last_updated TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run();
      
      // Create weekly XP data table
      unifiedDb.prepare(`
        CREATE TABLE weekly_xp_data (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          profile_id INTEGER NOT NULL,
          season_id INTEGER NOT NULL,
          week INTEGER NOT NULL,
          weekly_xp INTEGER DEFAULT 0,
          cumulative_xp INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (profile_id) REFERENCES users(profile_id),
          UNIQUE(profile_id, season_id, week)
        )
      `).run();
      
      // Create season weeks information table
      unifiedDb.prepare(`
        CREATE TABLE season_weeks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          season_id INTEGER NOT NULL,
          week INTEGER NOT NULL,
          start_date TEXT,
          end_date TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(season_id, week)
        )
      `).run();
      
      // Create indexes for better performance
      unifiedDb.prepare('CREATE INDEX idx_users_profile_id ON users(profile_id)').run();
      unifiedDb.prepare('CREATE INDEX idx_users_username ON users(username)').run();
      unifiedDb.prepare('CREATE INDEX idx_weekly_xp_profile_season ON weekly_xp_data(profile_id, season_id)').run();
      unifiedDb.prepare('CREATE INDEX idx_weekly_xp_season_week ON weekly_xp_data(season_id, week)').run();
      unifiedDb.prepare('CREATE INDEX idx_weekly_xp_cumulative ON weekly_xp_data(cumulative_xp DESC)').run();
      unifiedDb.prepare('CREATE INDEX idx_weekly_xp_weekly ON weekly_xp_data(weekly_xp DESC)').run();
      
      console.log('✅ Unified database schema created');
      
      // Step 1: Migrate all profiles from weekly database (these have XP data)
      console.log('📊 Step 1: Migrating profiles from weekly database...');
      const weeklyProfiles = weeklyDb.prepare('SELECT DISTINCT profile_id FROM weekly_xp_data ORDER BY profile_id').all();
      console.log(`Found ${weeklyProfiles.length} profiles with weekly XP data`);
      
      const insertUserStmt = unifiedDb.prepare(`
        INSERT OR REPLACE INTO users 
        (profile_id, userkey, username, display_name, avatar_url, total_xp, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);
      
      let usersInserted = 0;
      for (const { profile_id } of weeklyProfiles) {
        // Get user data from weekly DB (if available)
        const weeklyUser = weeklyDb.prepare('SELECT * FROM xp_profiles WHERE profile_id = ?').get(profile_id);
        
        // Get user data from main DB (if available)
        const mainUser = mainDb.prepare('SELECT * FROM comprehensive_users WHERE profile_id = ?').get(profile_id);
        
        // Create userkey
        const userkey = `profileId:${profile_id}`;
        
        // Merge data (prioritize main DB for user info, weekly DB for XP totals)
        const userData = {
          profile_id: profile_id,
          userkey: userkey,
          username: mainUser?.username || weeklyUser?.username || null,
          display_name: mainUser?.display_name || weeklyUser?.display_name || null,
          avatar_url: mainUser?.avatar_url || weeklyUser?.avatar_url || null,
          total_xp: weeklyUser?.total_xp || mainUser?.total_xp || 0,
          created_at: mainUser?.created_at || weeklyUser?.created_at || new Date().toISOString()
        };
        
        insertUserStmt.run(
          userData.profile_id,
          userData.userkey,
          userData.username,
          userData.display_name,
          userData.avatar_url,
          userData.total_xp,
          userData.created_at
        );
        
        usersInserted++;
        
        if (usersInserted % 1000 === 0) {
          console.log(`  Inserted ${usersInserted}/${weeklyProfiles.length} users...`);
        }
      }
      
      console.log(`✅ Inserted ${usersInserted} users`);
      
      // Step 2: Add remaining profiles from main database (high-XP users without weekly data)
      console.log('📊 Step 2: Adding remaining high-XP profiles from main database...');
      
      // Get all profile IDs from unified database first
      const existingProfileIds = unifiedDb.prepare('SELECT profile_id FROM users').all().map(row => row.profile_id);
      const existingProfileSet = new Set(existingProfileIds);
      
      // Get profiles from main database that aren't in unified database yet
      const allMainProfiles = mainDb.prepare('SELECT * FROM comprehensive_users').all();
      const mainOnlyProfiles = allMainProfiles.filter(profile => !existingProfileSet.has(profile.profile_id));
      
      console.log(`Found ${mainOnlyProfiles.length} additional profiles from main database`);
      
      for (const mainUser of mainOnlyProfiles) {
        const userkey = `profileId:${mainUser.profile_id}`;
        
        insertUserStmt.run(
          mainUser.profile_id,
          userkey,
          mainUser.username,
          mainUser.display_name,
          mainUser.avatar_url,
          mainUser.total_xp || 0,
          mainUser.created_at || new Date().toISOString()
        );
        
        usersInserted++;
      }
      
      console.log(`✅ Total users inserted: ${usersInserted}`);
      
      // Step 3: Migrate weekly XP data
      console.log('📊 Step 3: Migrating weekly XP data...');
      const weeklyXpData = weeklyDb.prepare('SELECT * FROM weekly_xp_data ORDER BY profile_id, season_id, week').all();
      console.log(`Found ${weeklyXpData.length} weekly XP records`);
      
      const insertWeeklyXpStmt = unifiedDb.prepare(`
        INSERT OR REPLACE INTO weekly_xp_data 
        (profile_id, season_id, week, weekly_xp, cumulative_xp, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      let weeklyXpInserted = 0;
      for (const xpRecord of weeklyXpData) {
        insertWeeklyXpStmt.run(
          xpRecord.profile_id,
          xpRecord.season_id,
          xpRecord.week,
          xpRecord.weekly_xp || 0,
          xpRecord.cumulative_xp || 0,
          xpRecord.created_at || new Date().toISOString()
        );
        
        weeklyXpInserted++;
        
        if (weeklyXpInserted % 10000 === 0) {
          console.log(`  Inserted ${weeklyXpInserted}/${weeklyXpData.length} weekly XP records...`);
        }
      }
      
      console.log(`✅ Inserted ${weeklyXpInserted} weekly XP records`);
      
      // Step 4: Migrate season weeks data
      console.log('📊 Step 4: Migrating season weeks data...');
      const seasonWeeksData = weeklyDb.prepare('SELECT * FROM season_weeks ORDER BY season_id, week').all();
      console.log(`Found ${seasonWeeksData.length} season week records`);
      
      const insertSeasonWeekStmt = unifiedDb.prepare(`
        INSERT OR REPLACE INTO season_weeks 
        (season_id, week, start_date, end_date, created_at)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      for (const weekRecord of seasonWeeksData) {
        insertSeasonWeekStmt.run(
          weekRecord.season_id,
          weekRecord.week,
          weekRecord.start_date,
          weekRecord.end_date,
          weekRecord.created_at || new Date().toISOString()
        );
      }
      
      console.log(`✅ Inserted ${seasonWeeksData.length} season week records`);
      
      // Generate final statistics
      console.log('\n📊 Final unified database statistics:');
      
      const totalUsers = unifiedDb.prepare('SELECT COUNT(*) as count FROM users').get();
      const usersWithUsernames = unifiedDb.prepare('SELECT COUNT(*) as count FROM users WHERE username IS NOT NULL').get();
      const usersWithXpData = unifiedDb.prepare('SELECT COUNT(DISTINCT profile_id) as count FROM weekly_xp_data').get();
      const totalWeeklyRecords = unifiedDb.prepare('SELECT COUNT(*) as count FROM weekly_xp_data').get();
      const seasonsCount = unifiedDb.prepare('SELECT COUNT(DISTINCT season_id) as count FROM weekly_xp_data').get();
      const weeksCount = unifiedDb.prepare('SELECT COUNT(*) as count FROM season_weeks').get();
      
      console.log(`   - Total users: ${totalUsers.count.toLocaleString()}`);
      console.log(`   - Users with usernames: ${usersWithUsernames.count.toLocaleString()} (${((usersWithUsernames.count / totalUsers.count) * 100).toFixed(2)}%)`);
      console.log(`   - Users with XP data: ${usersWithXpData.count.toLocaleString()}`);
      console.log(`   - Weekly XP records: ${totalWeeklyRecords.count.toLocaleString()}`);
      console.log(`   - Seasons: ${seasonsCount.count}`);
      console.log(`   - Week definitions: ${weeksCount.count}`);
      
      // Sample some data to verify
      console.log('\n📋 Sample unified data:');
      const sampleUsers = unifiedDb.prepare(`
        SELECT u.profile_id, u.username, u.display_name, u.total_xp,
               COUNT(w.id) as weekly_records
        FROM users u
        LEFT JOIN weekly_xp_data w ON u.profile_id = w.profile_id
        WHERE u.username IS NOT NULL
        GROUP BY u.profile_id
        ORDER BY u.total_xp DESC
        LIMIT 5
      `).all();
      
      sampleUsers.forEach(user => {
        console.log(`   - ${user.username} (${user.display_name}): ${user.total_xp.toLocaleString()} XP, ${user.weekly_records} weekly records`);
      });
      
      // Close databases
      mainDb.close();
      weeklyDb.close();
      unifiedDb.close();
      
      console.log('\n🎉 Unified database created successfully!');
      console.log(`📁 Location: ${this.unifiedDbPath}`);
      
    } catch (error) {
      console.error('❌ Error creating unified database:', error);
      throw error;
    }
  }
}

// Run the script
console.log('🚀 Starting unified database creation...');
const builder = new UnifiedDatabaseBuilder();
builder.createUnifiedDatabase()
  .then(() => console.log('✅ Unified database creation completed'))
  .catch(console.error);

export default UnifiedDatabaseBuilder;
