import { spawn } from 'child_process';
import path from 'path';

export default async function handler(req, res) {
  // Verify this is a cron request (Vercel Cron)
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify the request is from Vercel Cron
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('🕐 Starting scheduled data update...');
    
    const startTime = Date.now();
    
    // Run the comprehensive fetch script
    const scriptPath = path.join(process.cwd(), 'scripts', 'comprehensive-ethos-fetch.js');
    
    return new Promise((resolve) => {
      const child = spawn('node', [scriptPath], {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let output = '';
      let errorOutput = '';

      child.stdout.on('data', (data) => {
        const text = data.toString();
        output += text;
        console.log('Cron fetch output:', text);
      });

      child.stderr.on('data', (data) => {
        const text = data.toString();
        errorOutput += text;
        console.error('Cron fetch error:', text);
      });

      child.on('close', async (code) => {
        const duration = Date.now() - startTime;
        
        if (code === 0) {
          console.log('✅ Scheduled data update completed successfully');
          
          // Clear caches after successful fetch
          try {
            await clearAllCaches();
            console.log('✅ Caches cleared after scheduled update');
          } catch (cacheError) {
            console.error('⚠️ Failed to clear caches:', cacheError);
          }
          
          resolve(res.status(200).json({
            success: true,
            message: 'Scheduled data update completed successfully',
            duration: `${(duration / 1000).toFixed(1)}s`,
            timestamp: new Date().toISOString()
          }));
        } else {
          console.error('❌ Scheduled data update failed with code:', code);
          resolve(res.status(500).json({
            success: false,
            error: 'Scheduled data update failed',
            code,
            duration: `${(duration / 1000).toFixed(1)}s`,
            output: output.slice(-1000), // Last 1000 chars
            errorOutput: errorOutput.slice(-1000),
            timestamp: new Date().toISOString()
          }));
        }
      });

      // Set a timeout to prevent hanging
      setTimeout(() => {
        child.kill();
        resolve(res.status(408).json({
          success: false,
          error: 'Scheduled data update timed out',
          duration: `${(Date.now() - startTime) / 1000}s`,
          timestamp: new Date().toISOString()
        }));
      }, 10 * 60 * 1000); // 10 minutes timeout
    });

  } catch (error) {
    console.error('❌ Error in scheduled data update:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start scheduled data update',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

// Helper function to clear all caches
async function clearAllCaches() {
  const baseUrl = process.env.VERCEL_URL ? 
    `https://${process.env.VERCEL_URL}` : 
    'http://localhost:3000';

  const endpoints = [
    '/api/comprehensive-profiles?clearCache=true',
    '/api/csv-weekly-xp?clearCache=true',
    '/api/xp-user-counts?clearCache=true'
  ];

  for (const endpoint of endpoints) {
    try {
      await fetch(`${baseUrl}${endpoint}&_t=${Date.now()}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    } catch (error) {
      console.warn(`Failed to clear cache for ${endpoint}:`, error.message);
    }
  }
}