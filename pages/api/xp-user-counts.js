import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  try {
    const csvPath = path.join(process.cwd(), 'data', 'csv', 'comprehensive_weekly_xp.csv');
    
    if (!fs.existsSync(csvPath)) {
      return res.status(404).json({ error: 'Weekly XP data not found' });
    }

    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.trim().split('\n');
    
    if (lines.length <= 1) {
      return res.status(404).json({ error: 'No data found in CSV' });
    }

    const headers = lines[0].split(',');
    const data = lines.slice(1);

    // Parse CSV data
    const weeklyData = data.map(line => {
      const values = line.split(',');
      const record = {};
      headers.forEach((header, index) => {
        record[header] = values[index] || '';
      });
      return record;
    });

    // Calculate unique users with XP > 0 for each season
    const season0Users = new Set();
    const season1Users = new Set();
    const allUsers = new Set();

    weeklyData.forEach(record => {
      const profileId = record.profile_id;
      const seasonId = parseInt(record.season_id);
      const weeklyXp = parseFloat(record.weekly_xp) || 0;

      if (weeklyXp > 0) {
        allUsers.add(profileId);
        
        if (seasonId === 0) {
          season0Users.add(profileId);
        } else if (seasonId === 1) {
          season1Users.add(profileId);
        }
      }
    });

    // Calculate total XP for each season
    let season0TotalXp = 0;
    let season1TotalXp = 0;

    weeklyData.forEach(record => {
      const seasonId = parseInt(record.season_id);
      const weeklyXp = parseFloat(record.weekly_xp) || 0;

      if (seasonId === 0) {
        season0TotalXp += weeklyXp;
      } else if (seasonId === 1) {
        season1TotalXp += weeklyXp;
      }
    });

    const result = {
      season0: {
        usersWithXp: season0Users.size,
        totalXp: season0TotalXp,
        avgXpPerUser: season0Users.size > 0 ? season0TotalXp / season0Users.size : 0
      },
      season1: {
        usersWithXp: season1Users.size,
        totalXp: season1TotalXp,
        avgXpPerUser: season1Users.size > 0 ? season1TotalXp / season1Users.size : 0
      },
      allSeasons: {
        usersWithXp: allUsers.size,
        totalXp: season0TotalXp + season1TotalXp
      }
    };

    res.status(200).json(result);

  } catch (error) {
    console.error('Error processing XP user counts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

