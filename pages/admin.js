import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Navbar from '../components/Navbar';
import styles from '../styles/Admin.module.css';

export default function Admin() {
  const [cacheStats, setCacheStats] = useState(null);
  const [schedulerStatus, setSchedulerStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/cache-management');
      const data = await response.json();
      setCacheStats(data.cache);
      setSchedulerStatus(data.scheduler);
    } catch (error) {
      console.error('Failed to fetch status:', error);
      setMessage('Failed to fetch status');
    }
  };

  const executeAction = async (action) => {
    setLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/cache-management', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      
      const data = await response.json();
      setMessage(data.message || `${action} completed`);
      
      // Refresh status after action
      setTimeout(fetchStatus, 1000);
    } catch (error) {
      console.error(`Failed to ${action}:`, error);
      setMessage(`Failed to ${action}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <Head>
        <title>Cache & Scheduler Admin - Ethos Network</title>
        <meta name="description" content="Admin panel for managing data cache and automatic refresh scheduler" />
        <link rel="icon" href="/ethos.png" />
      </Head>
      <Navbar />
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>Data Management Admin</h1>
          <p className={styles.subtitle}>
            Manage automatic data fetching, caching, and background updates
          </p>
        </header>

        {message && (
          <div className={`${styles.message} ${message.includes('Failed') ? styles.error : styles.success}`}>
            {message}
          </div>
        )}

        <div className={styles.grid}>
          {/* Cache Statistics */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Cache Statistics</h2>
            {cacheStats ? (
              <div className={styles.stats}>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>Hit Rate</span>
                  <span className={styles.statValue}>{cacheStats.hitRate}</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>Cache Hits</span>
                  <span className={styles.statValue}>{cacheStats.hits}</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>Cache Misses</span>
                  <span className={styles.statValue}>{cacheStats.misses}</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>Updates</span>
                  <span className={styles.statValue}>{cacheStats.updates}</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>Memory Cache Size</span>
                  <span className={styles.statValue}>{cacheStats.memoryCacheSize}</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>File Cache Size</span>
                  <span className={styles.statValue}>{cacheStats.fileCacheSize}</span>
                </div>
              </div>
            ) : (
              <div className={styles.loading}>Loading cache statistics...</div>
            )}
          </div>

          {/* Scheduler Status */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Scheduler Status</h2>
            {schedulerStatus ? (
              <div className={styles.stats}>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>Status</span>
                  <span className={`${styles.statValue} ${schedulerStatus.isRunning ? styles.running : styles.stopped}`}>
                    {schedulerStatus.isRunning ? 'Running' : 'Stopped'}
                  </span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>Active Jobs</span>
                  <span className={styles.statValue}>{schedulerStatus.jobs?.length || 0}</span>
                </div>
                {schedulerStatus.nextRuns?.map((job, index) => (
                  <div key={index} className={styles.stat}>
                    <span className={styles.statLabel}>{job.name} Next Run</span>
                    <span className={styles.statValue}>
                      {job.nextRun !== 'Not scheduled' 
                        ? new Date(job.nextRun).toLocaleString()
                        : job.nextRun
                      }
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.loading}>Loading scheduler status...</div>
            )}
          </div>

          {/* Cache Actions */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Cache Actions</h2>
            <div className={styles.actions}>
              <button 
                className={styles.button}
                onClick={() => executeAction('clear')}
                disabled={loading}
              >
                Clear All Cache
              </button>
              <button 
                className={styles.button}
                onClick={() => executeAction('force-update')}
                disabled={loading}
              >
                Force Update Now
              </button>
              <button 
                className={styles.button}
                onClick={fetchStatus}
                disabled={loading}
              >
                Refresh Status
              </button>
            </div>
          </div>

          {/* Scheduler Actions */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Scheduler Actions</h2>
            <div className={styles.actions}>
              <button 
                className={`${styles.button} ${styles.success}`}
                onClick={() => executeAction('start-scheduler')}
                disabled={loading || schedulerStatus?.isRunning}
              >
                Start Scheduler
              </button>
              <button 
                className={`${styles.button} ${styles.danger}`}
                onClick={() => executeAction('stop-scheduler')}
                disabled={loading || !schedulerStatus?.isRunning}
              >
                Stop Scheduler
              </button>
            </div>
          </div>
        </div>

        <div className={styles.info}>
          <h3>About Automatic Data Fetching</h3>
          <ul>
            <li>📅 <strong>User Data:</strong> Updated every 2 hours (0:00, 2:00, 4:00, etc.)</li>
            <li>📊 <strong>Stats Data:</strong> Updated every 2 hours (1:00, 3:00, 5:00, etc.)</li>
            <li>📋 <strong>Activities:</strong> Updated every hour at 30 minutes past</li>
            <li>💾 <strong>Cache:</strong> Data is stored both in memory and files for instant access</li>
            <li>⚡ <strong>Performance:</strong> Users see cached data instantly while fresh data updates in background</li>
          </ul>
        </div>
      </div>
    </>
  );
}
