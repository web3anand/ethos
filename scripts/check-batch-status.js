// Check the status of the batch script
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_FILE = path.join(__dirname, '..', 'data', 'week13-batch-fetch.json');
const LOG_FILE = path.join(__dirname, '..', 'data', 'week13-batch-fetch.log');

console.log('🔍 Checking batch script status...\n');

// Check if output file exists
if (fs.existsSync(OUTPUT_FILE)) {
  console.log('✅ Output file found!');
  const stats = fs.statSync(OUTPUT_FILE);
  console.log(`   File size: ${(stats.size / 1024).toFixed(2)} KB`);
  console.log(`   Last modified: ${stats.mtime}`);
  
  try {
    const data = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'));
    console.log(`   Total profiles checked: ${data.totalChecked || 'N/A'}`);
    console.log(`   Week 13 recipients: ${data.totalWithWeek13Data || 'N/A'}`);
    console.log(`   Last checked profile ID: ${data.lastCheckedProfileId || 'N/A'}`);
    console.log(`   Consecutive empty: ${data.consecutiveEmpty || 'N/A'}`);
    console.log(`   Errors: ${data.errors?.length || 'N/A'}`);
    console.log(`   Batches processed: ${data.batches?.length || 'N/A'}`);
  } catch (error) {
    console.log(`   Error reading file: ${error.message}`);
  }
} else {
  console.log('❌ Output file not found');
}

// Check if log file exists
if (fs.existsSync(LOG_FILE)) {
  console.log('\n✅ Log file found!');
  const stats = fs.statSync(LOG_FILE);
  console.log(`   File size: ${(stats.size / 1024).toFixed(2)} KB`);
  console.log(`   Last modified: ${stats.mtime}`);
  
  try {
    const content = fs.readFileSync(LOG_FILE, 'utf8');
    const lines = content.trim().split('\n').filter(line => line);
    console.log(`   Log entries: ${lines.length}`);
    
    if (lines.length > 0) {
      const latest = JSON.parse(lines[lines.length - 1]);
      console.log(`   Latest entry: ${latest.timestamp}`);
      console.log(`   Latest stats: ${JSON.stringify(latest, null, 2)}`);
    }
  } catch (error) {
    console.log(`   Error reading log: ${error.message}`);
  }
} else {
  console.log('\n❌ Log file not found');
}

// Check for any week13 files
console.log('\n📁 All week13 files:');
const dataDir = path.join(__dirname, '..', 'data');
const files = fs.readdirSync(dataDir).filter(file => file.includes('week13'));
files.forEach(file => {
  const filePath = path.join(dataDir, file);
  const stats = fs.statSync(filePath);
  console.log(`   ${file}: ${(stats.size / 1024).toFixed(2)} KB (${stats.mtime})`);
});

console.log('\n🎯 The batch script is running with:');
console.log('   - 500 profiles per batch');
console.log('   - 50ms delay between requests');
console.log('   - Sequential processing (no concurrency)');
console.log('   - Stop after 3000 consecutive empty profiles');
console.log('\n⏱️  With 50ms delay, each batch of 500 takes about 25 seconds');
console.log('   This is a long-running process that will take several hours to complete.');
