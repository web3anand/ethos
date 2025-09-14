// Ethos Profiles API - Serves profile data for leaderboard and seasons distribution
// This API provides complete profile data from the database

const Database = require('better-sqlite3');

export default function handler(req, res) {
  console.log('[Ethos Profiles] API called');
  
  try {
    const db = new Database('./database/ethos.db');
    
    // Get query parameters
    const { 
      limit = 100, 
      offset = 0, 
      sortBy = 'total_xp', 
      order = 'DESC',
      minXp = 0,
      hasXp = null
    } = req.query;
    
    // Build query based on parameters
    let whereClause = 'WHERE 1=1';
    let params = [];
    
    if (minXp > 0) {
      whereClause += ' AND total_xp >= ?';
      params.push(parseInt(minXp));
    }
    
    if (hasXp === 'true') {
      whereClause += ' AND total_xp > 0';
    } else if (hasXp === 'false') {
      whereClause += ' AND total_xp = 0';
    }
    
    // Get profiles with pagination
    const profilesStmt = db.prepare(`
      SELECT 
        profile_id, username, display_name, avatar_url, description,
        total_xp, score, streak_days, has_validator_nft,
        social_x, social_discord, social_telegram, social_farcaster,
        primary_address, age_days, status,
        reviews_given, reviews_received, vouches_given, vouches_received,
        weekly_xp_data, last_updated
      FROM ethos_profiles 
      ${whereClause}
      ORDER BY ${sortBy} ${order}
      LIMIT ? OFFSET ?
    `);
    
    const profiles = profilesStmt.all(...params, parseInt(limit), parseInt(offset));
    
    // Get total count
    const countStmt = db.prepare(`SELECT COUNT(*) as count FROM ethos_profiles ${whereClause}`);
    const totalCount = countStmt.get(...params);
    
    // Get summary statistics
    const statsStmt = db.prepare(`
      SELECT 
        COUNT(*) as totalProfiles,
        COUNT(CASE WHEN total_xp > 0 THEN 1 END) as profilesWithXp,
        COUNT(CASE WHEN total_xp = 0 THEN 1 END) as profilesWithoutXp,
        SUM(total_xp) as totalXp,
        AVG(total_xp) as avgXp,
        MAX(total_xp) as maxXp,
        COUNT(CASE WHEN has_validator_nft = 1 THEN 1 END) as validatorNftHolders
      FROM ethos_profiles
    `);
    
    const stats = statsStmt.get();
    
    // Get weekly statistics
    const weeklyStmt = db.prepare(`
      SELECT profile_id, weekly_xp_data
      FROM ethos_profiles 
      WHERE weekly_xp_data IS NOT NULL 
      AND weekly_xp_data != '{}'
      AND total_xp > 0
    `);
    
    const weeklyData = weeklyStmt.all();
    
    // Process weekly statistics
    const weeklyStats = {};
    for (let week = 1; week <= 12; week++) {
      weeklyStats[week] = {
        week: week,
        totalXP: 0,
        activeUsers: 0,
        avgXPPerUser: 0
      };
    }
    
    weeklyData.forEach(profile => {
      try {
        const weeklyData = JSON.parse(profile.weekly_xp_data || '{}');
        
        Object.keys(weeklyData).forEach(seasonKey => {
          const seasonData = weeklyData[seasonKey];
          
          if (seasonData && typeof seasonData === 'object') {
            Object.keys(seasonData).forEach(weekKey => {
              const weekNumber = parseInt(weekKey.replace('week_', ''));
              const weekXP = seasonData[weekKey] || 0;
              
              if (weekXP > 0 && weekNumber >= 1 && weekNumber <= 12) {
                weeklyStats[weekNumber].totalXP += weekXP;
                weeklyStats[weekNumber].activeUsers++;
              }
            });
          }
        });
      } catch (parseError) {
        // Skip on error
      }
    });
    
    // Calculate averages and filter empty weeks
    const weeklyStatsArray = [];
    Object.keys(weeklyStats).forEach(weekKey => {
      const week = weeklyStats[weekKey];
      week.avgXPPerUser = week.activeUsers > 0 ? Math.round(week.totalXP / week.activeUsers) : 0;
      
      if (week.totalXP > 0) {
        weeklyStatsArray.push(week);
      }
    });
    
    weeklyStatsArray.sort((a, b) => a.week - b.week);
    
    db.close();
    
    console.log(`[Ethos Profiles] Returning ${profiles.length} profiles (${totalCount.count} total)`);
    
    return res.status(200).json({
      success: true,
      message: 'Profiles fetched successfully',
      data: {
        profiles: profiles,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: totalCount.count,
          hasMore: (parseInt(offset) + parseInt(limit)) < totalCount.count
        },
        statistics: {
          totalProfiles: stats.totalProfiles,
          profilesWithXp: stats.profilesWithXp,
          profilesWithoutXp: stats.profilesWithoutXp,
          totalXp: stats.totalXp || 0,
          avgXp: Math.round(stats.avgXp || 0),
          maxXp: stats.maxXp || 0,
          validatorNftHolders: stats.validatorNftHolders
        },
        weeklyStats: weeklyStatsArray
      },
      metadata: {
        dataSource: 'ethos-api-v2',
        dataQuality: 'Complete profile data with weekly XP',
        description: 'Complete Ethos profiles with all required fields',
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('[Ethos Profiles] Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
      data: {
        profiles: [],
        pagination: { limit: 0, offset: 0, total: 0, hasMore: false },
        statistics: {},
        weeklyStats: []
      }
    });
  }
}

