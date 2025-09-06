// Background job scheduler for automatic data fetching
// This module only works on the server side

let cron;
let isServerSide = false;

// Check if we're on the server side
if (typeof window === 'undefined') {
  cron = require('node-cron');
  isServerSide = true;
}

import { updateUserCache, updateStatsCache, updateActivitiesCache } from './cache.js';
import { getAllActiveUsers, fetchBulkUserStats, fetchBulkActivities } from './ethos.js';

class DataScheduler {
  constructor() {
    this.isRunning = false;
    this.jobs = new Map();
  }

  // Initialize all scheduled jobs
  async start() {
    if (!isServerSide || !cron) {
      console.log('📅 Scheduler can only run on server side');
      return;
    }

    if (this.isRunning) {
      console.log('📅 Scheduler already running');
      return;
    }

    console.log('📅 Starting data scheduler...');
    this.isRunning = true;

    // Schedule user data updates every 2 hours
    const userDataJob = cron.schedule('0 */2 * * *', async () => {
      console.log('🔄 Starting scheduled user data update...');
      await this.updateUserData();
    }, {
      scheduled: false,
      timezone: 'UTC'
    });

    // Schedule stats updates every 2 hours (offset by 1 hour)
    const statsJob = cron.schedule('0 1-23/2 * * *', async () => {
      console.log('📊 Starting scheduled stats update...');
      await this.updateStatsData();
    }, {
      scheduled: false,
      timezone: 'UTC'
    });

    // Schedule activities updates every hour
    const activitiesJob = cron.schedule('30 * * * *', async () => {
      console.log('📋 Starting scheduled activities update...');
      await this.updateActivitiesData();
    }, {
      scheduled: false,
      timezone: 'UTC'
    });

    this.jobs.set('userData', userDataJob);
    this.jobs.set('stats', statsJob);
    this.jobs.set('activities', activitiesJob);

    // Start all jobs
    userDataJob.start();
    statsJob.start();
    activitiesJob.start();

    console.log('✅ All scheduled jobs started');

    // Run initial data fetch
    await this.runInitialFetch();
  }

  // Stop all scheduled jobs
  stop() {
    console.log('🛑 Stopping scheduler...');
    this.jobs.forEach((job, name) => {
      job.stop();
      console.log(`✅ Stopped ${name} job`);
    });
    this.jobs.clear();
    this.isRunning = false;
  }

  // Update user data cache
  async updateUserData() {
    try {
      console.log('🔄 Fetching fresh user data...');
      const users = await getAllActiveUsers();
      
      for (const user of users) {
        await updateUserCache(user.profileId, user);
      }
      
      console.log(`✅ Updated cache for ${users.length} users`);
    } catch (error) {
      console.error('❌ Error updating user data:', error);
    }
  }

  // Update stats data cache
  async updateStatsData() {
    try {
      console.log('📊 Fetching fresh stats data...');
      const stats = await fetchBulkUserStats();
      
      for (const [profileId, userStats] of Object.entries(stats)) {
        await updateStatsCache(profileId, userStats);
      }
      
      console.log(`✅ Updated stats cache for ${Object.keys(stats).length} users`);
    } catch (error) {
      console.error('❌ Error updating stats data:', error);
    }
  }

  // Update activities data cache
  async updateActivitiesData() {
    try {
      console.log('📋 Fetching fresh activities data...');
      const activities = await fetchBulkActivities();
      
      for (const [profileId, userActivities] of Object.entries(activities)) {
        await updateActivitiesCache(profileId, userActivities);
      }
      
      console.log(`✅ Updated activities cache for ${Object.keys(activities).length} users`);
    } catch (error) {
      console.error('❌ Error updating activities data:', error);
    }
  }

  // Run initial data fetch on startup
  async runInitialFetch() {
    console.log('🚀 Running initial data fetch...');
    
    try {
      await Promise.all([
        this.updateUserData(),
        this.updateStatsData(),
        this.updateActivitiesData()
      ]);
      console.log('✅ Initial data fetch completed');
    } catch (error) {
      console.error('❌ Error during initial fetch:', error);
    }
  }

  // Get job status
  getStatus() {
    return {
      isRunning: this.isRunning,
      jobs: Array.from(this.jobs.keys()),
      nextRuns: Array.from(this.jobs.entries()).map(([name, job]) => ({
        name,
        nextRun: job.getStatus ? job.getStatus() : 'Scheduled but status unknown'
      }))
    };
  }
}

// Singleton instance
const scheduler = new DataScheduler();

export default scheduler;
