import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Navbar from '../components/Navbar';
import { ethosDistributionApi } from '../utils/ethosDistributionApi';
import FastDistributionApi from '../utils/fastDistributionApi';
import { checkValidatorNftsForProfiles, addValidatorSymbolToUsername, hasValidatorNft } from '../utils/validatorNftApi';
import { checkValidatorNftsWithCache, isKnownValidatorNftHolder } from '../utils/validatorNftCache';
import { ArrowUp, ArrowDown, ArrowUpDown, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import classicStyles from '../styles/Distribution.classic.module.css';

export default function Distribution() {
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [distributionStats, setDistributionStats] = useState(null);
  const [loading, setLoading] = useState(false); // Disabled loading screen
  const [loadingProgress, setLoadingProgress] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredData, setFilteredData] = useState([]);
  const [selectedView, setSelectedView] = useState('leaderboard');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);
  // Function to refresh season data
  const refreshSeasonData = async () => {
    try {
      setIsRefreshing(true);
      setCacheStatus('🔄 Fetching fresh data...');
      
      const startTime = Date.now();
      const response = await fetch('/api/seasons?refresh=true');
      const seasonData = await response.json();
      
      if (seasonData) {
        const responseTime = Date.now() - startTime;
        setCacheStatus(`✅ Fresh data loaded (${Math.round(responseTime/1000)}s)`);
        
        setDistributionStats(prev => ({
          ...prev,
          totalSeasons: seasonData.totalSeasons,
          currentSeason: seasonData.currentSeason,
          seasonStats: seasonData.seasonStats
        }));
      }
    } catch (error) {
      console.error('Error refreshing season data:', error);
      setCacheStatus('❌ Refresh failed');
    } finally {
      setIsRefreshing(false);
    }
  };

  const targetUsers = 20000; // Increased target for full database
  const [cacheStatus, setCacheStatus] = useState(null);
  const [fastApi, setFastApi] = useState(null);
  const [backgroundEnhancing, setBackgroundEnhancing] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'xpTotal', direction: 'desc' }); // Default to XP descending
  const [validatorNfts, setValidatorNfts] = useState(new Map()); // profileId -> boolean
  const [loadingValidators, setLoadingValidators] = useState(false);
  const [expandedSeason, setExpandedSeason] = useState(null); // Track expanded season
  const [isRefreshing, setIsRefreshing] = useState(false); // Track refresh state

  // Toggle season expansion
  const toggleSeason = (seasonId) => {
    setExpandedSeason(expandedSeason === seasonId ? null : seasonId);
  };

  // Function to enhance leaderboard with validator NFT data
  const enhanceWithValidatorNfts = async (leaderboardData) => {
    if (!leaderboardData || leaderboardData.length === 0) return;
    
    try {
      setLoadingValidators(true);
      console.log(`[Distribution] 🔍 Starting fast validator NFT checks...`);
      
      // Check top 50 users with cache optimization
      const topUsers = leaderboardData.slice(0, 50);
      
      // First, immediately show known validator NFT holders
      const immediateResults = new Map();
      topUsers.forEach(user => {
        if (isKnownValidatorNftHolder(user.profileId)) {
          immediateResults.set(user.profileId, true);
        }
      });
      
      if (immediateResults.size > 0) {
        console.log(`[Distribution] ⚡ Immediately showing ${immediateResults.size} known validator NFT holders`);
        setValidatorNfts(new Map(immediateResults));
        
        // Force immediate re-render
        const immediateData = leaderboardData.map(user => ({
          ...user,
          _immediateUpdate: Date.now()
        }));
        setLeaderboardData(immediateData);
        setFilteredData(immediateData);
      }
      
      // Then check remaining users via API
      console.log(`[Distribution] 🔍 Checking validator NFTs for ${topUsers.length} users...`);
      const validatorResults = await checkValidatorNftsWithCache(topUsers, 8); // Smaller batches
      
      // Update with complete results
      setValidatorNfts(new Map(validatorResults));
      
      // Log results for debugging
      const validatorCount = Array.from(validatorResults.values()).filter(Boolean).length;
      console.log(`[Distribution] ✅ Found ${validatorCount} validator NFT holders - updating display`);
      
      // Force component re-render by updating leaderboard timestamp
      const enhancedData = leaderboardData.map(user => ({
        ...user,
        _validatorCheck: Date.now() // Add timestamp to force re-render
      }));
      
      setLeaderboardData(enhancedData);
      setFilteredData(enhancedData);
      
      console.log('[Distribution] ✅ Validator NFT enhancement complete');
    } catch (error) {
      console.error('[Distribution] Error enhancing with validator NFTs:', error);
    } finally {
      setLoadingValidators(false);
      setLoadingProgress(null);
    }
  };

  // Initialize Fast API
  useEffect(() => {
    async function initFastApi() {
      try {
        // FastDistributionApi is already instantiated as a singleton
        const api = FastDistributionApi;
        setFastApi(api);
        
        console.log('[Distribution] ✅ Fast API ready - file-first loading enabled');
      } catch (error) {
        console.error('[Distribution] Fast API initialization failed:', error);
      }
    }
    
    initFastApi();
  }, []);

  // Check cache status on mount
  useEffect(() => {
    const standardStats = ethosDistributionApi.getCacheStats();
    const fastStats = fastApi?.getCacheStats();
    setCacheStatus({ standard: standardStats, fast: fastStats });
  }, [leaderboardData, fastApi]);

  useEffect(() => {
    async function fetchDistributionData() {
      const startTime = Date.now();
      
        try {
          console.log('[Distribution] 🚀 Starting data fetch...');
          setLoading(false); // No loading screen
          
          // Force refresh - always use Fast API with file database
          console.log('[Distribution] 🚀 Using Fast API with file database for instant load...');        // Load profiles from file database instantly
        const fastData = await fastApi.getFastLeaderboard(targetUsers, (progress) => {
          console.log(`[Distribution] Fast progress: ${progress.stage} - ${progress.percentage.toFixed(1)}%`);
        });
        
        console.log(`[Distribution] Raw fastData:`, fastData);
        
        if (fastData && fastData.length > 0) {
          // Add rank and xpPercentage to fast data
          const totalXp = fastData.reduce((sum, user) => sum + (user.xpTotal || user.xp || 0), 0);
          const processedData = fastData.map((user, index) => ({
            ...user,
            rank: index + 1,
            xpPercentage: totalXp > 0 ? ((user.xpTotal || user.xp || 0) / totalXp) * 100 : 0
          }));
          
          console.log(`[Distribution] Debug: Total XP = ${totalXp}, First user:`, processedData[0]);
          console.log(`[Distribution] Debug: First user streak:`, processedData[0]?.xpStreakDays);
          console.log(`[Distribution] Debug: Stats loaded, checking for season data...`);
          
          setLeaderboardData(processedData);
          setFilteredData(processedData);
          
          // Get fast distribution stats
          const stats = await fastApi.getFastDistributionStats(processedData);
          setDistributionStats(stats);
          
          // Enhance with validator NFTs immediately (non-blocking)
          enhanceWithValidatorNfts(processedData);
          
          const startTime = Date.now(); // Track API call time for cache detection
          
          // Fallback: if no season data, try to get it directly
          // Always fetch season data since fast API doesn't include it
          try {
            console.log('[Distribution] 📅 Fetching season data from API...');
            setLoadingProgress('Loading season statistics...');
            
            const seasonResponse = await fetch('/api/seasons');
            const seasonData = await seasonResponse.json();
            
            if (seasonData) {
              // Check if this came from cache based on response time
              const responseTime = Date.now() - startTime;
              const isCached = responseTime < 2000; // Less than 2 seconds likely means cached
              
              setCacheStatus(isCached ? '⚡ Using cached data' : '🔄 Fresh data loaded');
              
              setDistributionStats(prev => ({
                ...prev,
                totalSeasons: seasonData.totalSeasons,
                currentSeason: seasonData.currentSeason,
                seasonStats: seasonData.seasonStats
              }));
              console.log('[Distribution] ✅ Season data fetched:', seasonData.totalSeasons, 'seasons', isCached ? '(cached)' : '(fresh)');
            }
          } catch (error) {
            console.warn('[Distribution] ⚠️ Could not fetch season data:', error);
          }
          
          console.log(`[Distribution] ✅ Data loaded: ${processedData.length} users in ${Date.now() - startTime}ms`);
        } else {
          console.log('[Distribution] ⚠️ No data received from Fast API');
          
          // Try direct API call as fallback
          try {
            const response = await fetch('/api/profiles');
            const directData = await response.json();
            console.log('[Distribution] Direct API response:', directData);
            
            if (directData && directData.length > 0) {
              // Add rank and xpPercentage to direct data
              const totalXp = directData.reduce((sum, user) => sum + (user.xpTotal || user.xp || 0), 0);
              const processedDirectData = directData.map((user, index) => ({
                ...user,
                rank: index + 1,
                xpPercentage: totalXp > 0 ? ((user.xpTotal || user.xp || 0) / totalXp) * 100 : 0
              }));
              
              setLeaderboardData(processedDirectData);
              setFilteredData(processedDirectData);
              console.log(`[Distribution] ✅ Direct API data loaded: ${processedDirectData.length} users`);
            }
          } catch (apiError) {
            console.error('[Distribution] Direct API call failed:', apiError);
          }
        }
        
        console.log('[Distribution] Data fetch completed successfully');
        
      } catch (error) {
        console.error('[Distribution] Error fetching data:', error);
        setLoadingProgress({ 
          processed: 0, 
          target: targetUsers, 
          percentage: 0, 
          stage: `Error: ${error.message}` 
        });
      } finally {
        setLoading(false);
        setLoadingProgress(null);
      }
    }

    // Always fetch data when fast API is ready
    if (fastApi) {
      fetchDistributionData();
    }
  }, [targetUsers, fastApi]);  // Removed backgroundEnhancing dependency

  useEffect(() => {
    if (searchTerm.trim()) {
      let filtered;
      if (fastApi) {
        filtered = fastApi.searchLeaderboard(leaderboardData, searchTerm);
      } else {
        filtered = ethosDistributionApi.searchInLeaderboard(leaderboardData, searchTerm);
      }
      setFilteredData(filtered);
      setCurrentPage(1);
    } else {
      setFilteredData(leaderboardData);
      setCurrentPage(1);
    }
  }, [searchTerm, leaderboardData, fastApi]);

  // Calculate total XP - prioritize seasonal data if available, fallback to user profiles
  const seasonalTotalXp = distributionStats?.seasonStats?.reduce((total, season) => {
    const seasonTotal = season.weeks?.reduce((weekTotal, week) => weekTotal + (week.xpDistributed || 0), 0) || 0;
    return total + seasonTotal;
  }, 0) || 0;
  
  const userProfilesTotalXp = ethosDistributionApi.calculateTotalXp(leaderboardData.map(user => ({
    ...user,
    xpTotal: user.xpTotal || user.xp || 0
  })));
  
  // Use seasonal data if available (more accurate), otherwise fallback to user profiles
  const totalXp = seasonalTotalXp > 0 ? seasonalTotalXp : userProfilesTotalXp;
  const xpRanges = ethosDistributionApi.getXpDistributionRanges(leaderboardData.map(user => ({
    ...user,
    xpTotal: user.xpTotal || user.xp || 0
  })));

  // Sorting functionality
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    setCurrentPage(1); // Reset to first page when sorting
  };

  const getSortedData = (data) => {
    if (!sortConfig.key) return data;

    return [...data].sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      // Handle specific field mappings
      if (sortConfig.key === 'totalXp') {
        aValue = a.xpTotal || a.xp || 0;
        bValue = b.xpTotal || b.xp || 0;
      } else if (sortConfig.key === 'user') {
        aValue = a.displayName || a.username || '';
        bValue = b.displayName || b.username || '';
      } else if (sortConfig.key === 'username') {
        aValue = a.username || '';
        bValue = b.username || '';
      } else if (sortConfig.key === 'xpFormatted') {
        aValue = a.xpTotal || a.xp || 0;
        bValue = b.xpTotal || b.xp || 0;
      } else if (sortConfig.key === 'percentage') {
        aValue = a.xpPercentage || 0;
        bValue = b.xpPercentage || 0;
      } else if (sortConfig.key === 'streak') {
        aValue = a.xpStreakDays || 0;
        bValue = b.xpStreakDays || 0;
      }

      // Handle null/undefined values
      if (aValue == null) aValue = 0;
      if (bValue == null) bValue = 0;

      // Convert to numbers if they look like numbers
      if (typeof aValue === 'string' && !isNaN(aValue)) aValue = Number(aValue);
      if (typeof bValue === 'string' && !isNaN(bValue)) bValue = Number(bValue);

      if (sortConfig.direction === 'asc') {
        if (typeof aValue === 'string') {
          return aValue.toLowerCase().localeCompare(bValue.toLowerCase());
        }
        return aValue - bValue;
      } else {
        if (typeof aValue === 'string') {
          return bValue.toLowerCase().localeCompare(aValue.toLowerCase());
        }
        return bValue - aValue;
      }
    });
  };

  const getSortIcon = (columnKey) => {
    const iconProps = { className: classicStyles.sortIcon, size: 16 };
    if (sortConfig.key !== columnKey) {
      return <ArrowUpDown {...iconProps} />;
    }
    if (sortConfig.direction === 'asc') {
      return <ArrowUp {...iconProps} />;
    }
    return <ArrowDown {...iconProps} />;
  };
  
  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const sortedData = getSortedData(filteredData);
  const currentData = sortedData.slice(startIndex, endIndex);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  // Helper function to get the appropriate API for formatting
  const getActiveApi = () => {
    return fastApi || ethosDistributionApi;
  };

  const handleUserClick = (user) => {
    alert(`${user.displayName || 'Unknown User'}\nRank: #${user.rank || 'N/A'}\nXP: ${(user.xpTotal || 0).toLocaleString()}\nPercentage: ${(user.xpPercentage || 0).toFixed(3)}%`);
  };

  const handleForceRefresh = async () => {
    if (confirm('This will clear the cache and download fresh data. Continue?')) {
      setLoading(true);
      setLoadingProgress({ processed: 0, target: targetUsers, percentage: 0, stage: 'Clearing cache...' });
      
      try {
        if (fastApi) {
          console.log('[Distribution] Force refreshing with Fast API...');
          const freshData = await fastApi.forceRefresh(targetUsers, (progress) => {
            setLoadingProgress(progress);
          });
          
          setLeaderboardData(freshData);
          setFilteredData(freshData);
          
          // Get fast distribution stats
          const stats = await fastApi.getFastDistributionStats(freshData);
          setDistributionStats(stats);
          
        } else {
          console.log('[Distribution] Force refreshing with standard API...');
          const freshData = await ethosDistributionApi.forceRefreshLeaderboard(
            targetUsers,
            (progress) => {
              setLoadingProgress(progress);
            }
          );
          
          setLeaderboardData(freshData);
          setFilteredData(freshData);
          
          const stats = await ethosDistributionApi.getXpDistributionStats();
          setDistributionStats(stats);
        }
        
        // Update cache status
        const standardStats = ethosDistributionApi.getCacheStats();
        const fastStats = fastApi?.getCacheStats();
        setCacheStatus({ standard: standardStats, fast: fastStats });
        
      } catch (error) {
        console.error('[Distribution] Error refreshing data:', error);
        setLoadingProgress({ 
          processed: 0, 
          target: targetUsers, 
          percentage: 0, 
          stage: `Error: ${error.message}` 
        });
      } finally {
        setLoading(false);
        setLoadingProgress(null);
      }
    }
  };

  if (loading && leaderboardData.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
        <Navbar />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white mb-4 mx-auto"></div>
            <p className="text-white text-xl mb-2">Loading XP Distribution Data...</p>
            {loadingProgress && (
              <div className="text-center">
                <p className="text-gray-300 mb-2">
                  {loadingProgress.stage || 'Fetching users'}: {loadingProgress.current?.toLocaleString() || loadingProgress.processed?.toLocaleString() || 0} / {loadingProgress.total?.toLocaleString() || loadingProgress.target?.toLocaleString() || 0}
                </p>
                <div className="w-64 bg-gray-700 rounded-full h-2 mx-auto mb-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(loadingProgress.percentage, 100)}%` }}
                  ></div>
                </div>
                <p className="text-gray-400 text-sm">
                  {loadingProgress.percentage.toFixed(1)}% complete
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={classicStyles.container}>
      <Head>
        <title>Ethos XP Distribution | Leaderboard & Analytics</title>
        <meta name="description" content="Comprehensive XP distribution analysis with user rankings, statistics, and search functionality" />
        <link rel="icon" href="/ethos.png" />
      </Head>

      <Navbar />

      <main>
        {/* Header */}
        <header className={classicStyles.header}>
          <h1 className={classicStyles.title}>XP Distribution Center</h1>
          <p className={classicStyles.subtitle}>
            Comprehensive analysis of Ethos XP distribution across all users and seasons.
          </p>
        </header>

        {/* Statistics Overview */}
        <section className={classicStyles.statsGrid}>
          <div className={classicStyles.statCard}>
            <p className={classicStyles.statLabel}>Total XP Distributed</p>
            <p className={classicStyles.statValue}>{ethosDistributionApi.formatXpToMillions(totalXp)}</p>
            <p className={classicStyles.statSubValue}>{totalXp.toLocaleString()} XP</p>
          </div>
          <div className={classicStyles.statCard}>
            <p className={classicStyles.statLabel}>Active Users</p>
            <p className={classicStyles.statValue}>{leaderboardData.length.toLocaleString()}</p>
            <p className={classicStyles.statSubValue}>With XP data</p>
          </div>
          <div className={classicStyles.statCard}>
            <p className={classicStyles.statLabel}>Total Seasons</p>
            <p className={classicStyles.statValue}>{distributionStats?.totalSeasons || '...'}</p>
            <p className={classicStyles.statSubValue}>Current: {distributionStats?.currentSeason?.name || '...'}</p>
          </div>
          <div className={classicStyles.statCard}>
            <p className={classicStyles.statLabel}>Current Week</p>
            <p className={classicStyles.statValue}>{distributionStats?.currentSeason?.week || '...'}</p>
            <p className={classicStyles.statSubValue}>Season {distributionStats?.currentSeason?.id || '...'}</p>
          </div>
        </section>

        {/* Navigation Tabs */}
        <nav className={classicStyles.tabs}>
          <button
            onClick={() => setSelectedView('leaderboard')}
            className={selectedView === 'leaderboard' ? classicStyles.tabButtonActive : classicStyles.tabButton}
          >
            Leaderboard
          </button>
          <button
            onClick={() => setSelectedView('distribution')}
            className={selectedView === 'distribution' ? classicStyles.tabButtonActive : classicStyles.tabButton}
          >
            Analysis
          </button>
          <button
            onClick={() => setSelectedView('seasons')}
            className={selectedView === 'seasons' ? classicStyles.tabButtonActive : classicStyles.tabButton}
          >
            Seasons
          </button>
        </nav>

        {/* Leaderboard View */}
        {selectedView === 'leaderboard' && (
          <section>
            <div className={classicStyles.controlsContainer}>
              <div className={classicStyles.searchBox}>
                <input
                  type="text"
                  placeholder="Search by name, username, or ID..."
                  value={searchTerm}
                  onChange={handleSearch}
                  className={classicStyles.searchInput}
                />
              </div>
              <button
                onClick={handleForceRefresh}
                disabled={loading}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700"
              >
                {loading ? 'Refreshing...' : 'Force Refresh'}
              </button>
            </div>

            <div className={classicStyles.tableContainer}>
              <div className={classicStyles.tableWrapper}>
                <table className={classicStyles.table}>
                  <thead>
                    <tr>
                      <th onClick={() => handleSort('rank')}>Rank {getSortIcon('rank')}</th>
                      <th>User</th>
                      <th onClick={() => handleSort('totalXp')}>Total XP {getSortIcon('totalXp')}</th>
                      <th onClick={() => handleSort('percentage')}>Percentage {getSortIcon('percentage')}</th>
                      <th onClick={() => handleSort('score')}>Score {getSortIcon('score')}</th>
                      <th onClick={() => handleSort('streak')}>Streak {getSortIcon('streak')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentData.map((user) => (
                      <tr key={user.profileId} onClick={() => handleUserClick(user)}>
                        <td>
                          <span className={classicStyles.rank}>#{user.rank}</span>
                        </td>
                        <td>
                          <div className={classicStyles.userCell}>
                            <img
                              className={classicStyles.avatar}
                              src={user.avatarUrl || '/ethos.png'}
                              alt={user.displayName || 'User avatar'}
                              onError={(e) => { e.target.src = '/ethos.png'; }}
                            />
                            <div>
                              <div className={classicStyles.userName}>
                                {user.displayName || user.username || 'Unknown'}
                                {hasValidatorNft(user.profileId, validatorNfts) && (
                                  <span className={classicStyles.validatorSymbol}>𝑽</span>
                                )}
                              </div>
                              <div className={classicStyles.userHandle}>@{user.username || '...'}</div>
                            </div>
                          </div>
                        </td>
                        <td>{(user.xpTotal || user.xp || 0).toLocaleString()}</td>
                        <td>{(user.xpPercentage || 0).toFixed(4)}%</td>
                        <td>{(user.score || 0).toLocaleString()}</td>
                        <td>{user.xpStreakDays || 0} days</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className={classicStyles.pagination}>
                  <div className={classicStyles.paginationInfo}>
                    Page {currentPage} of {totalPages} ({filteredData.length} results)
                  </div>
                  <div className={classicStyles.paginationControls}>
                    <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}>
                      Prev
                    </button>
                    <span>Page {currentPage}</span>
                    <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}>
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Other Views (Distribution/Seasons) would go here, simplified for now */}
         {selectedView === 'distribution' && (
          <div className="space-y-6">
            <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-6">
              <h2 className="text-2xl font-bold text-white mb-6">XP Distribution Analysis</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* XP Ranges */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Users by XP Range</h3>
                  <div className="space-y-3">
                    {Object.entries(xpRanges).map(([range, count]) => (
                      <div key={range} className="flex items-center justify-between">
                        <span className="text-gray-300">{range} XP:</span>
                        <div className="flex items-center">
                          <div className="w-24 bg-gray-700 rounded-full h-2 mr-3">
                            <div
                              className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full"
                              style={{ width: `${(count / leaderboardData.length) * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-white font-medium w-12 text-right">{count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Contributors */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Top XP Contributors</h3>
                  <div className="space-y-3">
                    {leaderboardData.slice(0, 5).map((user, index) => (
                      <div key={user.profileId} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <span className="text-gray-400 w-6">#{index + 1}</span>
                          <span className="text-white ml-2">{user.displayName}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-blue-400 font-semibold">
                            {ethosDistributionApi.formatXpToMillions(user.xpTotal || user.xp || 0)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {(user.xpPercentage || 0).toFixed(2)}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedView === 'seasons' && (
          <div className="space-y-6">
            <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Season & Week Breakdown</h2>
                <div className="flex items-center space-x-4">
                  {cacheStatus && (
                    <span className="text-sm text-gray-400">
                      {typeof cacheStatus === 'string' ? cacheStatus : '⚡ Data loaded from cache'}
                    </span>
                  )}
                  <button
                    onClick={refreshSeasonData}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
                    disabled={isRefreshing}
                  >
                    {isRefreshing ? (
                      <Loader2 className="animate-spin mr-2" size={16} />
                    ) : (
                      '🔄'
                    )}
                    {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
                  </button>
                </div>
              </div>
              
              {distributionStats?.seasonStats?.length > 0 ? (
                <div className="space-y-4">
                  {distributionStats.seasonStats.map((season) => {
                    const seasonXp = season.weeks?.reduce((sum, week) => sum + (week.xpDistributed || 0), 0) || 0;
                    const isExpanded = expandedSeason === season.seasonId;

                    return (
                      <div key={season.seasonId} className="bg-[#0d1117] border border-[#30363d] rounded-lg overflow-hidden">
                        {/* Season Header */}
                        <div 
                          className="flex justify-between items-center p-4 cursor-pointer hover:bg-[#161b22] transition-colors"
                          onClick={() => toggleSeason(season.seasonId)}
                        >
                          <div className="flex items-center space-x-4">
                            <div className="flex-shrink-0">
                              {season.seasonId === distributionStats.currentSeason?.id ? (
                                <span className="px-3 py-1 bg-green-600 text-white text-sm rounded-full">
                                  Current
                                </span>
                              ) : (
                                <span className="px-3 py-1 bg-gray-600 text-gray-300 text-sm rounded-full">
                                  Completed
                                </span>
                              )}
                            </div>
                            <div>
                              <h3 className="text-lg font-bold text-white">{season.seasonName}</h3>
                              <p className="text-sm text-gray-400">
                                {season.totalWeeks} weeks | Started on {new Date(season.startDate).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-6">
                            <div className="text-right">
                              <p className="text-sm text-gray-400">Total XP Distributed</p>
                              <p className="text-xl font-bold text-blue-400">
                                {ethosDistributionApi.formatXpToMillions(seasonXp)}
                              </p>
                            </div>
                            <div className="text-gray-400">
                              {isExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                            </div>
                          </div>
                        </div>

                        {/* Expanded Weekly Breakdown */}
                        {isExpanded && (
                          <div className="p-4 bg-[#010409]">
                            <h4 className="text-md font-semibold text-white mb-3">Weekly Breakdown</h4>
                            <div className="overflow-x-auto">
                              <table className="w-full border-collapse">
                                <thead>
                                  <tr className="border-b border-[#30363d]">
                                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-400 uppercase">Week</th>
                                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-400 uppercase">Start Date</th>
                                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-400 uppercase">Active Users</th>
                                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-400 uppercase">XP Distributed</th>
                                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-400 uppercase">Avg XP/User</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {season.weeks.map((week) => {
                                    return (
                                      <tr key={`${season.seasonId}-week-${week.week}`} className="border-b border-[#21262d] hover:bg-[#161b22]">
                                        <td className="py-3 px-3 text-white font-medium">{week.week}</td>
                                        <td className="py-3 px-3 text-gray-400">{new Date(week.startDate).toLocaleDateString()}</td>
                                        <td className="py-3 px-3 text-white">{week.participants.toLocaleString()}</td>
                                        <td className="py-3 px-3 text-blue-400">{Math.round(week.xpDistributed).toLocaleString()}</td>
                                        <td className="py-3 px-3 text-gray-300">
                                          {week.participants > 0 ? Math.round(week.xpDistributed / week.participants).toLocaleString() : 0}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-400">Season data is loading...</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
