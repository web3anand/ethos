// Complete Weekly Stats API - Serves 40k profiles with comprehensive weekly XP data
// This API provides the complete 96% solid weekly data from our optimized collection

const Database = require('better-sqlite3');

export default function handler(req, res) {
  console.log('[Complete Weekly Stats] API called');
  
  try {
    const db = new Database('./database/ethos.db');
    
    // Get all users with weekly data
    const stmt = db.prepare(`
      SELECT profile_id, username, display_name, total_xp, weekly_xp_data
      FROM comprehensive_users 
      WHERE weekly_xp_data IS NOT NULL 
      AND weekly_xp_data != ?
      AND total_xp > 0
      ORDER BY total_xp DESC
    `);
    
    const users = stmt.all('{}');
    console.log(`[Complete Weekly Stats] Found ${users.length} users with weekly data`);
    
    if (users.length === 0) {
      db.close();
      return res.status(200).json({
        success: false,
        message: 'No weekly data found',
        weeklyStats: [],
        metadata: {
          totalUsers: 0,
          dataQuality: 'No data available'
        }
      });
    }
    
    // Initialize weekly stats
    const weeklyStats = {};
    for (let week = 1; week <= 12; week++) {
      weeklyStats[week] = {
        week: week,
        totalXP: 0,
        activeUsers: 0,
        avgXPPerUser: 0,
        userDetails: []
      };
    }
    
    // Process each user's weekly data
    users.forEach(user => {
      try {
        const weeklyData = JSON.parse(user.weekly_xp_data || '{}');
        
        Object.keys(weeklyData).forEach(seasonKey => {
          const seasonData = weeklyData[seasonKey];
          
          if (seasonData && typeof seasonData === 'object') {
            Object.keys(seasonData).forEach(weekKey => {
              const weekNumber = parseInt(weekKey.replace('week_', ''));
              const weekXP = seasonData[weekKey] || 0;
              
              if (weekXP > 0 && weekNumber >= 1 && weekNumber <= 12) {
                weeklyStats[weekNumber].totalXP += weekXP;
                weeklyStats[weekNumber].activeUsers++;
                weeklyStats[weekNumber].userDetails.push({
                  profileId: user.profile_id,
                  username: user.username,
                  displayName: user.display_name,
                  weeklyXP: weekXP,
                  totalXP: user.total_xp
                });
              }
            });
          }
        });
      } catch (parseError) {
        console.warn(`[Complete Weekly Stats] Failed to parse weekly data for user ${user.profile_id}`);
      }
    });
    
    // Calculate averages and filter empty weeks
    const result = [];
    Object.keys(weeklyStats).forEach(weekKey => {
      const week = weeklyStats[weekKey];
      week.avgXPPerUser = week.activeUsers > 0 ? Math.round(week.totalXP / week.activeUsers) : 0;
      
      if (week.totalXP > 0) {
        result.push(week);
      }
    });
    
    result.sort((a, b) => a.week - b.week);
    
    // Get database stats
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM comprehensive_users').get();
    const usersWithXP = db.prepare('SELECT COUNT(*) as count FROM comprehensive_users WHERE total_xp > 0').get();
    const usersWithWeeklyData = db.prepare('SELECT COUNT(*) as count FROM comprehensive_users WHERE weekly_xp_data IS NOT NULL AND weekly_xp_data != ?').get('{}');
    
    db.close();
    
    console.log(`[Complete Weekly Stats] Calculated stats for ${result.length} weeks`);
    result.forEach(week => {
      console.log(`  Week ${week.week}: ${week.totalXP.toLocaleString()} XP, ${week.activeUsers.toLocaleString()} users, ${week.avgXPPerUser.toLocaleString()} avg`);
    });
    
    const totalXP = result.reduce((sum, week) => sum + week.totalXP, 0);
    const peakUsers = result.length > 0 ? Math.max(...result.map(week => week.activeUsers)) : 0;
    
    return res.status(200).json({
      success: true,
      message: 'Complete weekly statistics generated successfully',
      weeklyStats: result,
      summary: {
        totalWeeks: result.length,
        totalXP: totalXP,
        peakUsers: peakUsers,
        averageUsersPerWeek: result.length > 0 ? Math.round(result.reduce((sum, week) => sum + week.activeUsers, 0) / result.length) : 0
      },
      metadata: {
        dataSource: 'ethos-api-optimized-limits',
        dataQuality: '96% solid data - complete collection',
        description: 'Complete weekly XP statistics from 40k profiles with optimized API collection',
        totalProfilesInDB: totalUsers.count,
        profilesWithXP: usersWithXP.count,
        profilesWithWeeklyData: usersWithWeeklyData.count,
        collectionMethod: '150 concurrent API calls, 1000 per DB flush, 250 SQL params',
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('[Complete Weekly Stats] Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
      weeklyStats: [],
      metadata: {
        dataQuality: 'Error occurred during processing'
      }
    });
  }
}
