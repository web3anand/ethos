import React, { useState, useEffect, useCallback } from 'react';
import styles from './XpDistribution.module.css';
import UserActivitiesStyles from './UserActivities.module.css';
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

const CalendarCell = ({ week, displayWeek, xp, change, isPositive, isFirstWeek }) => {
  const cellClasses = [
    styles.calendarCell,
    isFirstWeek ? styles.firstWeekCell : '',
    xp > 0 && !isFirstWeek ? (isPositive ? styles.positiveCell : styles.negativeCell) : '',
  ].join(' ');

  const weekLabel = displayWeek !== undefined ? displayWeek : (week + 1);

  return (
    <div className={cellClasses}>
      <div className={styles.weekNumber}>Week {weekLabel}</div>
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

const CustomDropdown = React.memo(({ value, onChange, options, className, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(option => option.value === value);

  const handleSelect = useCallback((optionValue) => {
    onChange(optionValue);
    setIsOpen(false);
  }, [onChange]);

  const handleToggle = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  const handleBlur = useCallback(() => {
    setTimeout(() => setIsOpen(false), 150);
  }, []);

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
});

const XpDistribution = ({ profile, userkey: propUserkey }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [seasons, setSeasons] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState(null);
  const [lastFetchedSeason, setLastFetchedSeason] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalXP: 0,
    avgUserXP: 0,
    currentSeasonXP: 0,
    weeklyChange: 0,
  });
  const [calendarData, setCalendarData] = useState([]);
  const [mounted, setMounted] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState('all');
  const [userTotalXP, setUserTotalXP] = useState(0); // Store user's total XP across all seasons

  // Determine userkey from profile or prop
  const userkey = propUserkey || (profile ? `profileId:${profile.profileId}` : null);
  
  console.log('🔑 XpDistribution userkey:', userkey, 'profileId:', profile?.profileId);

  // Clear API cache when userkey changes
  useEffect(() => {
    if (userkey && typeof getUserTotalXp === 'function') {
      console.log('🧹 Clearing API cache for new userkey:', userkey);
      // Import and clear cache
      import('../utils/ethosStatsApi.js').then(api => {
        if (api.default && api.default.clearCache) {
          api.default.clearCache();
        }
      });
    }
  }, [userkey]);
  
  // Debug: log the userkey being used
  useEffect(() => {
    console.log('XpDistribution - Profile:', profile);
    console.log('XpDistribution - UserKey:', userkey);
    console.log('XpDistribution - PropUserkey:', propUserkey);
  }, [profile, userkey, propUserkey]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const calculateStats = useCallback((weeklyData, allSeasons, currentSeasonId, totalXP = 0, seasonXP = 0) => {
    if (!weeklyData || weeklyData.length === 0) {
      return {
        totalXP: totalXP || 0, // Show user's total XP across all seasons
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
    
    // Show user's total XP across all seasons, not just current season
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
      seasonName: currentSeason.name,
      seasonStartDate: currentSeason.startDate,
      seasonEndDate: currentSeason.endDate
    };
  }, []);

  const generateCalendarData = useCallback((weeklyData) => {
    if (!weeklyData || weeklyData.length === 0) return [];

    return weeklyData.map((week, index) => {
      const currentXp = week.weeklyXp || week.total_xp || 0;
      let change = null;
      if (index > 0) {
        const previousWeekXp = weeklyData[index - 1].weeklyXp || weeklyData[index - 1].total_xp || 0;
        if (previousWeekXp > 0) {
          change = ((currentXp - previousWeekXp) / previousWeekXp) * 100;
        }
      }
      
      // Use original week number from API data
      const weekNumber = week.week !== undefined ? week.week : index;
      
      return {
        week: weekNumber,
        displayWeek: weekNumber + 1, // For display purposes (Week 0 → Week 1)
        xp: currentXp,
        change: change,
        isPositive: change === null || change >= 0,
        isFirstWeek: index === 0,
      };
    });
  }, []);

  const fetchData = useCallback(async (seasonId) => {
    console.log(`🚀 Fetching data for season: ${seasonId}`);
    console.log(`📋 Using userkey: ${userkey}`);
    console.time(`FetchSeason${seasonId}`);
    
    setLoading(true);
    
    try {
      if (userkey) {
        console.time(`APICalls-Season${seasonId}`);
        // Fetch season XP, weekly data, and total XP across all seasons
        const [seasonXP, weeklyXpData, totalXP] = await Promise.all([
          getUserSeasonXp(userkey, seasonId).catch(() => 0),
          getUserWeeklyXp(userkey, seasonId).catch(() => []),
          getUserTotalXp(userkey).catch(() => 0)
        ]);
        console.timeEnd(`APICalls-Season${seasonId}`);
        
        console.log(`📊 Season ${seasonId} - Total XP: ${totalXP}, Season XP: ${seasonXP}, Weekly data: ${weeklyXpData?.length || 0} weeks`);
        
        if (weeklyXpData && weeklyXpData.length > 0) {
          console.time(`ProcessData-Season${seasonId}`);
          
          // No need to filter - API already returns season-specific data
          console.log(`📊 Using all ${weeklyXpData.length} weeks from API for season ${seasonId}`);
          
          // Process weekly data
          const processedData = weeklyXpData.map((week, index) => ({
            week: week.week !== undefined ? week.week : (index + 1),
            weeklyXp: week.weeklyXp || 0,
            cumulativeXp: week.cumulativeXp || 0,
            total_xp: week.weeklyXp || 0
          }));
          
          setData(processedData);
          const allSeasons = await getAllSeasons();
          setStats(calculateStats(processedData, allSeasons, seasonId, totalXP, seasonXP));
          setCalendarData(generateCalendarData(processedData));
          console.timeEnd(`ProcessData-Season${seasonId}`);
        } else {
          // No weekly data - show empty
          setData([]);
          setCalendarData([]);
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
        }
      }
    } catch (error) {
      console.error('❌ Error fetching XP data:', error.message);
      // Show fallback data on error
      setData([{
        week: 1,
        weeklyXp: 0,
        cumulativeXp: 0,
        total_xp: 0
      }]);
      setCalendarData([{
        week: 1,
        xp: 0,
        change: null,
        isPositive: true,
        isFirstWeek: true
      }]);
      setStats({
        totalXP: userTotalXP || 0,
        avgUserXP: 0,
        currentSeasonXP: 0,
        weeklyChange: 0,
        totalWeeks: 1,
        seasonName: `Season ${seasonId} (Error)`
      });
    } finally {
      setLoading(false);
      console.timeEnd(`FetchSeason${seasonId}`);
      console.log(`✅ Finished loading season ${seasonId}`);
    }
  }, [userkey, calculateStats, generateCalendarData, userTotalXP]);

  useEffect(() => {
    const init = async () => {
      try {
        console.log('� XpDistribution initialization started');
        
        const seasonsData = await getAllSeasons();
        if (seasonsData && seasonsData.length > 0) {
          const sortedSeasons = [...seasonsData].sort((a, b) => b.id - a.id);
          setSeasons(sortedSeasons.map(s => ({ ...s, season_id: s.id })));
          const latestSeason = sortedSeasons[0];
          setSelectedSeason(latestSeason.id);
          setLastFetchedSeason(latestSeason.id);
          
          console.log('🎯 About to fetch data for latest season:', latestSeason.id);
          // Simple: just fetch data for the latest season
          if (userkey) {
            fetchData(latestSeason.id);
          }
        }
      } catch (error) {
        console.error("Error fetching seasons:", error);
      }
    };
    
    if (mounted && userkey) {
      console.log('🚀 Starting XpDistribution init with userkey:', userkey);
      init();
    }
  }, [mounted, userkey, fetchData]);

  // Only fetch data if selectedSeason changes and we're not already loading
  useEffect(() => {
    if (selectedSeason !== null && selectedSeason !== lastFetchedSeason && !loading) {
      console.log(`Season change detected: ${lastFetchedSeason} -> ${selectedSeason}`);
      setLastFetchedSeason(selectedSeason);
      fetchData(selectedSeason);
    }
  }, [selectedSeason, lastFetchedSeason, loading, fetchData]);

  const handleSeasonChange = (newSeasonId) => {
    console.log(`🔄 Season change requested: ${selectedSeason} -> ${newSeasonId} (type: ${typeof newSeasonId})`);
    console.time('SeasonChange');
    
    // Convert to number for consistency
    const numericSeasonId = typeof newSeasonId === 'string' ? parseInt(newSeasonId, 10) : newSeasonId;
    
    if (numericSeasonId !== selectedSeason && !loading) {
      console.log(`✅ Changing season to: ${numericSeasonId}`);
      setSelectedSeason(numericSeasonId);
      // Don't call fetchData here - let useEffect handle it to avoid double calls
    } else if (loading) {
      console.log('⏸️  Season change blocked - already loading');
    } else {
      console.log('⏭️  Season change ignored - same season selected');
    }
    
    console.timeEnd('SeasonChange');
  };
  
  // Build week options from calendarData
  const weekOptions = [
    { value: 'all', label: 'All Weeks' },
    ...calendarData.map((w, i) => ({ 
      value: w.week, 
      label: `Week ${w.displayWeek !== undefined ? w.displayWeek : (w.week + 1)}`, 
      key: `week-option-${w.week}-${i}` 
    }))
  ];

  // Filter calendarData if a week is selected
  const filteredCalendarData = selectedWeek === 'all' ? calendarData : calendarData.filter(w => w.week === selectedWeek);

  if (!mounted) {
    return (
      <div className={UserActivitiesStyles.activitiesSection}>
        <button className={UserActivitiesStyles.activitiesToggle}>
          <span>XP Distribution</span>
          <span className={UserActivitiesStyles.chevron}>
            <svg width="14" height="9" viewBox="0 0 14 9" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1.5 1.5L7 7L12.5 1.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className={UserActivitiesStyles.activitiesSection}>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className={UserActivitiesStyles.activitiesToggle}
        aria-expanded={isOpen}
      >
        <span>XP Distribution</span>
        <span className={`${UserActivitiesStyles.chevron} ${isOpen ? UserActivitiesStyles.chevronOpen : ''}`}>
          <svg width="14" height="9" viewBox="0 0 14 9" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1.5 1.5L7 7L12.5 1.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      </button>

      {isOpen && (
        <div className={UserActivitiesStyles.activitiesContent}>
          <div className={UserActivitiesStyles.activitiesControls}>
            <CustomDropdown
              value={selectedSeason ?? ''}
              onChange={handleSeasonChange}
              options={seasons.map(season => ({ value: season.id, label: season.name || `Season ${season.id}` }))}
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
              onClick={() => {
                console.log('🔄 Manual refresh clicked - clearing cache and refetching');
                // Clear cache before refresh
                import('../utils/ethosStatsApi.js').then(api => {
                  if (api.default && api.default.clearCache) {
                    api.default.clearCache();
                  }
                });
                setLastFetchedSeason(null); // Force refetch
                fetchData(selectedSeason);
              }}
              className={UserActivitiesStyles.refreshButton}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          <div className={UserActivitiesStyles.activitiesList}>
            {loading ? (
              <div className={UserActivitiesStyles.loadingState}>
                <div className={UserActivitiesStyles.loadingSpinner}></div>
                <span>Loading XP data...</span>
              </div>
            ) : data && data.length > 0 ? (
              <>
                <div className={styles.statsOverview}>
                  <StatCard value={stats.totalXP.toLocaleString()} label="Total XP" />
                  <StatCard value={Math.round(stats.avgUserXP).toLocaleString()} label="Avg Weekly XP" />
                  <StatCard value={stats.currentSeasonXP.toLocaleString()} label={`${stats.seasonName || 'Season'} Total`} />
                  <StatCard value={stats.totalWeeks} label="Total Weeks" />
                  <StatCard
                    value={`${stats.weeklyChange.toFixed(2)}%`}
                    label="Weekly Change"
                  />
                </div>

                <div className={styles.weeklyCalendar}>
                  <h3 className={styles.calendarTitle}>Weekly XP Breakdown</h3>
                  <div className={styles.calendarGrid}>
                    {filteredCalendarData.map((item, index) => (
                      <CalendarCell key={`season-${selectedSeason}-week-${item.week}-idx-${index}-xp-${item.xp}`} {...item} />
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className={UserActivitiesStyles.emptyState}>
                <p>
                  {selectedSeason === 0 || selectedSeason === '0'
                    ? 'No XP data available for Season 0. Showing mock data.'
                    : 'No XP data available for the selected season.'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default XpDistribution;
