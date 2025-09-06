import { dataCollector } from '../utils/dataCollector.js';

// Auto-refresh scheduler that runs every 30 minutes to check for stale data
class RefreshScheduler {
  constructor() {
    this.intervalId = null;
    this.running = false;
  }

  start() {
    if (this.running) {
      console.log('⚠️ Refresh scheduler already running');
      return;
    }

    console.log('🔄 Starting auto-refresh scheduler (checks every 30 minutes)');
    this.running = true;
    
    // Run immediately on start
    this.runRefresh();
    
    // Then run every 30 minutes
    this.intervalId = setInterval(() => {
      this.runRefresh();
    }, 30 * 60 * 1000); // 30 minutes
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.running = false;
    console.log('⏹️ Auto-refresh scheduler stopped');
  }

  async runRefresh() {
    try {
      console.log(`🔄 Auto-refresh check started at ${new Date().toLocaleString()}`);
      await dataCollector.refreshStaleData();
      console.log(`✅ Auto-refresh check completed at ${new Date().toLocaleString()}`);
    } catch (error) {
      console.error('❌ Auto-refresh failed:', error);
    }
  }
}

// Create singleton instance
export const refreshScheduler = new RefreshScheduler();
export default RefreshScheduler;
