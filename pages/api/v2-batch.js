// API endpoint for Ethos V2 batch operations
import EthosV2BatchApi from '../../utils/ethosV2BatchApi.js';
import fs from 'fs';
import path from 'path';

let v2Api = null;

// Initialize API instance (singleton)
function getV2Api() {
  if (!v2Api) {
    v2Api = new EthosV2BatchApi();
  }
  return v2Api;
}

export default async function handler(req, res) {
  try {
    const api = getV2Api();
    const { method } = req;
    
    switch (method) {
      case 'GET':
        // Get comprehensive data based on action
        const { limit = 25000, action } = req.query;
        
        if (action === 'leaderboard') {
          // Get leaderboard from comprehensive database
          const leaderboard = api.getLeaderboard(parseInt(limit));
          return res.status(200).json(leaderboard);
        }
        
        if (action === 'seasons') {
          // Get seasons data from comprehensive database
          const seasons = api.getSeasonsData();
          return res.status(200).json(seasons);
        }
        
        if (action === 'stats') {
          // Get distribution stats
          const leaderboard = api.getLeaderboard();
          const totalUsers = leaderboard.length;
          const totalXP = leaderboard.reduce((sum, user) => sum + (user.xpTotal || 0), 0);
          const averageXP = totalUsers > 0 ? Math.round(totalXP / totalUsers) : 0;
          const topUserXP = leaderboard.length > 0 ? leaderboard[0].xpTotal : 0;
          
          return res.status(200).json({
            totalUsers,
            totalXP,
            averageXP,
            topUserXP
          });
        }
        
        // Default: get leaderboard
        const profiles = api.getLeaderboard(parseInt(limit));
        return res.status(200).json(profiles);
        
      case 'POST':
        // Handle comprehensive data refresh
        const { action: postAction } = req.query;
        
        if (postAction === 'refresh') {
          console.log('[API] Starting comprehensive data refresh...');
          
          const result = await api.fullRefresh((progress) => {
            console.log(`[API] Progress: ${progress.stage} ${progress.current}/${progress.total}`);
          });
          
          return res.status(200).json({
            success: true,
            result,
            message: `Comprehensive refresh complete: ${result.users} users processed`
          });
        }
        
        // Legacy support for forceRefresh
        const { forceRefresh } = req.body;
        if (forceRefresh) {
          const result = await api.forceRefresh((progress) => {
            console.log(`[API] Progress: ${progress.stage} ${progress.current}/${progress.total}`);
          });
          
          return res.status(200).json({
            success: true,
            result,
            message: `Force refresh complete: ${result.users} users processed`
          });
        }
        
        return res.status(400).json({ error: 'Invalid action' });
        
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).end(`Method ${method} Not Allowed`);
    }
    
  } catch (error) {
    console.error('[API] V2 batch API error:', error);
    return res.status(500).json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
