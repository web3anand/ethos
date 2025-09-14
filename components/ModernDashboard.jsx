import React from 'react';
import Image from 'next/image';
import styles from './ModernDashboard.module.css';
import UserActivities from './UserActivities';
import SimpleXpStats from './SimpleXpStats';

// Score levels for mapping score to name and color
const scoreLevels = [
  { min: 0, max: 799, name: 'Untrusted', color: '#e74c3c' },
  { min: 800, max: 1199, name: 'Questionable', color: '#e1b000' },
  { min: 1200, max: 1399, name: 'Neutral', color: '#e2e2e2', text: '#222' },
  { min: 1400, max: 1599, name: 'Known', color: '#8cb6e6' },
  { min: 1600, max: 1799, name: 'Established', color: '#5fa8d3' },
  { min: 1800, max: 1999, name: 'Reputable', color: '#3b82f6' },
  { min: 2000, max: 2199, name: 'Exemplary', color: '#34d399' },
  { min: 2200, max: 2399, name: 'Distinguished', color: '#22c55e' },
  { min: 2400, max: 2599, name: 'Revered', color: '#a78bfa' },
  { min: 2600, max: 2800, name: 'Renowned', color: '#a855f7' },
];

function getScoreLevel(score) {
  return scoreLevels.find(l => score >= l.min && score <= l.max) || scoreLevels[0];
}

const ModernDashboard = ({ profile }) => {
  if (!profile) return null;

  const scoreLevel = getScoreLevel(Number(profile.score));

  return (
    <div className={styles.container}>
      {/* PFP Container */}
      <div className={styles.pfpContainer}>
        <div className={styles.profileSection}>
          <div className={styles.avatarWrapper}>
            <div
              className={styles.avatar}
              style={{ '--pfp-ring': scoreLevel.color }}
            >
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.displayName || 'Avatar'}
                  className={styles.avatarImage}
                  onError={(e) => {
                    e.target.src = '/ethos.png';
                  }}
                />
              ) : (
                <div className={styles.avatarFallback}>
                  {profile.displayName
                    ? profile.displayName
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)
                    : '?'}
                </div>
              )}
            </div>
            <div className={styles.scoreLabel}>
              <div
                className={styles.scorePill}
                style={{ 
                  background: scoreLevel.color,
                  color: scoreLevel.color === '#e2e2e2' ? '#222' : '#fff'
                }}
              >
                <Image
                  src="/ethos.png"
                  alt="Ethos Logo"
                  width={20}
                  height={20}
                  className={styles.ethosIcon}
                />
                {scoreLevel.name}
              </div>
            </div>
          </div>
          <div className={styles.profileInfo}>
            <div className={styles.profileName}>
              {profile.displayName}
            </div>
          </div>
        </div>
      </div>

      {/* Grid Layout */}
      <div className={styles.gridContainer}>
        {/* First Row */}
        <div className={styles.onchainData}>
          <h3 className={styles.sectionTitle}>Onchain Data / Validator</h3>
          <div className={styles.statsList}>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Address</span>
              <span className={styles.statValue}>
                {profile.onChain?.primaryAddress 
                  ? `${profile.onChain.primaryAddress.slice(0, 6)}...${profile.onChain.primaryAddress.slice(-4)}`
                  : 'N/A'}
              </span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Validator NFT</span>
              <span className={styles.statValue}>
                {profile.validatorNft ? '✅ Yes' : '❌ No'}
              </span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Status</span>
              <span className={`${styles.statValue} ${styles.statusActive}`}>
                ACTIVE
              </span>
            </div>
          </div>
        </div>

        <div className={styles.scoreGraph}>
          <h3 className={styles.sectionTitle}>Score Changes Graph</h3>
          <div className={styles.graphPlaceholder}>
            <div className={styles.comingSoon}>Coming Soon</div>
          </div>
        </div>

        <div className={styles.xpDistributionWrapper}>
          <SimpleXpStats profile={profile} />
        </div>

        {/* Second Row */}
        <div className={styles.mainStats}>
          <h3 className={styles.sectionTitle}>Main Stats</h3>
          <div className={styles.statsList}>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>ID</span>
              <span className={styles.statValue}>{profile.id}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Profile ID</span>
              <span className={styles.statValue}>{profile.profileId}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Score</span>
              <span className={styles.statValue}>{profile.score}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Influence Factor</span>
              <span className={styles.statValue}>{profile.influenceScore || 'N/A'}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>XP Total</span>
              <span className={styles.statValue}>{profile.xpTotal?.toLocaleString() || '0'}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>XP Streak Days</span>
              <span className={styles.statValue}>{profile.xpStreakDays || '0'}</span>
            </div>
          </div>
        </div>

        {/* Vouches sections */}
        <div className={styles.vouchesGiven}>
          <h3 className={styles.sectionTitle}>Vouches Given</h3>
          <div className={styles.statsList}>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Count</span>
              <span className={styles.statValue}>{profile.vouchGiven?.count || 0}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Total ETH</span>
              <span className={styles.statValue}>{profile.vouchGiven?.eth || '0'}</span>
            </div>
          </div>
        </div>

        <div className={styles.vouchesReceived}>
          <h3 className={styles.sectionTitle}>Vouches Received</h3>
          <div className={styles.statsList}>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Count</span>
              <span className={styles.statValue}>{profile.vouchReceived?.count || 0}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Total ETH</span>
              <span className={styles.statValue}>{profile.vouchReceived?.eth || '0'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Activities - Full Width */}
      <div className={styles.activitiesWrapper}>
        <UserActivities profile={profile} />
      </div>
    </div>
  );
};

export default ModernDashboard;
