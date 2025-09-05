import fs from 'fs/promises';
import path from 'path';

export default async function handler(req, res) {
  try {
    const filePath = path.join(process.cwd(), 'data', 'user-profiles.json');
    
    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      return res.status(200).json({
        totalProfiles: 0,
        source: 'none',
        lastUpdated: null
      });
    }
    
    const data = await fs.readFile(filePath, 'utf8');
    const profiles = JSON.parse(data);
    
    const stats = {
      totalProfiles: profiles.length,
      source: 'file-database',
      lastUpdated: new Date().toISOString(),
      topScore: Math.max(...profiles.map(p => p.score || 0)),
      averageScore: profiles.reduce((sum, p) => sum + (p.score || 0), 0) / profiles.length,
      profilesWithUsernames: profiles.filter(p => p.username).length,
      profilesWithScores: profiles.filter(p => p.score > 0).length
    };
    
    res.status(200).json(stats);
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ 
      totalProfiles: 0,
      source: 'error',
      lastUpdated: null,
      error: error.message 
    });
  }
}
