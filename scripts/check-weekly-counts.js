import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Checking weekly XP counts in current data...\n');

try {
  // Read the comprehensive weekly XP data
  const csvPath = path.join(__dirname, '..', 'data', 'csv', 'comprehensive_weekly_xp.csv');
  const data = fs.readFileSync(csvPath, 'utf8');
  const lines = data.split('\n').slice(1).filter(line => line.trim());
  
  console.log(`📊 Total records in CSV: ${lines.length}`);
  
  // Count users with XP > 0 for each week
  const weekCounts = {};
  const weekXpTotals = {};
  
  lines.forEach(line => {
    const [profile_id, season_id, week, weekly_xp, cumulative_xp] = line.split(',');
    const xp = parseInt(weekly_xp) || 0;
    
    if (xp > 0) {
      weekCounts[week] = (weekCounts[week] || 0) + 1;
      weekXpTotals[week] = (weekXpTotals[week] || 0) + xp;
    }
  });
  
  console.log('\n📈 Users with XP > 0 by week:');
  console.log('================================');
  Object.keys(weekCounts)
    .sort((a, b) => parseInt(a) - parseInt(b))
    .forEach(week => {
      const count = weekCounts[week];
      const totalXp = weekXpTotals[week];
      console.log(`Week ${week}: ${count} users (${totalXp.toLocaleString()} XP)`);
    });
  
  console.log('\n🎯 Target vs Current:');
  console.log('====================');
  console.log(`Week 12: Target 1998, Current ${weekCounts['12'] || 0}, Missing ${1998 - (weekCounts['12'] || 0)}`);
  console.log(`Week 13: Target 2498, Current ${weekCounts['13'] || 0}, Missing ${2498 - (weekCounts['13'] || 0)}`);
  
} catch (error) {
  console.error('❌ Error:', error.message);
}
