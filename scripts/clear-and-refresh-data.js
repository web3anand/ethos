import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧹 Starting comprehensive data cleanup and refresh...');

// Clear all cache files
const cacheFiles = [
  'data/comprehensive-xp-stats.json',
  'data/weekly-xp-data.json',
  'data/weekly-xp-fetch-stats.json',
  'data/xp-fetch-first-100-stats.json',
  'data/xp-fetch-stats.json',
  'data/xp-profiles-data.json',
  'data/xp-profiles-first-100.json'
];

console.log('🗑️ Clearing cache files...');
cacheFiles.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    console.log(`✅ Deleted ${file}`);
  } else {
    console.log(`⚠️  ${file} not found`);
  }
});

// Clear .next build cache
const nextDir = path.join(__dirname, '..', '.next');
if (fs.existsSync(nextDir)) {
  console.log('🗑️ Clearing .next build cache...');
  fs.rmSync(nextDir, { recursive: true, force: true });
  console.log('✅ Cleared .next directory');
}

console.log('✅ Cache files and build directory cleared successfully!');
console.log('🎉 Data cleanup complete!');
console.log('📝 Next steps:');
console.log('1. Restart your development server (npm run dev)');
console.log('2. Visit the distribution page to trigger fresh data fetch');
console.log('3. The APIs will now fetch fresh data from the CSV files');

console.log('🔄 Data cleanup and refresh process initiated...');
