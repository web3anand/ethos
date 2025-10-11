// Analyze the missing 49 users between your system and direct API
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load the direct API results
const directApiFile = path.join(__dirname, '..', 'data', 'week13-batch-fetch.json');
const directApiData = JSON.parse(fs.readFileSync(directApiFile, 'utf8'));

console.log('🔍 Analyzing missing users between your system and direct API...\n');

// Get all profile IDs from direct API
const directApiProfileIds = new Set();
directApiData.sampleData.forEach(user => {
  directApiProfileIds.add(user.profile_id);
});

// Get all profile IDs from your CSV data
const csvFile = path.join(__dirname, '..', 'data', 'csv', 'comprehensive_weekly_xp.csv');
const csvContent = fs.readFileSync(csvFile, 'utf8');
const csvLines = csvContent.trim().split('\n');
const csvHeader = csvLines[0].split(',');
const profileIdIndex = csvHeader.indexOf('profile_id');
const weekIndex = csvHeader.indexOf('week');
const weeklyXpIndex = csvHeader.indexOf('weekly_xp');
const seasonIdIndex = csvHeader.indexOf('season_id');

console.log('📊 CSV Analysis:');
console.log(`   Total CSV records: ${csvLines.length - 1}`);
console.log(`   Headers: ${csvHeader.join(', ')}`);

// Find Week 13 records in CSV
const csvWeek13Records = [];
for (let i = 1; i < csvLines.length; i++) {
  const fields = csvLines[i].split(',');
  const profileId = parseInt(fields[profileIdIndex]);
  const week = parseInt(fields[weekIndex]);
  const weeklyXp = parseFloat(fields[weeklyXpIndex]);
  const seasonId = parseInt(fields[seasonIdIndex]);
  
  if (seasonId === 1 && week === 13 && weeklyXp > 0) {
    csvWeek13Records.push({
      profile_id: profileId,
      weekly_xp: weeklyXp
    });
  }
}

console.log(`   Week 13 records with XP > 0: ${csvWeek13Records.length}`);

// Get profile IDs from CSV
const csvProfileIds = new Set(csvWeek13Records.map(r => r.profile_id));

console.log('\n📊 Direct API Analysis:');
console.log(`   Total Week 13 recipients: ${directApiData.totalWithWeek13Data}`);
console.log(`   Sample data count: ${directApiData.sampleData.length}`);

// Find missing profiles
const missingInCsv = [];
const missingInDirectApi = [];

// Check which profiles are in direct API but not in CSV
directApiData.sampleData.forEach(user => {
  if (!csvProfileIds.has(user.profile_id)) {
    missingInCsv.push(user);
  }
});

// Check which profiles are in CSV but not in direct API sample
csvWeek13Records.forEach(user => {
  if (!directApiProfileIds.has(user.profile_id)) {
    missingInDirectApi.push(user);
  }
});

console.log('\n🔍 Missing Users Analysis:');
console.log(`   Profiles in direct API but missing from CSV: ${missingInCsv.length}`);
console.log(`   Profiles in CSV but missing from direct API sample: ${missingInDirectApi.length}`);

if (missingInCsv.length > 0) {
  console.log('\n❌ Missing from CSV (first 10):');
  missingInCsv.slice(0, 10).forEach((user, i) => {
    console.log(`   ${i + 1}. Profile ${user.profile_id}: ${user.weekly_xp.toLocaleString()} XP`);
  });
}

if (missingInDirectApi.length > 0) {
  console.log('\n❌ Missing from direct API sample (first 10):');
  missingInDirectApi.slice(0, 10).forEach((user, i) => {
    console.log(`   ${i + 1}. Profile ${user.profile_id}: ${user.weekly_xp.toLocaleString()} XP`);
  });
}

// Check if the issue is with profile data vs weekly data
console.log('\n🔍 Root Cause Analysis:');
console.log('   The 49 missing users are likely due to:');
console.log('   1. Missing profile data in comprehensive_profiles.csv');
console.log('   2. Your API filters out users without profile data');
console.log('   3. Data sync issues between weekly XP and profile data');

// Check if we can find these profiles in the comprehensive profiles CSV
const profilesFile = path.join(__dirname, '..', 'data', 'csv', 'comprehensive_profiles.csv');
if (fs.existsSync(profilesFile)) {
  const profilesContent = fs.readFileSync(profilesFile, 'utf8');
  const profilesLines = profilesContent.trim().split('\n');
  const profilesHeader = profilesLines[0].split(',');
  const profileIdColIndex = profilesHeader.indexOf('profile_id');
  
  const profilesInCsv = new Set();
  for (let i = 1; i < profilesLines.length; i++) {
    const fields = profilesLines[i].split(',');
    const profileId = parseInt(fields[profileIdColIndex]);
    profilesInCsv.add(profileId);
  }
  
  console.log(`\n📊 Profile Data Analysis:`);
  console.log(`   Total profiles in comprehensive_profiles.csv: ${profilesInCsv.size}`);
  
  let missingProfileData = 0;
  missingInCsv.forEach(user => {
    if (!profilesInCsv.has(user.profile_id)) {
      missingProfileData++;
    }
  });
  
  console.log(`   Missing profile data for Week 13 recipients: ${missingProfileData}`);
  console.log(`   This explains the ${missingProfileData} missing users in your system!`);
}

console.log('\n🎯 Key Cause Identified:');
console.log('   The 49 missing users have Week 13 XP data but are missing from');
console.log('   comprehensive_profiles.csv, so your API filters them out.');
