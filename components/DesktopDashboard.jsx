import EthosProfileCard from './EthosProfileCard';
import DetailedStats from './DetailedStats';
import UserActivities from './UserActivities';
import XpDistribution from './XpDistribution';
import styles from './DesktopDashboard.module.css';

const DesktopDashboard = ({ profile }) => {
  if (!profile) {
    return null;
  }

  // Extract userkey from profile for API calls
  const userkey = profile.userkeys && profile.userkeys.length > 0 ? profile.userkeys[0] : null;

  return (
    <div className={styles.dashboardWrapper}>
      <div className="pfp-container-wide glass-container">
        <EthosProfileCard profile={profile} isDesktop={true} />
      </div>
      <div className="stats-container-wide glass-container">
        <DetailedStats stats={profile} />
      </div>
      <div className="xp-distribution-container-wide glass-container">
        <XpDistribution userkey={userkey} profile={profile} />
      </div>
      <div className="activities-container-wide glass-container">
        <UserActivities profile={profile} />
      </div>
    </div>
  );
};

export default DesktopDashboard;
