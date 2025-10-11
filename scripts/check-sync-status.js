import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function checkSyncStatus() {
  try {
    const dbPath = path.join(__dirname, '..', 'database', 'ethos.db');
    const db = new Database(dbPath);
    
    console.log('📊 Database Sync Status');
    console.log('========================');
    
    // Get total profiles
    const totalProfiles = db.prepare('SELECT COUNT(*) as count FROM comprehensive_users').get();
    console.log(`📈 Total profiles in database: ${totalProfiles.count}`);
    
    // Get highest profile ID
    const maxId = db.prepare('SELECT MAX(profile_id) as max_id FROM comprehensive_users').get();
    console.log(`🔢 Highest profile ID: ${maxId.max_id}`);
    
    // Get recent profiles
    const recentProfiles = db.prepare(`
      SELECT profile_id, username, display_name, score, total_xp, last_updated 
      FROM comprehensive_users 
      ORDER BY last_updated DESC 
      LIMIT 5
    `).all();
    
    console.log('\n🆕 Most recently updated profiles:');
    recentProfiles.forEach((profile, index) => {
      console.log(`  ${index + 1}. ${profile.display_name || profile.username} (ID: ${profile.profile_id}) - Score: ${profile.score}, XP: ${profile.total_xp}`);
    });
    
    // Get top profiles by score
    const topProfiles = db.prepare(`
      SELECT profile_id, username, display_name, score, total_xp 
      FROM comprehensive_users 
      ORDER BY score DESC 
      LIMIT 5
    `).all();
    
    console.log('\n🏆 Top profiles by score:');
    topProfiles.forEach((profile, index) => {
      console.log(`  ${index + 1}. ${profile.display_name || profile.username} - Score: ${profile.score}, XP: ${profile.total_xp}`);
    });
    
    db.close();
    
  } catch (error) {
    console.error('❌ Error checking sync status:', error);
  }
}

checkSyncStatus();
