import { runIncrementalUpdate } from '../../scripts/incremental-profile-updater.js';
import fs from 'fs';
import path from 'path';

// File-based lock mechanism (no cooldown)
const LOCK_FILE = path.join(process.cwd(), 'data', 'csv', 'force-refresh.lock');
const REFRESH_PASSWORD = 'acees'; // Password to access force refresh

// Track running refresh
let isRefreshing = false;
let lastRefreshStats = null;
let refreshStartTime = null;

// Check if refresh is currently running
function isCurrentlyRunning() {
  try {
    if (!fs.existsSync(LOCK_FILE)) {
      return { isRunning: false };
    }
    
    const lockData = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf8'));
    return { isRunning: true, lockData };
  } catch (error) {
    console.warn('Error checking lock status:', error.message);
    return { isRunning: false };
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
    console.log('🔒 Created force refresh lock');
  } catch (error) {
    console.error('Error creating refresh lock:', error);
  }
}

// Get refresh status
function getRefreshStatus() {
  const running = isCurrentlyRunning();
  
  return {
    isRefreshing,
    isRunning: running.isRunning,
    lastRefreshStats,
    lastRefreshTime: lastRefreshStats ? new Date(lastRefreshStats.timestamp).toISOString() : null,
    refreshStartTime: refreshStartTime ? new Date(refreshStartTime).toISOString() : null,
    lockData: running.lockData
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
    // Check password
    const { password } = req.body;
    if (password !== REFRESH_PASSWORD) {
      return res.status(401).json({ 
        error: 'Invalid password',
        message: 'Password required to access force refresh'
      });
    }

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

    // Create lock file
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
      processId: process.pid
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
