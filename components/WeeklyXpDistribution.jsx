import React, { useState, useEffect } from 'react';
import styles from '../styles/Distribution.classic.module.css';

const WeeklyXpDistribution = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/weekly-distribution-data');
        if (!response.ok) {
          throw new Error('Failed to fetch data');
        }
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const renderSeasonTable = (seasonData, seasonName) => {
    if (!seasonData || !seasonData.weeks || seasonData.weeks.length === 0) {
      return null;
    }

    return (
      <div key={seasonName} className={styles.seasonSection}>
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Total XP</div>
            <div className={styles.statValue}>{seasonData.totalXp?.toLocaleString() || '0'}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Active Users</div>
            <div className={styles.statValue}>{seasonData.totalActiveUsers || '0'}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Total Weeks</div>
            <div className={styles.statValue}>{seasonData.weeks?.length || '0'}</div>
          </div>
        </div>

        <div className={styles.tableContainer}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Week</th>
                <th>Date</th>
                <th>Active Users</th>
                <th>Total XP</th>
                <th>Avg XP/User</th>
              </tr>
            </thead>
            <tbody>
              {seasonData.weeks.map((week, index) => (
                <tr key={index}>
                  <td>{week.week}</td>
                  <td>{week.startDate}</td>
                  <td>{week.activeUsers?.toLocaleString() || '0'}</td>
                  <td>{week.totalXp?.toLocaleString() || '0'}</td>
                  <td>{week.avgXpPerUser?.toFixed(2) || '0.00'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading weekly XP distribution data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <p>Error: {error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={styles.errorContainer}>
        <p>No data available</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Weekly XP Distribution</h2>
      
      {data.season0 && renderSeasonTable(data.season0, 'Season 0')}
      {data.season1 && renderSeasonTable(data.season1, 'Season 1')}
    </div>
  );
};

export default WeeklyXpDistribution;
