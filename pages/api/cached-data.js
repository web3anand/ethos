// API endpoint to get cached user data instantly
import { getUserCache, getStatsCache, getActivitiesCache, getAnalysisCache } from '../../lib/cache.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { profileId, type } = req.query;

  if (!profileId) {
    return res.status(400).json({ message: 'Profile ID is required' });
  }

  try {
    let data = null;
    let cacheType = 'all';

    switch (type) {
      case 'user':
        data = await getUserCache(profileId);
        cacheType = 'user';
        break;
      case 'stats':
        data = await getStatsCache(profileId);
        cacheType = 'stats';
        break;
      case 'activities':
        data = await getActivitiesCache(profileId);
        cacheType = 'activities';
        break;
      case 'analysis':
        data = await getAnalysisCache(profileId);
        cacheType = 'analysis';
        break;
      default:
        // Get all cached data for the user
        const [user, stats, activities, analysis] = await Promise.all([
          getUserCache(profileId),
          getStatsCache(profileId),
          getActivitiesCache(profileId),
          getAnalysisCache(profileId)
        ]);
        
        data = {
          user,
          stats,
          activities,
          analysis,
          hasCachedData: !!(user || stats || activities || analysis)
        };
        break;
    }

    if (!data && type !== 'all') {
      return res.status(404).json({ 
        message: `No cached ${cacheType} data found for profile ${profileId}`,
        profileId,
        type: cacheType
      });
    }

    return res.status(200).json({
      profileId,
      type: cacheType,
      data,
      cached: true,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching cached data:', error);
    return res.status(500).json({ 
      message: 'Failed to fetch cached data',
      error: error.message 
    });
  }
}
