// Vercel Cron Job - runs every 3 hours
// This file should be in pages/api/cron/update-data.js

export default async function handler(req, res) {
  // Verify this is a cron request (optional security)
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('🔄 Starting scheduled data update...');
    
    // Import and run the update logic
    const { performDataUpdate } = await import('../../scripts/update-data.js');
    
    const result = await performDataUpdate();
    
    console.log('✅ Scheduled update completed:', result);
    
    res.status(200).json({
      success: true,
      message: 'Data update completed successfully',
      stats: result
    });
    
  } catch (error) {
    console.error('❌ Scheduled update failed:', error);
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// Configure this as a cron job in vercel.json
export const config = {
  type: 'experimental',
};
