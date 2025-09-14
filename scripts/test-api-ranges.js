async function testApiRanges() {
  console.log('🔍 Testing API with different profile ID ranges...');
  
  const ranges = [
    { start: 1000, end: 1100, name: "1k-1.1k" },
    { start: 2000, end: 2100, name: "2k-2.1k" },
    { start: 5000, end: 5100, name: "5k-5.1k" },
    { start: 10000, end: 10100, name: "10k-10.1k" },
    { start: 20000, end: 20100, name: "20k-20.1k" },
    { start: 30000, end: 30100, name: "30k-30.1k" }
  ];
  
  for (const range of ranges) {
    console.log(`\n📡 Testing ${range.name} range (${range.start}-${range.end})...`);
    
    let foundInRange = 0;
    let sampleProfile = null;
    
    for (let profileId = range.start; profileId <= range.end; profileId++) {
      try {
        const response = await fetch(`https://api.ethos.network/v1/profile/${profileId}`, {
          headers: {
            'User-Agent': 'Ethos-Test/1.0'
          }
        });
        
        if (response.ok) {
          const profile = await response.json();
          foundInRange++;
          
          if (!sampleProfile) {
            sampleProfile = {
              id: profile.id,
              username: profile.username,
              displayName: profile.displayName,
              score: profile.score,
              xp: profile.xp,
              streak: profile.streak
            };
          }
        }
      } catch (error) {
        // Ignore errors
      }
      
      // Small delay
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    console.log(`  📊 Found ${foundInRange} profiles in ${range.name} range`);
    
    if (sampleProfile) {
      console.log(`  📋 Sample: ID ${sampleProfile.id} - ${sampleProfile.username || 'No username'} (Score: ${sampleProfile.score || 0})`);
    }
  }
  
  console.log('\n🎯 Range test complete!');
}

testApiRanges().catch(console.error);
