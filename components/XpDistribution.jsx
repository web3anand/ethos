import React, { useState, useEffect, useCallback } from 'react';
import styles from './XpDistribution.module.css';
import UserActivitiesStyles from './UserActivities.module.css';
import { getAllSeasons, getUserWeeklyXp } from '../utils/ethosStatsApi';

const StatCard = ({ value, label, note }) => (
  <div className={styles.statCard}>
    <div className={styles.statValue}>{value}</div>
    <div className={styles.statLabel}>{label}</div>
    {note && <div className={styles.statNote}>{note}</div>}
  </div>
);

const CalendarCell = ({ week, xp, change, isPositive, isFirstWeek }) => {
  const cellClasses = [
    styles.calendarCell,
    isFirstWeek ? styles.firstWeekCell : '',
    xp > 0 && !isFirstWeek ? (isPositive ? styles.positiveCell : styles.negativeCell) : '',
  ].join(' ');

  return (
    <div className={cellClasses}>
      <div className={styles.weekNumber}>Week {week}</div>
      <div className={styles.weekXp}>{xp.toLocaleString()}</div>
      {change !== null && !isFirstWeek && (
        <div className={styles.weekChange}>
          <span className={`${styles.changeValue} ${isPositive ? styles.positiveChange : styles.negativeChange}`}>
            {isPositive ? '+' : ''}{change.toFixed(2)}%
          </span>
        </div>
      )}
    </div>
  );
};

// CustomDropdown copied from UserActivities.jsx
const CustomDropdown = ({ value, onChange, options, className, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(option => option.value === value);

  const handleSelect = (optionValue) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleBlur = () => {
    setTimeout(() => setIsOpen(false), 150);
  };

  return (
    <div className={`${UserActivitiesStyles.customDropdown} ${className || ''}`.trim()}>
      <div
        className={UserActivitiesStyles.dropdownTrigger}
        onClick={handleToggle}
        onBlur={handleBlur}
        tabIndex={0}
      >
        <span>{selectedOption ? selectedOption.label : placeholder}</span>
        <span className={`${UserActivitiesStyles.dropdownArrow} ${isOpen ? UserActivitiesStyles.dropdownArrowOpen : ''}`}>
          <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      </div>
      {isOpen && (
        <div className={UserActivitiesStyles.dropdownMenu}>
          {options.map(option => (
            <div
              key={option.value}
              className={`${UserActivitiesStyles.dropdownOption} ${value === option.value ? UserActivitiesStyles.dropdownOptionSelected : ''}`}
              onClick={() => handleSelect(option.value)}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const XpDistribution = ({ userkey }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [seasons, setSeasons] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState(null);
  const [data, setData] = useState(null);
  const [stats, setStats] = useState({
    totalXP: 0,
    avgUserXP: 0,
    currentSeasonXP: 0,
    weeklyChange: 0,
  });
  const [calendarData, setCalendarData] = useState([]);
  const [mounted, setMounted] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState('all');

  // Use dynamic import for ethos hooks to avoid SSR issues
  const [ethos, setEthos] = useState(null);

  useEffect(() => {
    setMounted(true);
    // Dynamically import ethos-connect only on client side
    import('ethos-connect').then(({ ethos: ethosModule }) => {
      setEthos(ethosModule);
    });
  }, []);

  const wallet = ethos?.useWallet?.()?.wallet;

  const calculateStats = useCallback((weeklyData, allSeasons, currentSeasonId) => {
    if (!weeklyData || weeklyData.length === 0) {
      return {
        totalXP: 0,
        avgUserXP: 0,
        currentSeasonXP: 0,
        weeklyChange: 0,
      };
    }

    const totalXP = weeklyData.reduce((sum, item) => sum + item.total_xp, 0);
    const avgUserXP = weeklyData.length > 0 ? totalXP / weeklyData.length : 0;

    const currentSeason = allSeasons.find(s => s.season_id === currentSeasonId);
    const currentSeasonXP = currentSeason ? currentSeason.total_xp : 0;

    let weeklyChange = 0;
    if (weeklyData.length > 1) {
      const latestWeek = weeklyData[weeklyData.length - 1].total_xp;
      const previousWeek = weeklyData[weeklyData.length - 2].total_xp;
      if (previousWeek > 0) {
        weeklyChange = ((latestWeek - previousWeek) / previousWeek) * 100;
      }
    }

    return {
      totalXP,
      avgUserXP,
      currentSeasonXP,
      weeklyChange,
    };
  }, []);

  const generateCalendarData = useCallback((weeklyData) => {
    if (!weeklyData || weeklyData.length === 0) return [];

    return weeklyData.map((week, index) => {
      let change = null;
      if (index > 0) {
        const previousWeekXp = weeklyData[index - 1].total_xp;
        if (previousWeekXp > 0) {
          change = ((week.total_xp - previousWeekXp) / previousWeekXp) * 100;
        }
      }
      return {
        week: week.week_number,
        xp: week.total_xp,
        change: change,
        isPositive: change === null || change >= 0,
        isFirstWeek: index === 0,
      };
    });
  }, []);

  const fetchData = useCallback(async (seasonId) => {
    if (userkey) {
      try {
        let weeklyXpData = await getUserWeeklyXp(userkey, seasonId);
        // Normalize data fields for API/mocks
        if (weeklyXpData && weeklyXpData.length > 0) {
          weeklyXpData = weeklyXpData.map((w, i) => ({
            week_number: w.week_number || w.week || i + 1,
            total_xp: w.total_xp || w.weeklyXp || w.totalXp || 0,
          }));
        }
        setData(weeklyXpData);
        const allSeasons = await getAllSeasons();
        setStats(calculateStats(weeklyXpData, allSeasons, seasonId));
        setCalendarData(generateCalendarData(weeklyXpData));
        return;
      } catch (error) {
        console.error('Error fetching real XP data, falling back to mock:', error);
      }
    }
    // Fallback: use mock data
    const weeklyXpData = Array.from({ length: 12 }, (_, i) => ({
      week_number: i + 1,
      total_xp: Math.floor(Math.random() * 2000) + 300,
    }));
    setData(weeklyXpData);
    setStats(calculateStats(weeklyXpData, [], seasonId));
    setCalendarData(generateCalendarData(weeklyXpData));
  }, [userkey, calculateStats, generateCalendarData]);

  useEffect(() => {
    const init = async () => {
      try {
        const seasonsData = await getAllSeasons();
        if (seasonsData && seasonsData.length > 0) {
          // Use .id for season id
          const sortedSeasons = [...seasonsData].sort((a, b) => b.id - a.id);
          setSeasons(sortedSeasons.map((s, i) => ({ ...s, season_number: s.name?.match(/\d+/)?.[0] || i, season_id: s.id })));
          const latestSeason = sortedSeasons[0];
          setSelectedSeason(latestSeason.id);
          fetchData(latestSeason.id);
        } else {
          setSeasons([]);
        }
      } catch (error) {
        console.error("Error fetching seasons:", error);
      }
    };
    if (mounted) {
      init();
    }
  }, [fetchData, mounted]);

  const handleSeasonChange = (e) => {
    const newSeasonId = e.target.value;
    console.log(`Season changed to: ${newSeasonId} (type: ${typeof newSeasonId})`);
    setSelectedSeason(newSeasonId);
    fetchData(newSeasonId);
  };
  
  // Build week options from calendarData
  const weekOptions = [
    { value: 'all', label: 'All Weeks' },
    ...calendarData.map((w, i) => ({ value: w.week, label: `Week ${w.week}` }))
  ];

  // Filter calendarData if a week is selected
  const filteredCalendarData = selectedWeek === 'all' ? calendarData : calendarData.filter(w => w.week === selectedWeek);

  if (!mounted) {
    return (
      <div className={styles.xpSection}>
        <button className={styles.xpToggle}>
          <span>XP Distribution</span>
          <svg
            className={styles.chevron}
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M19.9201 8.9502L13.4001 15.4702C12.6301 16.2402 11.3701 16.2402 10.6001 15.4702L4.08008 8.9502"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeMiterlimit="10"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className={styles.xpSection}>
      <button onClick={() => setIsOpen(!isOpen)} className={styles.xpToggle}>
        <span>XP Distribution</span>
        <svg
          className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M19.9201 8.9502L13.4001 15.4702C12.6301 16.2402 11.3701 16.2402 10.6001 15.4702L4.08008 8.9502"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeMiterlimit="10"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {isOpen && (
        <div className={styles.xpContent}>
          <div className={styles.xpControls}>
            <CustomDropdown
              value={selectedSeason || ''}
              onChange={val => { setSelectedSeason(val); fetchData(val); }}
              options={seasons.map(season => ({ value: season.season_id, label: season.name || `Season ${season.season_number}` }))}
              placeholder="Season"
              className={styles.seasonSelector}
            />
            <CustomDropdown
              value={selectedWeek}
              onChange={setSelectedWeek}
              options={weekOptions}
              placeholder="Week"
              className={styles.seasonSelector}
            />
            <button
              onClick={() => fetchData(selectedSeason)}
              className={UserActivitiesStyles.refreshButton}
            >
              Refresh
            </button>
          </div>

          {/* Always show data, never loading spinner */}
          {data && data.length > 0 ? (
            <>
              <div className={styles.statsOverview}>
                <StatCard value={stats.totalXP.toLocaleString()} label="Total XP" />
                <StatCard value={Math.round(stats.avgUserXP).toLocaleString()} label="Avg User XP" />
                <StatCard value={stats.currentSeasonXP.toLocaleString()} label="Current Season XP" />
                <StatCard
                  value={`${stats.weeklyChange.toFixed(2)}%`}
                  label="Weekly Change"
                />
              </div>

              <div className={styles.weeklyCalendar}>
                <h3 className={styles.calendarTitle}>Weekly XP Breakdown</h3>
                <div className={styles.calendarGrid}>
                  {filteredCalendarData.map((item, index) => (
                    <CalendarCell key={index} {...item} />
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className={styles.emptyState}>
              <p>No XP data available for the selected season.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default XpDistribution;
