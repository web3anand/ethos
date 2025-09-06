// API endpoint for cache management
import { getCacheStats, clearAllCache } from '../../lib/cache.js';
import scheduler from '../../lib/scheduler.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    // Get cache statistics
    try {
      const stats = await getCacheStats();
      const schedulerStatus = scheduler.getStatus();
      
      return res.status(200).json({
        cache: stats,
        scheduler: schedulerStatus,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return res.status(500).json({ message: 'Failed to get cache statistics' });
    }
  }

  if (req.method === 'POST') {
    const { action } = req.body;

    try {
      switch (action) {
        case 'clear':
          await clearAllCache();
          return res.status(200).json({ message: 'Cache cleared successfully' });

        case 'start-scheduler':
          await scheduler.start();
          return res.status(200).json({ message: 'Scheduler started successfully' });

        case 'stop-scheduler':
          scheduler.stop();
          return res.status(200).json({ message: 'Scheduler stopped successfully' });

        case 'force-update':
          // Force immediate data update
          await scheduler.runInitialFetch();
          return res.status(200).json({ message: 'Force update completed' });

        default:
          return res.status(400).json({ message: 'Invalid action' });
      }
    } catch (error) {
      console.error('Cache management error:', error);
      return res.status(500).json({ 
        message: 'Cache management operation failed',
        error: error.message 
      });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
