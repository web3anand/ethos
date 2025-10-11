import { runIncrementalUpdate } from '../../scripts/incremental-profile-updater.js';
import fs from 'fs';
import path from 'path';

// File-based lock mechanism for better concurrency control
const LOCK_FILE = path.join(process.cwd(), 'data', 'csv', 'update.lock');
const MAX_LOCK_AGE = 30 * 60 * 1000; // 30 minutes

// Track running updates
let isUpdating = false;
let lastUpdateStats = null;
let updateStartTime = null;

// Check if update is locked
function isUpdateLocked() {
  try {
    if (!fs.existsSync(LOCK_FILE)) {
      return false;
    }
    
    const lockData = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf8'));
    const lockAge = Date.now() - lockData.timestamp;
    
    // If lock is too old, consider it stale and remove it
    if (lockAge > MAX_LOCK_AGE) {
      console.log('🔓 Removing stale lock file');
      fs.unlinkSync(LOCK_FILE);
      return false;
    }
    
    return true;
  } catch (error) {
    console.warn('Error checking lock file:', error.message);
    return false;
  }
}

// Create update lock
function createUpdateLock(pid) {
  try {
    const lockData = {
      pid: pid,
      timestamp: Date.now(),
      status: 'running'
    };
    fs.writeFileSync(LOCK_FILE, JSON.stringify(lockData, null, 2));
    console.log('🔒 Created update lock');
  } catch (error) {
    console.error('Error creating lock file:', error);
  }
}

// Remove update lock
function removeUpdateLock() {
  try {
    if (fs.existsSync(LOCK_FILE)) {
      fs.unlinkSync(LOCK_FILE);
      console.log('🔓 Removed update lock');
    }
  } catch (error) {
    console.error('Error removing lock file:', error);
  }
}

// Get update status with lock information
function getDetailedUpdateStatus() {
  const lockExists = isUpdateLocked();
  const inMemory = isUpdating;
  
  return {
    isUpdating: lockExists || inMemory,
    lockExists,
    inMemory,
    lastUpdateStats,
    lastUpdateTime: lastUpdateStats ? new Date(lastUpdateStats.timestamp).toISOString() : null,
    updateStartTime: updateStartTime ? new Date(updateStartTime).toISOString() : null
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check if update is already running (file-based + in-memory check)
    if (isUpdateLocked() || isUpdating) {
      const status = getDetailedUpdateStatus();
      return res.status(409).json({ 
        error: 'Update already in progress',
        status: 'running',
        details: status,
        message: 'Another user is currently updating the database. Please wait for it to complete.'
      });
    }

    // Create lock file
    const processId = process.pid;
    createUpdateLock(processId);
    
    // Start the update process
    isUpdating = true;
    updateStartTime = Date.now();
    
    console.log('🚀 Starting incremental update via API...');
    
    // Run the incremental update in the background
    runIncrementalUpdate()
      .then(stats => {
        lastUpdateStats = stats;
        isUpdating = false;
        updateStartTime = null;
        removeUpdateLock();
        console.log('✅ Incremental update completed:', stats);
      })
      .catch(error => {
        isUpdating = false;
        updateStartTime = null;
        removeUpdateLock();
        console.error('❌ Incremental update failed:', error);
      });

    // Return immediate response
    res.status(200).json({
      message: 'Incremental update started',
      status: 'started',
      timestamp: new Date().toISOString(),
      processId: processId
    });

  } catch (error) {
    isUpdating = false;
    updateStartTime = null;
    removeUpdateLock();
    console.error('Error starting incremental update:', error);
    res.status(500).json({ 
      error: 'Failed to start incremental update',
      details: error.message 
    });
  }
}

// Export a function to check update status
export async function getUpdateStatus() {
  return {
    isUpdating,
    lastUpdateStats,
    lastUpdateTime: lastUpdateStats ? new Date().toISOString() : null
  };
}
