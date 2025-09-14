import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DatabaseToCsvExporter {
  constructor() {
    this.mainDbPath = path.join(__dirname, '..', 'database', 'ethos.db');
    this.weeklyDbPath = path.join(__dirname, '..', 'database', 'weekly-xp.db');
    this.unifiedDbPath = path.join(__dirname, '..', 'database', 'unified-ethos.db');
    this.dataDir = path.join(__dirname, '..', 'data', 'csv');
    
    console.log('🚀 Database to CSV Exporter initialized');
    console.log(`📁 Data directory: ${this.dataDir}`);
    
    // Ensure data directory exists
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
      console.log('📁 Created data/csv directory');
    }
  }

  // Convert array of objects to CSV string
  arrayToCsv(data, headers) {
    if (!data || data.length === 0) return headers.join(',') + '\n';
    
    const csvRows = [headers.join(',')];
    
    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header];
        // Handle null/undefined values and escape commas/quotes
        if (value === null || value === undefined) return '';
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      csvRows.push(values.join(','));
    }
    
    return csvRows.join('\n');
  }

  // Export users data
  async exportUsers() {
    try {
      console.log('👥 Exporting users data...');
      
      let allUsers = [];
      
      // Try unified database first
      if (fs.existsSync(this.unifiedDbPath)) {
        console.log('📊 Reading from unified database...');
        const unifiedDb = new Database(this.unifiedDbPath);
        allUsers = unifiedDb.prepare('SELECT * FROM users ORDER BY profile_id').all();
        unifiedDb.close();
        console.log(`✅ Found ${allUsers.length} users in unified database`);
      } else {
        // Fallback to combining main and weekly databases
        console.log('📊 Combining main and weekly databases...');
        
        const mainDb = new Database(this.mainDbPath);
        const weeklyDb = new Database(this.weeklyDbPath);
        
        // Get all profiles from weekly database (these have XP data)
        const weeklyProfiles = weeklyDb.prepare('SELECT DISTINCT profile_id FROM weekly_xp_data').all();
        const weeklyProfileIds = weeklyProfiles.map(p => p.profile_id);
        
        console.log(`Found ${weeklyProfileIds.length} profiles with weekly XP data`);
        
        // Process profiles in batches
        const batchSize = 1000;
        for (let i = 0; i < weeklyProfileIds.length; i += batchSize) {
          const batch = weeklyProfileIds.slice(i, i + batchSize);
          
          for (const profileId of batch) {
            // Get user data from weekly DB
            const weeklyUser = weeklyDb.prepare('SELECT * FROM xp_profiles WHERE profile_id = ?').get(profileId);
            
            // Get user data from main DB (if available)
            const mainUser = mainDb.prepare('SELECT * FROM comprehensive_users WHERE profile_id = ?').get(profileId);
            
            // Merge data
            const userData = {
              profile_id: profileId,
              userkey: `profileId:${profileId}`,
              username: mainUser?.username || weeklyUser?.username || null,
              display_name: mainUser?.display_name || weeklyUser?.display_name || null,
              avatar_url: mainUser?.avatar_url || weeklyUser?.avatar_url || null,
              description: mainUser?.description || null,
              social_x: mainUser?.social_x || null,
              score: mainUser?.score || 0,
              total_xp: weeklyUser?.total_xp || mainUser?.total_xp || 0,
              streak_days: mainUser?.streak_days || 0,
              last_updated: mainUser?.last_updated || null,
              created_at: mainUser?.created_at || new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            
            allUsers.push(userData);
          }
          
          if (i % 5000 === 0) {
            console.log(`  Processed ${i}/${weeklyProfileIds.length} profiles...`);
          }
        }
        
        // Add remaining profiles from main database (high-XP users without weekly data)
        const allMainProfiles = mainDb.prepare('SELECT * FROM comprehensive_users').all();
        const existingProfileIds = new Set(allUsers.map(u => u.profile_id));
        
        for (const mainUser of allMainProfiles) {
          if (!existingProfileIds.has(mainUser.profile_id)) {
            const userData = {
              profile_id: mainUser.profile_id,
              userkey: `profileId:${mainUser.profile_id}`,
              username: mainUser.username,
              display_name: mainUser.display_name,
              avatar_url: mainUser.avatar_url,
              description: mainUser.description,
              social_x: mainUser.social_x,
              score: mainUser.score || 0,
              total_xp: mainUser.total_xp || 0,
              streak_days: mainUser.streak_days || 0,
              last_updated: mainUser.last_updated,
              created_at: mainUser.created_at || new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            
            allUsers.push(userData);
          }
        }
        
        mainDb.close();
        weeklyDb.close();
        
        console.log(`✅ Combined total: ${allUsers.length} users`);
      }
      
      // Sort by profile_id for consistency
      allUsers.sort((a, b) => a.profile_id - b.profile_id);
      
      // Export to CSV
      const headers = [
        'profile_id', 'userkey', 'username', 'display_name', 'avatar_url',
        'description', 'social_x', 'score', 'total_xp', 'streak_days',
        'last_updated', 'created_at', 'updated_at'
      ];
      
      const csvContent = this.arrayToCsv(allUsers, headers);
      const usersFile = path.join(this.dataDir, 'users.csv');
      
      fs.writeFileSync(usersFile, csvContent, 'utf8');
      console.log(`✅ Exported ${allUsers.length} users to ${usersFile}`);
      
      // Export summary stats
      const usersWithNames = allUsers.filter(u => u.username).length;
      const stats = {
        total_users: allUsers.length,
        users_with_names: usersWithNames,
        coverage_percentage: ((usersWithNames / allUsers.length) * 100).toFixed(2),
        export_date: new Date().toISOString()
      };
      
      console.log(`📊 Users stats: ${stats.users_with_names}/${stats.total_users} (${stats.coverage_percentage}%) have usernames`);
      
      return stats;
      
    } catch (error) {
      console.error('❌ Error exporting users:', error);
      throw error;
    }
  }

  // Export weekly XP data
  async exportWeeklyXp() {
    try {
      console.log('📈 Exporting weekly XP data...');
      
      const weeklyDb = new Database(this.weeklyDbPath);
      
      // Get all weekly XP data
      const weeklyXpData = weeklyDb.prepare(`
        SELECT profile_id, season_id, week, weekly_xp, cumulative_xp, created_at
        FROM weekly_xp_data 
        ORDER BY profile_id, season_id, week
      `).all();
      
      console.log(`✅ Found ${weeklyXpData.length} weekly XP records`);
      
      // Export to CSV
      const headers = ['profile_id', 'season_id', 'week', 'weekly_xp', 'cumulative_xp', 'created_at'];
      const csvContent = this.arrayToCsv(weeklyXpData, headers);
      const weeklyXpFile = path.join(this.dataDir, 'weekly_xp.csv');
      
      fs.writeFileSync(weeklyXpFile, csvContent, 'utf8');
      console.log(`✅ Exported ${weeklyXpData.length} weekly XP records to ${weeklyXpFile}`);
      
      weeklyDb.close();
      
      return {
        total_records: weeklyXpData.length,
        unique_profiles: new Set(weeklyXpData.map(r => r.profile_id)).size,
        seasons: new Set(weeklyXpData.map(r => r.season_id)).size
      };
      
    } catch (error) {
      console.error('❌ Error exporting weekly XP:', error);
      throw error;
    }
  }

  // Export season weeks data
  async exportSeasonWeeks() {
    try {
      console.log('📅 Exporting season weeks data...');
      
      const weeklyDb = new Database(this.weeklyDbPath);
      
      // Get season weeks data
      const seasonWeeks = weeklyDb.prepare(`
        SELECT season_id, week, start_date, end_date, created_at
        FROM season_weeks 
        ORDER BY season_id, week
      `).all();
      
      console.log(`✅ Found ${seasonWeeks.length} season week records`);
      
      // Export to CSV
      const headers = ['season_id', 'week', 'start_date', 'end_date', 'created_at'];
      const csvContent = this.arrayToCsv(seasonWeeks, headers);
      const seasonWeeksFile = path.join(this.dataDir, 'season_weeks.csv');
      
      fs.writeFileSync(seasonWeeksFile, csvContent, 'utf8');
      console.log(`✅ Exported ${seasonWeeks.length} season week records to ${seasonWeeksFile}`);
      
      weeklyDb.close();
      
      return {
        total_weeks: seasonWeeks.length,
        seasons: new Set(seasonWeeks.map(r => r.season_id)).size
      };
      
    } catch (error) {
      console.error('❌ Error exporting season weeks:', error);
      throw error;
    }
  }

  // Main export function
  async exportAll() {
    try {
      console.log('🚀 Starting database to CSV export...');
      const startTime = Date.now();
      
      const userStats = await this.exportUsers();
      const weeklyXpStats = await this.exportWeeklyXp();
      const seasonWeeksStats = await this.exportSeasonWeeks();
      
      const duration = Date.now() - startTime;
      
      console.log('\n🎉 Export completed successfully!');
      console.log('📊 Export summary:');
      console.log(`   - Users: ${userStats.total_users} (${userStats.users_with_names} with names)`);
      console.log(`   - Weekly XP records: ${weeklyXpStats.total_records}`);
      console.log(`   - Season weeks: ${seasonWeeksStats.total_weeks}`);
      console.log(`   - Duration: ${Math.round(duration / 1000)} seconds`);
      console.log(`   - Files location: ${this.dataDir}`);
      
      // Create summary file
      const summary = {
        export_date: new Date().toISOString(),
        duration_seconds: Math.round(duration / 1000),
        users: userStats,
        weekly_xp: weeklyXpStats,
        season_weeks: seasonWeeksStats,
        files: {
          users: 'users.csv',
          weekly_xp: 'weekly_xp.csv',
          season_weeks: 'season_weeks.csv'
        }
      };
      
      const summaryFile = path.join(this.dataDir, 'export_summary.json');
      fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2), 'utf8');
      console.log(`📋 Export summary saved to ${summaryFile}`);
      
    } catch (error) {
      console.error('❌ Export failed:', error);
      throw error;
    }
  }
}

// Run the script
console.log('🚀 Starting database to CSV export...');
const exporter = new DatabaseToCsvExporter();
exporter.exportAll()
  .then(() => console.log('✅ Database to CSV export completed'))
  .catch(console.error);

export default DatabaseToCsvExporter;
