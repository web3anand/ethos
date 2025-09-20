// Backup Manager for Ethos Data
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG = {
  DATA_DIR: path.join(__dirname, '..', 'data', 'csv'),
  BACKUP_DIR: path.join(__dirname, '..', 'data', 'backups'),
  MAX_BACKUPS: 10, // Keep last 10 backups
  BACKUP_FILES: [
    'comprehensive_profiles.csv',
    'comprehensive_weekly_xp.csv',
    'season_weeks.csv'
  ]
};

export class BackupManager {
  constructor() {
    this.ensureBackupDir();
  }

  ensureBackupDir() {
    if (!fs.existsSync(CONFIG.BACKUP_DIR)) {
      fs.mkdirSync(CONFIG.BACKUP_DIR, { recursive: true });
      console.log(`📁 Created backup directory: ${CONFIG.BACKUP_DIR}`);
    }
  }

  createBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupPath = path.join(CONFIG.BACKUP_DIR, `backup-${timestamp}`);
    
    if (!fs.existsSync(backupPath)) {
      fs.mkdirSync(backupPath, { recursive: true });
    }

    const backupStats = {
      timestamp,
      files: [],
      totalSize: 0
    };

    console.log(`🔄 Creating backup: ${timestamp}`);

    for (const file of CONFIG.BACKUP_FILES) {
      const sourcePath = path.join(CONFIG.DATA_DIR, file);
      const backupFilePath = path.join(backupPath, file);

      if (fs.existsSync(sourcePath)) {
        try {
          fs.copyFileSync(sourcePath, backupFilePath);
          const stats = fs.statSync(backupFilePath);
          
          backupStats.files.push({
            name: file,
            size: stats.size,
            status: 'success'
          });
          backupStats.totalSize += stats.size;
          
          console.log(`✅ Backed up ${file} (${this.formatBytes(stats.size)})`);
        } catch (error) {
          console.error(`❌ Failed to backup ${file}:`, error.message);
          backupStats.files.push({
            name: file,
            size: 0,
            status: 'error',
            error: error.message
          });
        }
      } else {
        console.warn(`⚠️  Source file not found: ${file}`);
        backupStats.files.push({
          name: file,
          size: 0,
          status: 'not_found'
        });
      }
    }

    // Save backup metadata
    const metadataPath = path.join(backupPath, 'backup-metadata.json');
    fs.writeFileSync(metadataPath, JSON.stringify(backupStats, null, 2));

    // Clean up old backups
    this.cleanupOldBackups();

    console.log(`✅ Backup completed: ${this.formatBytes(backupStats.totalSize)} total`);
    return backupStats;
  }

  cleanupOldBackups() {
    try {
      const backups = fs.readdirSync(CONFIG.BACKUP_DIR)
        .filter(name => name.startsWith('backup-'))
        .map(name => {
          const fullPath = path.join(CONFIG.BACKUP_DIR, name);
          const stats = fs.statSync(fullPath);
          return {
            name,
            path: fullPath,
            created: stats.birthtime
          };
        })
        .sort((a, b) => b.created - a.created);

      if (backups.length > CONFIG.MAX_BACKUPS) {
        const toDelete = backups.slice(CONFIG.MAX_BACKUPS);
        for (const backup of toDelete) {
          fs.rmSync(backup.path, { recursive: true, force: true });
          console.log(`🗑️  Deleted old backup: ${backup.name}`);
        }
      }
    } catch (error) {
      console.error('❌ Error cleaning up old backups:', error.message);
    }
  }

  restoreBackup(backupName) {
    const backupPath = path.join(CONFIG.BACKUP_DIR, backupName);
    
    if (!fs.existsSync(backupPath)) {
      throw new Error(`Backup not found: ${backupName}`);
    }

    console.log(`🔄 Restoring backup: ${backupName}`);

    const metadataPath = path.join(backupPath, 'backup-metadata.json');
    let metadata = null;
    
    if (fs.existsSync(metadataPath)) {
      metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    }

    const restoreStats = {
      timestamp: new Date().toISOString(),
      restored: [],
      errors: []
    };

    for (const file of CONFIG.BACKUP_FILES) {
      const backupFilePath = path.join(backupPath, file);
      const targetPath = path.join(CONFIG.DATA_DIR, file);

      if (fs.existsSync(backupFilePath)) {
        try {
          // Create target directory if it doesn't exist
          const targetDir = path.dirname(targetPath);
          if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
          }

          fs.copyFileSync(backupFilePath, targetPath);
          const stats = fs.statSync(targetPath);
          
          restoreStats.restored.push({
            name: file,
            size: stats.size
          });
          
          console.log(`✅ Restored ${file} (${this.formatBytes(stats.size)})`);
        } catch (error) {
          console.error(`❌ Failed to restore ${file}:`, error.message);
          restoreStats.errors.push({
            name: file,
            error: error.message
          });
        }
      } else {
        console.warn(`⚠️  Backup file not found: ${file}`);
        restoreStats.errors.push({
          name: file,
          error: 'File not found in backup'
        });
      }
    }

    console.log(`✅ Restore completed: ${restoreStats.restored.length} files restored`);
    return restoreStats;
  }

  listBackups() {
    try {
      const backups = fs.readdirSync(CONFIG.BACKUP_DIR)
        .filter(name => name.startsWith('backup-'))
        .map(name => {
          const fullPath = path.join(CONFIG.BACKUP_DIR, name);
          const stats = fs.statSync(fullPath);
          const metadataPath = path.join(fullPath, 'backup-metadata.json');
          
          let metadata = null;
          if (fs.existsSync(metadataPath)) {
            metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
          }

          return {
            name,
            created: stats.birthtime,
            size: this.getDirSize(fullPath),
            metadata
          };
        })
        .sort((a, b) => b.created - a.created);

      return backups;
    } catch (error) {
      console.error('❌ Error listing backups:', error.message);
      return [];
    }
  }

  getDirSize(dirPath) {
    try {
      let totalSize = 0;
      const files = fs.readdirSync(dirPath);
      
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isDirectory()) {
          totalSize += this.getDirSize(filePath);
        } else {
          totalSize += stats.size;
        }
      }
      
      return totalSize;
    } catch (error) {
      return 0;
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];
  const backupManager = new BackupManager();

  switch (command) {
    case 'create':
      backupManager.createBackup();
      break;
      
    case 'list':
      const backups = backupManager.listBackups();
      console.log('\n📋 Available Backups:');
      backups.forEach((backup, index) => {
        console.log(`${index + 1}. ${backup.name}`);
        console.log(`   Created: ${backup.created.toISOString()}`);
        console.log(`   Size: ${backupManager.formatBytes(backup.size)}`);
        if (backup.metadata) {
          console.log(`   Files: ${backup.metadata.files.length}`);
        }
        console.log('');
      });
      break;
      
    case 'restore':
      const backupName = process.argv[3];
      if (!backupName) {
        console.error('❌ Please specify backup name');
        process.exit(1);
      }
      try {
        backupManager.restoreBackup(backupName);
      } catch (error) {
        console.error('❌ Restore failed:', error.message);
        process.exit(1);
      }
      break;
      
    default:
      console.log('Usage: node backup-manager.js <command>');
      console.log('Commands:');
      console.log('  create  - Create a new backup');
      console.log('  list    - List all backups');
      console.log('  restore <name> - Restore a specific backup');
      break;
  }
}
