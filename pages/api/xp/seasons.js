import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Read season weeks data
    const seasonWeeksPath = path.join(process.cwd(), 'data', 'csv', 'season_weeks.csv');
    
    if (!fs.existsSync(seasonWeeksPath)) {
      return res.status(404).json({ error: 'Season data not found' });
    }

    const content = fs.readFileSync(seasonWeeksPath, 'utf8');
    const lines = content.trim().split('\n');
    const headers = lines[0].split(',');
    
    const seasons = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      const season = {};
      
      headers.forEach((header, index) => {
        let value = values[index] || '';
        
        // Convert numeric fields
        if (['season', 'week', 'start_timestamp', 'end_timestamp'].includes(header)) {
          value = value === '' ? 0 : parseInt(value);
        }
        
        season[header] = value;
      });
      
      seasons.push(season);
    }

    // Find current season and week
    const now = Date.now();
    let currentSeason = null;
    let currentWeek = null;
    
    // Group by season
    const seasonsByNumber = {};
    seasons.forEach(season => {
      if (!seasonsByNumber[season.season]) {
        seasonsByNumber[season.season] = [];
      }
      seasonsByNumber[season.season].push(season);
    });

    // Find current season (most recent one with data)
    const seasonNumbers = Object.keys(seasonsByNumber).map(Number).sort((a, b) => b - a);
    
    if (seasonNumbers.length > 0) {
      currentSeason = seasonNumbers[0]; // Most recent season
      const currentSeasonWeeks = seasonsByNumber[currentSeason];
      
      // Find current week (most recent week in current season)
      if (currentSeasonWeeks.length > 0) {
        const latestWeek = currentSeasonWeeks.reduce((latest, week) => 
          week.week > latest.week ? week : latest
        );
        currentWeek = latestWeek.week;
      }
    }

    res.status(200).json({
      seasons: seasonsByNumber,
      currentSeason,
      currentWeek,
      totalSeasons: seasonNumbers.length,
      totalWeeks: seasons.length
    });

  } catch (error) {
    console.error('Error fetching seasons:', error);
    res.status(500).json({ error: 'Failed to fetch seasons data' });
  }
}
