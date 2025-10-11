import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '..', 'database', 'ethos.db');
const db = new Database(dbPath);

console.log('🔍 Checking database schema...');

// Get table info
const tableInfo = db.prepare("PRAGMA table_info(comprehensive_users)").all();
console.log('📋 Table columns:');
tableInfo.forEach(column => {
  console.log(`  - ${column.name} (${column.type})`);
});

// Check if streak column exists
const hasStreak = tableInfo.some(col => col.name === 'streak');
console.log(`\n🎯 Streak column exists: ${hasStreak}`);

if (!hasStreak) {
  console.log('➕ Adding streak column...');
  try {
    db.prepare('ALTER TABLE comprehensive_users ADD COLUMN streak INTEGER DEFAULT 0').run();
    console.log('✅ Streak column added successfully');
  } catch (error) {
    console.error('❌ Error adding streak column:', error.message);
  }
}

// Show sample data
console.log('\n📊 Sample data:');
const sample = db.prepare('SELECT profile_id, username, score, xp, streak FROM comprehensive_users LIMIT 3').all();
sample.forEach(row => {
  console.log(`  ID ${row.profile_id}: ${row.username || 'No username'} - Score: ${row.score}, XP: ${row.xp}, Streak: ${row.streak || 0}`);
});

db.close();
