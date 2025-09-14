// API endpoint for weekly XP data with proper X-Ethos-Client header

const Database = require('better-sqlite3');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = new Database('./database/ethos.db');
    
    // Get seasons data
    const seasons = db.prepare(`
      SELECT id, name, start_date, total_weeks, current_week, is_current
      FROM ethos_seasons 
      ORDER BY id
    `).all();
    
    // Get weeks data
    const weeks = db.prepare(`
      SELECT season_id, week_number, start_date, end_date
      FROM ethos_weeks 
      ORDER BY season_id, week_number
    `).all();
    
    // Get weekly XP data with user info
    const weeklyData = db.prepare(`
      SELECT 
        w.profile_id,
        w.username,
        w.display_name,
        w.season_id,
        w.week_number,
        w.weekly_xp,
        w.cumulative_xp,
        p.xp_total as total_xp,
        p.score,
        p.status
      FROM ethos_weekly_xp w
      LEFT JOIN ethos_profiles p ON w.profile_id = p.profile_id
      ORDER BY w.season_id, w.week_number, w.weekly_xp DESC
    `).all();
    
    // Get weekly stats (aggregated data)
    const weeklyStats = db.prepare(`
      SELECT 
        season_id,
        week_number,
        total_weekly_xp,
        active_users,
        avg_xp_per_user
      FROM weekly_stats
      ORDER BY season_id, week_number
    `).all();
    
    // Calculate statistics
    const stats = {
      totalSeasons: seasons.length,
      totalWeeks: weeks.length,
      totalProfiles: new Set(weeklyData.map(d => d.profile_id)).size,
      totalWeeklyDataPoints: weeklyData.length,
      totalWeeklyXP: weeklyData.reduce((sum, d) => sum + d.weekly_xp, 0),
      lastUpdated: new Date().toISOString()
    };
    
    // Group data by season and week
    const seasonData = seasons.map(season => {
      const seasonWeeks = weeks.filter(w => w.season_id === season.id);
      const seasonWeeklyData = weeklyData.filter(d => d.season_id === season.id);
      const seasonWeeklyStats = weeklyStats.filter(s => s.season_id === season.id);
      
      return {
        ...season,
        weeks: seasonWeeks.map(week => {
          const weekData = seasonWeeklyData.filter(d => d.week_number === week.week_number);
          const weekStats = seasonWeeklyStats.find(s => s.week_number === week.week_number);
          
          // Use aggregated stats if available, otherwise calculate from individual data
          const participants = weekStats ? weekStats.active_users : weekData.length;
          const totalWeeklyXP = weekStats ? weekStats.total_weekly_xp : weekData.reduce((sum, d) => sum + d.weekly_xp, 0);
          const avgWeeklyXP = weekStats ? Math.round(weekStats.avg_xp_per_user) : (weekData.length > 0 ? Math.round(weekData.reduce((sum, d) => sum + d.weekly_xp, 0) / weekData.length) : 0);
          
          return {
            ...week,
            participants,
            totalWeeklyXP,
            avgWeeklyXP,
            topUsers: weekData
              .sort((a, b) => b.weekly_xp - a.weekly_xp)
              .slice(0, 10)
              .map(user => ({
                profileId: user.profile_id,
                username: user.username,
                displayName: user.display_name,
                weeklyXp: user.weekly_xp,
                cumulativeXp: user.cumulative_xp,
                totalXp: user.total_xp,
                score: user.score,
                status: user.status
              }))
          };
        })
      };
    });
    
    // Get top users across all weeks
    const topUsers = weeklyData
      .reduce((acc, user) => {
        const existing = acc.find(u => u.profile_id === user.profile_id);
        if (existing) {
          existing.totalWeeklyXP += user.weekly_xp;
          existing.weeksActive += 1;
        } else {
          acc.push({
            profile_id: user.profile_id,
            username: user.username,
            display_name: user.display_name,
            total_xp: user.total_xp,
            score: user.score,
            status: user.status,
            totalWeeklyXP: user.weekly_xp,
            weeksActive: 1
          });
        }
        return acc;
      }, [])
      .sort((a, b) => b.totalWeeklyXP - a.totalWeeklyXP)
      .slice(0, 50);
    
    db.close();
    
    res.status(200).json({
      success: true,
      data: {
        seasons: seasonData,
        stats,
        topUsers,
        metadata: {
          dataSource: 'ethos-api-v2',
          lastUpdated: stats.lastUpdated,
          description: 'Comprehensive weekly XP data using all Ethos API endpoints'
        }
      }
    });
    
  } catch (error) {
    console.error('Error fetching weekly XP data:', error);
    res.status(500).json({ 
      error: 'Failed to fetch weekly XP data',
      details: error.message 
    });
  }
}
