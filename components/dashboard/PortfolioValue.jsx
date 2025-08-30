import React from 'react';
import styles from './PortfolioValue.module.css';

const PortfolioValue = () => {
  return (
    <div className={styles.card}>
      <h2 className={styles.title}>Total Portfolio Value</h2>
      <p className={styles.value}>$0</p>
    </div>
  );
};

export default PortfolioValue;
