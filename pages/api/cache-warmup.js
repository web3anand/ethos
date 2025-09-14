// Simple endpoint to pre-warm caches for better performance

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🔥 Cache warmup requested...');
    const startTime = Date.now();

    // Pre-warm comprehensive profiles cache
    const profilesResponse = await fetch(`${req.headers.origin || 'http://localhost:3001'}/api/comprehensive-profiles?limit=1`);
    
    // Pre-warm weekly XP cache for Season 1
    const weeklyResponse = await fetch(`${req.headers.origin || 'http://localhost:3001'}/api/csv-weekly-xp?season=1&limit=1`);
    
    const duration = Date.now() - startTime;
    
    res.status(200).json({
      success: true,
      message: 'Cache warmed up successfully',
      duration_ms: duration,
      caches_warmed: [
        'comprehensive_profiles',
        'weekly_xp_season_1'
      ]
    });

  } catch (error) {
    console.error('❌ Cache warmup failed:', error);
    res.status(500).json({ 
      error: 'Cache warmup failed',
      message: error.message 
    });
  }
}

