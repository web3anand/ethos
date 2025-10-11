const fs = require('fs');
const path = require('path');

// Parse CSV content to array of objects
function parseCsv(csvContent, headers = null) {
  const lines = csvContent.trim().split('\n');
  if (lines.length === 0) return [];
  
  const csvHeaders = headers || lines[0].split(',');
  const data = [];
  
  for (let i = headers ? 0 : 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const row = {};
    for (let k = 0; k < csvHeaders.length; k++) {
      const header = csvHeaders[k];
      let value = values[k] || '';
      
      // Convert numeric fields
      if (['profile_id', 'season', 'week', 'weekly_xp', 'cumulative_xp'].includes(header)) {
        value = value === '' ? 0 : parseInt(value);
      }
      
      row[header] = value;
    }
    data.push(row);
  }
  
  return data;
}

console.log('🔍 Analyzing ranking for user 5476 (hashvalue)...\n');

// Load the CSV data
const dataDir = path.join(process.cwd(), 'data', 'csv');
const weeklyXpFile = path.join(dataDir, 'comprehensive_weekly_xp.csv');
const weeklyXpContent = fs.readFileSync(weeklyXpFile, 'utf8');
const weeklyXpData = parseCsv(weeklyXpContent);

// Find user 5476 data
const user5476Data = weeklyXpData.filter(record => record.profile_id === 5476);
console.log('User 5476 data:', user5476Data);

// Analyze Season 0 rankings
console.log('\n📊 SEASON 0 ANALYSIS:');
const season0Data = weeklyXpData.filter(record => record.season === 0);
console.log(`Total records in Season 0: ${season0Data.length}`);

// Group by profile_id for season totals
const season0Profiles = new Map();
season0Data.forEach(record => {
  const profileId = record.profile_id;
  if (!season0Profiles.has(profileId)) {
    season0Profiles.set(profileId, {
      profile_id: profileId,
      cumulative_xp: 0
    });
  }
  const current = season0Profiles.get(profileId);
  current.cumulative_xp = Math.max(current.cumulative_xp, record.cumulative_xp || 0);
});

const season0Array = Array.from(season0Profiles.values())
  .filter(p => p.cumulative_xp > 0)
  .sort((a, b) => b.cumulative_xp - a.cumulative_xp);

season0Array.forEach((profile, index) => {
  profile.rank = index + 1;
});

const user5476Season0 = season0Array.find(p => p.profile_id === 5476);
console.log(`User 5476 in Season 0: Rank #${user5476Season0?.rank}, XP: ${user5476Season0?.cumulative_xp}`);
console.log(`Total participants in Season 0: ${season0Array.length}`);

// Show top 10 and context around user 5476
console.log('\nTop 10 Season 0:');
season0Array.slice(0, 10).forEach(p => console.log(`#${p.rank}: Profile ${p.profile_id} - ${p.cumulative_xp} XP`));

if (user5476Season0?.rank > 10) {
  console.log('\nContext around user 5476:');
  const start = Math.max(0, user5476Season0.rank - 6);
  const end = Math.min(season0Array.length, user5476Season0.rank + 4);
  season0Array.slice(start, end).forEach(p => {
    const marker = p.profile_id === 5476 ? '👤 ' : '   ';
    console.log(`${marker}#${p.rank}: Profile ${p.profile_id} - ${p.cumulative_xp} XP`);
  });
}

// Analyze Season 1 rankings
console.log('\n📊 SEASON 1 ANALYSIS:');
const season1Data = weeklyXpData.filter(record => record.season === 1);
console.log(`Total records in Season 1: ${season1Data.length}`);

// Group by profile_id for season totals
const season1Profiles = new Map();
season1Data.forEach(record => {
  const profileId = record.profile_id;
  if (!season1Profiles.has(profileId)) {
    season1Profiles.set(profileId, {
      profile_id: profileId,
      cumulative_xp: 0
    });
  }
  const current = season1Profiles.get(profileId);
  current.cumulative_xp = Math.max(current.cumulative_xp, record.cumulative_xp || 0);
});

const season1Array = Array.from(season1Profiles.values())
  .filter(p => p.cumulative_xp > 0)
  .sort((a, b) => b.cumulative_xp - a.cumulative_xp);

season1Array.forEach((profile, index) => {
  profile.rank = index + 1;
});

const user5476Season1 = season1Array.find(p => p.profile_id === 5476);
console.log(`User 5476 in Season 1: Rank #${user5476Season1?.rank}, XP: ${user5476Season1?.cumulative_xp}`);
console.log(`Total participants in Season 1: ${season1Array.length}`);

// Show top 10 and context around user 5476
console.log('\nTop 10 Season 1:');
season1Array.slice(0, 10).forEach(p => console.log(`#${p.rank}: Profile ${p.profile_id} - ${p.cumulative_xp} XP`));

if (user5476Season1?.rank > 10) {
  console.log('\nContext around user 5476:');
  const start = Math.max(0, user5476Season1.rank - 6);
  const end = Math.min(season1Array.length, user5476Season1.rank + 4);
  season1Array.slice(start, end).forEach(p => {
    const marker = p.profile_id === 5476 ? '👤 ' : '   ';
    console.log(`${marker}#${p.rank}: Profile ${p.profile_id} - ${p.cumulative_xp} XP`);
  });
}

console.log('\n🔍 SUMMARY:');
console.log(`Season 0: ${season0Array.length} participants, User 5476 rank #${user5476Season0?.rank} with ${user5476Season0?.cumulative_xp} XP`);
console.log(`Season 1: ${season1Array.length} participants, User 5476 rank #${user5476Season1?.rank} with ${user5476Season1?.cumulative_xp} XP`);
console.log(`XP Improvement: ${user5476Season1?.cumulative_xp - user5476Season0?.cumulative_xp} (+${((user5476Season1?.cumulative_xp / user5476Season0?.cumulative_xp - 1) * 100).toFixed(1)}%)`);
console.log(`Rank Change: ${user5476Season0?.rank - user5476Season1?.rank} positions (${user5476Season0?.rank > user5476Season1?.rank ? 'improved' : 'declined'})`);
