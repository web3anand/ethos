import React from 'react';
import styles from './GlitchLoading.module.css';

const GlitchLoading = ({ 
  progress = null, 
  message = 'Loading...', 
  showProgress = true,
  blurBackground = true 
}) => {
  return (
    <div className={`${styles.loadingOverlay} ${blurBackground ? styles.blurBackground : ''}`}>
      <div className={styles.loadingContainer}>
        {/* Glitch Logo */}
        <div className={styles.logoContainer}>
          <div className={styles.glitchLogo}>
            <span className={styles.logoText} data-text="E">E</span>
          </div>
          <div className={styles.glitchDots}>
            <div className={styles.dot}></div>
            <div className={styles.dot}></div>
            <div className={styles.dot}></div>
            <div className={styles.dot}></div>
            <div className={styles.dot}></div>
          </div>
        </div>

        {/* Loading Message */}
        <h2 className={styles.loadingMessage}>
          {message}
        </h2>

        {/* Glitch Progress Bar */}
        {showProgress && progress && (
          <div className={styles.progressContainer}>
            <div className={styles.progressTrack}>
              <div 
                className={styles.progressBar}
                style={{ width: `${Math.min(progress.percentage || 0, 100)}%` }}
              >
                <div className={styles.progressGlitch}></div>
                <div className={styles.progressGlitch}></div>
                <div className={styles.progressGlitch}></div>
              </div>
            </div>
            
            {/* Progress Details */}
            <div className={styles.progressDetails}>
              <div className={styles.progressInfo}>
                <span className={styles.progressStage}>{progress.stage || 'Processing data...'}</span>
                <span className={styles.progressPercentage}>
                  {Math.round(progress.percentage || 0)}%
                </span>
              </div>
              
              {progress.current !== undefined && progress.total !== undefined && (
                <div className={styles.progressCount}>
                  {progress.current.toLocaleString()} / {progress.total.toLocaleString()} processed
                </div>
              )}
            </div>
          </div>
        )}

        {/* Glitch Loading Animation */}
        <div className={styles.glitchAnimation}>
          <div className={styles.glitchBar}></div>
          <div className={styles.glitchBar}></div>
          <div className={styles.glitchBar}></div>
          <div className={styles.glitchBar}></div>
          <div className={styles.glitchBar}></div>
        </div>
      </div>
    </div>
  );
};

export default GlitchLoading;
