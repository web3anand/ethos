import { fetchStatus } from './trigger-comprehensive-fetch';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    res.status(200).json({
      ...fetchStatus,
      // Add some additional info
      duration: fetchStatus.startTime ? 
        Date.now() - new Date(fetchStatus.startTime).getTime() : 0,
      isIdle: !fetchStatus.isRunning && !fetchStatus.completed && !fetchStatus.error
    });
  } catch (error) {
    console.error('Error getting fetch status:', error);
    res.status(500).json({ 
      error: 'Failed to get fetch status',
      details: error.message
    });
  }
}
