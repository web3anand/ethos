import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import styles from './ModernDashboard.module.css';
import UserActivities from './UserActivities';
import SimpleXpStats from './SimpleXpStats';
import ScoreChangesChart from './ScoreChangesChart';
import { getUserByProfileId } from '../utils/ethosApiClient';

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
  const [completeProfile, setCompleteProfile] = useState(profile);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile && profile.profileId && (!profile.userkeys || profile.userkeys.length === 0)) {
      setLoading(true);
      getUserByProfileId(profile.profileId)
        .then(completeData => {
          console.log('[ModernDashboard] Fetched complete profile data:', completeData);
          setCompleteProfile(completeData);
          setLoading(false);
        })
        .catch(error => {
          console.error('[ModernDashboard] Error fetching complete profile:', error);
          setCompleteProfile(profile);
          setLoading(false);
        });
    } else {
      setCompleteProfile(profile);
    }
  }, [profile]);

  if (!completeProfile) return null;

  const scoreLevel = getScoreLevel(Number(completeProfile.score));

  // Helper function to extract social media usernames from userkeys
  const getSocialUsername = (service) => {
    if (!completeProfile.userkeys || !Array.isArray(completeProfile.userkeys)) {
      console.log(`[Social Media] No userkeys found for ${service}`);
      return null;
    }
    
    console.log(`[Social Media] Checking userkeys for ${service}:`, completeProfile.userkeys);
    
    for (const key of completeProfile.userkeys) {
      // Handle string format: "service:x.com:username"
      if (typeof key === 'string' && key.startsWith(`service:${service}:`)) {
        const username = key.split(':')[2];
        console.log(`[Social Media] Found ${service} username (string format):`, username);
        return username;
      }
      // Handle object format: {service: 'x.com', username: 'username'}
      if (typeof key === 'object' && key.service === service) {
        console.log(`[Social Media] Found ${service} username (object format):`, key.username);
        return key.username;
      }
    }
    
    console.log(`[Social Media] No ${service} username found`);
    return null;
  };

  // Special handling for Farcaster - use main username if available
  const getFarcasterUsername = () => {
    // First try to get from userkeys
    const farcasterId = getSocialUsername('farcaster');
    if (farcasterId) {
      // For Farcaster, we might need to use the main username instead of user ID
      // Check if the main username looks like a Farcaster username
      if (completeProfile.username && completeProfile.username.startsWith('@')) {
        return completeProfile.username.substring(1); // Remove @ prefix
      }
      return farcasterId; // Fallback to user ID
    }
    return null;
  };

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
              {completeProfile.avatarUrl ? (
                <img
                  src={completeProfile.avatarUrl}
                  alt={completeProfile.displayName || 'Avatar'}
                  className={styles.avatarImage}
                  onError={(e) => {
                    e.target.src = '/ethos.png';
                  }}
                />
              ) : (
                <div className={styles.avatarFallback}>
                  {completeProfile.displayName
                    ? completeProfile.displayName
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
              {completeProfile.displayName}
            </div>
            <div className={styles.socialLinks}>
              {getSocialUsername('x.com') && (
                <a 
                  href={`https://x.com/i/user/${getSocialUsername('x.com')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.socialLink}
                  title="X (Twitter)"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </a>
              )}
              {getSocialUsername('discord') && (
                <a 
                  href={`https://discord.com/users/${getSocialUsername('discord')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.socialLink}
                  title="Discord"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.445.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                  </svg>
                </a>
              )}
              {getSocialUsername('telegram') && (
                <span 
                  className={styles.socialLink}
                  title="Telegram (User ID only - no direct link available)"
                  style={{ opacity: 0.6, cursor: 'not-allowed' }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-.14.05-.22.08-.09.03-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                  </svg>
                </span>
              )}
              {getFarcasterUsername() && (
                <a 
                  href={`https://warpcast.com/${getFarcasterUsername()}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.socialLink}
                  title="Farcaster"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                  </svg>
                </a>
              )}
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
                {completeProfile.onChain?.primaryAddress 
                  ? `${completeProfile.onChain.primaryAddress.slice(0, 6)}...${completeProfile.onChain.primaryAddress.slice(-4)}`
                  : 'N/A'}
              </span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Validator NFT</span>
              <span className={styles.statValue}>
                {completeProfile.validatorNft ? '✅ Yes' : '❌ No'}
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
          <ScoreChangesChart 
            profileId={completeProfile.profileId} 
            username={completeProfile.username}
            currentScore={completeProfile.score}
          />
        </div>

        <div className={styles.xpDistributionWrapper}>
          <SimpleXpStats profile={completeProfile} />
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
