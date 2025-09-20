// Monitor the progress of the Week 13 batch fetch
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOG_FILE = path.join(__dirname, '..', 'data', 'week13-batch-fetch.log');
const OUTPUT_FILE = path.join(__dirname, '..', 'data', 'week13-batch-fetch.json');

function monitorProgress() {
  console.log('🔍 Monitoring Week 13 batch fetch progress...\n');
  
  // Check if log file exists
  if (!fs.existsSync(LOG_FILE)) {
    console.log('❌ Log file not found. Script may not have started yet.');
    return;
  }
  
  // Read log file
  const logContent = fs.readFileSync(LOG_FILE, 'utf8');
  const logLines = logContent.trim().split('\n').filter(line => line);
  
  if (logLines.length === 0) {
    console.log('📝 Log file is empty. Script may be starting...');
    return;
  }
  
  // Get latest log entry
  const latestLog = JSON.parse(logLines[logLines.length - 1]);
  
  console.log('📊 CURRENT STATUS:');
  console.log(`   Total profiles checked: ${latestLog.totalChecked?.toLocaleString() || 'N/A'}`);
  console.log(`   Week 13 recipients found: ${latestLog.totalWithWeek13Data?.toLocaleString() || 'N/A'}`);
  console.log(`   Last checked profile ID: ${latestLog.lastCheckedProfileId?.toLocaleString() || 'N/A'}`);
  console.log(`   Last found profile ID: ${latestLog.lastFoundProfileId?.toLocaleString() || 'N/A'}`);
  console.log(`   Consecutive empty: ${latestLog.consecutiveEmpty?.toLocaleString() || 'N/A'}`);
  console.log(`   Total errors: ${latestLog.errors || 'N/A'}`);
  console.log(`   Batches processed: ${latestLog.batches || 'N/A'}`);
  console.log(`   Last update: ${latestLog.timestamp || 'N/A'}`);
  
  // Check if results file exists
  if (fs.existsSync(OUTPUT_FILE)) {
    console.log('\n📄 Results file found!');
    const results = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'));
    
    console.log('\n📋 SAMPLE RECIPIENTS:');
    if (results.sampleData && results.sampleData.length > 0) {
      results.sampleData.slice(0, 10).forEach((user, index) => {
        console.log(`   ${index + 1}. Profile ${user.profile_id}: ${user.weekly_xp?.toLocaleString() || 'N/A'} XP`);
      });
    }
    
    console.log('\n📦 RECENT BATCHES:');
    if (results.batches && results.batches.length > 0) {
      results.batches.slice(-5).forEach((batch, index) => {
        console.log(`   Batch ${results.batches.length - 4 + index}: profiles ${batch.batchStart}-${batch.batchEnd} = ${batch.validResults} users`);
      });
    }
  }
  
  console.log('\n⏱️  Script is running in the background...');
  console.log('   Run this monitor script again to check progress.');
}

monitorProgress();
