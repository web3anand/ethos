import { dataCollector } from '../../utils/dataCollector.js';
import { r4rDatabase } from '../../utils/simpleR4RDatabase.js';

export default async function handler(req, res) {
  console.log('🔍 R4R PATTERN ANALYSIS ENDPOINT CALLED');
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🔍 Starting comprehensive R4R pattern analysis...');
    
    // Get all cached users
    const allUsers = await dataCollector.getAllCachedUsers();
    console.log(`📊 Analyzing patterns across ${allUsers.length} cached users`);
    
    // Analyze R4R patterns
    const patterns = await dataCollector.analyzeR4RPatterns();
    
    // Get additional statistics
    const stats = {
      totalUsers: allUsers.length,
      totalWithReviews: 0,
      totalWithVouches: 0,
      averageReviews: 0,
      averageVouches: 0,
      highReciprocityCount: patterns.high_reciprocity_users.length
    };

    // Calculate statistics
    let totalReviews = 0;
    let totalVouches = 0;
    
    for (const user of allUsers) {
      const userStats = await r4rDatabase.getProfileStats(user.profileId);
      if (userStats && userStats.reviews) {
        const received = userStats.reviews.received || 0;
        if (received > 0) {
          stats.totalWithReviews++;
          totalReviews += received;
        }
      }
      
      if (userStats && userStats.vouches) {
        const vouchesReceived = userStats.vouches.count?.received || 0;
        if (vouchesReceived > 0) {
          stats.totalWithVouches++;
          totalVouches += vouchesReceived;
        }
      }
    }
    
    stats.averageReviews = stats.totalWithReviews > 0 ? (totalReviews / stats.totalWithReviews).toFixed(2) : 0;
    stats.averageVouches = stats.totalWithVouches > 0 ? (totalVouches / stats.totalWithVouches).toFixed(2) : 0;
    
    // Generate insights
    const insights = [];
    
    if (patterns.high_reciprocity_users.length > 0) {
      insights.push(`🚨 Found ${patterns.high_reciprocity_users.length} users with suspicious reciprocity patterns (80-120% ratio)`);
    }
    
    if (stats.averageReviews > 15) {
      insights.push(`⚠️ High average review count (${stats.averageReviews}) may indicate farming activity`);
    }
    
    if (stats.totalUsers > 50) {
      insights.push(`📈 Large dataset (${stats.totalUsers} users) provides good analysis foundation`);
    }
    
    const result = {
      timestamp: Date.now(),
      statistics: stats,
      patterns: patterns,
      insights: insights,
      topSuspiciousUsers: patterns.high_reciprocity_users
        .sort((a, b) => Math.abs(1 - a.ratio) - Math.abs(1 - b.ratio))
        .slice(0, 10)
        .map(item => ({
          username: item.user.username,
          profileId: item.user.profileId,
          reviewsReceived: item.received,
          reviewsGiven: item.given,
          reciprocityRatio: item.ratio.toFixed(3),
          suspicionLevel: Math.abs(1 - item.ratio) < 0.1 ? 'HIGH' : 'MEDIUM'
        }))
    };
    
    console.log(`✅ R4R pattern analysis completed - found ${patterns.high_reciprocity_users.length} suspicious users`);
    
    res.status(200).json(result);
    
  } catch (error) {
    console.error('❌ R4R pattern analysis failed:', error);
    res.status(500).json({ 
      error: 'Pattern analysis failed',
      details: error.message 
    });
  }
}
