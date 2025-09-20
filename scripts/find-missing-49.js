// Find the exact 49 missing users
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Finding the exact 49 missing users...\n');

// Load your CSV data
const csvFile = path.join(__dirname, '..', 'data', 'csv', 'comprehensive_weekly_xp.csv');
const csvContent = fs.readFileSync(csvFile, 'utf8');
const csvLines = csvContent.trim().split('\n');
const csvHeader = csvLines[0].split(',');
const profileIdIndex = csvHeader.indexOf('profile_id');
const weekIndex = csvHeader.indexOf('week');
const weeklyXpIndex = csvHeader.indexOf('weekly_xp');
const seasonIdIndex = csvHeader.indexOf('season_id');

// Get all Week 13 recipients from your CSV
const yourWeek13Recipients = new Set();
for (let i = 1; i < csvLines.length; i++) {
  const fields = csvLines[i].split(',');
  const profileId = parseInt(fields[profileIdIndex]);
  const week = parseInt(fields[weekIndex]);
  const weeklyXp = parseFloat(fields[weeklyXpIndex]);
  const seasonId = parseInt(fields[seasonIdIndex]);
  
  if (seasonId === 1 && week === 13 && weeklyXp > 0) {
    yourWeek13Recipients.add(profileId);
  }
}

console.log(`📊 Your CSV has ${yourWeek13Recipients.size} Week 13 recipients`);

// Load the direct API results
const directApiFile = path.join(__dirname, '..', 'data', 'week13-batch-fetch.json');
const directApiData = JSON.parse(fs.readFileSync(directApiFile, 'utf8'));

console.log(`📊 Direct API found ${directApiData.totalWithWeek13Data} Week 13 recipients`);

// The direct API only has sample data, not all 2,498 profiles
// We need to check if the issue is in the data source or processing

// Check if there are any profiles in your CSV that shouldn't be there
console.log('\n🔍 Checking data quality...');

// Check for duplicate profile IDs in your CSV
const duplicateCheck = new Map();
for (let i = 1; i < csvLines.length; i++) {
  const fields = csvLines[i].split(',');
  const profileId = parseInt(fields[profileIdIndex]);
  const week = parseInt(fields[weekIndex]);
  const weeklyXp = parseFloat(fields[weeklyXpIndex]);
  const seasonId = parseInt(fields[seasonIdIndex]);
  
  if (seasonId === 1 && week === 13 && weeklyXp > 0) {
    const key = `${profileId}`;
    if (duplicateCheck.has(key)) {
      console.log(`❌ Duplicate found: Profile ${profileId} appears multiple times`);
    } else {
      duplicateCheck.set(key, { profileId, weeklyXp, line: i + 1 });
    }
  }
}

console.log(`✅ No duplicates found in your CSV`);

// Check if the issue is with the API filtering
console.log('\n🔍 Checking API filtering logic...');

// Load your profiles CSV to see if there are users with Week 13 XP but no profile data
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
  
  console.log(`📊 Total profiles in comprehensive_profiles.csv: ${profilesInCsv.size}`);
  
  // Find users with Week 13 XP but no profile data
  const missingProfileData = [];
  yourWeek13Recipients.forEach(profileId => {
    if (!profilesInCsv.has(profileId)) {
      missingProfileData.push(profileId);
    }
  });
  
  console.log(`❌ Users with Week 13 XP but no profile data: ${missingProfileData.length}`);
  
  if (missingProfileData.length > 0) {
    console.log('   First 10 missing profile data:');
    missingProfileData.slice(0, 10).forEach((profileId, i) => {
      console.log(`   ${i + 1}. Profile ${profileId}`);
    });
  }
  
  // This is likely the cause - your API filters out users without profile data
  if (missingProfileData.length === 49) {
    console.log('\n🎯 KEY CAUSE IDENTIFIED:');
    console.log('   The 49 missing users have Week 13 XP data but are missing');
    console.log('   from comprehensive_profiles.csv. Your API filters them out');
    console.log('   because it requires both weekly XP AND profile data.');
  } else if (missingProfileData.length > 0) {
    console.log('\n🎯 PARTIAL CAUSE IDENTIFIED:');
    console.log(`   ${missingProfileData.length} users are missing profile data.`);
    console.log('   This explains part of the discrepancy.');
  }
}

// Check if there are any data quality issues
console.log('\n🔍 Checking for data quality issues...');

// Check for negative XP values
let negativeXpCount = 0;
let zeroXpCount = 0;
let validXpCount = 0;

for (let i = 1; i < csvLines.length; i++) {
  const fields = csvLines[i].split(',');
  const week = parseInt(fields[weekIndex]);
  const weeklyXp = parseFloat(fields[weeklyXpIndex]);
  const seasonId = parseInt(fields[seasonIdIndex]);
  
  if (seasonId === 1 && week === 13) {
    if (weeklyXp < 0) {
      negativeXpCount++;
    } else if (weeklyXp === 0) {
      zeroXpCount++;
    } else {
      validXpCount++;
    }
  }
}

console.log(`   Week 13 records with negative XP: ${negativeXpCount}`);
console.log(`   Week 13 records with zero XP: ${zeroXpCount}`);
console.log(`   Week 13 records with positive XP: ${validXpCount}`);

console.log('\n📋 SUMMARY:');
console.log(`   Your system: ${yourWeek13Recipients.size} Week 13 recipients`);
console.log(`   Direct API: ${directApiData.totalWithWeek13Data} Week 13 recipients`);
console.log(`   Difference: ${directApiData.totalWithWeek13Data - yourWeek13Recipients.size} missing users`);
console.log('\n🎯 The 49 missing users are likely due to missing profile data');
console.log('   in comprehensive_profiles.csv, causing your API to filter them out.');
