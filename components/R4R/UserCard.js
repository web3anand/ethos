import React from 'react';
import styles from './UserCard.module.css';

const UserCard = ({ user, basicStats }) => {
  if (!user) return null;

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <img src={user.avatarUrl || '/default-avatar.png'} alt={user.username} className={styles.avatar} />
        <div className={styles.identity}>
          <h2 className={styles.displayName}>{user.displayName}</h2>
          <p className={styles.username}>@{user.username}</p>
        </div>
      </div>
      <div className={styles.statsGrid}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{basicStats.credibilityScore}</span>
          <span className={styles.statLabel}>Credibility</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{basicStats.reviewsGiven}</span>
          <span className={styles.statLabel}>Given</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{basicStats.reviewsReceived}</span>
          <span className={styles.statLabel}>Received</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{basicStats.vouchesGiven}</span>
          <span className={styles.statLabel}>Vouches Given</span>
        </div>
      </div>
    </div>
  );
};

export default UserCard;
