import { dataCollector } from '../../utils/dataCollector.js';

let refreshInterval = null;

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { action } = req.body;
    
    if (action === 'start') {
      if (refreshInterval) {
        return res.status(200).json({ message: 'Auto-refresh already running' });
      }
      
      console.log('🔄 Starting server-side auto-refresh scheduler');
      
      // Run immediately
      dataCollector.refreshStaleData().catch(console.error);
      
      // Then run every 30 minutes
      refreshInterval = setInterval(() => {
        dataCollector.refreshStaleData().catch(console.error);
      }, 30 * 60 * 1000);
      
      return res.status(200).json({ message: 'Auto-refresh started' });
      
    } else if (action === 'stop') {
      if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
        console.log('⏹️ Auto-refresh scheduler stopped');
      }
      return res.status(200).json({ message: 'Auto-refresh stopped' });
      
    } else if (action === 'run') {
      // Manual refresh trigger
      try {
        await dataCollector.refreshStaleData();
        return res.status(200).json({ message: 'Manual refresh completed' });
      } catch (error) {
        return res.status(500).json({ error: 'Manual refresh failed', details: error.message });
      }
    }
    
    return res.status(400).json({ error: 'Invalid action' });
  }
  
  if (req.method === 'GET') {
    return res.status(200).json({ 
      running: refreshInterval !== null,
      message: 'Auto-refresh status'
    });
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}
