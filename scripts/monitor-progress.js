// Simple progress monitor for the batch script
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_FILE = path.join(__dirname, '..', 'data', 'week13-batch-fetch.json');
const LOG_FILE = path.join(__dirname, '..', 'data', 'week13-batch-fetch.log');

console.log('🔍 Monitoring Week 13 batch fetch progress...\n');

// Check if files exist
if (fs.existsSync(OUTPUT_FILE)) {
  const stats = fs.statSync(OUTPUT_FILE);
  console.log(`✅ Output file found (${(stats.size / 1024).toFixed(2)} KB)`);
  
  try {
    const data = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'));
    console.log(`📊 Progress:`);
    console.log(`   Profiles checked: ${data.totalChecked || 0}`);
    console.log(`   Week 13 recipients: ${data.totalWithWeek13Data || 0}`);
    console.log(`   Last profile ID: ${data.lastCheckedProfileId || 0}`);
    console.log(`   Consecutive empty: ${data.consecutiveEmpty || 0}/3000`);
    console.log(`   Errors: ${data.errors?.length || 0}`);
    console.log(`   Batches processed: ${data.batches?.length || 0}`);
    
    if (data.sampleData && data.sampleData.length > 0) {
      console.log(`\n🎯 Sample Week 13 recipients:`);
      data.sampleData.slice(0, 5).forEach((user, i) => {
        console.log(`   ${i + 1}. Profile ${user.profile_id}: ${user.weekly_xp.toLocaleString()} XP`);
      });
    }
  } catch (error) {
    console.log(`❌ Error reading output file: ${error.message}`);
  }
} else {
  console.log('⏳ Output file not created yet - script is starting up...');
}

if (fs.existsSync(LOG_FILE)) {
  const stats = fs.statSync(LOG_FILE);
  console.log(`\n📝 Log file found (${(stats.size / 1024).toFixed(2)} KB)`);
} else {
  console.log('\n⏳ Log file not created yet - script is starting up...');
}

console.log('\n⚡ Current configuration:');
console.log('   - 500 profiles per batch');
console.log('   - 100 concurrent requests');
console.log('   - 10ms delay between requests');
console.log('   - 1000ms delay between batches');
console.log('   - Stop after 3000 consecutive empty profiles');
console.log('\n🎯 This should be much faster now with the X-Ethos-Client header!');
