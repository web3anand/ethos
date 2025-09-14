import fs from 'fs';
import path from 'path';

// File-based lock mechanism for better concurrency control
const LOCK_FILE = path.join(process.cwd(), 'data', 'csv', 'update.lock');
const MAX_LOCK_AGE = 30 * 60 * 1000; // 30 minutes

// Check if update is locked
function isUpdateLocked() {
  try {
    if (!fs.existsSync(LOCK_FILE)) {
      return { locked: false };
    }
    
    const lockData = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf8'));
    const lockAge = Date.now() - lockData.timestamp;
    
    // If lock is too old, consider it stale
    if (lockAge > MAX_LOCK_AGE) {
      return { locked: false, stale: true };
    }
    
    return { 
      locked: true, 
      lockData: {
        pid: lockData.pid,
        timestamp: lockData.timestamp,
        age: lockAge,
        status: lockData.status
      }
    };
  } catch (error) {
    console.warn('Error checking lock file:', error.message);
    return { locked: false, error: error.message };
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const statsFile = path.join(process.cwd(), 'data', 'csv', 'update_stats.json');
    const lockStatus = isUpdateLocked();
    
    let lastUpdateStats = null;
    let isUpdating = false;
    
    // Check if stats file exists
    if (fs.existsSync(statsFile)) {
      try {
        const statsContent = fs.readFileSync(statsFile, 'utf8');
        lastUpdateStats = JSON.parse(statsContent);
      } catch (error) {
        console.warn('Could not read update stats:', error.message);
      }
    }
    
    // Determine if update is running
    isUpdating = lockStatus.locked;
    
    // Get current CSV file stats
    const csvDir = path.join(process.cwd(), 'data', 'csv');
    const profilesFile = path.join(csvDir, 'comprehensive_profiles.csv');
    const weeklyFile = path.join(csvDir, 'comprehensive_weekly_xp.csv');
    
    let currentProfileCount = 0;
    let currentWeeklyCount = 0;
    
    if (fs.existsSync(profilesFile)) {
      const profilesContent = fs.readFileSync(profilesFile, 'utf8');
      currentProfileCount = profilesContent.split('\n').length - 1; // Subtract header
    }
    
    if (fs.existsSync(weeklyFile)) {
      const weeklyContent = fs.readFileSync(weeklyFile, 'utf8');
      currentWeeklyCount = weeklyContent.split('\n').length - 1; // Subtract header
    }
    
    // Calculate update progress if running
    let updateProgress = null;
    if (isUpdating && lockStatus.lockData) {
      const lockAge = lockStatus.lockData.age;
      const estimatedDuration = 10 * 60 * 1000; // 10 minutes estimated
      const progress = Math.min((lockAge / estimatedDuration) * 100, 95);
      
      updateProgress = {
        estimatedProgress: Math.round(progress),
        runningFor: Math.round(lockAge / 1000), // seconds
        estimatedRemaining: Math.max(0, Math.round((estimatedDuration - lockAge) / 1000))
      };
    }
    
    res.status(200).json({
      isUpdating,
      lockStatus,
      lastUpdateStats,
      updateProgress,
      currentStats: {
        profileCount: currentProfileCount,
        weeklyRecordCount: currentWeeklyCount,
        lastChecked: new Date().toISOString()
      },
      concurrency: {
        message: isUpdating ? 'Another user is currently updating the database' : 'Database is available for updates',
        canStartUpdate: !isUpdating
      }
    });

  } catch (error) {
    console.error('Error checking update status:', error);
    res.status(500).json({ 
      error: 'Failed to check update status',
      details: error.message 
    });
  }
}
