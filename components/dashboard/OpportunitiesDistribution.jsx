import React from 'react';
import styles from './OpportunitiesDistribution.module.css';

const OpportunitiesDistribution = () => {
  return (
    <div className={styles.card}>
      <h2 className={styles.title}>Opportunities Distribution</h2>
      <div className={styles.distributionList}>
        <div className={styles.distributionItem}>
          <div className={styles.legend}>
            <span className={`${styles.dot} ${styles.miEth}`}></span>
            <span>miETH</span>
          </div>
          <span className={styles.amount}>$0 / 0.0%</span>
        </div>
        <div className={styles.distributionItem}>
          <div className={styles.legend}>
            <span className={`${styles.dot} ${styles.miUsdc}`}></span>
            <span>mUSDC</span>
          </div>
          <span className={styles.amount}>$0 / 0.0%</span>
        </div>
      </div>
    </div>
  );
};

export default OpportunitiesDistribution;
