import fs from 'fs';
import path from 'path';

// Cache for CSV data to avoid reading files on every request
let csvCache = {
  users: null,
  weeklyXp: null,
  seasonWeeks: null,
  lastLoaded: null,
  cacheTimeoutMs: 5 * 60 * 1000, // 5 minutes
  userLookup: null, // Fast user lookup map
  processedData: new Map() // Cache processed weekly data by season/week
};

// Parse a single CSV line with proper quote handling
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  let i = 0;
  
  while (i < line.length) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes) {
        // Check if this is an escaped quote (double quote)
        if (line[i + 1] === '"') {
          current += '"';
          i += 2;
        } else {
          // End of quoted field - but only if we're at a field boundary
          // Look ahead to see if the next non-whitespace char is a comma or end of line
          let j = i + 1;
          while (j < line.length && line[j] === ' ') j++;
          
          if (j >= line.length || line[j] === ',') {
            // This is truly the end of the quoted field
            inQuotes = false;
            i++;
          } else {
            // This is a quote inside the quoted field, keep it
            current += char;
            i++;
          }
        }
      } else {
        // Start of quoted field
        inQuotes = true;
        i++;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
      i++;
    } else {
      current += char;
      i++;
    }
  }
  
  result.push(current);
  return result;
}

// Parse CSV content to array of objects using more robust parsing
function parseCsv(csvContent, headers = null) {
  const lines = csvContent.trim().split('\n');
  if (lines.length === 0) return [];
  
  const csvHeaders = headers || parseCSVLine(lines[0]);
  const data = [];
  
  for (let i = headers ? 0 : 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    
    // Ensure we have the right number of columns
    while (values.length < csvHeaders.length) {
      values.push('');
    }
    
    // Create object from headers and values
    const row = {};
    for (let k = 0; k < csvHeaders.length; k++) {
      const header = csvHeaders[k];
      let value = values[k] || '';
      
      // Convert numeric fields
      if (['profile_id', 'season_id', 'week', 'weekly_xp', 'cumulative_xp', 'total_xp', 'score', 'streak_days'].includes(header)) {
        value = value === '' ? 0 : parseInt(value);
        
        // Validate streak_days - cap at reasonable maximum (365 days)
        if (header === 'streak_days' && value > 365) {
          console.warn(`[Weekly XP Data Validation] Profile ${row.profile_id || 'unknown'} has unrealistic streak_days: ${value}, capping at 365`);
          value = 365;
        }
      }
      
      // Handle null/empty values
      if (value === '' || value === 'null') {
        value = null;
      }
      
      row[header] = value;
    }
    
    data.push(row);
  }
  
  return data;
}

// Load CSV data with caching
function loadCsvData() {
  const now = Date.now();
  
  // Check if cache is still valid
  if (csvCache.lastLoaded && (now - csvCache.lastLoaded) < csvCache.cacheTimeoutMs) {
    // Quick return for cached data
    return csvCache;
  }
  
  console.log('📊 Loading CSV data from files (cache expired)...');
  const dataDir = path.join(process.cwd(), 'data', 'csv');
  
  try {
    // Load comprehensive profiles (contains user data)
    const usersFile = path.join(dataDir, 'comprehensive_profiles.csv');
    const usersContent = fs.readFileSync(usersFile, 'utf8');
    csvCache.users = parseCsv(usersContent);
    
    // Load comprehensive weekly XP
    const weeklyXpFile = path.join(dataDir, 'comprehensive_weekly_xp.csv');
    const weeklyXpContent = fs.readFileSync(weeklyXpFile, 'utf8');
    csvCache.weeklyXp = parseCsv(weeklyXpContent);
    console.log(`[CSV Load] Loaded ${csvCache.weeklyXp.length} weekly XP records from ${weeklyXpFile}`);
    
    
    // Load season weeks
    const seasonWeeksFile = path.join(dataDir, 'season_weeks.csv');
    const seasonWeeksContent = fs.readFileSync(seasonWeeksFile, 'utf8');
    csvCache.seasonWeeks = parseCsv(seasonWeeksContent);
    
    // Create fast user lookup map
    csvCache.userLookup = new Map();
    csvCache.users.forEach(user => {
      csvCache.userLookup.set(user.profile_id, user);
    });
    
    // Clear processed data cache when reloading
    csvCache.processedData.clear();
    
    csvCache.lastLoaded = now;
    
    console.log(`✅ Loaded CSV data: ${csvCache.users.length} users, ${csvCache.weeklyXp.length} weekly records (cached for 30min)`);
    
  } catch (error) {
    console.error('❌ Error loading CSV data:', error);
    throw error;
  }
  
  return csvCache;
}

// Pre-process and cache aggregated weekly data for faster queries
function getProcessedWeeklyData(data, season, week) {
  const cacheKey = `s${season || 'all'}_w${week || 'all'}`;
  
  // Return cached data if available
  if (csvCache.processedData.has(cacheKey)) {
    return csvCache.processedData.get(cacheKey);
  }
  
  console.log(`🔄 Processing weekly data for ${cacheKey}...`);
  
  // Filter and aggregate weekly XP data efficiently
  let filteredData = data.weeklyXp;
  
  // Apply season filter - handle missing season data
  if (season !== undefined) {
    filteredData = filteredData.filter(record => {
      // Use season_id if it exists (including 0), otherwise fall back to season
      const recordSeason = record.season_id !== undefined ? record.season_id : record.season;
      // Convert both to numbers for comparison
      const recordSeasonNum = parseInt(recordSeason);
      const requestedSeasonNum = parseInt(season);
      // Only include records that have season data and match the requested season
      return !isNaN(recordSeasonNum) && recordSeasonNum === requestedSeasonNum;
    });
  }
  
  // Apply week filter or aggregate by profile for season totals
  let aggregatedData;
  
  if (week !== undefined && week !== null && week !== '') {
    // Specific week data - filter by week and season
    filteredData = filteredData.filter(record => record.week === parseInt(week));
    
    // For weekly data, we want the specific weekly_xp for that week, not aggregated
    // Each record should represent one user's performance in that specific week
    aggregatedData = filteredData.map(record => ({
      profile_id: record.profile_id,
      season_id: record.season_id !== undefined ? record.season_id : record.season,
      week: record.week,
      weekly_xp: record.weekly_xp || 0,
      cumulative_xp: record.cumulative_xp || 0
    }));
    
    console.log(`🔍 Week ${week} data: ${filteredData.length} records -> ${aggregatedData.length} unique profiles`);
  } else {
    // Season totals - aggregate by profile_id
    const profileTotals = new Map();
    
    filteredData.forEach(record => {
      const profileId = record.profile_id;
      if (!profileTotals.has(profileId)) {
        profileTotals.set(profileId, {
          profile_id: profileId,
          season_id: record.season_id !== undefined ? record.season_id : (record.season || parseInt(season) || 1), // Use season_id if it exists (including 0)
          week: null, // Season total
          weekly_xp: 0,
          cumulative_xp: 0
        });
      }
      
      const current = profileTotals.get(profileId);
      current.weekly_xp += record.weekly_xp || 0;
      current.cumulative_xp = Math.max(current.cumulative_xp, record.cumulative_xp || 0);
    });
    
    aggregatedData = Array.from(profileTotals.values());
  }
  
  // Combine with user data and filter out users with no XP
  const combinedData = aggregatedData
    .filter(record => {
      // Only include users who have XP for this specific query
      if (week !== undefined && week !== null && week !== '') {
        // For weekly views, only include users who actually earned XP in that specific week
        return record.weekly_xp > 0;
      } else {
        return record.cumulative_xp > 0; // Season view: must have cumulative XP in this season
      }
    })
    .map(record => {
      const user = data.userLookup.get(record.profile_id) || {};
      
      // Clean up corrupted display names
      let cleanDisplayName = user.display_name || `User ${record.profile_id}`;
      
      // Check if display name contains concatenated data (URLs, etc.)
      if (cleanDisplayName.includes('https://') || cleanDisplayName.includes('pbs.twimg.com')) {
        // Extract only the actual display name part before any URL
        const urlMatch = cleanDisplayName.match(/^(.*?)(https?:\/\/.*)/);
        if (urlMatch) {
          cleanDisplayName = urlMatch[1].trim();
        }
      }
      
      // Remove other concatenated data patterns
      cleanDisplayName = cleanDisplayName
        .replace(/\d+true$/, '') // Remove trailing numbers followed by 'true'
        .replace(/\d+active\d+$/, '') // Remove trailing status patterns
        .replace(/\d+$/, '') // Remove trailing numbers
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .trim();
      
      // If display name is empty or just whitespace, use username
      if (!cleanDisplayName || cleanDisplayName.length < 2) {
        cleanDisplayName = user.username || `User ${record.profile_id}`;
      }
      
      // Clean up avatar URL - remove any concatenated data
      let cleanAvatarUrl = user.avatar_url || null;
      if (cleanAvatarUrl) {
        // If avatar URL contains commas, it might have extra data concatenated
        if (cleanAvatarUrl.includes(',')) {
          cleanAvatarUrl = cleanAvatarUrl.split(',')[0].trim();
        }
        // Ensure it's a valid URL
        if (!cleanAvatarUrl.startsWith('http')) {
          cleanAvatarUrl = null;
        }
      }
      
      return {
        profile_id: record.profile_id,
        username: user.username || `user_${record.profile_id}`,
        display_name: cleanDisplayName,
        avatar_url: cleanAvatarUrl,
        total_xp: user.total_xp || 0,
        season_id: record.season_id,
        week: record.week,
        weekly_xp: record.weekly_xp || 0,
        cumulative_xp: record.cumulative_xp || 0
      };
    });
  
  // Sort by the appropriate metric
  const sortKey = (week !== undefined && week !== null && week !== '') ? 'weekly_xp' : 'cumulative_xp';
  combinedData.sort((a, b) => b[sortKey] - a[sortKey]);
  
  // Add ranking
  combinedData.forEach((record, index) => {
    record.rank = index + 1;
  });
  
  // Cache the processed data
  csvCache.processedData.set(cacheKey, combinedData);
  console.log(`✅ Cached ${combinedData.length} records for ${cacheKey}`);
  
  return combinedData;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Clear cache if requested
  if (req.query.clearCache === 'true') {
    csvCache.lastLoaded = null;
    csvCache.processedData.clear();
    console.log('🧹 Cache cleared');
  }

  try {
    const { season, week, search, limit, offset = 0 } = req.query;
    
    // Default limit logic: if no limit specified, show all results for the query
    const defaultLimit = limit ? parseInt(limit) : null;
    
    // Load CSV data
    const data = loadCsvData();
    
    // Get processed weekly data (cached for performance)
    let combinedData = getProcessedWeeklyData(data, season, week);
    
    // Filter by search term if specified (preserve original ranking)
    if (search) {
      const searchTerm = search.toLowerCase();
      combinedData = combinedData.filter(record => {
        return (
          record.username.toLowerCase().includes(searchTerm) ||
          record.display_name.toLowerCase().includes(searchTerm) ||
          record.profile_id.toString() === search
        );
      });
      
      // Keep original rankings from full dataset - don't re-rank after search
      // This preserves the actual rank among all users, not just search results
    }
    
    // Apply pagination only if limit is specified
    let paginatedData;
    let hasMore = false;
    
    if (defaultLimit) {
      const startIndex = parseInt(offset);
      const endIndex = startIndex + defaultLimit;
      paginatedData = combinedData.slice(startIndex, endIndex);
      hasMore = endIndex < combinedData.length;
    } else {
      // Show all results if no limit specified
      paginatedData = combinedData;
      hasMore = false;
    }
    
    // Get available seasons and weeks (lightweight)
    const seasons = [
      { season_id: 0, season_name: 'Season 0' },
      { season_id: 1, season_name: 'Season 1' }
    ];
    
    const weeks = [
      { season_id: 0, week: 0 },
      { season_id: 1, week: 0 }, { season_id: 1, week: 1 }, { season_id: 1, week: 2 },
      { season_id: 1, week: 3 }, { season_id: 1, week: 4 }, { season_id: 1, week: 5 },
      { season_id: 1, week: 6 }, { season_id: 1, week: 7 }, { season_id: 1, week: 8 },
      { season_id: 1, week: 9 }, { season_id: 1, week: 10 }, { season_id: 1, week: 11 },
      { season_id: 1, week: 12 }, { season_id: 1, week: 13 }, { season_id: 1, week: 14 }
    ].filter(w => season === undefined || w.season_id === parseInt(season));
    
    res.status(200).json({
      profiles: paginatedData,
      total: combinedData.length,
      seasons,
      weeks,
      pagination: {
        limit: defaultLimit,
        offset: parseInt(offset),
        hasMore: hasMore,
        showing: paginatedData.length,
        total_available: combinedData.length
      },
      source: 'csv_optimized',
      cache_info: {
        last_loaded: new Date(csvCache.lastLoaded).toISOString(),
        users_count: data.users.length,
        cached_queries: csvCache.processedData.size
      }
    });
    
  } catch (error) {
    console.error('Error fetching CSV weekly XP data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
