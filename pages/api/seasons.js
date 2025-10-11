import fs from 'fs';
import path from 'path';

// Cache for season data
let seasonCache = {
  data: null,
  lastLoaded: null,
  cacheTimeoutMs: 30 * 60 * 1000, // 30 minutes
};

// Parse CSV content to array of objects
function parseCsv(csvContent) {
  const lines = csvContent.trim().split('\n');
  if (lines.length === 0) return [];
  
  const headers = lines[0].split(',');
  const data = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const row = {};
    
    for (let j = 0; j < headers.length; j++) {
      const header = headers[j];
      let value = values[j] || '';
      
      // Convert numeric fields
      if (['season_id', 'week'].includes(header)) {
        value = value === '' ? 0 : parseInt(value);
      }
      
      // Handle dates
      if (['start_date', 'end_date', 'created_at'].includes(header)) {
        value = value === '' ? null : new Date(value);
      }
      
      row[header] = value;
    }
    
    data.push(row);
  }
  
  return data;
}

// Load season data with caching
function loadSeasonData() {
  const now = Date.now();
  
  // Check if cache is still valid
  if (seasonCache.lastLoaded && (now - seasonCache.lastLoaded) < seasonCache.cacheTimeoutMs) {
    return seasonCache.data;
  }
  
  console.log('📅 Loading season data from CSV...');
  const dataDir = path.join(process.cwd(), 'data', 'csv');
  
  try {
    // Load season weeks data
    const seasonFile = path.join(dataDir, 'season_weeks.csv');
    const seasonContent = fs.readFileSync(seasonFile, 'utf8');
    const seasonWeeks = parseCsv(seasonContent);
    
    // Group weeks by season
    const seasonMap = new Map();
    
    seasonWeeks.forEach(week => {
      const seasonId = week.season_id;
      if (!seasonMap.has(seasonId)) {
        seasonMap.set(seasonId, {
          id: seasonId,
          name: `Season ${seasonId}`,
          weeks: []
        });
      }
      seasonMap.get(seasonId).weeks.push(week);
    });
    
    // Convert to array and sort by season ID
    const seasons = Array.from(seasonMap.values()).sort((a, b) => a.id - b.id);
    
    // Determine current season and week
    const now = new Date();
    let currentSeason = null;
    let currentWeek = null;
    
    for (const season of seasons) {
      for (const week of season.weeks) {
        if (week.start_date <= now && week.end_date >= now) {
          currentSeason = season;
          currentWeek = week;
          break;
        }
      }
      if (currentSeason) break;
    }
    
    // If no current week, find the latest week
    if (!currentSeason && seasons.length > 0) {
      const latestSeason = seasons[seasons.length - 1];
      if (latestSeason.weeks.length > 0) {
        currentSeason = latestSeason;
        currentWeek = latestSeason.weeks[latestSeason.weeks.length - 1];
      }
    }
    
    const data = {
      seasons,
      totalSeasons: seasons.length,
      currentSeason,
      currentWeek,
      lastUpdated: now
    };
    
    seasonCache.data = data;
    seasonCache.lastLoaded = now;
    
    console.log(`✅ Loaded ${seasons.length} seasons with current season: ${currentSeason?.name || 'none'}, current week: ${currentWeek?.week || 'none'}`);
    
    return data;
    
  } catch (error) {
    console.error('❌ Error loading season data:', error);
    throw error;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const seasonData = loadSeasonData();
    
    res.status(200).json({
      ...seasonData,
      cache_info: {
        last_loaded: new Date(seasonCache.lastLoaded).toISOString(),
        cache_timeout_ms: seasonCache.cacheTimeoutMs
      }
    });
    
  } catch (error) {
    console.error('Error fetching season data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
