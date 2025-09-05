import React, { useState } from 'react';
import styles from './LiquidityOpportunities.module.css';
import { FaEthereum } from 'react-icons/fa';

const LiquidityOpportunities = () => {
  const [activeTab, setActiveTab] = useState('miETH');

  return (
    <div className={styles.card}>
      <h2 className={styles.title}>Liquidity Opportunities</h2>
      <div className={styles.tabs}>
        <button 
          className={`${styles.tab} ${activeTab === 'miETH' ? styles.active : ''}`}
          onClick={() => setActiveTab('miETH')}
        >
          miETH
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'mUSDC' ? styles.active : ''}`}
          onClick={() => setActiveTab('mUSDC')}
        >
          mUSDC
        </button>
      </div>
      
      {activeTab === 'miETH' && (
        <div className={styles.content}>
          <div className={styles.assetHeader}>
            <div className={styles.assetInfo}>
              <FaEthereum className={styles.assetIcon} />
              <h3>miETH</h3>
            </div>
            <div className={styles.totalSupplied}>
              <span>Total Supplied</span>
              <span className={styles.suppliedValue}>$0</span>
            </div>
          </div>

          <div className={styles.rewards}>
            <h4>Rewards</h4>
            <div className={styles.rewardItem}>
              <span>Base Yield</span>
              <span className={styles.apy}>4.82% APY</span>
            </div>
            <div className={styles.rewardItem}>
              <span>Protocol Token Emissions</span>
              <span className={styles.points}>Points 2x</span>
            </div>
            <div className={styles.rewardItem}>
              <span>Mitosis Token Emissions</span>
              <span className={styles.comingSoon}>Coming Soon</span>
            </div>
          </div>

          <div className={styles.holdings}>
            <div className={styles.holdingsHeader}>
              <span>Asset</span>
              <span>Balance</span>
              <span>Holding Duration</span>
              <span>Start Date</span>
            </div>
            {/* Holdings data would be mapped here */}
          </div>
        </div>
      )}
    </div>
  );
};

export default LiquidityOpportunities;
