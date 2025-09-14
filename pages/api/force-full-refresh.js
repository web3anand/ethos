import { runIncrementalUpdate } from '../../scripts/incremental-profile-updater.js';
import fs from 'fs';
import path from 'path';

// File-based lock and cooldown mechanism
const LOCK_FILE = path.join(process.cwd(), 'data', 'csv', 'force-refresh.lock');
const COOLDOWN_HOURS = 12;
const COOLDOWN_MS = COOLDOWN_HOURS * 60 * 60 * 1000; // 12 hours in milliseconds

// Track running refresh
let isRefreshing = false;
let lastRefreshStats = null;
let refreshStartTime = null;

// Check if refresh is on cooldown
function isOnCooldown() {
  try {
    if (!fs.existsSync(LOCK_FILE)) {
      return { onCooldown: false, remainingTime: 0 };
    }
    
    const lockData = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf8'));
    const timeSinceLastRefresh = Date.now() - lockData.timestamp;
    
    if (timeSinceLastRefresh < COOLDOWN_MS) {
      const remainingTime = COOLDOWN_MS - timeSinceLastRefresh;
      return { onCooldown: true, remainingTime, lastRefresh: lockData };
    }
    
    // Cooldown expired, remove lock file
    fs.unlinkSync(LOCK_FILE);
    return { onCooldown: false, remainingTime: 0 };
  } catch (error) {
    console.warn('Error checking cooldown:', error.message);
    return { onCooldown: false, remainingTime: 0 };
  }
}

// Create refresh lock with timestamp
function createRefreshLock() {
  try {
    const lockData = {
      timestamp: Date.now(),
      processId: process.pid,
      status: 'running'
    };
    fs.writeFileSync(LOCK_FILE, JSON.stringify(lockData, null, 2));
    console.log('🔒 Created force refresh lock with 12-hour cooldown');
  } catch (error) {
    console.error('Error creating refresh lock:', error);
  }
}

// Get refresh status
function getRefreshStatus() {
  const cooldown = isOnCooldown();
  
  return {
    isRefreshing,
    onCooldown: cooldown.onCooldown,
    remainingCooldownTime: cooldown.remainingTime,
    remainingCooldownHours: Math.ceil(cooldown.remainingTime / (60 * 60 * 1000)),
    lastRefreshStats,
    lastRefreshTime: lastRefreshStats ? new Date(lastRefreshStats.timestamp).toISOString() : null,
    refreshStartTime: refreshStartTime ? new Date(refreshStartTime).toISOString() : null,
    cooldownHours: COOLDOWN_HOURS
  };
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    // Return status
    return res.status(200).json(getRefreshStatus());
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check if refresh is already running
    if (isRefreshing) {
      const status = getRefreshStatus();
      return res.status(409).json({ 
        error: 'Force refresh already in progress',
        status: 'running',
        details: status,
        message: 'A force refresh is currently running. Please wait for it to complete.'
      });
    }
    
    // Check cooldown
    const cooldownCheck = isOnCooldown();
    if (cooldownCheck.onCooldown) {
      const hoursRemaining = Math.ceil(cooldownCheck.remainingTime / (60 * 60 * 1000));
      return res.status(429).json({ 
        error: 'Force refresh on cooldown',
        status: 'cooldown',
        remainingHours: hoursRemaining,
        remainingTime: cooldownCheck.remainingTime,
        message: `Force refresh is on cooldown. Please wait ${hoursRemaining} more hours before trying again.`,
        lastRefresh: cooldownCheck.lastRefresh
      });
    }

    // Create lock file (starts cooldown)
    createRefreshLock();
    
    // Start the refresh process
    isRefreshing = true;
    refreshStartTime = Date.now();
    
    console.log('🚀 Starting FORCE FULL REFRESH via API...');
    
    // Run the full refresh in the background
    runIncrementalUpdate()
      .then(stats => {
        lastRefreshStats = stats;
        isRefreshing = false;
        refreshStartTime = null;
        console.log('✅ Force full refresh completed:', stats);
      })
      .catch(error => {
        isRefreshing = false;
        refreshStartTime = null;
        console.error('❌ Force full refresh failed:', error);
      });

    // Return immediate response
    res.status(200).json({
      message: 'Force full refresh started',
      status: 'started',
      timestamp: new Date().toISOString(),
      processId: process.pid,
      cooldownHours: COOLDOWN_HOURS,
      nextAllowedRefresh: new Date(Date.now() + COOLDOWN_MS).toISOString()
    });

  } catch (error) {
    isRefreshing = false;
    refreshStartTime = null;
    console.error('Error starting force full refresh:', error);
    res.status(500).json({ 
      error: 'Failed to start force full refresh',
      details: error.message 
    });
  }
}

// Export status function for external use
export async function getForceRefreshStatus() {
  return getRefreshStatus();
}
