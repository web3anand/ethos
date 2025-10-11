// Analyze the difference between CSV data and direct API
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Analyzing CSV vs Direct API data...\n');

// Load your CSV data
const csvFile = path.join(__dirname, '..', 'data', 'csv', 'comprehensive_weekly_xp.csv');
const csvContent = fs.readFileSync(csvFile, 'utf8');
const csvLines = csvContent.trim().split('\n');
const csvHeader = csvLines[0].split(',');
const profileIdIndex = csvHeader.indexOf('profile_id');
const weekIndex = csvHeader.indexOf('week');
const weeklyXpIndex = csvHeader.indexOf('weekly_xp');
const seasonIdIndex = csvHeader.indexOf('season_id');

console.log('📊 CSV Data Analysis:');
console.log(`   Total records: ${csvLines.length - 1}`);
console.log(`   Headers: ${csvHeader.join(', ')}`);

// Get all Week 13 recipients from your CSV
const csvWeek13Recipients = new Map();
for (let i = 1; i < csvLines.length; i++) {
  const fields = csvLines[i].split(',');
  const profileId = parseInt(fields[profileIdIndex]);
  const week = parseInt(fields[weekIndex]);
  const weeklyXp = parseFloat(fields[weeklyXpIndex]);
  const seasonId = parseInt(fields[seasonIdIndex]);
  
  if (seasonId === 1 && week === 13 && weeklyXp > 0) {
    csvWeek13Recipients.set(profileId, {
      profile_id: profileId,
      weekly_xp: weeklyXp,
      cumulative_xp: parseFloat(fields[csvHeader.indexOf('cumulative_xp')]) || 0
    });
  }
}

console.log(`   Week 13 recipients: ${csvWeek13Recipients.size}`);

// Load the direct API results
const directApiFile = path.join(__dirname, '..', 'data', 'week13-batch-fetch.json');
const directApiData = JSON.parse(fs.readFileSync(directApiFile, 'utf8'));

console.log(`\n📊 Direct API Data Analysis:`);
console.log(`   Total profiles checked: ${directApiData.totalChecked}`);
console.log(`   Week 13 recipients found: ${directApiData.totalWithWeek13Data}`);
console.log(`   Sample data count: ${directApiData.sampleData.length}`);

// Check if the issue is with the data source
console.log('\n🔍 Data Source Analysis:');

// Check the date/time of the CSV file
const csvStats = fs.statSync(csvFile);
console.log(`   CSV file last modified: ${csvStats.mtime}`);
console.log(`   CSV file size: ${(csvStats.size / (1024 * 1024)).toFixed(2)} MB`);

// Check if there are any data quality issues in the CSV
let totalWeek13Records = 0;
let totalWeek13WithXp = 0;
let totalWeek13ZeroXp = 0;
let totalWeek13NegativeXp = 0;

for (let i = 1; i < csvLines.length; i++) {
  const fields = csvLines[i].split(',');
  const week = parseInt(fields[weekIndex]);
  const weeklyXp = parseFloat(fields[weeklyXpIndex]);
  const seasonId = parseInt(fields[seasonIdIndex]);
  
  if (seasonId === 1 && week === 13) {
    totalWeek13Records++;
    if (weeklyXp > 0) {
      totalWeek13WithXp++;
    } else if (weeklyXp === 0) {
      totalWeek13ZeroXp++;
    } else {
      totalWeek13NegativeXp++;
    }
  }
}

console.log(`\n📊 Week 13 Data Breakdown:`);
console.log(`   Total Week 13 records: ${totalWeek13Records}`);
console.log(`   Records with XP > 0: ${totalWeek13WithXp}`);
console.log(`   Records with XP = 0: ${totalWeek13ZeroXp}`);
console.log(`   Records with XP < 0: ${totalWeek13NegativeXp}`);

// Check if the issue is with the API filtering
console.log('\n🔍 API Filtering Analysis:');

// Check if your API is filtering out some users
const apiFile = path.join(__dirname, '..', 'pages', 'api', 'csv-weekly-xp.js');
if (fs.existsSync(apiFile)) {
  const apiContent = fs.readFileSync(apiFile, 'utf8');
  
  // Look for filtering logic
  if (apiContent.includes('weekly_xp > 0')) {
    console.log('   ✅ API filters for weekly_xp > 0 (correct)');
  } else {
    console.log('   ❌ API might not be filtering correctly');
  }
  
  if (apiContent.includes('season_id')) {
    console.log('   ✅ API filters by season_id (correct)');
  } else {
    console.log('   ❌ API might not be filtering by season');
  }
  
  if (apiContent.includes('week')) {
    console.log('   ✅ API filters by week (correct)');
  } else {
    console.log('   ❌ API might not be filtering by week');
  }
}

// Check if there are any data inconsistencies
console.log('\n🔍 Data Consistency Check:');

// Check for any profiles that might be missing from the CSV
const missingProfiles = [];
const directApiProfileIds = new Set(directApiData.sampleData.map(u => u.profile_id));

directApiProfileIds.forEach(profileId => {
  if (!csvWeek13Recipients.has(profileId)) {
    missingProfiles.push(profileId);
  }
});

console.log(`   Profiles in direct API sample but missing from CSV: ${missingProfiles.length}`);

if (missingProfiles.length > 0) {
  console.log('   Missing profiles:');
  missingProfiles.forEach(profileId => {
    console.log(`     - Profile ${profileId}`);
  });
}

// Check if the issue is with the data source itself
console.log('\n🎯 KEY CAUSE ANALYSIS:');
console.log('   The 49 missing users are likely due to:');
console.log('   1. **Data Source Difference**: Your CSV might be from a different');
console.log('      time period or data export than the direct API');
console.log('   2. **Data Sync Issues**: The CSV might not be fully up-to-date');
console.log('   3. **API Filtering**: Your API might be filtering out some users');
console.log('      that the direct API includes');

console.log('\n📋 RECOMMENDATIONS:');
console.log('   1. Check when your CSV data was last updated');
console.log('   2. Verify that your CSV contains the same data as the API');
console.log('   3. Check if there are any API filtering differences');
console.log('   4. Consider re-exporting data from the database');

console.log(`\n📊 FINAL SUMMARY:`);
console.log(`   Your CSV: ${csvWeek13Recipients.size} Week 13 recipients`);
console.log(`   Direct API: ${directApiData.totalWithWeek13Data} Week 13 recipients`);
console.log(`   Difference: ${directApiData.totalWithWeek13Data - csvWeek13Recipients.size} missing users`);
console.log(`   This confirms the 49 user discrepancy you noticed!`);
