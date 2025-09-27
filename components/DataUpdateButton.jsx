import React, { useState } from 'react';
import styles from './DataUpdateButton.module.css';

const DataUpdateButton = ({ onUpdateComplete }) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateProgress, setUpdateProgress] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');

  const handleAuthentication = async () => {
    try {
      const response = await fetch('/api/authenticate-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      if (response.ok) {
        setIsAuthenticated(true);
        setAuthError('');
        setShowPassword(false);
      } else {
        const data = await response.json();
        setAuthError(data.error || 'Invalid password');
      }
    } catch (error) {
      setAuthError('Authentication failed');
    }
  };

  const handleUpdate = async () => {
    if (!isAuthenticated) {
      setShowPassword(true);
      return;
    }

    setIsUpdating(true);
    setUpdateProgress({ stage: 'Starting data fetch...', percentage: 0 });

    try {
      // Step 1: Trigger comprehensive fetch
      setUpdateProgress({ stage: 'Fetching data from Ethos API...', percentage: 20 });
      const fetchResponse = await fetch('/api/trigger-comprehensive-fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!fetchResponse.ok) {
        throw new Error('Failed to start data fetch');
      }

      const fetchData = await fetchResponse.json();
      console.log('Fetch started:', fetchData);

      // Step 2: Monitor progress with detailed levels
      setUpdateProgress({ 
        stage: 'Processing data...', 
        percentage: 40,
        level: 'Data Processing',
        details: 'Fetching user profiles and weekly data...'
      });
      
      // Poll for completion with enhanced progress tracking
      let attempts = 0;
      const maxAttempts = 60; // 5 minutes max
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        
        try {
          const statusResponse = await fetch('/api/fetch-status');
          const status = await statusResponse.json();
          
          if (status.completed) {
            setUpdateProgress({ 
              stage: 'Clearing cache...', 
              percentage: 80,
              level: 'Cache Management',
              details: 'Clearing API caches for fresh data...'
            });
            
            // Step 3: Clear API cache
            await fetch('/api/clear-all-cache', { method: 'POST' });
            
            setUpdateProgress({ 
              stage: 'Update complete!', 
              percentage: 100,
              level: 'Complete',
              details: 'Data successfully updated and caches cleared'
            });
            setLastUpdate(new Date().toLocaleString());
            
            if (onUpdateComplete) {
              onUpdateComplete();
            }
            
            break;
          } else if (status.error) {
            throw new Error(status.error);
          } else {
            // Enhanced progress with levels
            const progressLevels = [
              { min: 0, max: 20, level: 'Initialization', details: 'Starting data fetch process...' },
              { min: 20, max: 40, level: 'API Connection', details: 'Connecting to Ethos API...' },
              { min: 40, max: 60, level: 'Data Fetching', details: 'Fetching user profiles and XP data...' },
              { min: 60, max: 80, level: 'Data Processing', details: 'Processing and validating data...' },
              { min: 80, max: 95, level: 'Saving Data', details: 'Saving data to CSV files...' },
              { min: 95, max: 100, level: 'Finalizing', details: 'Clearing caches and finalizing...' }
            ];
            
            const currentPercentage = Math.min(40 + (attempts * 2), 75);
            const currentLevel = progressLevels.find(level => 
              currentPercentage >= level.min && currentPercentage < level.max
            ) || progressLevels[progressLevels.length - 1];
            
            setUpdateProgress({ 
              stage: status.stage || 'Processing...', 
              percentage: currentPercentage,
              level: currentLevel.level,
              details: currentLevel.details
            });
          }
        } catch (statusError) {
          console.warn('Status check failed:', statusError);
        }
        
        attempts++;
      }

      if (attempts >= maxAttempts) {
        throw new Error('Update timed out - please check manually');
      }

    } catch (error) {
      console.error('Update failed:', error);
      setUpdateProgress({ stage: `Error: ${error.message}`, percentage: 0 });
    } finally {
      setIsUpdating(false);
      // Clear progress after 3 seconds
      setTimeout(() => setUpdateProgress(null), 3000);
    }
  };

  return (
    <div className={styles.container}>
      {!isAuthenticated && !showPassword ? (
        <button 
          className={`${styles.updateButton} ${styles.authButton}`}
          onClick={() => setShowPassword(true)}
          disabled={isUpdating}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <circle cx="12" cy="16" r="1"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          Update Data
        </button>
      ) : showPassword && !isAuthenticated ? (
        <div className={styles.authContainer}>
          <div className={styles.authForm}>
            <h4 className={styles.authTitle}>Authentication Required</h4>
            <input
              type="password"
              placeholder="Enter update password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.passwordInput}
              onKeyPress={(e) => e.key === 'Enter' && handleAuthentication()}
            />
            {authError && <div className={styles.authError}>{authError}</div>}
            <div className={styles.authButtons}>
              <button 
                className={styles.authButton}
                onClick={handleAuthentication}
                disabled={!password.trim()}
              >
                Authenticate
              </button>
              <button 
                className={styles.cancelButton}
                onClick={() => {
                  setShowPassword(false);
                  setPassword('');
                  setAuthError('');
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button 
          className={`${styles.updateButton} ${isUpdating ? styles.updating : ''}`}
          onClick={handleUpdate}
          disabled={isUpdating}
        >
          {isUpdating ? (
            <>
              <div className={styles.spinner}></div>
              Updating...
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 4v6h-6"/>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
              </svg>
              Update Data
            </>
          )}
        </button>
      )}

      {updateProgress && (
        <div className={styles.progressContainer}>
          <div className={styles.progressHeader}>
            <div className={styles.progressLevel}>{updateProgress.level}</div>
            <div className={styles.progressPercentage}>{updateProgress.percentage}%</div>
          </div>
          <div className={styles.progressBar}>
            <div 
              className={styles.progressFill} 
              style={{ width: `${updateProgress.percentage}%` }}
            ></div>
          </div>
          <div className={styles.progressText}>
            {updateProgress.stage}
          </div>
          {updateProgress.details && (
            <div className={styles.progressDetails}>
              {updateProgress.details}
            </div>
          )}
        </div>
      )}

      {lastUpdate && (
        <div className={styles.lastUpdate}>
          Last updated: {lastUpdate}
        </div>
      )}
    </div>
  );
};

export default DataUpdateButton;
