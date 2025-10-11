import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Double-checking weekly XP counts...\n');

try {
  // Read the comprehensive weekly XP data
  const csvPath = path.join(__dirname, '..', 'data', 'csv', 'comprehensive_weekly_xp.csv');
  const data = fs.readFileSync(csvPath, 'utf8');
  const lines = data.split('\n').slice(1).filter(line => line.trim());
  
  console.log(`📊 Total records in CSV: ${lines.length}`);
  
  // Different counting methods
  const method1 = {}; // Count unique profiles with XP > 0
  const method2 = {}; // Count all records with XP > 0 (including duplicates)
  const method3 = {}; // Count unique profiles regardless of XP
  const method4 = {}; // Count profiles with XP >= 0 (including 0 XP)
  
  const uniqueProfiles = new Set();
  
  lines.forEach(line => {
    const [profile_id, season_id, week, weekly_xp, cumulative_xp] = line.split(',');
    const xp = parseInt(weekly_xp) || 0;
    const profileId = profile_id;
    
    uniqueProfiles.add(profileId);
    
    // Method 1: Unique profiles with XP > 0
    if (xp > 0) {
      if (!method1[week]) method1[week] = new Set();
      method1[week].add(profileId);
    }
    
    // Method 2: All records with XP > 0
    if (xp > 0) {
      method2[week] = (method2[week] || 0) + 1;
    }
    
    // Method 3: All unique profiles (regardless of XP)
    if (!method3[week]) method3[week] = new Set();
    method3[week].add(profileId);
    
    // Method 4: Unique profiles with XP >= 0
    if (xp >= 0) {
      if (!method4[week]) method4[week] = new Set();
      method4[week].add(profileId);
    }
  });
  
  console.log(`📊 Total unique profiles in CSV: ${uniqueProfiles.size}\n`);
  
  console.log('📈 Counting results by different methods:');
  console.log('==========================================');
  
  const weeks = Object.keys(method1).sort((a, b) => parseInt(a) - parseInt(b));
  
  weeks.forEach(week => {
    const count1 = method1[week] ? method1[week].size : 0;
    const count2 = method2[week] || 0;
    const count3 = method3[week] ? method3[week].size : 0;
    const count4 = method4[week] ? method4[week].size : 0;
    
    console.log(`Week ${week}:`);
    console.log(`  Method 1 (unique profiles with XP > 0): ${count1}`);
    console.log(`  Method 2 (all records with XP > 0): ${count2}`);
    console.log(`  Method 3 (all unique profiles): ${count3}`);
    console.log(`  Method 4 (unique profiles with XP >= 0): ${count4}`);
    console.log('');
  });
  
  // Focus on Week 12 and 13
  console.log('🎯 Week 12 and 13 Analysis:');
  console.log('============================');
  
  const week12Count = method1['12'] ? method1['12'].size : 0;
  const week13Count = method1['13'] ? method1['13'].size : 0;
  
  console.log(`Week 12: ${week12Count} unique profiles with XP > 0`);
  console.log(`Week 13: ${week13Count} unique profiles with XP > 0`);
  
  console.log('\n🔍 Sample Week 12 profiles:');
  if (method1['12']) {
    const week12Profiles = Array.from(method1['12']).slice(0, 10);
    week12Profiles.forEach(profileId => {
      const profileLines = lines.filter(line => {
        const [pid, season_id, week, weekly_xp] = line.split(',');
        return pid === profileId && week === '12' && parseInt(weekly_xp) > 0;
      });
      
      if (profileLines.length > 0) {
        const [profile_id, season_id, week, weekly_xp, cumulative_xp] = profileLines[0].split(',');
        console.log(`  Profile ${profileId}: ${weekly_xp} XP (cumulative: ${cumulative_xp})`);
      }
    });
  }
  
  console.log('\n🔍 Sample Week 13 profiles:');
  if (method1['13']) {
    const week13Profiles = Array.from(method1['13']).slice(0, 10);
    week13Profiles.forEach(profileId => {
      const profileLines = lines.filter(line => {
        const [pid, season_id, week, weekly_xp] = line.split(',');
        return pid === profileId && week === '13' && parseInt(weekly_xp) > 0;
      });
      
      if (profileLines.length > 0) {
        const [profile_id, season_id, week, weekly_xp, cumulative_xp] = profileLines[0].split(',');
        console.log(`  Profile ${profileId}: ${weekly_xp} XP (cumulative: ${cumulative_xp})`);
      }
    });
  }
  
} catch (error) {
  console.error('❌ Error:', error.message);
}
