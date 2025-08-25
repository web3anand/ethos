import { useState, useEffect } from 'react';
import { getTopMembers } from '../utils/ethosStatsApi';
import styles from './TopMembers.module.css';

const TopMembers = ({ limit = 10 }) => {
  const [topMembers, setTopMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTopMembers = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getTopMembers(limit);
        setTopMembers(data);
      } catch (err) {
        console.error('Error fetching top members:', err);
        setError('Failed to load top members');
      } finally {
        setLoading(false);
      }
    };

    fetchTopMembers();
  }, [limit]);

  const formatScore = (score) => {
    if (score >= 1000) {
      return `${(score / 1000).toFixed(1)}k`;
    }
    return score.toString();
  };

  const formatXP = (xp) => {
    if (xp >= 1000000) {
      return `${(xp / 1000000).toFixed(1)}M`;
    }
    if (xp >= 1000) {
      return `${(xp / 1000).toFixed(1)}k`;
    }
    return xp.toString();
  };

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return `#${rank}`;
    }
  };

  if (loading) {
    return (
      <div className={styles.topMembers}>
        <div className={styles.header}>
          <h3 className={styles.title}>Top Score Members</h3>
        </div>
        <div className={styles.loading}>Loading top members...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.topMembers}>
        <div className={styles.header}>
          <h3 className={styles.title}>Top Score Members</h3>
        </div>
        <div className={styles.error}>{error}</div>
      </div>
    );
  }

  return (
    <div className={styles.topMembers}>
      <div className={styles.header}>
        <h3 className={styles.title}>Top Score Members</h3>
        <div className={styles.subtitle}>Highest ranked users on Ethos Network</div>
      </div>
      
      <div className={styles.membersList}>
        {topMembers.map((member, index) => (
          <div key={member.profileId || index} className={styles.memberItem}>
            <div className={styles.memberRank}>
              <span className={styles.rankIcon}>{getRankIcon(member.rank)}</span>
            </div>
            
            <div className={styles.memberAvatar}>
              {member.avatarUrl ? (
                <img 
                  src={member.avatarUrl} 
                  alt={member.displayName || member.username}
                  className={styles.avatar}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div 
                className={styles.avatarFallback}
                style={{ display: member.avatarUrl ? 'none' : 'flex' }}
              >
                {(member.displayName || member.username || '?').charAt(0).toUpperCase()}
              </div>
            </div>
            
            <div className={styles.memberInfo}>
              <div className={styles.memberName}>
                {member.displayName || member.username || 'Unknown User'}
              </div>
              {member.username && member.displayName !== member.username && (
                <div className={styles.memberUsername}>@{member.username}</div>
              )}
            </div>
            
            <div className={styles.memberStats}>
              <div className={styles.statItem}>
                <span className={styles.statValue}>{formatScore(member.score)}</span>
                <span className={styles.statLabel}>Score</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statValue}>{formatXP(member.xpTotal || 0)}</span>
                <span className={styles.statLabel}>XP</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {topMembers.length === 0 && !loading && (
        <div className={styles.noData}>
          No top members data available
        </div>
      )}
    </div>
  );
};

export default TopMembers;
