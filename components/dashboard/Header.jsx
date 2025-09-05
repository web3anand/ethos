import React from 'react';
import styles from './Header.module.css';
import { FiCopy } from 'react-icons/fi';

const Header = ({ walletAddress }) => {
  return (
    <header className={styles.header}>
      <div className={styles.walletInfo}>
        <div className={styles.walletIcon}></div>
        <h1>{walletAddress}</h1>
        <button className={styles.copyButton}>
          <FiCopy />
        </button>
      </div>
    </header>
  );
};

export default Header;
