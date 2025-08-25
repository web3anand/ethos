import { useState, useEffect } from 'react';
import { getUserInvitationStats } from '../utils/ethosStatsApi';
import styles from './InvitationStats.module.css';

const InvitationStats = ({ userkey }) => {
  const [invitationData, setInvitationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userkey) return;

    const fetchInvitationStats = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getUserInvitationStats(userkey);
        setInvitationData(data);
      } catch (err) {
        console.error('Error fetching invitation stats:', err);
        setError('Failed to load invitation statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchInvitationStats();
  }, [userkey]);

  if (loading) {
    return (
      <div className={styles.invitationStats}>
        <div className={styles.header}>
          <h3 className={styles.title}>Invitation Statistics</h3>
        </div>
        <div className={styles.loading}>Loading invitation data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.invitationStats}>
        <div className={styles.header}>
          <h3 className={styles.title}>Invitation Statistics</h3>
        </div>
        <div className={styles.error}>{error}</div>
      </div>
    );
  }

  return (
    <div className={styles.invitationStats}>
      <div className={styles.header}>
        <h3 className={styles.title}>Invitation Statistics</h3>
        <div className={styles.subtitle}>Members invited to Ethos Network</div>
      </div>
      
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statNumber}>{invitationData?.totalInvitations || 0}</div>
          <div className={styles.statLabel}>Total Invitations</div>
        </div>
        
        <div className={styles.statCard}>
          <div className={styles.statNumber}>{invitationData?.thisWeek || 0}</div>
          <div className={styles.statLabel}>This Week</div>
        </div>
        
        <div className={styles.statCard}>
          <div className={styles.statNumber}>{invitationData?.thisMonth || 0}</div>
          <div className={styles.statLabel}>This Month</div>
        </div>
      </div>

      {invitationData?.recentInvitations && invitationData.recentInvitations.length > 0 && (
        <div className={styles.recentInvitations}>
          <h4 className={styles.sectionTitle}>Recent Invitations</h4>
          <div className={styles.invitationsList}>
            {invitationData.recentInvitations.slice(0, 5).map((invitation, index) => (
              <div key={index} className={styles.invitationItem}>
                <div className={styles.invitationInfo}>
                  <div className={styles.invitationDate}>
                    {new Date(invitation.timestamp || invitation.createdAt).toLocaleDateString()}
                  </div>
                  <div className={styles.invitationDetails}>
                    Invitation accepted
                  </div>
                </div>
                <div className={styles.invitationStatus}>
                  <span className={styles.statusBadge}>Accepted</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default InvitationStats;
