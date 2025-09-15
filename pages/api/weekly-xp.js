import Database from 'better-sqlite3';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { season, week, search, limit = 100, offset = 0 } = req.query;
    
    // Connect to weekly XP database (now contains synced user data)
    const weeklyDbPath = path.join(process.cwd(), 'database', 'weekly-xp.db');
    const db = new Database(weeklyDbPath);
    
    let query = `
      SELECT 
        w.profile_id,
        COALESCE(p.username, 'user_' || w.profile_id) as username,
        COALESCE(p.display_name, 'User ' || w.profile_id) as display_name,
        p.avatar_url,
        p.total_xp,
        w.season_id,
        w.week,
        w.weekly_xp,
        w.cumulative_xp,
        ROW_NUMBER() OVER (
          ORDER BY ${(week !== undefined && week !== null && week !== '') ? 'w.weekly_xp' : 'w.cumulative_xp'} DESC
        ) as rank
      FROM weekly_xp_data w
      LEFT JOIN xp_profiles p ON w.profile_id = p.profile_id
      WHERE 1=1
    `;
    
    const params = [];
    
    // Filter by season if specified
    if (season !== undefined) {
      query += ` AND w.season_id = ?`;
      params.push(parseInt(season));
    }
    
    // Filter by week if specified
    if (week !== undefined && week !== null && week !== '') {
      query += ` AND w.week = ?`;
      params.push(parseInt(week));
    }
    
    // Filter by search term if specified
    if (search) {
      query += ` AND (p.username LIKE ? OR p.display_name LIKE ? OR w.profile_id = ?)`;
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, search);
    }
    
    // Only include profiles with XP data for the specified criteria
    if (season !== undefined || (week !== undefined && week !== null && week !== '')) {
      query += ` AND w.profile_id IS NOT NULL`;
    }
    
    // Add ordering and limit
    query += ` ORDER BY ${(week !== undefined && week !== null && week !== '') ? 'w.weekly_xp' : 'w.cumulative_xp'} DESC`;
    query += ` LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));
    
    const profiles = db.prepare(query).all(...params);
    
    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM weekly_xp_data w
      LEFT JOIN xp_profiles p ON w.profile_id = p.profile_id
      WHERE 1=1
    `;
    
    const countParams = [];
    
    if (season !== undefined) {
      countQuery += ` AND w.season_id = ?`;
      countParams.push(parseInt(season));
    }
    
    if (week !== undefined && week !== null && week !== '') {
      countQuery += ` AND w.week = ?`;
      countParams.push(parseInt(week));
    }
    
    if (search) {
      countQuery += ` AND (p.username LIKE ? OR p.display_name LIKE ? OR w.profile_id = ?)`;
      const searchPattern = `%${search}%`;
      countParams.push(searchPattern, searchPattern, search);
    }
    
    if (season !== undefined || (week !== undefined && week !== null && week !== '')) {
      countQuery += ` AND w.profile_id IS NOT NULL`;
    }
    
    const totalResult = db.prepare(countQuery).get(...countParams);
    const total = totalResult.total;
    
    // Get seasons and weeks data
    const seasons = db.prepare(`
      SELECT DISTINCT season_id, 
        CASE WHEN season_id = 0 THEN 'Season 0' ELSE 'Season 1' END as season_name
      FROM weekly_xp_data 
      ORDER BY season_id
    `).all();
    
    const weeks = db.prepare(`
      SELECT DISTINCT season_id, week
      FROM weekly_xp_data 
      ORDER BY season_id, week
    `).all();
    
    // Close database
    db.close();
    
    res.status(200).json({
      profiles,
      total,
      seasons,
      weeks,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + profiles.length < total
      }
    });
    
  } catch (error) {
    console.error('Error fetching weekly XP data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
