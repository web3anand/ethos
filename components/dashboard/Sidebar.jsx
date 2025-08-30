import React from 'react';
import styles from './Sidebar.module.css';
import { FiGrid, FiBarChart2, FiLayers, FiCheckSquare } from 'react-icons/fi';

const Sidebar = () => {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <div className={styles.logoIcon}></div>
        <span>EOL</span>
      </div>
      <nav className={styles.nav}>
        <ul>
          <li className={`${styles.navItem} ${styles.active}`}>
            <FiGrid />
            <span>Liquidity Booster</span>
          </li>
          <li className={styles.navItem}>
            <FiBarChart2 />
            <span>Matrix</span>
          </li>
          <li className={styles.navItem}>
            <FiLayers />
            <span>My Staking</span>
          </li>
          <li className={styles.navItem}>
            <FiCheckSquare />
            <span>My Vote</span>
          </li>
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;
