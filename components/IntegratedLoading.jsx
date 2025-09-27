import React from 'react';
import styles from './IntegratedLoading.module.css';

const IntegratedLoading = ({ 
  message = 'Loading...', 
  showProgress = true,
  progress = null,
  size = 'medium' // small, medium, large
}) => {
  const getSizeClass = () => {
    switch (size) {
      case 'small':
        return styles.small;
      case 'large':
        return styles.large;
      default:
        return styles.medium;
    }
  };

  return (
    <div className={`${styles.loadingContainer} ${getSizeClass()}`}>
      {/* Glitch Loading Bars */}
      <div className={styles.loadingBars}>
        <div className={styles.bar}></div>
        <div className={styles.bar}></div>
        <div className={styles.bar}></div>
        <div className={styles.bar}></div>
        <div className={styles.bar}></div>
      </div>
      
      {/* Loading Text */}
      <span className={styles.loadingText} data-text={message}>
        {message}
      </span>
      
      {/* Progress Bar (if enabled) */}
      {showProgress && progress && (
        <div className={styles.progressContainer}>
          <div className={styles.progressTrack}>
            <div 
              className={styles.progressBar}
              style={{ width: `${Math.min(progress.percentage || 0, 100)}%` }}
            >
              <div className={styles.progressGlitch}></div>
            </div>
          </div>
          <div className={styles.progressPercentage}>
            {Math.round(progress.percentage || 0)}%
          </div>
        </div>
      )}
    </div>
  );
};

export default IntegratedLoading;
