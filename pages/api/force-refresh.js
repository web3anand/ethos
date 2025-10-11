import ForceRefreshSync from '../../scripts/force-refresh-sync.js';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🔄 Force refresh API called');
    
    // Create sync instance
    const sync = new ForceRefreshSync();
    
    // Run the sync
    const result = await sync.forceRefreshSync();
    
    // Close database connection
    sync.close();
    
    if (result.success) {
      console.log('✅ Force refresh completed successfully');
      return res.status(200).json({
        success: true,
        message: 'Force refresh completed successfully',
        data: {
          inserted: result.inserted,
          updated: result.updated,
          errors: result.errors,
          totalProfiles: result.totalProfiles,
          highestId: result.highestId
        }
      });
    } else {
      console.error('❌ Force refresh failed:', result.error);
      return res.status(500).json({
        success: false,
        error: result.error || 'Force refresh failed'
      });
    }
    
  } catch (error) {
    console.error('❌ Force refresh API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}
