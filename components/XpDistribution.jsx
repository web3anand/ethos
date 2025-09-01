import React, { useState, useEffect } from 'react';
import styles from './XpDistribution.module.css';
import { getCurrentSeasonXpDistribution, getUserWeeklyXp, getAllSeasons } from '../utils/ethosStatsApi';

function XpDistribution({ userkey }) {
  const [seasons, setSeasons] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState(null);
  const [weeklyData, setWeeklyData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('weekly'); // 'weekly', 'trend', 'list'
  const [fullScreen, setFullScreen] = useState(false);

  const fetchData = async () => {
    if (!userkey) return;
    setLoading(true);
    setError(null);
    try {
      // Fetch all seasons
      const allSeasons = await getAllSeasons();
      setSeasons(allSeasons);
      
      // Use current season or first available season
      const currentSeason = allSeasons.find(s => s.isActive) || allSeasons[0];
      setSelectedSeason(currentSeason);
      
      if (currentSeason) {
        // Fetch user's weekly XP data for selected season
        const data = await getUserWeeklyXp(userkey, currentSeason.id);
        
        // Process and sort the data properly
        const processedData = data
          .filter(item => item.weeklyXp !== undefined && item.week !== undefined)
          .sort((a, b) => {
            // Sort by season first, then by week
            if (a.season !== b.season) {
              return a.season.localeCompare(b.season);
            }
            return a.week - b.week;
          })
          .slice(-12); // Show last 12 weeks
        
        setWeeklyData(processedData);
      }
    } catch (err) {
      setError('Failed to load XP data');
      console.error('XP Distribution fetch error:', err);
    }
    setLoading(false);
  };

  const handleSeasonChange = async (seasonId) => {
    const season = seasons.find(s => s.id === parseInt(seasonId));
    setSelectedSeason(season);
    
    if (season && userkey) {
      setLoading(true);
      try {
        const data = await getUserWeeklyXp(userkey, season.id);
        const processedData = data
          .filter(item => item.weeklyXp !== undefined && item.week !== undefined)
          .sort((a, b) => a.week - b.week)
          .slice(-12);
        setWeeklyData(processedData);
      } catch (err) {
        setError('Failed to load season data');
      }
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [userkey]);

  // Enhanced mock data generation for better visualization
  const generateMockData = () => {
    const baseDate = new Date();
    const data = [];
    
    for (let i = 11; i >= 0; i--) {
      const weekStart = new Date(baseDate);
      weekStart.setDate(baseDate.getDate() - (i * 7));
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      // Generate realistic XP progression with more variation
      const baseXp = 800 + (Math.random() * 2000);
      const trend = Math.sin((12 - i) * 0.4) * 600 + (12 - i) * 50; // Upward trend
      const weeklyXp = Math.max(200, Math.floor(baseXp + trend + (Math.random() * 800 - 400)));
      const dailyXp = Math.floor(weeklyXp / 7);
      
      const prevWeekXp = data.length > 0 ? data[data.length - 1].weeklyXp : weeklyXp;
      const change = weeklyXp - prevWeekXp;
      const changePercent = prevWeekXp > 0 ? ((change / prevWeekXp) * 100) : 0;
      
      data.push({
        week: 12 - i,
        weeklyXp: weeklyXp,
        dailyXp: dailyXp,
        change: change,
        changePercent: changePercent,
        dateRange: `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        season: selectedSeason?.name || 'Season 1'
      });
    }
    
    return data;
  };

  const displayData = weeklyData.length > 0 ? weeklyData : generateMockData();

  const formatXp = (xp) => {
    if (xp >= 1000000) return (xp / 1000000).toFixed(1) + 'M XP';
    if (xp >= 1000) return (xp / 1000).toFixed(1) + 'K XP';
    return Math.floor(xp) + ' XP';
  };

  const formatChange = (change) => {
    if (!change) return '—';
    const prefix = change > 0 ? '+' : '';
    return `${prefix}${formatXp(Math.abs(change))}`;
  };

  const getXpColor = (xp) => {
    if (xp >= 2500) return '#22c55e'; // Green
    if (xp >= 1500) return '#3b82f6'; // Blue  
    if (xp >= 800) return '#f59e0b'; // Yellow
    return '#8b949e'; // Gray
  };

  const getChangeColor = (change) => {
    if (change > 0) return '#22c55e';
    if (change < 0) return '#ef4444';
    return '#8b949e';
  };

  const maxXp = Math.max(...displayData.map(d => d.weeklyXp || 0));
  const totalXp = displayData.reduce((sum, item) => sum + (item.weeklyXp || 0), 0);
  const avgWeeklyXp = Math.floor(totalXp / displayData.length);
  const lastWeekXp = displayData[displayData.length - 1]?.weeklyXp || 0;
  const weeklyGrowth = displayData.length > 1 ? 
    ((lastWeekXp - displayData[displayData.length - 2]?.weeklyXp) / displayData[displayData.length - 2]?.weeklyXp) * 100 : 0;

  const renderChart = () => (
    <div className={styles.chartContainer}>
      <div className={styles.chartGrid}>
        {/* Y-axis labels */}
        <div className={styles.yAxisLabels}>
          <span>{formatXp(maxXp)}</span>
          <span>{formatXp(maxXp * 0.75)}</span>
          <span>{formatXp(maxXp * 0.5)}</span>
          <span>{formatXp(maxXp * 0.25)}</span>
          <span>0</span>
        </div>
        
        {/* Chart bars */}
        <div className={styles.chartBars}>
          {displayData.map((item, index) => {
            const height = ((item.weeklyXp || 0) / maxXp) * 100;
            const change = item.change || 0;
            
            return (
              <div key={index} className={styles.barContainer}>
                <div 
                  className={styles.bar}
                  style={{
                    height: `${Math.max(height, 2)}%`,
                    background: `linear-gradient(180deg, ${getXpColor(item.weeklyXp)} 0%, ${getXpColor(item.weeklyXp)}80 100%)`,
                  }}
                  title={`Week ${item.week}: ${formatXp(item.weeklyXp)}`}
                >
                  {/* Change indicator */}
                  {change !== 0 && (
                    <div 
                      className={styles.changeIndicator}
                      style={{ color: getChangeColor(change) }}
                    >
                      {change > 0 ? '↗' : '↘'}
                    </div>
                  )}
                </div>
                
                {/* Week label */}
                <div className={styles.barLabel}>
                  W{item.week}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderTrendChart = () => {
    const cumulativeData = displayData.map((item, index) => {
      const cumulative = displayData.slice(0, index + 1).reduce((sum, d) => sum + d.weeklyXp, 0);
      return { ...item, cumulative };
    });
    
    const maxCumulative = Math.max(...cumulativeData.map(d => d.cumulative));
    const minCumulative = Math.min(...cumulativeData.map(d => d.cumulative));
    const range = maxCumulative - minCumulative || 1;
    
    // Generate SVG path for smooth curve
    const generatePath = () => {
      const width = 100;
      const height = 100;
      const stepX = width / (cumulativeData.length - 1);
      
      let path = '';
      let areaPath = '';
      
      cumulativeData.forEach((data, index) => {
        const x = index * stepX;
        const y = height - ((data.cumulative - minCumulative) / range) * height;
        
        if (index === 0) {
          path += `M ${x} ${y}`;
          areaPath += `M ${x} ${height} L ${x} ${y}`;
        } else {
          // Create smooth curve using quadratic bezier
          const prevData = cumulativeData[index - 1];
          const prevX = (index - 1) * stepX;
          const prevY = height - ((prevData.cumulative - minCumulative) / range) * height;
          const controlX = prevX + stepX / 2;
          const controlY1 = prevY;
          const controlY2 = y;
          
          path += ` Q ${controlX} ${controlY1} ${x} ${y}`;
          areaPath += ` Q ${controlX} ${controlY1} ${x} ${y}`;
        }
      });
      
      // Close the area path
      areaPath += ` L ${width} ${height} Z`;
      
      return { line: path, area: areaPath };
    };

    const paths = generatePath();

    return (
      <div className={styles.trendChartContainer}>
        <div className={styles.trendHeader}>
          <div className={styles.trendTitleSection}>
            <h3 className={styles.trendTitle}>Cumulative XP Trend</h3>
            <span className={styles.trendPeriod}>Last {displayData.length} weeks</span>
          </div>
        </div>
        
        <div className={styles.trendChart}>
          <div className={styles.trendYAxis}>
            <span>{formatXp(maxCumulative)}</span>
            <span>{formatXp(maxCumulative * 0.75)}</span>
            <span>{formatXp(maxCumulative * 0.5)}</span>
            <span>{formatXp(maxCumulative * 0.25)}</span>
            <span>{formatXp(minCumulative)}</span>
          </div>
          
          <div className={styles.trendSvgContainer}>
            <svg viewBox="0 0 100 100" className={styles.trendSvg}>
              <defs>
                <linearGradient id="trendGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3"/>
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05"/>
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="1" result="coloredBlur"/>
                  <feMerge> 
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              
              {/* Grid lines */}
              {[0.25, 0.5, 0.75].map(fraction => (
                <line
                  key={fraction}
                  x1="0"
                  y1={100 - fraction * 100}
                  x2="100"
                  y2={100 - fraction * 100}
                  stroke="rgba(255,255,255,0.05)"
                  strokeWidth="0.2"
                />
              ))}
              
              {/* Area fill */}
              <path
                d={paths.area}
                fill="url(#trendGradient)"
                className={styles.trendArea}
              />
              
              {/* Trend line */}
              <path
                d={paths.line}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="0.8"
                filter="url(#glow)"
                className={styles.trendLine}
              />
              
              {/* Data points */}
              {cumulativeData.map((data, index) => {
                const x = (index / (cumulativeData.length - 1)) * 100;
                const y = 100 - ((data.cumulative - minCumulative) / range) * 100;
                return (
                  <g key={index}>
                    <circle
                      cx={x}
                      cy={y}
                      r="1.2"
                      fill="#1e40af"
                      className={styles.trendPoint}
                    />
                    <circle
                      cx={x}
                      cy={y}
                      r="0.6"
                      fill="#3b82f6"
                      className={styles.trendPointInner}
                    />
                  </g>
                );
              })}
            </svg>
            
            {/* Hover tooltip */}
            <div className={styles.trendTooltip} id="trendTooltip"></div>
          </div>
          
          <div className={styles.trendXAxis}>
            {cumulativeData.map((data, index) => {
              const date = new Date(data.startDate);
              const label = index % 2 === 0 ? 
                `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : '';
              return (
                <span key={index} className={styles.trendXLabel}>
                  {label}
                </span>
              );
            })}
          </div>
        </div>
        
        {/* Weekly breakdown */}
        <div className={styles.weeklyBreakdown}>
          <h4 className={styles.breakdownTitle}>Weekly Performance</h4>
          <div className={styles.breakdownGrid}>
            {displayData.slice(-6).map((data, index) => {
              const change = index > 0 ? data.weeklyXp - displayData[displayData.length - 6 + index - 1]?.weeklyXp : 0;
              const changePercent = index > 0 && displayData[displayData.length - 6 + index - 1]?.weeklyXp > 0 ? 
                ((change / displayData[displayData.length - 6 + index - 1]?.weeklyXp) * 100).toFixed(1) : '0';
              
              return (
                <div key={index} className={styles.breakdownItem}>
                  <div className={styles.breakdownWeek}>Week {data.week}</div>
                  <div className={styles.breakdownXp}>{formatXp(data.weeklyXp)}</div>
                  <div 
                    className={styles.breakdownChange}
                    style={{ color: getChangeColor(change) }}
                  >
                    {change !== 0 ? `${change > 0 ? '+' : ''}${changePercent}%` : '—'}
                  </div>
                  <div className={styles.breakdownActivities}>{data.activities} activities</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderStats = () => (
    <div className={styles.statsGrid}>
      <div className={styles.statCard}>
        <div className={styles.statValue}>{formatXp(totalXp)}</div>
        <div className={styles.statLabel}>Total XP</div>
      </div>
      
      <div className={styles.statCard}>
        <div className={styles.statValue}>{formatXp(avgWeeklyXp)}</div>
        <div className={styles.statLabel}>Weekly Avg</div>
      </div>
      
      <div className={styles.statCard}>
        <div className={styles.statValue} style={{ color: getChangeColor(weeklyGrowth) }}>
          {weeklyGrowth > 0 ? '+' : ''}{weeklyGrowth.toFixed(1)}%
        </div>
        <div className={styles.statLabel}>Growth</div>
      </div>
      
      <div className={styles.statCard}>
        <div className={styles.statValue}>{displayData[displayData.length - 1]?.streak || 0}</div>
        <div className={styles.statLabel}>Day Streak</div>
      </div>
    </div>
  );

  const renderWeeklyList = () => (
    <div className={styles.weeklyList}>
      {displayData.slice(-6).reverse().map((item, index) => (
        <div key={item.week || index} className={styles.weeklyItem}>
          <div className={styles.weekInfo}>
            <div className={styles.weekNumber}>W{item.week}</div>
            <div className={styles.weekDetails}>
              <div className={styles.weekLabel}>
                {new Date(item.startDate).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric' 
                })} - {new Date(item.endDate).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </div>
              <div className={styles.weekActivities}>
                {item.activities || 0} activities
              </div>
            </div>
          </div>
          
          <div className={styles.weekStats}>
            <div className={styles.weekXp}>
              {formatXp(item.weeklyXp || 0)}
            </div>
            <div 
              className={styles.weekChange}
              style={{ color: getChangeColor(item.change || 0) }}
            >
              {formatChange(item.change)}
            </div>
          </div>
          
          <div className={styles.weekProgress}>
            <div 
              className={styles.progressBar}
              style={{
                width: `${((item.weeklyXp || 0) / maxXp) * 100}%`,
                background: getXpColor(item.weeklyXp || 0)
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className={`${styles.container} ${fullScreen ? styles.fullScreen : ''}`}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h3 className={styles.title}>XP Analytics</h3>
          <span className={styles.subtitle}>
            {selectedSeason?.name || 'Season 1'} • Last {displayData.length} weeks
          </span>
        </div>
        
        <div className={styles.headerControls}>
          {/* Season Selector */}
          {seasons.length > 0 && (
            <select 
              className={styles.seasonSelector}
              value={selectedSeason?.id || ''}
              onChange={(e) => handleSeasonChange(e.target.value)}
            >
              {seasons.map(season => (
                <option key={season.id} value={season.id}>
                  {season.name}
                </option>
              ))}
            </select>
          )}
          
          <div className={styles.viewToggle}>
            <button 
              className={`${styles.toggleBtn} ${viewMode === 'weekly' ? styles.toggleActive : ''}`}
              onClick={() => setViewMode('weekly')}
              title="Weekly Bar Chart"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <rect x="7" y="7" width="3" height="10"/>
                <rect x="14" y="5" width="3" height="12"/>
              </svg>
              <span className={styles.btnLabel}>Weekly</span>
            </button>
            <button 
              className={`${styles.toggleBtn} ${viewMode === 'trend' ? styles.toggleActive : ''}`}
              onClick={() => setViewMode('trend')}
              title="Cumulative Trend Chart"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M3 3v18h18"/>
                <path d="M7 12l4-4 4 4 4-4"/>
                <circle cx="7" cy="12" r="1"/>
                <circle cx="11" cy="8" r="1"/>
                <circle cx="15" cy="12" r="1"/>
                <circle cx="19" cy="8" r="1"/>
              </svg>
              <span className={styles.btnLabel}>Trend</span>
            </button>
            <button 
              className={`${styles.toggleBtn} ${viewMode === 'list' ? styles.toggleActive : ''}`}
              onClick={() => setViewMode('list')}
              title="Weekly Performance List"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M8 6h13"/>
                <path d="M8 12h13"/>
                <path d="M8 18h13"/>
                <circle cx="4" cy="6" r="1"/>
                <circle cx="4" cy="12" r="1"/>
                <circle cx="4" cy="18" r="1"/>
              </svg>
              <span className={styles.btnLabel}>List</span>
            </button>
          </div>
          
          <button 
            className={`${styles.fullScreenBtn} ${fullScreen ? styles.active : ''}`}
            onClick={() => setFullScreen(!fullScreen)}
            title={fullScreen ? "Exit Full Screen" : "Enter Full Screen"}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              {fullScreen ? (
                <>
                  <path d="M8 3v3a2 2 0 0 1-2 2H3"/>
                  <path d="M21 8h-3a2 2 0 0 1-2-2V3"/>
                  <path d="M3 16h3a2 2 0 0 1 2 2v3"/>
                  <path d="M16 21v-3a2 2 0 0 1 2-2h3"/>
                </>
              ) : (
                <>
                  <path d="M15 3h6v6"/>
                  <path d="M9 21H3v-6"/>
                  <path d="M21 3l-7 7"/>
                  <path d="M3 21l7-7"/>
                </>
              )}
            </svg>
          </button>
          
          <button 
            className={`${styles.refreshBtn} ${loading ? styles.loading : ''}`} 
            onClick={fetchData} 
            disabled={loading}
            title="Refresh XP Data"
          >
            <svg 
              width="18" 
              height="18" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.5"
              className={loading ? styles.spinning : ''}
            >
              <polyline points="23 4 23 10 17 10"/>
              <polyline points="1 20 1 14 7 14"/>
              <path d="m20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      {renderStats()}

      {/* Content */}
      <div className={styles.content}>
        {loading && (
          <div className={styles.loadingState}>
            <div className={styles.loadingSpinner}></div>
            <span>Loading XP analytics...</span>
          </div>
        )}
        
        {error && (
          <div className={styles.errorState}>
            <div className={styles.errorIcon}>⚠️</div>
            <div className={styles.errorText}>{error}</div>
            <button className={styles.retryBtn} onClick={fetchData}>
              Try Again
            </button>
          </div>
        )}
        
        {!loading && !error && (
          <>
            {viewMode === 'weekly' && renderChart()}
            {viewMode === 'trend' && renderTrendChart()}
            {viewMode === 'list' && renderWeeklyList()}
          </>
        )}
      </div>
    </div>
  );
}

export default XpDistribution;
