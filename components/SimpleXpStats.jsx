import React, { useState, useEffect, useCallback } from 'react';
import styles from './SimpleXpStats.module.css';
import CustomDropdown from './CustomDropdown'; // Import the new component
import {
  getUserWeeklyXp,
  getUserTotalXp,
  getUserSeasonXp,
  getAllSeasons
} from '../utils/ethosStatsApi';

const StatCard = ({ value, label, note }) => (
  <div className={styles.statCard}>
    <div className={styles.statValue}>{value}</div>
    <div className={styles.statLabel}>{label}</div>
    {note && <div className={styles.statNote}>{note}</div>}
  </div>
);

const SimpleXpStats = ({ profile, userkey: propUserkey }) => {
  const [selectedSeason, setSelectedSeason] = useState(null);
  const [seasons, setSeasons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalXP: 0,
    avgUserXP: 0,
    currentSeasonXP: 0,
    weeklyChange: 0,
    totalWeeks: 0,
    seasonName: 'Loading...'
  });
  const [mounted, setMounted] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState('all');
  const [weeklyData, setWeeklyData] = useState([]);

  // Determine userkey from profile or prop
  const userkey = propUserkey || (profile ? `profileId:${profile.profileId}` : null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const calculateStats = useCallback((weeklyData, allSeasons, currentSeasonId, totalXP = 0, seasonXP = 0) => {
    if (!weeklyData || weeklyData.length === 0) {
      return {
        totalXP: totalXP || 0,
        avgUserXP: 0,
        currentSeasonXP: seasonXP || 0,
        weeklyChange: 0,
        totalWeeks: 0,
        seasonName: 'No Data'
      };
    }

    // Find season info
    const currentSeason = allSeasons?.find(s => s.id === currentSeasonId) || 
                         { id: currentSeasonId, name: `Season ${currentSeasonId}` };

    // Calculate current season XP from weekly data
    const currentSeasonXP = weeklyData.reduce((sum, item) => sum + (item.weeklyXp || item.total_xp || 0), 0);
    
    // Use the provided seasonXP if available, otherwise calculate from weekly data
    const finalSeasonXP = seasonXP || currentSeasonXP;
    
    // Show user's total XP across all seasons
    const displayTotalXP = totalXP || finalSeasonXP;

    const avgUserXP = weeklyData.length > 0 ? finalSeasonXP / weeklyData.length : 0;

    let weeklyChange = 0;
    if (weeklyData.length > 1) {
      const latestWeek = weeklyData[weeklyData.length - 1].weeklyXp || weeklyData[weeklyData.length - 1].total_xp || 0;
      const previousWeek = weeklyData[weeklyData.length - 2].weeklyXp || weeklyData[weeklyData.length - 2].total_xp || 0;
      if (previousWeek > 0) {
        weeklyChange = ((latestWeek - previousWeek) / previousWeek) * 100;
      }
    }

    return {
      totalXP: displayTotalXP,
      avgUserXP,
      currentSeasonXP: finalSeasonXP,
      weeklyChange,
      totalWeeks: weeklyData.length,
      seasonName: currentSeason.name
    };
  }, []);

  const fetchData = useCallback(async (seasonId) => {
    setLoading(true);
    
    try {
      if (userkey) {
        // Fetch season XP, weekly data, and total XP across all seasons
        const [seasonXP, weeklyXpData, totalXP] = await Promise.all([
          getUserSeasonXp(userkey, seasonId).catch(() => 0),
          getUserWeeklyXp(userkey, seasonId).catch(() => []),
          getUserTotalXp(userkey).catch(() => 0)
        ]);
        
        if (weeklyXpData && weeklyXpData.length > 0) {
          const allSeasons = await getAllSeasons();
          setStats(calculateStats(weeklyXpData, allSeasons, seasonId, totalXP, seasonXP));
          setWeeklyData(weeklyXpData);
        } else {
          // No weekly data - show basic stats
          const allSeasons = await getAllSeasons();
          const currentSeason = allSeasons?.find(s => s.id === seasonId) || { id: seasonId, name: `Season ${seasonId}` };
          setStats({
            totalXP: totalXP || 0,
            avgUserXP: 0,
            currentSeasonXP: seasonXP || 0,
            weeklyChange: 0,
            totalWeeks: 0,
            seasonName: currentSeason.name
          });
          setWeeklyData([]);
        }
      }
    } catch (error) {
      console.error('Error fetching XP data:', error.message);
      setStats({
        totalXP: 0,
        avgUserXP: 0,
        currentSeasonXP: 0,
        weeklyChange: 0,
        totalWeeks: 0,
        seasonName: `Season ${seasonId} (Error)`
      });
      setWeeklyData([]);
    } finally {
      setLoading(false);
    }
  }, [userkey, calculateStats]);

  useEffect(() => {
    const init = async () => {
      try {
        const seasonsData = await getAllSeasons();
        if (seasonsData && seasonsData.length > 0) {
          const sortedSeasons = [...seasonsData].sort((a, b) => b.id - a.id);
          setSeasons(sortedSeasons);
          const latestSeason = sortedSeasons[0];
          setSelectedSeason(latestSeason.id);
          
          if (userkey) {
            fetchData(latestSeason.id);
          }
        }
      } catch (error) {
        console.error("Error fetching seasons:", error);
      }
    };
    
    if (mounted && userkey) {
      init();
    }
  }, [mounted, userkey, fetchData]);

  // Build week options from weekly data
  const weekOptions = [
    { value: 'all', label: 'All Weeks' },
    ...weeklyData.map((week, index) => ({ 
      value: index, 
      label: `Week ${week.week !== undefined ? week.week + 1 : index + 1}` 
    }))
  ];

  // Get current week data for display
  const getCurrentWeekData = () => {
    if (selectedWeek === 'all' || !weeklyData.length) return null;
    const weekData = weeklyData[selectedWeek];
    if (!weekData) return null;
    
    return {
      weekNumber: weekData.week !== undefined ? weekData.week + 1 : selectedWeek + 1,
      weeklyXp: weekData.weeklyXp || 0,
      cumulativeXp: weekData.cumulativeXp || 0
    };
  };

  const currentWeekData = getCurrentWeekData();

  if (!mounted) {
    return (
      <div className={styles.container}>
        <h3 className={styles.title}>XP Distribution</h3>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>XP Distribution</h3>
        <div className={styles.selectors}>
          <CustomDropdown
            value={selectedSeason}
            onChange={(value) => {
              setSelectedSeason(value);
              setSelectedWeek('all');
              fetchData(value);
            }}
            options={seasons.map(season => ({ value: season.id, label: season.name || `Season ${season.id}` }))}
            placeholder="Season"
            disabled={loading}
            className={styles.customDropdown}
          />
          {weekOptions.length > 1 && (
            <CustomDropdown
              value={selectedWeek}
              onChange={setSelectedWeek}
              options={weekOptions}
              placeholder="Week"
              disabled={loading}
              className={styles.customDropdown}
            />
          )}
        </div>
      </div>

      {loading ? (
        <div className={styles.loading}>
          <div className={styles.loadingSpinner}></div>
          <span>Loading XP data...</span>
        </div>
      ) : (
        <div className={styles.statsGrid}>
          {currentWeekData ? (
            // Show specific week data
            <>
              <StatCard 
                value={currentWeekData.weeklyXp.toLocaleString()} 
                label={`Week ${currentWeekData.weekNumber} XP`} 
              />
              <StatCard 
                value={currentWeekData.cumulativeXp.toLocaleString()} 
                label="Cumulative XP" 
              />
              <StatCard 
                value={stats.totalXP.toLocaleString()} 
                label="Total XP" 
              />
              <StatCard 
                value={stats.currentSeasonXP.toLocaleString()} 
                label={`${stats.seasonName} Total`} 
              />
            </>
          ) : (
            // Show all weeks summary
            <>
              <StatCard 
                value={stats.totalXP.toLocaleString()} 
                label="Total XP" 
              />
              <StatCard 
                value={Math.round(stats.avgUserXP).toLocaleString()} 
                label="Avg Weekly XP" 
              />
              <StatCard 
                value={stats.currentSeasonXP.toLocaleString()} 
                label={`${stats.seasonName} Total`} 
              />
              <StatCard 
                value={stats.totalWeeks} 
                label="Total Weeks" 
              />
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default SimpleXpStats;
