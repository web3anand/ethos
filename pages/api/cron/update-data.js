import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  // Only allow POST requests (cron jobs)
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify this is a cron job request
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('🔄 Starting daily data update...');
    
    // Import the comprehensive fetch script
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    // Run the comprehensive data fetch
    const { stdout, stderr } = await execAsync('node scripts/comprehensive-ethos-fetch.js');
    
    console.log('✅ Daily data update completed');
    console.log('📊 Output:', stdout);
    
    if (stderr) {
      console.error('⚠️ Warnings:', stderr);
    }
    
    res.status(200).json({ 
      success: true, 
      message: 'Daily data update completed',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Daily data update failed:', error);
    
    res.status(500).json({ 
      success: false, 
      error: 'Daily data update failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
