// Startup script to initialize the background data scheduler
import scheduler from '../lib/scheduler.js';

let isInitialized = false;

export async function initializeDataScheduler() {
  if (isInitialized) {
    console.log('📅 Data scheduler already initialized');
    return;
  }

  try {
    console.log('🚀 Initializing data scheduler...');
    await scheduler.start();
    isInitialized = true;
    console.log('✅ Data scheduler initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize data scheduler:', error);
    throw error;
  }
}

export function getSchedulerStatus() {
  return {
    initialized: isInitialized,
    status: scheduler.getStatus()
  };
}

// Auto-initialize on import (only in production)
if (process.env.NODE_ENV === 'production') {
  initializeDataScheduler().catch(console.error);
}
