export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🧹 Clearing all API caches...');
    
    const results = [];
    
    // Clear comprehensive profiles cache
    try {
      const profilesResponse = await fetch(`${process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'http://localhost:3000'}/api/comprehensive-profiles?clearCache=true&_t=${Date.now()}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (profilesResponse.ok) {
        const profilesData = await profilesResponse.json();
        results.push({ endpoint: 'comprehensive-profiles', status: 'cleared', records: profilesData.profiles.length });
      } else {
        results.push({ endpoint: 'comprehensive-profiles', status: 'error', error: profilesResponse.statusText });
      }
    } catch (error) {
      results.push({ endpoint: 'comprehensive-profiles', status: 'error', error: error.message });
    }

    // Clear weekly XP cache
    try {
      const weeklyResponse = await fetch(`${process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'http://localhost:3000'}/api/csv-weekly-xp?clearCache=true&_t=${Date.now()}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (weeklyResponse.ok) {
        const weeklyData = await weeklyResponse.json();
        results.push({ endpoint: 'csv-weekly-xp', status: 'cleared', records: weeklyData.profiles.length });
      } else {
        results.push({ endpoint: 'csv-weekly-xp', status: 'error', error: weeklyResponse.statusText });
      }
    } catch (error) {
      results.push({ endpoint: 'csv-weekly-xp', status: 'error', error: error.message });
    }

    // Clear XP user counts cache
    try {
      const countsResponse = await fetch(`${process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'http://localhost:3000'}/api/xp-user-counts?clearCache=true&_t=${Date.now()}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (countsResponse.ok) {
        const countsData = await countsResponse.json();
        results.push({ endpoint: 'xp-user-counts', status: 'cleared', records: Object.keys(countsData).length });
      } else {
        results.push({ endpoint: 'xp-user-counts', status: 'error', error: countsResponse.statusText });
      }
    } catch (error) {
      results.push({ endpoint: 'xp-user-counts', status: 'error', error: error.message });
    }

    console.log('✅ All caches cleared:', results);

    res.status(200).json({
      message: 'All caches cleared successfully',
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error clearing caches:', error);
    res.status(500).json({ 
      error: 'Failed to clear caches',
      details: error.message
    });
  }
}
