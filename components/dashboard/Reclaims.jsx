import React from 'react';
import styles from './Reclaims.module.css';

const Reclaims = () => {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h2 className={styles.title}>Reclaims</h2>
        <button className={styles.reclaimButton}>Initiate Reclaim</button>
      </div>
      <div className={styles.reclaimsTable}>
        <div className={styles.reclaimsHeader}>
          <span>Asset</span>
          <span>Requested Amount</span>
          <span>Requested At</span>
          <span>Status</span>
        </div>
        {/* Reclaims data would be mapped here */}
      </div>
    </div>
  );
};

export default Reclaims;
