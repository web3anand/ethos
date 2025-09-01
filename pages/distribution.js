import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Navbar from '../components/Navbar';
import { ethosDistributionApi } from '../utils/ethosDistributionApi';
import EnhancedDistributionApi from '../utils/enhancedDistributionApi';
import styles from '../styles/Distribution.module.css';

export default function Distribution() {
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [distributionStats, setDistributionStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredData, setFilteredData] = useState([]);
  const [selectedView, setSelectedView] = useState('leaderboard');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);
  const [targetUsers] = useState(10000);
  const [cacheStatus, setCacheStatus] = useState(null);
  const [useEnhancedMode, setUseEnhancedMode] = useState(false);
  const [enhancedApi, setEnhancedApi] = useState(null);

  // Initialize Enhanced API
  useEffect(() => {
    async function initEnhancedApi() {
      try {
        const api = new EnhancedDistributionApi();
        const isReady = await api.initialize();
        setEnhancedApi(api);
        
        if (isReady) {
          console.log('[Distribution] ✅ Enhanced API ready - blockchain mode available');
        } else {
          console.log('[Distribution] ⚠️ Enhanced API fallback mode');
        }
      } catch (error) {
        console.error('[Distribution] Enhanced API initialization failed:', error);
      }
    }
    
    initEnhancedApi();
  }, []);

  // Check cache status on mount
  useEffect(() => {
    const stats = ethosDistributionApi.getCacheStats();
    const enhancedStats = enhancedApi?.getCacheStats();
    setCacheStatus({ ...stats, enhanced: enhancedStats });
  }, [leaderboardData, enhancedApi]);

  useEffect(() => {
    async function fetchDistributionData() {
      try {
        console.log('[Distribution] Starting data fetch...');
        setLoading(true);
        setLoadingProgress({ processed: 0, target: targetUsers, percentage: 0, stage: 'Initializing...' });
        
        if (useEnhancedMode && enhancedApi) {
          console.log('[Distribution] 🚀 Using Enhanced API (blockchain mode)...');
          
          // Use comprehensive blockchain-based approach
          const comprehensiveData = await enhancedApi.buildComprehensiveLeaderboard((progress) => {
            setLoadingProgress(progress);
            console.log(`[Distribution] Enhanced progress: ${progress.stage} - ${progress.percentage.toFixed(1)}%`);
          });
          
          if (comprehensiveData && comprehensiveData.length > 0) {
            setLeaderboardData(comprehensiveData);
            setFilteredData(comprehensiveData);
            
            // Get enhanced distribution stats
            const stats = await enhancedApi.getDistributionStats(comprehensiveData);
            setDistributionStats(stats);
            
            console.log(`[Distribution] ✅ Enhanced data loaded: ${comprehensiveData.length} users from blockchain`);
          }
          
        } else {
          console.log('[Distribution] Using standard API mode...');
          
          // First, get quick leaderboard for immediate display
          console.log('[Distribution] Fetching quick leaderboard...');
          const quickData = await ethosDistributionApi.getQuickLeaderboard();
          if (quickData && quickData.length > 0) {
            setLeaderboardData(quickData);
            setFilteredData(quickData);
            console.log(`[Distribution] Quick data loaded: ${quickData.length} users`);
          }
          
          // Then get comprehensive data with progress updates
          console.log('[Distribution] Fetching comprehensive leaderboard...');
          const comprehensiveData = await ethosDistributionApi.getLeaderboardData(
            targetUsers,
            (progress) => {
              setLoadingProgress(progress);
              console.log(`[Distribution] Progress: ${progress.processed}/${progress.target} (${progress.percentage.toFixed(1)}%)`);
            }
          );
          
          // Get distribution stats in parallel
          const stats = await ethosDistributionApi.getXpDistributionStats();
          
          // Update with comprehensive data
          if (comprehensiveData && comprehensiveData.length > 0) {
            setLeaderboardData(comprehensiveData);
            setFilteredData(comprehensiveData);
            console.log(`[Distribution] Comprehensive data loaded: ${comprehensiveData.length} users`);
          }
          
          setDistributionStats(stats);
        }
        
        console.log('[Distribution] All data fetched successfully');
        
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

    // Only fetch data when enhanced API is ready (if using enhanced mode) or immediately (if using standard mode)
    if (!useEnhancedMode || enhancedApi) {
      fetchDistributionData();
    }
  }, [targetUsers, useEnhancedMode, enhancedApi]);

  useEffect(() => {
    if (searchTerm.trim()) {
      let filtered;
      if (useEnhancedMode && enhancedApi) {
        filtered = enhancedApi.searchLeaderboard(leaderboardData, searchTerm);
      } else {
        filtered = ethosDistributionApi.searchInLeaderboard(leaderboardData, searchTerm);
      }
      setFilteredData(filtered);
      setCurrentPage(1);
    } else {
      setFilteredData(leaderboardData);
      setCurrentPage(1);
    }
  }, [searchTerm, leaderboardData, useEnhancedMode, enhancedApi]);

  const totalXp = ethosDistributionApi.calculateTotalXp(leaderboardData);
  const xpRanges = ethosDistributionApi.getXpDistributionRanges(leaderboardData);
  
  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = filteredData.slice(startIndex, endIndex);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  // Helper function to get the appropriate API for formatting
  const getActiveApi = () => {
    return useEnhancedMode && enhancedApi ? enhancedApi : ethosDistributionApi;
  };

  const handleUserClick = (user) => {
    alert(`${user.displayName}\nRank: #${user.rank}\nXP: ${user.xpTotal.toLocaleString()}\nPercentage: ${user.xpPercentage.toFixed(3)}%`);
  };

  const handleForceRefresh = async () => {
    if (confirm('This will clear the cache and download fresh data. Continue?')) {
      setLoading(true);
      setLoadingProgress({ processed: 0, target: targetUsers, percentage: 0, stage: 'Clearing cache...' });
      
      try {
        if (useEnhancedMode && enhancedApi) {
          console.log('[Distribution] Force refreshing with Enhanced API...');
          const freshData = await enhancedApi.forceRefresh((progress) => {
            setLoadingProgress(progress);
          });
          
          setLeaderboardData(freshData);
          setFilteredData(freshData);
          
          // Get enhanced distribution stats
          const stats = await enhancedApi.getDistributionStats(freshData);
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
        const enhancedStats = enhancedApi?.getCacheStats();
        setCacheStatus({ ...standardStats, enhanced: enhancedStats });
        
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      <Head>
        <title>Ethos XP Distribution | Leaderboard & Statistics</title>
        <meta name="description" content="Comprehensive XP distribution analysis with user rankings, statistics, and search functionality" />
        <link rel="icon" href="/ethos.png" />
      </Head>

      <Navbar />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
            XP Distribution Center
          </h1>
          <p className="text-gray-300 text-lg">
            Comprehensive analysis of Ethos XP distribution across all users and seasons
          </p>
        </div>

        {/* Statistics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className={`${styles.statCard} glass-container`}>
            <h3 className="text-sm font-medium text-gray-400 mb-2">Total XP</h3>
            <p className="text-2xl font-bold text-white">
              {getActiveApi().formatXP ? getActiveApi().formatXP(totalXp) : ethosDistributionApi.formatXpToMillions(totalXp)}
            </p>
            <p className="text-xs text-gray-500">{totalXp.toLocaleString()} XP</p>
          </div>
          
          <div className={`${styles.statCard} glass-container`}>
            <h3 className="text-sm font-medium text-gray-400 mb-2">Active Users</h3>
            <p className="text-2xl font-bold text-white">
              {leaderboardData.length.toLocaleString()}
              {loading && (
                <span className="text-sm text-blue-400 ml-2">
                  (Loading more...)
                </span>
              )}
            </p>
            <p className="text-xs text-gray-500">
              {loading ? 'Expanding leaderboard...' : 'With XP data'}
            </p>
          </div>
          
          <div className={`${styles.statCard} glass-container`}>
            <h3 className="text-sm font-medium text-gray-400 mb-2">Total Seasons</h3>
            <p className="text-2xl font-bold text-white">
              {distributionStats?.totalSeasons || 0}
            </p>
            <p className="text-xs text-gray-500">Current: {distributionStats?.currentSeason?.name}</p>
          </div>
          
          <div className={`${styles.statCard} glass-container`}>
            <h3 className="text-sm font-medium text-gray-400 mb-2">Current Week</h3>
            <p className="text-2xl font-bold text-white">
              {distributionStats?.currentSeason?.week || 0}
            </p>
            <p className="text-xs text-gray-500">Season {distributionStats?.currentSeason?.id}</p>
          </div>
        </div>

        {/* Loading Progress Bar (when loading more data) */}
        {loading && loadingProgress && leaderboardData.length > 0 && (
          <div className="glass-container p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white font-medium">
                {useEnhancedMode ? 'Blockchain Analysis' : 'Expanding Leaderboard'}
              </span>
              <span className="text-gray-300 text-sm">
                {loadingProgress.current?.toLocaleString() || loadingProgress.processed?.toLocaleString() || 0} / {loadingProgress.total?.toLocaleString() || loadingProgress.target?.toLocaleString() || 0} users
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  useEnhancedMode 
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600' 
                    : 'bg-gradient-to-r from-blue-600 to-purple-600'
                }`}
                style={{ width: `${Math.min(loadingProgress.percentage, 100)}%` }}
              ></div>
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {loadingProgress.percentage.toFixed(1)}% complete - {loadingProgress.stage || (loadingProgress.query ? `Currently searching: "${loadingProgress.query}"` : 'Processing...')}
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 mb-6">
          <div className="flex space-x-4">
            <button
              onClick={() => setSelectedView('leaderboard')}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                selectedView === 'leaderboard'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              XP Leaderboard
            </button>
            <button
              onClick={() => setSelectedView('distribution')}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                selectedView === 'distribution'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Distribution Analysis
            </button>
            <button
              onClick={() => setSelectedView('seasons')}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                selectedView === 'seasons'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Season Breakdown
            </button>
          </div>
          
          {/* Cache Status & Controls */}
          <div className="flex items-center space-x-4">
            {/* Enhanced Mode Toggle */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setUseEnhancedMode(!useEnhancedMode)}
                disabled={loading || !enhancedApi}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  useEnhancedMode
                    ? 'bg-purple-600 text-white border border-purple-500'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
                } ${(!enhancedApi || loading) ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={useEnhancedMode ? 'Using blockchain-based data' : 'Using API-based data'}
              >
                {useEnhancedMode ? '🔗 Blockchain' : '🌐 API'}
              </button>
            </div>
            
            {/* Cache Status */}
            {cacheStatus && (
              <div className="text-sm text-gray-400">
                Cache: {cacheStatus.totalItems || 0} items
                {useEnhancedMode && cacheStatus.enhanced && (
                  <span className="text-purple-400 ml-1">
                    | Enhanced: {cacheStatus.enhanced.distributionCache + cacheStatus.enhanced.profileCache} items
                  </span>
                )}
                {cacheStatus.items?.some(item => item.key.includes('leaderboard')) && (
                  <span className="text-green-400 ml-1">✓ Cached</span>
                )}
              </div>
            )}
            
            {/* Force Refresh Button */}
            <button
              onClick={handleForceRefresh}
              disabled={loading}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                loading
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
              }`}
            >
              {loading ? 'Refreshing...' : 'Force Refresh'}
            </button>
          </div>
        </div>

        {/* Leaderboard View */}
        {selectedView === 'leaderboard' && (
          <div className="space-y-6">
            {/* Search Bar */}
            <div className="glass-container p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Search users by name, username, or profile ID..."
                    value={searchTerm}
                    onChange={handleSearch}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="text-gray-400 flex items-center">
                  {filteredData.length} of {leaderboardData.length} users
                </div>
              </div>
            </div>

            {/* Leaderboard Table */}
            <div className="glass-container overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-800 border-b border-gray-600">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Rank
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Total XP
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        XP (Millions)
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Percentage
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Score
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Streak
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {currentData.map((user) => (
                      <tr
                        key={user.profileId}
                        onClick={() => handleUserClick(user)}
                        className="hover:bg-gray-800 cursor-pointer transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className={`text-lg font-bold ${
                              user.rank <= 3 ? 'text-yellow-400' :
                              user.rank <= 10 ? 'text-blue-400' :
                              'text-gray-300'
                            }`}>
                              #{user.rank}
                            </span>
                            {user.rank === 1 && <span className="ml-2 text-xl">🏆</span>}
                            {user.rank === 2 && <span className="ml-2 text-xl">🥈</span>}
                            {user.rank === 3 && <span className="ml-2 text-xl">🥉</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {user.avatarUrl && (
                              <img
                                className="h-10 w-10 rounded-full mr-3"
                                src={user.avatarUrl}
                                alt={user.displayName}
                                onError={(e) => {
                                  e.target.src = '/ethos.png';
                                }}
                              />
                            )}
                            <div>
                              <div className="text-sm font-medium text-white">
                                {user.displayName}
                              </div>
                              <div className="text-sm text-gray-400">
                                @{user.username}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                          {user.xpTotal.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-400 font-semibold">
                          {getActiveApi().formatXP ? getActiveApi().formatXP(user.xpTotal) : ethosDistributionApi.formatXpToMillions(user.xpTotal)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-16 bg-gray-700 rounded-full h-2 mr-2">
                              <div
                                className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
                                style={{ width: `${Math.min(user.xpPercentage * 10, 100)}%` }}
                              ></div>
                            </div>
                            <span className="text-sm text-gray-300">
                              {user.xpPercentage.toFixed(3)}%
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {user.score.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {user.xpStreakDays} days
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 bg-gray-800 border-t border-gray-600">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-400">
                      Showing {startIndex + 1} to {Math.min(endIndex, filteredData.length)} of {filteredData.length} users
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 bg-gray-700 text-gray-300 rounded disabled:opacity-50 hover:bg-gray-600"
                      >
                        Previous
                      </button>
                      <span className="px-3 py-1 text-gray-300">
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 bg-gray-700 text-gray-300 rounded disabled:opacity-50 hover:bg-gray-600"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Distribution Analysis View */}
        {selectedView === 'distribution' && (
          <div className="space-y-6">
            <div className="glass-container p-6">
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
                            {getActiveApi().formatXP ? getActiveApi().formatXP(user.xpTotal) : ethosDistributionApi.formatXpToMillions(user.xpTotal)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {user.xpPercentage.toFixed(2)}%
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

        {/* Season Breakdown View */}
        {selectedView === 'seasons' && distributionStats && (
          <div className="space-y-6">
            <div className="glass-container p-6">
              <h2 className="text-2xl font-bold text-white mb-6">Season & Week Breakdown</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {distributionStats.seasonStats.map((season) => (
                  <div key={season.seasonId} className="bg-gray-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-white">
                        {season.seasonName}
                      </h3>
                      {season.seasonId === distributionStats.currentSeason?.id && (
                        <span className="px-2 py-1 bg-green-600 text-white text-xs rounded-full">
                          Current
                        </span>
                      )}
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Total Weeks:</span>
                        <span className="text-white font-medium">{season.totalWeeks}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Start Date:</span>
                        <span className="text-white">
                          {new Date(season.startDate).toLocaleDateString()}
                        </span>
                      </div>
                      {season.weeks.length > 0 && (
                        <div className="mt-3">
                          <h4 className="text-gray-300 font-medium mb-2">Week Distribution:</h4>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {season.weeks.slice(0, 6).map((week) => (
                              <div key={week.week} className="flex justify-between text-gray-400">
                                <span>Week {week.week}:</span>
                                <span>
                                  {new Date(week.startDate).toLocaleDateString('en-US', { 
                                    month: 'short', 
                                    day: 'numeric' 
                                  })}
                                </span>
                              </div>
                            ))}
                          </div>
                          {season.weeks.length > 6 && (
                            <div className="text-xs text-gray-500 mt-2">
                              ...and {season.weeks.length - 6} more weeks
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
