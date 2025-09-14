import fs from 'fs';
import path from 'path';

// Cache for CSV data to avoid reading files on every request
let csvCache = {
  profiles: null,
  lastLoaded: null,
  cacheTimeoutMs: 30 * 60 * 1000, // 30 minutes (increased for performance)
  sortedProfiles: null, // Pre-sorted profiles for faster responses
  profileLookup: null // Fast profile lookup map
};

// Parse CSV content to array of objects
function parseCsv(csvContent, headers = null) {
  const lines = csvContent.trim().split('\n');
  if (lines.length === 0) return [];
  
  const csvHeaders = headers || lines[0].split(',');
  const data = [];
  
  for (let i = headers ? 0 : 1; i < lines.length; i++) {
    const values = [];
    let currentValue = '';
    let inQuotes = false;
    
    // Parse CSV with proper quote handling
    for (let j = 0; j < lines[i].length; j++) {
      const char = lines[i][j];
      
      if (char === '"') {
        if (inQuotes && lines[i][j + 1] === '"') {
          currentValue += '"';
          j++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(currentValue);
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    values.push(currentValue); // Add last value
    
    // Create object from headers and values
    const row = {};
    for (let k = 0; k < csvHeaders.length; k++) {
      const header = csvHeaders[k];
      let value = values[k] || '';
      
      // Convert numeric fields
      if (['profile_id', 'userkey', 'score', 'streak_days', 'total_xp', 'season_0_xp', 'season_1_xp', 'season_0_weeks', 'season_1_weeks', 'userkeys_count', 'eth_addresses'].includes(header)) {
        value = value === '' ? 0 : parseInt(value);
      }
      
      // Convert boolean fields
      if (['is_validator'].includes(header)) {
        value = value === 'true';
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
    return csvCache;
  }
  
  console.log('📊 Loading comprehensive profiles CSV data...');
  const dataDir = path.join(process.cwd(), 'data', 'csv');
  
  try {
    // Load comprehensive profiles
    const profilesFile = path.join(dataDir, 'comprehensive_profiles.csv');
    const profilesContent = fs.readFileSync(profilesFile, 'utf8');
    csvCache.profiles = parseCsv(profilesContent);
    
    // Pre-sort profiles by total XP for faster responses
    csvCache.sortedProfiles = [...csvCache.profiles].sort((a, b) => b.total_xp - a.total_xp);
    
    // Add ranking to pre-sorted profiles
    csvCache.sortedProfiles.forEach((profile, index) => {
      profile.rank = index + 1;
    });
    
    // Create fast profile lookup map
    csvCache.profileLookup = new Map();
    csvCache.profiles.forEach(profile => {
      csvCache.profileLookup.set(profile.profile_id, profile);
    });
    
    csvCache.lastLoaded = now;
    
    console.log(`✅ Loaded ${csvCache.profiles.length} comprehensive profiles from CSV (pre-sorted and indexed)`);
    
  } catch (error) {
    console.error('❌ Error loading comprehensive profiles CSV:', error);
    throw error;
  }
  
  return csvCache;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { search, limit = 5000, offset = 0 } = req.query;
    
    // Load CSV data
    const data = loadCsvData();
    
    // Use pre-sorted profiles for better performance
    let filteredProfiles = data.sortedProfiles;
    
    // Filter by search term if specified
    if (search) {
      const searchTerm = search.toLowerCase();
      filteredProfiles = filteredProfiles.filter(profile => {
        return (
          (profile.username && profile.username.toLowerCase().includes(searchTerm)) ||
          (profile.display_name && profile.display_name.toLowerCase().includes(searchTerm)) ||
          profile.profile_id.toString() === search
        );
      });
      
      // Re-rank after search filtering
      filteredProfiles.forEach((profile, index) => {
        profile.rank = index + 1;
      });
    }
    
    // Apply pagination
    const startIndex = parseInt(offset);
    const endIndex = startIndex + parseInt(limit);
    const paginatedProfiles = filteredProfiles.slice(startIndex, endIndex);
    
    // Format response to match existing API structure
    const formattedProfiles = paginatedProfiles.map(profile => ({
      profile_id: profile.profile_id,
      username: profile.username || `user_${profile.profile_id}`,
      display_name: profile.display_name || `User ${profile.profile_id}`,
      avatar_url: profile.avatar_url,
      description: profile.description,
      score: profile.score,
      streak_days: profile.streak_days,
      total_xp: profile.total_xp,
      is_validator: profile.is_validator,
      season_0_xp: profile.season_0_xp,
      season_1_xp: profile.season_1_xp,
      status: profile.status,
      userkeys_count: profile.userkeys_count,
      eth_addresses: profile.eth_addresses,
      rank: profile.rank
    }));
    
    res.status(200).json({
      profiles: formattedProfiles,
      total: filteredProfiles.length,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: endIndex < filteredProfiles.length
      },
      source: 'comprehensive_csv',
      cache_info: {
        last_loaded: new Date(csvCache.lastLoaded).toISOString(),
        profiles_count: data.profiles.length
      }
    });
    
  } catch (error) {
    console.error('Error fetching comprehensive profiles:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
