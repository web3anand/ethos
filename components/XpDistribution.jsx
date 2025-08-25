import React, { useState, useEffect } from 'react';
import styles from './XpDistribution.module.css';
import { getCurrentSeasonXpDistribution, getUserWeeklyXp } from '../utils/ethosStatsApi';

function XpDistribution({ userkey }) {
  const [season, setSeason] = useState(null);
  const [weeklyData, setWeeklyData] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    if (!userkey) return;
    setLoading(true);
    setError(null);
    try {
      const seasonInfo = await getCurrentSeasonXpDistribution();
      setSeason(seasonInfo);
      const data = await getUserWeeklyXp(userkey, seasonInfo.seasonId);
      setWeeklyData(data);
      setSelectedWeek(data.length ? data[0].week : '');
    } catch (err) {
      setError('Failed to load XP data');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [userkey]);

  const handleWeekChange = (e) => {
    setSelectedWeek(Number(e.target.value));
  };

  const filteredData = selectedWeek
    ? weeklyData.filter(item => item.week === selectedWeek)
    : weeklyData;

  return (
    <div className={styles.xpActivitiesContainer}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h3 className={styles.title}>Weekly XP Distribution</h3>
          {season && <span className={styles.seasonInfo}>{season.seasonName}</span>}
        </div>
      </div>
      <div className={styles.filtersContainer}>
        <div className={styles.filtersRow}>
          <div className={styles.weekSelector}>
            <select
              className={styles.weekSelect}
              value={selectedWeek}
              onChange={handleWeekChange}
            >
              {weeklyData.map(item => (
                <option key={item.week} value={item.week}>
                  Week {item.week}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      <div className={styles.activitiesList}>
        {loading && <div className={styles.loading}>Loading...</div>}
        {error && (
          <div className={styles.error}>
            {error}
            <button className={styles.retryButton} onClick={fetchData}>
              Retry
            </button>
          </div>
        )}
        {!loading && !error && filteredData.length === 0 && (
          <div className={styles.noActivities}>
            <div className={styles.noActivitiesIcon}>—</div>
            <div className={styles.noActivitiesText}>No XP data available</div>
          </div>
        )}
        {!loading && !error && filteredData.map(item => (
          <div key={item.week} className={`${styles.activityItem} ${styles.weekly_xp}`}>
            <div className={styles.activityIcon}>{item.week}</div>
            <div className={styles.activityContent}>
              <div className={styles.activityDescription}>
                XP gained in week {item.week}
              </div>
              <div className={styles.activityDate}>
                {new Date(item.startDate).toLocaleDateString()} - {new Date(item.endDate).toLocaleDateString()}
              </div>
            </div>
            <div className={styles.activityAmount}>
              <div className={styles.xpAmount}>{item.weeklyXp}</div>
              <div className={styles.xpLabel}>XP</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default XpDistribution;
