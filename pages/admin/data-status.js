import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import styles from './data-status.module.css';

export default function DataStatus() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastCheck, setLastCheck] = useState(null);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/fetch-status');
      const data = await response.json();
      setStatus(data);
      setLastCheck(new Date().toLocaleString());
    } catch (error) {
      console.error('Error fetching status:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const triggerUpdate = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/trigger-comprehensive-fetch', {
        method: 'POST'
      });
      const data = await response.json();
      console.log('Update triggered:', data);
    } catch (error) {
      console.error('Error triggering update:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearCache = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/clear-all-cache', {
        method: 'POST'
      });
      const data = await response.json();
      console.log('Cache cleared:', data);
    } catch (error) {
      console.error('Error clearing cache:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !status) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading status...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>Data Status - Ethos Dashboard</title>
      </Head>

      <header className={styles.header}>
        <h1>Data Update System Status</h1>
        <p>Monitor and manage data updates</p>
      </header>

      <div className={styles.controls}>
        <button 
          className={styles.button} 
          onClick={triggerUpdate}
          disabled={loading || status?.isRunning}
        >
          {status?.isRunning ? 'Running...' : 'Trigger Update'}
        </button>
        
        <button 
          className={styles.buttonSecondary} 
          onClick={clearCache}
          disabled={loading}
        >
          Clear Cache
        </button>
        
        <button 
          className={styles.buttonSecondary} 
          onClick={fetchStatus}
          disabled={loading}
        >
          Refresh Status
        </button>
      </div>

      {status && (
        <div className={styles.statusGrid}>
          <div className={styles.statusCard}>
            <h3>Current Status</h3>
            <div className={styles.statusItem}>
              <span className={styles.label}>Status:</span>
              <span className={`${styles.value} ${status.isRunning ? styles.running : status.completed ? styles.completed : styles.idle}`}>
                {status.isRunning ? 'Running' : status.completed ? 'Completed' : 'Idle'}
              </span>
            </div>
            <div className={styles.statusItem}>
              <span className={styles.label}>Stage:</span>
              <span className={styles.value}>{status.stage || 'N/A'}</span>
            </div>
            <div className={styles.statusItem}>
              <span className={styles.label}>Duration:</span>
              <span className={styles.value}>
                {status.duration ? `${(status.duration / 1000).toFixed(1)}s` : 'N/A'}
              </span>
            </div>
          </div>

          <div className={styles.statusCard}>
            <h3>Timing</h3>
            <div className={styles.statusItem}>
              <span className={styles.label}>Start Time:</span>
              <span className={styles.value}>
                {status.startTime ? new Date(status.startTime).toLocaleString() : 'N/A'}
              </span>
            </div>
            <div className={styles.statusItem}>
              <span className={styles.label}>End Time:</span>
              <span className={styles.value}>
                {status.endTime ? new Date(status.endTime).toLocaleString() : 'N/A'}
              </span>
            </div>
            <div className={styles.statusItem}>
              <span className={styles.label}>Last Check:</span>
              <span className={styles.value}>{lastCheck || 'N/A'}</span>
            </div>
          </div>

          {status.error && (
            <div className={styles.statusCard}>
              <h3>Error</h3>
              <div className={styles.error}>
                {status.error}
              </div>
            </div>
          )}
        </div>
      )}

      <div className={styles.info}>
        <h3>System Information</h3>
        <ul>
          <li><strong>Manual Updates:</strong> Click "Trigger Update" to fetch fresh data from Ethos API</li>
          <li><strong>Automatic Updates:</strong> Vercel Cron runs daily at 2 AM UTC</li>
          <li><strong>Cache Duration:</strong> 30 minutes for profiles, 5 minutes for weekly data</li>
          <li><strong>Data Source:</strong> Direct from Ethos API (api.ethos.network)</li>
        </ul>
      </div>
    </div>
  );
}
