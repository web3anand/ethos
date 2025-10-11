import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'database', 'ethos.db');
const db = new Database(dbPath);

try {
  // Get profile ID statistics
  const stats = db.prepare(`
    SELECT 
      MIN(profile_id) as min_id, 
      MAX(profile_id) as max_id, 
      COUNT(*) as total,
      AVG(profile_id) as avg_id
    FROM comprehensive_users
  `).get();
  
  console.log('📊 Profile ID Statistics:');
  console.log(`   Min ID: ${stats.min_id}`);
  console.log(`   Max ID: ${stats.max_id}`);
  console.log(`   Total profiles: ${stats.total}`);
  console.log(`   Average ID: ${Math.round(stats.avg_id)}`);
  
  // Get some sample profile IDs
  const samples = db.prepare(`
    SELECT profile_id, username, display_name, total_xp
    FROM comprehensive_users 
    ORDER BY profile_id 
    LIMIT 10
  `).all();
  
  console.log('\n📋 Sample Profile IDs:');
  samples.forEach(profile => {
    console.log(`   ID: ${profile.profile_id}, Username: ${profile.username || 'N/A'}, XP: ${profile.total_xp || 0}`);
  });
  
  // Check for gaps in profile IDs
  const gaps = db.prepare(`
    WITH RECURSIVE gaps AS (
      SELECT MIN(profile_id) as id FROM comprehensive_users
      UNION ALL
      SELECT id + 1 FROM gaps WHERE id < (SELECT MAX(profile_id) FROM comprehensive_users)
    )
    SELECT g.id as missing_id
    FROM gaps g
    LEFT JOIN comprehensive_users c ON g.id = c.profile_id
    WHERE c.profile_id IS NULL
    ORDER BY g.id
    LIMIT 10
  `).all();
  
  if (gaps.length > 0) {
    console.log('\n🔍 First 10 Missing Profile IDs:');
    gaps.forEach(gap => {
      console.log(`   Missing ID: ${gap.missing_id}`);
    });
  }
  
} catch (error) {
  console.error('❌ Error checking database:', error.message);
} finally {
  db.close();
}

