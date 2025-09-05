// Super simple Season 0 API test
const fetch = require('node-fetch');

async function testSeason0Fast() {
  const userkey = 'profileId:5476';
  const baseUrl = 'https://api.ethos.network/api/v2';
  
  console.log('Testing Season 0 APIs with 2 second timeout...');
  
  const timeout = (ms) => new Promise((_, reject) => 
    setTimeout(() => reject(new Error('TIMEOUT')), ms)
  );
  
  try {
    // Test with 2 second timeout
    const [totalXP, seasonXP, weeklyXpData] = await Promise.race([
      Promise.all([
        fetch(`${baseUrl}/xp/user/${encodeURIComponent(userkey)}`, {
          headers: { 'X-Ethos-Client': 'ethos-app-dev' }
        }).then(r => r.json()).catch(() => 0),
        
        fetch(`${baseUrl}/xp/user/${encodeURIComponent(userkey)}/season/0`, {
          headers: { 'X-Ethos-Client': 'ethos-app-dev' }
        }).then(r => r.json()).catch(() => 0),
        
        fetch(`${baseUrl}/xp/user/${encodeURIComponent(userkey)}/season/0/weekly`, {
          headers: { 'X-Ethos-Client': 'ethos-app-dev' }
        }).then(r => r.json()).catch(() => [])
      ]),
      timeout(2000)
    ]);
    
    console.log('SUCCESS - Season 0 APIs responded within 2 seconds!');
    console.log(`Total XP: ${totalXP}`);
    console.log(`Season 0 XP: ${seasonXP}`);
    console.log(`Weekly data: ${JSON.stringify(weeklyXpData)}`);
    
  } catch (error) {
    console.log('FAILED - Season 0 APIs took longer than 2 seconds or errored:', error.message);
  }
}

testSeason0Fast();
