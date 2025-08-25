import React from 'react';
import styles from './SummaryCard.module.css';

const SummaryCard = ({ title, value, change }) => {
  const isPositive = change && change.startsWith('+');
  const changeColor = isPositive ? styles.positive : styles.negative;

  return (
    <div className={styles.card}>
      <p className={styles.title}>{title}</p>
      <div className={styles.valueContainer}>
        <h3 className={styles.value}>{value}</h3>
        {change && <span className={`${styles.change} ${changeColor}`}>{change}</span>}
      </div>
    </div>
  );
};

export default SummaryCard;
