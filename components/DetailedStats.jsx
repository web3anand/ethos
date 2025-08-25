import styles from './DetailedStats.module.css';

const DetailedStats = ({ stats }) => {
  if (!stats) {
    return null;
  }

  const mainStats = {
    'ID': stats.id,
    'Profile ID': stats.profileId,
    'Status': stats.status,
    'Score': stats.score,
    'Influence Factor': stats.influenceScore !== undefined ? stats.influenceScore : 'N/A',
    'XP Total': stats.xpTotal,
    'XP Streak Days': stats.xpStreakDays,
  };

  const vouchGiven = {
    'Count': stats.vouchGiven.count,
    'Total ETH': `${stats.vouchGiven.eth}`,
    'Total USD': stats.ethPrice ? `$${(Number(stats.vouchGiven.eth) * stats.ethPrice).toLocaleString(undefined, {maximumFractionDigits:2})}` : 'Loading...',
  };

  const vouchReceived = {
    'Count': stats.vouchReceived.count,
    'Total ETH': `${stats.vouchReceived.eth}`,
    'Total USD': stats.ethPrice ? `$${(Number(stats.vouchReceived.eth) * stats.ethPrice).toLocaleString(undefined, {maximumFractionDigits:2})}` : 'Loading...',
  };

  return (
    <div className={styles.statsContainer}>
      <div className={styles.statSection}>
        <h3 className={styles.sectionTitle}>Main Stats</h3>
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <tbody>
              {Object.entries(mainStats).map(([label, value]) => (
                <tr key={label} className={styles.tableRow}>
                  <td className={styles.tableCellLabel}>{label}</td>
                  <td className={styles.tableCellValue}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className={styles.statSection}>
        <h3 className={styles.sectionTitle}>Vouches Given</h3>
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <tbody>
              {Object.entries(vouchGiven).map(([label, value]) => (
                <tr key={label} className={styles.tableRow}>
                  <td className={styles.tableCellLabel}>{label}</td>
                  <td className={styles.tableCellValue}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className={styles.statSection}>
        <h3 className={styles.sectionTitle}>Vouches Received</h3>
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <tbody>
              {Object.entries(vouchReceived).map(([label, value]) => (
                <tr key={label} className={styles.tableRow}>
                  <td className={styles.tableCellLabel}>{label}</td>
                  <td className={styles.tableCellValue}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DetailedStats;
