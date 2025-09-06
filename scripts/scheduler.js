import cron from 'node-cron';
import EthosDataSync from './sync-ethos-data.js';

class EthosScheduler {
  constructor() {
    this.dataSync = new EthosDataSync();
    this.jobs = new Map();
  }

  // Schedule regular full data sync (every 6 hours)
  scheduleFullSync() {
    const job = cron.schedule('0 */6 * * *', async () => {
      console.log('⏰ Scheduled full sync starting...');
      await this.dataSync.fullSync();
    }, {
      scheduled: false,
      timezone: "America/New_York"
    });

    this.jobs.set('fullSync', job);
    job.start();
    console.log('📅 Full sync scheduled: Every 6 hours');
  }

  // Schedule ETH price updates (every 15 minutes)
  scheduleEthPriceSync() {
    const job = cron.schedule('*/15 * * * *', async () => {
      console.log('💰 Updating ETH price...');
      await this.dataSync.syncEthPrice();
    }, {
      scheduled: false,
      timezone: "America/New_York"
    });

    this.jobs.set('ethPrice', job);
    job.start();
    console.log('📅 ETH price sync scheduled: Every 15 minutes');
  }

  // Schedule profile sync (every 2 hours)
  scheduleProfileSync() {
    const job = cron.schedule('0 */2 * * *', async () => {
      console.log('👥 Updating profile data...');
      await this.dataSync.syncProfiles();
    }, {
      scheduled: false,
      timezone: "America/New_York"
    });

    this.jobs.set('profiles', job);
    job.start();
    console.log('📅 Profile sync scheduled: Every 2 hours');
  }

  // Start all scheduled jobs
  startAllJobs() {
    console.log('🚀 Starting Ethos Data Scheduler...');
    
    this.scheduleFullSync();
    this.scheduleEthPriceSync();
    this.scheduleProfileSync();

    // Run initial sync
    console.log('🔄 Running initial data sync...');
    this.dataSync.fullSync();

    console.log('✅ All sync jobs scheduled and running');
  }

  // Stop all jobs
  stopAllJobs() {
    for (const [name, job] of this.jobs.entries()) {
      job.stop();
      console.log(`⏹️ Stopped ${name} job`);
    }
    this.jobs.clear();
    this.dataSync.close();
  }

  // Get status of all jobs
  getStatus() {
    const jobStatus = {};
    for (const [name, job] of this.jobs.entries()) {
      jobStatus[name] = {
        running: job.running || false,
        scheduled: job.scheduled || false
      };
    }

    return {
      jobs: jobStatus,
      syncStatus: this.dataSync.getSyncStatus()
    };
  }

  // Manual sync trigger
  async triggerSync(type = 'full') {
    switch (type) {
      case 'full':
        return await this.dataSync.fullSync();
      case 'profiles':
        return await this.dataSync.syncProfiles();
      case 'r4r':
        return await this.dataSync.syncR4RAnalysis();
      case 'eth-price':
        return await this.dataSync.syncEthPrice();
      default:
        throw new Error(`Unknown sync type: ${type}`);
    }
  }
}

// CLI interface for the scheduler
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const scheduler = new EthosScheduler();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'start':
      scheduler.startAllJobs();
      
      // Keep the process running
      process.on('SIGINT', () => {
        console.log('\\n🛑 Shutting down scheduler...');
        scheduler.stopAllJobs();
        process.exit(0);
      });
      
      // Keep alive
      setInterval(() => {
        // Just keep the process running
      }, 60000);
      break;
      
    case 'sync':
      const syncType = process.argv[3] || 'full';
      scheduler.triggerSync(syncType).then(() => {
        console.log(`✅ ${syncType} sync completed`);
        scheduler.dataSync.close();
        process.exit(0);
      }).catch(error => {
        console.error(`❌ ${syncType} sync failed:`, error);
        scheduler.dataSync.close();
        process.exit(1);
      });
      break;
      
    case 'status':
      const status = scheduler.getStatus();
      console.log('📊 Scheduler Status:', JSON.stringify(status, null, 2));
      scheduler.dataSync.close();
      break;
      
    default:
      console.log('Usage:');
      console.log('  node scripts/scheduler.js start      # Start all scheduled jobs');
      console.log('  node scripts/scheduler.js sync [type] # Run manual sync (full|profiles|r4r|eth-price)');
      console.log('  node scripts/scheduler.js status     # Show scheduler status');
      process.exit(1);
  }
}

export default EthosScheduler;
