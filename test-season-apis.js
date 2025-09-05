const fetch = require('node-fetch');

async function testSeasonAPIs() {
  const baseUrl = 'https://api.ethos.network/api/v2';
  const userkey = 'profileId:5476'; // Real user profile ID
  
  console.log('Testing Season 0 APIs with real profile ID 5476...');
  
  try {
    // Test Season 0 weekly data
    const season0WeeklyUrl = `${baseUrl}/xp/user/${encodeURIComponent(userkey)}/season/0/weekly`;
    console.log(`\nCalling: ${season0WeeklyUrl}`);
    
    const response0 = await fetch(season0WeeklyUrl, {
      headers: {
        'X-Ethos-Client': 'ethos-app-dev',
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`Season 0 Weekly Response: ${response0.status} ${response0.statusText}`);
    if (response0.ok) {
      const data0 = await response0.json();
      console.log('Season 0 Weekly Data:', JSON.stringify(data0, null, 2));
    } else {
      console.log('Season 0 Weekly Error:', await response0.text());
    }
    
  } catch (error) {
    console.log('Season 0 Weekly API Error:', error.message);
  }
  
  console.log('\n=================================\n');
  
  try {
    // Test Season 1 weekly data  
    const season1WeeklyUrl = `${baseUrl}/xp/user/${encodeURIComponent(userkey)}/season/1/weekly`;
    console.log(`Calling: ${season1WeeklyUrl}`);
    
    const response1 = await fetch(season1WeeklyUrl, {
      headers: {
        'X-Ethos-Client': 'ethos-app-dev',
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`Season 1 Weekly Response: ${response1.status} ${response1.statusText}`);
    if (response1.ok) {
      const data1 = await response1.json();
      console.log('Season 1 Weekly Data:', JSON.stringify(data1, null, 2));
    } else {
      console.log('Season 1 Weekly Error:', await response1.text());
    }
    
  } catch (error) {
    console.log('Season 1 Weekly API Error:', error.message);
  }
  
  console.log('\n=================================\n');
  
  try {
    // Test Season 0 weeks structure
    const season0WeeksUrl = `${baseUrl}/xp/season/0/weeks`;
    console.log(`Calling: ${season0WeeksUrl}`);
    
    const weeksResponse0 = await fetch(season0WeeksUrl, {
      headers: {
        'X-Ethos-Client': 'ethos-app-dev',
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`Season 0 Weeks Response: ${weeksResponse0.status} ${weeksResponse0.statusText}`);
    if (weeksResponse0.ok) {
      const weeksData0 = await weeksResponse0.json();
      console.log('Season 0 Weeks Data:', JSON.stringify(weeksData0, null, 2));
    } else {
      console.log('Season 0 Weeks Error:', await weeksResponse0.text());
    }
    
  } catch (error) {
    console.log('Season 0 Weeks API Error:', error.message);
  }
}

testSeasonAPIs().catch(console.error);
