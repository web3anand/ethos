import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function exportDatabaseToJson() {
  try {
    const dbPath = path.join(__dirname, '..', 'database', 'ethos.db');
    const db = new Database(dbPath);
    
    console.log('🔄 Exporting database to user-profiles.json...');
    
    // Get all comprehensive users data
    const users = db.prepare(`
      SELECT 
        profile_id as id,
        profile_id as profileId,
        username,
        display_name as displayName,
        avatar_url as avatarUrl,
        score,
        total_xp as xpTotal,
        streak_days as xpStreakDays,
        primary_address as primaryAddr,
        all_addresses,
        status,
        reviews_given,
        reviews_received,
        vouches_given,
        vouches_received,
        weekly_xp_data as weeklyXpData,
        last_updated as lastUpdated
      FROM comprehensive_users 
      ORDER BY score DESC
    `).all();
    
    console.log(`📊 Found ${users.length} users in database`);
    
    // Convert to the format expected by the Fast API
    const userProfiles = users.map(user => ({
      id: user.id,
      profileId: user.profileId,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      score: user.score || 0,
      xpTotal: user.xpTotal || 0,
      xpStreakDays: user.xpStreakDays || 0,
      primaryAddr: user.primaryAddr,
      userkeys: user.all_addresses ? JSON.parse(user.all_addresses) : [`profileId:${user.profileId}`],
      stats: {
        review: {
          received: {
            positive: user.reviews_received || 0,
            negative: 0,
            neutral: 0
          }
        },
        vouch: {
          received: {
            count: user.vouches_received || 0,
            amountWeiTotal: "0"
          },
          given: {
            count: user.vouches_given || 0,
            amountWeiTotal: "0"
          }
        }
      },
      status: user.status,
      source: 'database-export'
    }));
    
    // Write to user-profiles.json
    const outputPath = path.join(__dirname, '..', 'data', 'user-profiles.json');
    fs.writeFileSync(outputPath, JSON.stringify(userProfiles, null, 2));
    
    console.log(`✅ Created user-profiles.json with ${userProfiles.length} profiles`);
    console.log(`📈 Top 5 profiles by score:`);
    userProfiles.slice(0, 5).forEach((profile, index) => {
      console.log(`  ${index + 1}. ${profile.displayName || profile.username} - Score: ${profile.score}, XP: ${profile.xpTotal}`);
    });
    
    db.close();
    
  } catch (error) {
    console.error('❌ Error exporting database:', error);
  }
}

exportDatabaseToJson();
