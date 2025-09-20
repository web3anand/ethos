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
      if (['profile_id', 'userkey', 'score', 'streak_days', 'total_xp', 'season_0_xp', 'season_1_xp', 'season_0_weeks', 'season_1_weeks', 'userkeys_count', 'eth_addresses'].includes(header)) {
        value = value === '' ? 0 : parseInt(value);
        
        // Validate streak_days - cap at reasonable maximum (365 days)
        if (header === 'streak_days' && value > 365) {
          console.warn(`[Data Validation] Profile ${row.profile_id || 'unknown'} has unrealistic streak_days: ${value}, capping at 365`);
          value = 365;
        }
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
    console.log(`[Debug] Loading from: ${path.join(dataDir, 'comprehensive_profiles.csv')}`);
  
  try {
    // Load comprehensive profiles
    const profilesFile = path.join(dataDir, 'comprehensive_profiles.csv');
    const profilesContent = fs.readFileSync(profilesFile, 'utf8');
    csvCache.profiles = parseCsv(profilesContent);
    console.log(`[Debug] Parsed ${csvCache.profiles.length} profiles`);
    console.log(`[Debug] First profile:`, csvCache.profiles[0]);
    
    // Remove duplicates and merge data - keep the entry with the highest score
    const uniqueProfiles = new Map();
    
    csvCache.profiles.forEach(profile => {
      const key = profile.username || `user_${profile.profile_id}`;
      
      if (!uniqueProfiles.has(key)) {
        uniqueProfiles.set(key, profile);
      } else {
        const existing = uniqueProfiles.get(key);
        // Keep the entry with higher score, or if scores are equal, keep the one with higher XP
        if (profile.score > existing.score || 
            (profile.score === existing.score && profile.total_xp > existing.total_xp)) {
          uniqueProfiles.set(key, profile);
        }
      }
    });
    
    // Convert back to array and sort by total XP
    csvCache.sortedProfiles = Array.from(uniqueProfiles.values()).sort((a, b) => b.total_xp - a.total_xp);
    
    // Add ranking to pre-sorted profiles
    csvCache.sortedProfiles.forEach((profile, index) => {
      profile.rank = index + 1;
    });
    
    // Create fast profile lookup map using deduplicated data
    csvCache.profileLookup = new Map();
    csvCache.sortedProfiles.forEach(profile => {
      csvCache.profileLookup.set(profile.profile_id, profile);
    });
    
    csvCache.lastLoaded = now;
    
    console.log(`✅ Loaded ${csvCache.profiles.length} comprehensive profiles from CSV, ${csvCache.sortedProfiles.length} unique profiles (pre-sorted and indexed)`);
    
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
    const formattedProfiles = paginatedProfiles.map(profile => {
      // Clean up corrupted display names
      let cleanDisplayName = profile.display_name || '';
      
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
      
      // If display name is empty, corrupted, or just "User", use username
      if (!cleanDisplayName || cleanDisplayName.length < 2 || cleanDisplayName === 'User') {
        cleanDisplayName = profile.username || `user_${profile.profile_id}`;
      }
      
      // If username is generic (user_XXXX), try to use a more descriptive name
      if (cleanDisplayName.startsWith('user_') && profile.display_name && profile.display_name !== 'User') {
        cleanDisplayName = profile.display_name;
      }
      
      // Clean up avatar URL - remove any concatenated data
      let cleanAvatarUrl = profile.avatar_url || null;
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
        profile_id: profile.profile_id,
        username: profile.username || `user_${profile.profile_id}`,
        display_name: cleanDisplayName,
        avatar_url: cleanAvatarUrl,
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
      };
    });
    
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
