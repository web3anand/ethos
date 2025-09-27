import React from 'react';
import styles from './SmartLoading.module.css';

const SmartLoading = ({ progress, stage, isVisible }) => {
  if (!isVisible) return null;

  return (
    <div className={styles.loadingOverlay}>
      <div className={styles.loadingContainer}>
        {/* Animated Logo */}
        <div className={styles.logoContainer}>
          <div className={styles.logo}>
            <div className={styles.logoInner}>
              <span className={styles.logoText}>E</span>
            </div>
            <div className={styles.logoRing}></div>
            <div className={styles.logoParticles}>
              <div className={styles.particle}></div>
              <div className={styles.particle}></div>
              <div className={styles.particle}></div>
            </div>
          </div>
        </div>

        {/* Loading Content */}
        <div className={styles.loadingContent}>
          <h2 className={styles.loadingTitle}>
            {stage || 'Loading XP Distribution Data...'}
          </h2>
          
          {/* Progress Bar */}
          <div className={styles.progressContainer}>
            <div className={styles.progressBar}>
              <div 
                className={styles.progressFill}
                style={{ width: `${progress?.percentage || 0}%` }}
              ></div>
            </div>
            <div className={styles.progressText}>
              {progress?.percentage ? `${Math.round(progress.percentage)}%` : '0%'}
            </div>
          </div>

          {/* Loading Stats */}
          {progress && (
            <div className={styles.loadingStats}>
              {progress.current && progress.total && (
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>Loading:</span>
                  <span className={styles.statValue}>
                    {progress.current.toLocaleString()} / {progress.total.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Animated Dots */}
          <div className={styles.loadingDots}>
            <div className={styles.dot}></div>
            <div className={styles.dot}></div>
            <div className={styles.dot}></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartLoading;
