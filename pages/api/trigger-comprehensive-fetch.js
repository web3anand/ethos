import { spawn } from 'child_process';
import path from 'path';

// Global state to track fetch status
let fetchStatus = {
  isRunning: false,
  completed: false,
  error: null,
  stage: 'Idle',
  startTime: null,
  endTime: null
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check if fetch is already running
    if (fetchStatus.isRunning) {
      return res.status(409).json({ 
        error: 'Fetch already in progress',
        status: fetchStatus
      });
    }

    // Reset status
    fetchStatus = {
      isRunning: true,
      completed: false,
      error: null,
      stage: 'Starting comprehensive fetch...',
      startTime: new Date().toISOString(),
      endTime: null
    };

    console.log('🚀 Starting comprehensive fetch from API...');

    // Run the comprehensive fetch script
    const scriptPath = path.join(process.cwd(), 'scripts', 'comprehensive-ethos-fetch.js');
    const child = spawn('node', [scriptPath], {
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Handle script output with enhanced progress tracking
    child.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('Fetch output:', output);
      
      // Update status based on output with more detailed stages
      if (output.includes('Starting comprehensive data fetch')) {
        fetchStatus.stage = 'Initializing data fetch...';
      } else if (output.includes('Processing batch')) {
        fetchStatus.stage = 'Processing user profiles...';
      } else if (output.includes('Found') && output.includes('profiles in batch')) {
        fetchStatus.stage = 'Fetching user data from Ethos API...';
      } else if (output.includes('Saving data to CSV')) {
        fetchStatus.stage = 'Saving data to CSV files...';
      } else if (output.includes('Counting weekly XP recipients')) {
        fetchStatus.stage = 'Processing weekly XP data...';
      } else if (output.includes('COMPREHENSIVE FETCH COMPLETED')) {
        fetchStatus.stage = 'Fetch completed successfully!';
        fetchStatus.completed = true;
        fetchStatus.isRunning = false;
        fetchStatus.endTime = new Date().toISOString();
      } else if (output.includes('Progress:')) {
        // Extract progress information from the output
        const progressMatch = output.match(/Progress: (\d+) profiles checked, (\d+) found/);
        if (progressMatch) {
          const [, checked, found] = progressMatch;
          fetchStatus.stage = `Processed ${found} profiles (${checked} checked)`;
        }
      }
    });

    child.stderr.on('data', (data) => {
      const error = data.toString();
      console.error('Fetch error:', error);
      fetchStatus.error = error;
      fetchStatus.isRunning = false;
      fetchStatus.endTime = new Date().toISOString();
    });

    child.on('close', (code) => {
      console.log(`Fetch process exited with code ${code}`);
      if (code !== 0) {
        fetchStatus.error = `Process exited with code ${code}`;
        fetchStatus.isRunning = false;
        fetchStatus.endTime = new Date().toISOString();
      }
    });

    // Don't wait for completion - return immediately
    res.status(200).json({
      message: 'Comprehensive fetch started',
      status: fetchStatus
    });

  } catch (error) {
    console.error('Error starting comprehensive fetch:', error);
    fetchStatus.error = error.message;
    fetchStatus.isRunning = false;
    fetchStatus.endTime = new Date().toISOString();
    
    res.status(500).json({ 
      error: 'Failed to start comprehensive fetch',
      details: error.message,
      status: fetchStatus
    });
  }
}

// Export the status for other endpoints
export { fetchStatus };
