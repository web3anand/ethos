// N8N Webhook endpoint for automatic data updates
// This endpoint can be called by N8N or any external automation service

import { spawn } from 'child_process';
import path from 'path';

export default async function handler(req, res) {
  // Allow both GET and POST for flexibility
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Optional authentication (uncomment and set your secret)
  // const authHeader = req.headers.authorization;
  // const expectedToken = process.env.N8N_WEBHOOK_SECRET || 'your-secret-token';
  // if (authHeader !== `Bearer ${expectedToken}`) {
  //   return res.status(401).json({ error: 'Unauthorized' });
  // }

  try {
    console.log('🤖 N8N Webhook triggered - starting data update...');
    
    const startTime = Date.now();
    let output = '';
    let errorOutput = '';

    // Run the comprehensive fetch script
    const scriptPath = path.join(process.cwd(), 'scripts', 'comprehensive-ethos-fetch.js');
    const child = spawn('node', [scriptPath], {
      stdio: 'pipe',
      cwd: process.cwd()
    });

    // Collect output
    child.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      console.log(text.trim());
    });

    child.stderr.on('data', (data) => {
      const text = data.toString();
      errorOutput += text;
      console.error(text.trim());
    });

    // Handle completion
    child.on('close', async (code) => {
      const duration = Date.now() - startTime;
      
      if (code === 0) {
        console.log('✅ N8N webhook data update completed successfully');
        
        // Clear API caches after successful update
        try {
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
          console.log('✅ API caches cleared after N8N update');
        } catch (cacheError) {
          console.warn('⚠️ Failed to clear caches after N8N update:', cacheError.message);
        }
        
        res.status(200).json({
          success: true,
          message: 'Data update completed successfully via N8N webhook',
          duration: `${(duration / 1000).toFixed(1)}s`,
          timestamp: new Date().toISOString(),
          output: output.slice(-1000), // Last 1000 chars
          errorOutput: errorOutput.slice(-500) // Last 500 chars
        });
      } else {
        console.error('❌ N8N webhook data update failed with code:', code);
        res.status(500).json({
          success: false,
          error: 'Data update failed via N8N webhook',
          code,
          duration: `${(duration / 1000).toFixed(1)}s`,
          output: output.slice(-1000),
          errorOutput: errorOutput.slice(-1000)
        });
      }
    });

    // Handle errors
    child.on('error', (error) => {
      console.error('❌ N8N webhook spawn error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to start data update process',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    });

    // Set timeout to prevent hanging
    setTimeout(() => {
      child.kill();
      res.status(408).json({
        success: false,
        error: 'Data update timed out via N8N webhook',
        duration: `${(Date.now() - startTime) / 1000}s`,
        timestamp: new Date().toISOString()
      });
    }, 10 * 60 * 1000); // 10 minutes timeout

  } catch (error) {
    console.error('❌ Error in N8N webhook:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process N8N webhook request',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
