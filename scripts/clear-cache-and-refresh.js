// Script to clear API cache and force refresh of latest data
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3000/api';

async function clearCacheAndRefresh() {
  console.log('🔄 Clearing API cache and forcing refresh...');
  
  try {
    // Clear comprehensive profiles cache
    console.log('📊 Clearing comprehensive profiles cache...');
    const profilesResponse = await fetch(`${API_BASE}/comprehensive-profiles?clearCache=true&_t=${Date.now()}`, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
    if (profilesResponse.ok) {
      const profilesData = await profilesResponse.json();
      console.log(`✅ Comprehensive profiles: ${profilesData.profiles.length} profiles loaded`);
    }
    
    // Clear weekly XP cache
    console.log('📈 Clearing weekly XP cache...');
    const weeklyResponse = await fetch(`${API_BASE}/csv-weekly-xp?clearCache=true&_t=${Date.now()}`, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
    if (weeklyResponse.ok) {
      const weeklyData = await weeklyResponse.json();
      console.log(`✅ Weekly XP data: ${weeklyData.profiles.length} records loaded`);
    }
    
    // Clear XP user counts cache
    console.log('📊 Clearing XP user counts cache...');
    const countsResponse = await fetch(`${API_BASE}/xp-user-counts?clearCache=true&_t=${Date.now()}`, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
    if (countsResponse.ok) {
      const countsData = await countsResponse.json();
      console.log(`✅ XP user counts: ${Object.keys(countsData).length} seasons loaded`);
    }
    
    console.log('🎉 All caches cleared and data refreshed!');
    console.log('💡 The UI should now show the latest data from the Ethos API fetch.');
    
  } catch (error) {
    console.error('❌ Error clearing cache:', error.message);
  }
}

clearCacheAndRefresh();
