import Database from 'better-sqlite3';
import path from 'path';

export default async function handler(req, res) {
  try {
    const { limit = 5000, offset = 0 } = req.query;
    const dbPath = path.join(process.cwd(), 'database', 'ethos.db');
    
    // Check if database exists
    try {
      const db = new Database(dbPath);
      
      // Get profiles from database with pagination
      const profiles = db.prepare(`
        SELECT 
          profile_id as id,
          profile_id,
          username,
          display_name as displayName,
          avatar_url as avatarUrl,
          description,
          social_x as twitterId,
          score,
          total_xp as xpTotal,
          streak_days as xpStreakDays,
          last_updated as lastUpdated
        FROM comprehensive_users 
        ORDER BY score DESC
        LIMIT ? OFFSET ?
      `).all(parseInt(limit), parseInt(offset));
      
      db.close();
      
      // Map to expected format
      const mappedProfiles = profiles.map((profile, index) => ({
        rank: parseInt(offset) + index + 1,
        address: `profile_${profile.profile_id}`,
        username: profile.username || profile.displayName || null,
        displayName: profile.displayName || profile.username || null,
        score: profile.score || 0,
        reviews: {
          positive: 0, // Not available in current schema
          negative: 0,
          neutral: 0
        },
        vouches: {
          received: 0, // Not available in current schema
          given: 0
        },
        xp: profile.xpTotal || 0,
        xpTotal: profile.xpTotal || 0,
        xpStreakDays: profile.xpStreakDays || 0,
        profileId: profile.profile_id,
        id: profile.profile_id,
        avatarUrl: profile.avatarUrl || null,
        userkeys: [],
        source: 'sqlite-database'
      }));
      
      res.status(200).json({ profiles: mappedProfiles });
    } catch (dbError) {
      console.error('Database error:', dbError);
      return res.status(200).json({ profiles: [] });
    }
  } catch (error) {
    console.error('Error reading profiles:', error);
    res.status(500).json({ error: 'Failed to load profiles' });
  }
}
