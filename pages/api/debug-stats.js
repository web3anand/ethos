// Debug API to test user stats fetching
import { getUserStats } from '../../utils/ethosApiClient';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { profileId } = req.query;
    
    if (!profileId) {
      return res.status(400).json({ error: 'profileId is required' });
    }

    console.log(`Testing getUserStats for profileId: ${profileId}`);
    
    // Test the getUserStats function directly
    const userKey = `profileId:${profileId}`;
    const stats = await getUserStats(userKey);
    
    console.log(`Raw stats response:`, JSON.stringify(stats, null, 2));

    return res.status(200).json({
      profileId,
      userKey,
      stats,
      hasStats: !!stats,
      reviewData: stats?.review || null,
      vouchData: stats?.vouch || null
    });

  } catch (error) {
    console.error('Debug API Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message,
      stack: error.stack 
    });
  }
}
