import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  try {
    // Read the weekly distribution data
    const dataPath = path.join(process.cwd(), 'data', 'weekly-distribution-profiles.json');
    
    if (!fs.existsSync(dataPath)) {
      return res.status(404).json({
        success: false,
        error: 'Weekly distribution data not found'
      });
    }

    const rawData = fs.readFileSync(dataPath, 'utf8');
    const data = JSON.parse(rawData);

    if (!data.profiles || !data.metadata) {
      return res.status(500).json({
        success: false,
        error: 'Invalid data format'
      });
    }

    // Process the data to create weekly distribution summary
    const processedData = processWeeklyDistributionData(data);

    res.status(200).json({
      success: true,
      data: processedData
    });

  } catch (error) {
    console.error('Error processing weekly distribution data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process weekly distribution data'
    });
  }
}

function processWeeklyDistributionData(data) {
  const { profiles, metadata } = data;
  const seasons = metadata.seasons || [];
  
  const processedSeasons = seasons.map(season => {
    const seasonId = season.id;
    const seasonName = season.name;
    const seasonStartDate = new Date(season.startDate);
    
    // Collect all weekly data for this season
    const weeklyData = {};
    
    Object.values(profiles).forEach(profile => {
      if (profile.seasons && profile.seasons[seasonId] && profile.seasons[seasonId].weekly) {
        const seasonData = profile.seasons[seasonId];
        
        Object.values(seasonData.weekly).forEach(week => {
          const weekNumber = week.week;
          
          if (!weeklyData[weekNumber]) {
            weeklyData[weekNumber] = {
              week: weekNumber,
              activeUsers: new Set(),
              totalWeeklyXP: 0,
              startDate: null
            };
          }
          
          // Only count users who actually received XP that week
          if (week.weeklyXp > 0) {
            weeklyData[weekNumber].activeUsers.add(profile.profileId);
            weeklyData[weekNumber].totalWeeklyXP += week.weeklyXp;
          }
        });
      }
    });
    
    // Convert to array and sort by week number
    const weeks = Object.values(weeklyData)
      .map(week => ({
        week_number: week.week,
        start_date: getActualWeekDates(seasonId, week.week) || seasonStartDate,
        participants: week.activeUsers.size,
        totalWeeklyXP: week.totalWeeklyXP,
        avgXpPerUser: week.activeUsers.size > 0 ? Math.round(week.totalWeeklyXP / week.activeUsers.size) : 0
      }))
      .sort((a, b) => a.week_number - b.week_number);
    
    return {
      id: seasonId,
      name: seasonName,
      startDate: season.startDate,
      totalWeeks: weeks.length,
      weeks: weeks
    };
  });

  return {
    seasons: processedSeasons,
    totalProfiles: metadata.totalProfilesFound,
    totalXp: metadata.totalXp,
    lastUpdated: metadata.lastUpdated
  };
}

function getActualWeekDates(seasonId, weekNumber) {
  // Real date ranges for each season and week
  const seasonDates = {
    0: [
      {"week":0,"startDate":"2025-01-16T18:42:59.000Z","endDate":"2025-05-14T03:54:55.000Z"}
    ],
    1: [
      {"week":0,"startDate":"2025-05-14T00:01:49.122Z","endDate":"2025-06-20T19:55:47.337Z"},
      {"week":1,"startDate":"2025-06-20T19:12:01.074Z","endDate":"2025-06-27T21:32:51.307Z"},
      {"week":2,"startDate":"2025-06-27T21:32:08.305Z","endDate":"2025-07-04T17:00:20.498Z"},
      {"week":3,"startDate":"2025-07-04T17:00:26.151Z","endDate":"2025-07-11T19:04:21.062Z"},
      {"week":4,"startDate":"2025-07-11T19:04:27.040Z","endDate":"2025-07-18T18:38:27.544Z"},
      {"week":5,"startDate":"2025-07-18T18:38:50.206Z","endDate":"2025-07-25T19:51:16.867Z"},
      {"week":6,"startDate":"2025-07-25T19:50:42.697Z","endDate":"2025-08-01T15:13:34.494Z"},
      {"week":7,"startDate":"2025-08-01T15:13:36.422Z","endDate":"2025-08-08T18:55:00.271Z"},
      {"week":8,"startDate":"2025-08-08T18:55:21.479Z","endDate":"2025-08-15T18:09:33.970Z"},
      {"week":9,"startDate":"2025-08-15T18:09:03.459Z","endDate":"2025-08-22T17:53:27.517Z"},
      {"week":10,"startDate":"2025-08-22T17:53:30.582Z","endDate":"2025-08-29T21:04:42.150Z"},
      {"week":11,"startDate":"2025-08-29T21:03:55.956Z","endDate":"2025-09-05T17:16:51.970Z"},
      {"week":12,"startDate":"2025-09-05T17:16:42.166Z","endDate":"2025-09-12T07:24:08.810Z"}
    ]
  };

  const seasonWeeks = seasonDates[seasonId];
  if (!seasonWeeks) return null;
  
  const weekData = seasonWeeks.find(w => w.week === weekNumber);
  return weekData ? weekData.startDate : null;
}