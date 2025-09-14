import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Navbar from '../components/Navbar';
import { ethosDistributionApi } from '../utils/ethosDistributionApi';
import FastDistributionApi from '../utils/fastDistributionApi';
import { checkValidatorNftsForProfiles, addValidatorSymbolToUsername, hasValidatorNft } from '../utils/validatorNftApi';
import { checkValidatorNftsWithCache, isKnownValidatorNftHolder } from '../utils/validatorNftCache';
import { ArrowUp, ArrowDown, ArrowUpDown, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import classicStyles from '../styles/Distribution.classic.module.css';
import CustomDropdown from '../components/CustomDropdown';

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

  const targetUsers = 100000; // Load all profiles from database (no limit)
  const [cacheStatus, setCacheStatus] = useState(null);
  const [fastApi, setFastApi] = useState(null);
  const [backgroundEnhancing, setBackgroundEnhancing] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'xpTotal', direction: 'desc' }); // Default to XP descending
  const [validatorNfts, setValidatorNfts] = useState(new Map()); // profileId -> boolean
  const [loadingValidators, setLoadingValidators] = useState(false);
  const [updateStatus, setUpdateStatus] = useState(null); // Track update status
  const [fullRefreshStatus, setFullRefreshStatus] = useState(null); // Track full refresh status

  // Check update status
  const checkUpdateStatus = async () => {
    try {
      const response = await fetch('/api/update-status');
      const status = await response.json();
      setUpdateStatus(status);
      return status;
    } catch (error) {
      console.error('Error checking update status:', error);
      return null;
    }
  };

  // Check full refresh status
  const checkFullRefreshStatus = async () => {
    try {
      const response = await fetch('/api/force-full-refresh');
      const status = await response.json();
      setFullRefreshStatus(status);
      return status;
    } catch (error) {
      console.error('Error checking full refresh status:', error);
      return null;
    }
  };

  // Check update status on component mount
  useEffect(() => {
    checkUpdateStatus();
    checkFullRefreshStatus();
    // Check every 30 seconds
    const interval = setInterval(() => {
      checkUpdateStatus();
      checkFullRefreshStatus();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Weekly leaderboard state
  const [weeklyData, setWeeklyData] = useState([]);
  const [filteredWeeklyData, setFilteredWeeklyData] = useState([]);
  const [displayedWeeklyData, setDisplayedWeeklyData] = useState([]);
  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState('1'); // Default to Season 1
  const [selectedWeek, setSelectedWeek] = useState(''); // Empty means season totals
  const [weeklySearchTerm, setWeeklySearchTerm] = useState('');
  const [availableSeasons, setAvailableSeasons] = useState([]);
  const [availableWeeks, setAvailableWeeks] = useState([]);
  const [weeklyPagination, setWeeklyPagination] = useState({ total: 0, hasMore: false });
  const [weeklyCurrentPage, setWeeklyCurrentPage] = useState(1);
  const weeklyItemsPerPage = 25;
  const [weeklyDistributionAnalysis, setWeeklyDistributionAnalysis] = useState([]);

  // Fetch weekly leaderboard data
  const fetchWeeklyData = async (season = selectedSeason, week = selectedWeek) => {
    try {
      setWeeklyLoading(true);
      const params = new URLSearchParams({
        offset: '0',
        limit: '100000' // Get all data for local filtering
      });
      
      if (season) params.append('season', season);
      if (week) params.append('week', week);
      
      const response = await fetch(`/api/csv-weekly-xp?${params}`);
      const data = await response.json();
      
      if (response.ok) {
        setWeeklyData(data.profiles);
        setFilteredWeeklyData(data.profiles); // Initialize filtered data
        setWeeklyPagination({ total: data.total, hasMore: data.pagination.hasMore });
        setAvailableSeasons(data.seasons);
        setAvailableWeeks(data.weeks.filter(w => w.season_id == season));
      } else {
        console.error('Error fetching weekly data:', data.error);
        setWeeklyData([]);
        setFilteredWeeklyData([]);
      }
    } catch (error) {
      console.error('Error fetching weekly data:', error);
      setWeeklyData([]);
      setFilteredWeeklyData([]);
    } finally {
      setWeeklyLoading(false);
    }
  };

  // Handle season change
  const handleSeasonChange = (season) => {
    setSelectedSeason(season);
    setSelectedWeek(''); // Reset week when season changes
    setWeeklySearchTerm(''); // Reset search when season changes
    setWeeklyCurrentPage(1); // Reset to first page
    fetchWeeklyData(season, '');
  };

  // Handle week change
  const handleWeekChange = (week) => {
    setSelectedWeek(week);
    setWeeklySearchTerm(''); // Reset search when week changes
    setWeeklyCurrentPage(1); // Reset to first page
    fetchWeeklyData(selectedSeason, week);
  };

  // Handle weekly search - filters locally
  const handleWeeklySearch = (term) => {
    setWeeklySearchTerm(term);
  };

  // Filter weekly data when search term or data changes
  useEffect(() => {
    if (!weeklySearchTerm.trim()) {
      // If search is empty, show all data
      setFilteredWeeklyData(weeklyData);
    } else {
      // Filter data locally
      const filtered = weeklyData.filter(user => {
        const searchLower = weeklySearchTerm.toLowerCase();
        return (
          user.username?.toLowerCase().includes(searchLower) ||
          user.display_name?.toLowerCase().includes(searchLower) ||
          user.profile_id?.toString().includes(searchLower)
        );
      });
      setFilteredWeeklyData(filtered);
    }
    setWeeklyCurrentPage(1); // Reset to first page when filtering
  }, [weeklySearchTerm, weeklyData]);

  // Paginate filtered data for display
  useEffect(() => {
    const startIndex = (weeklyCurrentPage - 1) * weeklyItemsPerPage;
    const endIndex = startIndex + weeklyItemsPerPage;
    const paginatedData = filteredWeeklyData.slice(startIndex, endIndex);
    setDisplayedWeeklyData(paginatedData);
  }, [filteredWeeklyData, weeklyCurrentPage]);

  // Fetch weekly distribution analysis data
  const fetchWeeklyDistributionAnalysis = async () => {
    try {
      console.log('[Distribution] 📊 Fetching weekly distribution analysis...');
      
      const response = await fetch('/api/csv-weekly-xp?offset=0&limit=100000'); // Get all weekly data
      const data = await response.json();
      
      if (data && data.profiles) {
        // Process weekly data to create analysis
        const weeklyStats = {};
        
        data.profiles.forEach(profile => {
          const season = profile.season_id || profile.season;
          const week = profile.week;
          const key = `${season}-${week}`;
          
          if (!weeklyStats[key]) {
            weeklyStats[key] = {
              season: season,
              week: week,
              totalXp: 0,
              activeUsers: 0,
              users: new Set()
            };
          }
          
          weeklyStats[key].totalXp += profile.weekly_xp || 0;
          weeklyStats[key].users.add(profile.profile_id);
        });
        
        // Convert to array and calculate additional metrics
        const analysis = Object.values(weeklyStats).map(week => {
          week.activeUsers = week.users.size;
          week.avgXpPerUser = week.activeUsers > 0 ? week.totalXp / week.activeUsers : 0;
          delete week.users; // Remove Set object
          return week;
        });
        
        // Calculate season totals for percentage calculation
        const seasonTotals = {};
        const seasonUserCounts = {};
        analysis.forEach(week => {
          if (!seasonTotals[week.season]) {
            seasonTotals[week.season] = 0;
            seasonUserCounts[week.season] = new Set();
          }
          seasonTotals[week.season] += week.totalXp;
          // Track unique users per season
          weeklyStats[`${week.season}-${week.week}`]?.users?.forEach(userId => {
            seasonUserCounts[week.season].add(userId);
          });
        });
        
        // Add percentage of season total and season user count
        analysis.forEach(week => {
          week.percentageOfSeason = seasonTotals[week.season] > 0 
            ? (week.totalXp / seasonTotals[week.season]) * 100 
            : 0;
          week.seasonTotalUsers = seasonUserCounts[week.season]?.size || 0;
        });
        
        // Sort by season and week
        analysis.sort((a, b) => {
          if (a.season !== b.season) {
            return a.season - b.season;
          }
          return a.week - b.week;
        });
        
        setWeeklyDistributionAnalysis(analysis);
        console.log('[Distribution] ✅ Weekly distribution analysis loaded:', analysis.length, 'weeks');
      }
    } catch (error) {
      console.error('[Distribution] ❌ Error fetching weekly distribution analysis:', error);
    }
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
          
          // Force refresh - always use Fast API with file database
          console.log('[Distribution] 🚀 Using Fast API with file database for instant load...');        // Load profiles from file database instantly
        const fastData = await fastApi.getFastLeaderboard(targetUsers, (progress) => {
          console.log(`[Distribution] Fast progress: ${progress.stage} - ${progress.percentage.toFixed(1)}%`);
          setLoadingProgress(progress);
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
          
          // Get fast distribution stats from complete dataset (don't pass processedData to get full stats)
          console.log('[Distribution] 📊 Calculating complete distribution stats...');
          const stats = await fastApi.getFastDistributionStats();
          console.log('[Distribution] Debug stats:', stats);
          console.log('[Distribution] Stats totalXp type:', typeof stats.totalXp, 'value:', stats.totalXp);
          
          if (stats.totalXp !== undefined) {
            console.log(`[Distribution] ✅ Stats calculated: ${stats.totalUsers} total users, ${stats.totalXp.toLocaleString()} total XP`);
          } else {
            console.error('[Distribution] ❌ Stats totalXp is undefined!');
            console.error('[Distribution] Full stats object:', JSON.stringify(stats, null, 2));
          }
          
          setDistributionStats(stats);
          
          // Enhance with validator NFTs immediately (non-blocking)
          enhanceWithValidatorNfts(processedData);
          
          const startTime = Date.now(); // Track API call time for cache detection
          
          // Fallback: if no season data, try to get it directly
          // Always fetch season data since fast API doesn't include it
          try {
            console.log('[Distribution] 📅 Fetching season data from API...');
            setLoadingProgress('Loading season statistics...');
            
            const seasonResponse = await fetch('/api/xp/seasons');
            const seasonData = await seasonResponse.json();
            
            if (seasonData) {
              // Check if this came from cache based on response time
              const responseTime = Date.now() - startTime;
              const isCached = responseTime < 2000; // Less than 2 seconds likely means cached
              
              setCacheStatus(isCached ? '⚡ Using cached data' : '🔄 Fresh data loaded');
              
              setDistributionStats(prev => ({
                ...prev,
                totalSeasons: seasonData.totalSeasons,
                currentSeason: {
                  id: seasonData.currentSeason,
                  name: `Season ${seasonData.currentSeason}`
                },
                currentWeek: {
                  week: seasonData.currentWeek
                },
                seasonStats: seasonData.seasonStats
              }));
              console.log('[Distribution] ✅ Season data fetched:', seasonData.totalSeasons, 'seasons', isCached ? '(cached)' : '(fresh)');
            }
          } catch (error) {
            console.warn('[Distribution] ⚠️ Could not fetch season data:', error);
          }
          
          console.log(`[Distribution] ✅ Data loaded: ${processedData.length} users in ${Date.now() - startTime}ms`);
          
          // Fetch weekly distribution analysis
          await fetchWeeklyDistributionAnalysis();
        } else {
          console.log('[Distribution] ⚠️ No data received from Fast API');
          
          // Try direct API call as fallback
          try {
            const response = await fetch('/api/comprehensive-profiles');
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
        setLoadingProgress(null);
      }
    }

    // Always fetch data when fast API is ready
    if (fastApi) {
      fetchDistributionData();
    }
  }, [targetUsers, fastApi]);  // Removed backgroundEnhancing dependency

  // Load weekly data when the weekly tab is selected
  useEffect(() => {
    if (selectedView === 'weekly') {
      fetchWeeklyData(selectedSeason, selectedWeek);
    }
  }, [selectedView]);

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

  // Calculate total XP - use stats from fast API if available, otherwise calculate from leaderboard data
  const statsTotalXp = distributionStats?.totalXp || 0;
  const userProfilesTotalXp = leaderboardData.reduce((total, user) => total + (user.xpTotal || user.xp || 0), 0);
  
  // Use stats total XP if available (more accurate), otherwise calculate from user profiles
  const totalXp = statsTotalXp > 0 ? statsTotalXp : userProfilesTotalXp;
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
    // Check if update is already running
    const status = await checkUpdateStatus();
    if (status?.isUpdating) {
      // Show a simple alert for concurrent updates
      alert('An update is already running. Please wait for it to complete.');
      return;
    }

    // Create a custom dialog
    const dialog = document.createElement('div');
    dialog.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    
    dialog.innerHTML = `
      <div style="
        background: #1a1a1a;
        border: 1px solid #333;
        border-radius: 12px;
        padding: 24px;
        max-width: 500px;
        width: 90%;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
        color: white;
      ">
        <div style="margin-bottom: 20px;">
          <h3 style="margin: 0 0 12px 0; color: #fff; font-size: 20px; font-weight: 600;">
            🔄 Smart Database Update
          </h3>
          <p style="margin: 0 0 16px 0; color: #ccc; line-height: 1.5;">
            This will perform an incremental update that:
          </p>
          <ul style="margin: 0 0 20px 0; padding-left: 20px; color: #ccc;">
            <li>Only fetches new profiles since last update</li>
            <li>Updates existing profiles with latest data</li>
            <li>Refreshes scores, streaks, and XP information</li>
            <li>Preserves all existing data</li>
          </ul>
          <p style="margin: 0; color: #00cc66; font-size: 14px;">
            ✅ This is a safe, incremental update
          </p>
        </div>
        <div style="display: flex; gap: 12px; justify-content: flex-end;">
          <button id="cancelBtn" style="
            background: #333;
            color: white;
            border: 1px solid #555;
            border-radius: 6px;
            padding: 10px 20px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
          ">Cancel</button>
          <button id="confirmBtn" style="
            background: #00cc66;
            color: white;
            border: 1px solid #00cc66;
            border-radius: 6px;
            padding: 10px 20px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
          ">Start Update</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(dialog);
    
    // Handle button clicks
    const cancelBtn = dialog.querySelector('#cancelBtn');
    const confirmBtn = dialog.querySelector('#confirmBtn');
    
    cancelBtn.addEventListener('click', () => {
      document.body.removeChild(dialog);
    });
    
    confirmBtn.addEventListener('click', async () => {
      document.body.removeChild(dialog);
      
      // Show processing message with progress bar
      const processingDialog = document.createElement('div');
      processingDialog.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      `;
      
      processingDialog.innerHTML = `
        <div style="
          background: #1a1a1a;
          border: 1px solid #333;
          border-radius: 12px;
          padding: 24px;
          max-width: 500px;
          width: 90%;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
          color: white;
          text-align: center;
        ">
          <div style="margin-bottom: 20px;">
            <div style="
              width: 50px;
              height: 50px;
              border: 3px solid #333;
              border-top: 3px solid #00cc66;
              border-radius: 50%;
              animation: spin 1s linear infinite;
              margin: 0 auto 20px;
            "></div>
            <h3 style="margin: 0 0 12px 0; color: #fff; font-size: 20px; font-weight: 600;">
              Updating Database...
            </h3>
            <p id="syncStatus" style="margin: 0 0 20px 0; color: #ccc; font-size: 14px;">
              Starting incremental update...
            </p>
            
            <!-- Progress Bar -->
            <div style="margin-bottom: 16px;">
              <div style="
                width: 100%;
                height: 8px;
                background: #333;
                border-radius: 4px;
                overflow: hidden;
              ">
                <div id="progressBar" style="
                  width: 0%;
                  height: 100%;
                  background: linear-gradient(90deg, #00cc66, #00ff88);
                  border-radius: 4px;
                  transition: width 0.3s ease;
                "></div>
              </div>
            </div>
            
            <div style="
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 12px;
              color: #888;
            ">
              <span id="processedCount">Checking for updates...</span>
              <span id="estimatedTime">Estimating time...</span>
            </div>
          </div>
        </div>
        <style>
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
      `;
      
      document.body.appendChild(processingDialog);
      
      try {
        console.log('[Distribution] Starting incremental update...');
        
        // Update progress elements
        const syncStatus = processingDialog.querySelector('#syncStatus');
        const progressBar = processingDialog.querySelector('#progressBar');
        const processedCount = processingDialog.querySelector('#processedCount');
        const estimatedTime = processingDialog.querySelector('#estimatedTime');
        
        // Start progress simulation
        let progress = 0;
        const startTime = Date.now();
        
        const updateProgress = (stage, current, target) => {
          syncStatus.textContent = stage;
          processedCount.textContent = current ? `${current.toLocaleString()} profiles processed` : 'Processing...';
          
          const percentage = target ? Math.min((current / target) * 100, 100) : progress;
          progressBar.style.width = `${percentage}%`;
          
          // Calculate estimated time remaining
          const elapsed = (Date.now() - startTime) / 1000;
          if (current > 0 && elapsed > 0) {
            const rate = current / elapsed;
            const remaining = Math.max(0, (target || current) - current);
            const eta = Math.round(remaining / rate);
            estimatedTime.textContent = `~${Math.round(eta / 60)}m ${eta % 60}s remaining`;
          }
        };
        
        // Start with initial progress
        updateProgress('Initializing update...', 0, 100);
        
        // Simulate progress during API call
        const progressInterval = setInterval(() => {
          if (progress < 95) {
            progress += Math.random() * 3;
            updateProgress('Fetching new profiles and updating existing ones...', Math.floor(progress * 100), 100);
          }
        }, 800);
        
        // Call the incremental update API
        const response = await fetch('/api/incremental-update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        const result = await response.json();
        
        // Clear progress interval
        clearInterval(progressInterval);
        
        if (response.ok) {
          console.log('[Distribution] Incremental update started:', result);
          
          // Remove processing dialog
          document.body.removeChild(processingDialog);
          
          // Show success dialog
          const successDialog = document.createElement('div');
          successDialog.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          `;
          
          successDialog.innerHTML = `
            <div style="
              background: #1a1a1a;
              border: 1px solid #333;
              border-radius: 12px;
              padding: 24px;
              max-width: 400px;
              width: 90%;
              box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
              color: white;
              text-align: center;
            ">
              <div style="margin-bottom: 16px;">
                <div style="
                  width: 60px;
                  height: 60px;
                  background: #00cc66;
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  margin: 0 auto 16px;
                  font-size: 24px;
                ">✓</div>
                <h3 style="margin: 0 0 8px 0; color: #fff; font-size: 18px;">
                  Update Started!
                </h3>
                <p style="margin: 0 0 16px 0; color: #ccc; font-size: 14px;">
                  Incremental update is running in the background
                </p>
                <p style="margin: 0 0 16px 0; color: #888; font-size: 12px;">
                  New profiles and updates will be processed automatically
                </p>
                <button id="closeBtn" style="
                  background: #00cc66;
                  color: white;
                  border: 1px solid #00cc66;
                  border-radius: 6px;
                  padding: 10px 24px;
                  cursor: pointer;
                  font-size: 14px;
                  font-weight: 500;
                ">Close</button>
              </div>
            </div>
          `;
          
          document.body.appendChild(successDialog);
          
          successDialog.querySelector('#closeBtn').addEventListener('click', () => {
            document.body.removeChild(successDialog);
            // Refresh the page to show updated data
            window.location.reload();
          });
          
        } else if (response.status === 409) {
          // Handle concurrent update scenario
          console.log('[Distribution] Update already in progress:', result);
          
          // Remove processing dialog
          document.body.removeChild(processingDialog);
          
          // Show concurrent update dialog
          const concurrentDialog = document.createElement('div');
          concurrentDialog.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          `;
          
          concurrentDialog.innerHTML = `
            <div style="
              background: #1a1a1a;
              border: 1px solid #ffa500;
              border-radius: 12px;
              padding: 24px;
              max-width: 450px;
              width: 90%;
              box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
              color: white;
              text-align: center;
            ">
              <div style="margin-bottom: 16px;">
                <div style="
                  width: 60px;
                  height: 60px;
                  background: #ffa500;
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  margin: 0 auto 16px;
                  font-size: 24px;
                ">⏳</div>
                <h3 style="margin: 0 0 8px 0; color: #fff; font-size: 18px;">
                  Update Already Running
                </h3>
                <p style="margin: 0 0 16px 0; color: #ccc; font-size: 14px;">
                  ${result.message || 'Another user is currently updating the database.'}
                </p>
                <p style="margin: 0 0 16px 0; color: #888; font-size: 12px;">
                  Please wait for the current update to complete before starting a new one.
                </p>
                <div style="margin: 16px 0; padding: 12px; background: #2a2a2a; border-radius: 6px; font-size: 12px; color: #ccc;">
                  <div>Process ID: ${result.details?.lockData?.pid || 'Unknown'}</div>
                  <div>Started: ${result.details?.updateStartTime ? new Date(result.details.updateStartTime).toLocaleString() : 'Unknown'}</div>
                </div>
                <button id="closeBtn" style="
                  background: #ffa500;
                  color: white;
                  border: 1px solid #ffa500;
                  border-radius: 6px;
                  padding: 10px 24px;
                  cursor: pointer;
                  font-size: 14px;
                  font-weight: 500;
                ">Close</button>
              </div>
            </div>
          `;
          
          document.body.appendChild(concurrentDialog);
          
          concurrentDialog.querySelector('#closeBtn').addEventListener('click', () => {
            document.body.removeChild(concurrentDialog);
          });
          
        } else {
          throw new Error(result.error || 'Incremental update failed');
        }
        
      } catch (error) {
        console.error('[Distribution] Incremental update error:', error);
        document.body.removeChild(processingDialog);
        alert(`Incremental update failed: ${error.message}`);
      }
    });
  };

  const handleFullForceRefresh = async () => {
    // Check if any update is already running
    const updateStatus = await checkUpdateStatus();
    const fullRefreshStatus = await checkFullRefreshStatus();
    
    if (updateStatus?.isUpdating) {
      alert('A quick update is already running. Please wait for it to complete.');
      return;
    }
    
    if (fullRefreshStatus?.isRefreshing) {
      alert('A full refresh is already running. Please wait for it to complete.');
      return;
    }
    
    // No cooldown check needed - password protection instead

    // Create a custom dialog for full refresh
    const dialog = document.createElement('div');
    dialog.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    
    dialog.innerHTML = `
      <div style="
        background: #1a1a1a;
        border: 1px solid #dc2626;
        border-radius: 12px;
        padding: 24px;
        max-width: 600px;
        width: 90%;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
        color: white;
      ">
        <div style="margin-bottom: 20px;">
          <h3 style="margin: 0 0 12px 0; color: #ef4444; font-size: 20px; font-weight: 600;">
            🚨 FULL DATABASE REFRESH
          </h3>
          <p style="margin: 0 0 16px 0; color: #ccc; line-height: 1.5;">
            <strong style="color: #ef4444;">WARNING:</strong> This will perform a COMPLETE refresh that:
          </p>
          <ul style="margin: 0 0 20px 0; padding-left: 20px; color: #ccc;">
            <li><strong>Updates ALL existing profiles</strong> from ID 1 to the highest ID</li>
            <li><strong>Discovers new profiles</strong> beyond the current highest ID</li>
            <li><strong>Takes 30+ minutes</strong> to complete</li>
            <li><strong>Uses significant API resources</strong></li>
          </ul>
          <div style="background: #dc2626; border-radius: 6px; padding: 12px; margin-bottom: 16px;">
            <p style="margin: 0; color: white; font-size: 14px; font-weight: 600;">
              🔐 PASSWORD REQUIRED: Enter password to access force refresh
            </p>
          </div>
          <p style="margin: 0; color: #fbbf24; font-size: 14px;">
            ⚠️ Use only when you need to ensure ALL profiles have the latest data
          </p>
        </div>
        <div style="margin-bottom: 20px;">
          <label style="display: block; margin-bottom: 8px; color: #ccc; font-size: 14px; font-weight: 500;">
            Password:
          </label>
          <input type="password" id="refreshPassword" placeholder="Enter password" style="
            width: 100%;
            padding: 10px 12px;
            background: #333;
            border: 1px solid #555;
            border-radius: 6px;
            color: white;
            font-size: 14px;
            box-sizing: border-box;
          " />
        </div>
        <div style="display: flex; gap: 12px; justify-content: flex-end;">
          <button id="cancelFullBtn" style="
            background: #333;
            color: white;
            border: 1px solid #555;
            border-radius: 6px;
            padding: 10px 20px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
          ">Cancel</button>
          <button id="confirmFullBtn" style="
            background: #dc2626;
            color: white;
            border: 1px solid #dc2626;
            border-radius: 6px;
            padding: 10px 20px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
          ">Start Full Refresh</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(dialog);
    
    // Handle button clicks
    const cancelBtn = dialog.querySelector('#cancelFullBtn');
    const confirmBtn = dialog.querySelector('#confirmFullBtn');
    
    cancelBtn.addEventListener('click', () => {
      document.body.removeChild(dialog);
    });
    
    confirmBtn.addEventListener('click', async () => {
      const passwordInput = dialog.querySelector('#refreshPassword');
      const password = passwordInput.value.trim();
      
      if (!password) {
        alert('Please enter the password to access force refresh.');
        return;
      }
      
      document.body.removeChild(dialog);
      
      try {
        console.log('[Distribution] Starting full refresh...');
        
        // Call the full refresh API with password
        const response = await fetch('/api/force-full-refresh', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ password }),
        });
        
        const result = await response.json();
        
        if (response.ok) {
          console.log('[Distribution] Full refresh started:', result);
          
          // Show success dialog
          alert(`Full refresh started successfully!\n\nThis will take 30+ minutes to complete.`);
          
          // Refresh status to show the update is running
          checkFullRefreshStatus();
        } else {
          console.error('[Distribution] Full refresh error:', result);
          if (result.status === 401) {
            alert(`Access denied: ${result.message || 'Invalid password'}`);
          } else {
            alert(`Full refresh failed: ${result.error || 'Unknown error'}`);
          }
        }
      } catch (error) {
        console.error('[Distribution] Full refresh error:', error);
        alert(`Full refresh failed: ${error.message}`);
      }
    });
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
            <p className={classicStyles.statValue}>{distributionStats?.totalUsers?.toLocaleString() || leaderboardData.length.toLocaleString()}</p>
            <p className={classicStyles.statSubValue}>With XP data</p>
          </div>
          <div className={classicStyles.statCard}>
            <p className={classicStyles.statLabel}>Total Seasons</p>
            <p className={classicStyles.statValue}>{distributionStats?.totalSeasons || '...'}</p>
            <p className={classicStyles.statSubValue}>Current: {distributionStats?.currentSeason?.name || '...'}</p>
          </div>
          <div className={classicStyles.statCard}>
            <p className={classicStyles.statLabel}>Current Week</p>
            <p className={classicStyles.statValue}>Week {distributionStats?.currentWeek?.week ?? '...'}</p>
            <p className={classicStyles.statSubValue}>Season {distributionStats?.currentSeason?.id ?? '...'}</p>
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
            onClick={() => setSelectedView('weekly')}
            className={selectedView === 'weekly' ? classicStyles.tabButtonActive : classicStyles.tabButton}
          >
            Weekly Leaderboard
          </button>
          <button
            onClick={() => setSelectedView('distribution')}
            className={selectedView === 'distribution' ? classicStyles.tabButtonActive : classicStyles.tabButton}
          >
            Analysis
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
              <div className="flex gap-2">
                <button
                  onClick={handleForceRefresh}
                  disabled={loading || (updateStatus?.isUpdating)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                    updateStatus?.isUpdating 
                      ? 'bg-orange-800 text-orange-300 border-orange-700 cursor-not-allowed' 
                      : loading 
                      ? 'bg-gray-800 text-gray-300 border-gray-700 cursor-not-allowed'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border-gray-700'
                  }`}
                  title={updateStatus?.isUpdating ? 'Update in progress - please wait' : 'Start incremental update'}
                >
                  {updateStatus?.isUpdating ? (
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 border border-orange-300 border-t-transparent rounded-full animate-spin"></div>
                      Update Running...
                    </span>
                  ) : loading ? (
                    'Refreshing...'
                  ) : (
                    'Quick Update'
                  )}
                </button>
                
                <button
                  onClick={handleFullForceRefresh}
                  disabled={loading || (updateStatus?.isUpdating) || (fullRefreshStatus?.isRefreshing) || (fullRefreshStatus?.onCooldown)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                    fullRefreshStatus?.isRefreshing || updateStatus?.isUpdating
                      ? 'bg-red-800 text-red-300 border-red-700 cursor-not-allowed' 
                      : fullRefreshStatus?.onCooldown
                      ? 'bg-yellow-800 text-yellow-300 border-yellow-700 cursor-not-allowed'
                      : loading 
                      ? 'bg-gray-800 text-gray-300 border-gray-700 cursor-not-allowed'
                      : 'bg-red-800 text-red-300 hover:bg-red-700 border-red-700'
                  }`}
                  title={
                    fullRefreshStatus?.isRefreshing ? 'Full refresh in progress - please wait' 
                    : fullRefreshStatus?.onCooldown ? `Full refresh on cooldown - ${fullRefreshStatus.remainingCooldownHours}h remaining`
                    : updateStatus?.isUpdating ? 'Update in progress - please wait' 
                    : 'Full refresh all profiles (12h cooldown)'
                  }
                >
                  {fullRefreshStatus?.isRefreshing ? (
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 border border-red-300 border-t-transparent rounded-full animate-spin"></div>
                      Full Refresh Running...
                    </span>
                  ) : fullRefreshStatus?.onCooldown ? (
                    `Full Refresh (${fullRefreshStatus.remainingCooldownHours}h cooldown)`
                  ) : loading ? (
                    'Refreshing...'
                  ) : (
                    'Full Refresh'
                  )}
                </button>
              </div>
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

        {/* Weekly Leaderboard View */}
        {selectedView === 'weekly' && (
          <section>
            <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-6 mb-6">
              <h2 className="text-2xl font-bold text-white mb-6">Weekly XP Leaderboard</h2>
              
              {/* Controls */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                {/* Season Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Season
                  </label>
                  <CustomDropdown
                    value={selectedSeason}
                    onChange={handleSeasonChange}
                    options={availableSeasons.map(season => ({
                      value: season.season_id,
                      label: season.season_name
                    }))}
                    placeholder="Select Season"
                    className="w-full"
                  />
                </div>
                
                {/* Week Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Week
                  </label>
                  <CustomDropdown
                    value={selectedWeek}
                    onChange={handleWeekChange}
                    options={[
                      { value: '', label: 'Season Total' },
                      ...availableWeeks.map(week => ({
                        value: week.week,
                        label: `Week ${week.week}`
                      }))
                    ]}
                    placeholder="Select Week"
                    className="w-full"
                  />
                </div>
                
                {/* Search */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Search Users
                  </label>
                  <input
                    type="text"
                    placeholder="Search by username, display name, or profile ID..."
                    value={weeklySearchTerm}
                    onChange={(e) => handleWeeklySearch(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              {/* Summary Info */}
              <div className="flex flex-wrap gap-4 mb-6 text-sm">
                <div className="flex items-center space-x-2">
                  <span className="text-gray-400">Showing:</span>
                  <span className="text-white font-medium">
                    {selectedWeek !== '' ? `Week ${selectedWeek} of ${availableSeasons.find(s => s.season_id == selectedSeason)?.season_name}` : `${availableSeasons.find(s => s.season_id == selectedSeason)?.season_name} Total`}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-gray-400">Total Results:</span>
                  <span className="text-blue-400 font-medium">{filteredWeeklyData.length.toLocaleString()}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-gray-400">Metric:</span>
                  <span className="text-green-400 font-medium">
                    {selectedWeek ? 'Weekly XP' : 'Cumulative XP'}
                  </span>
                </div>
              </div>
            </div>

            {/* Weekly Leaderboard Table */}
            <div className={classicStyles.tableContainer}>
              {weeklyLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  <span className="ml-3 text-gray-400">Loading weekly data...</span>
                </div>
              ) : (
                <div className={classicStyles.tableWrapper}>
                  <table className={classicStyles.table}>
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>User</th>
                        <th>{selectedWeek !== '' ? 'Weekly XP' : 'Season XP'}</th>
                        {selectedWeek === '' && <th>Cumulative XP</th>}
                        <th>Total XP</th>
                        <th>Season</th>
                        {selectedWeek !== '' && <th>Week</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {displayedWeeklyData.map((user) => (
                        <tr key={`${user.profile_id}-${user.season_id}-${user.week}`}>
                          <td>
                            <span className={classicStyles.rank}>#{user.rank}</span>
                          </td>
                          <td>
                            <div className={classicStyles.userCell}>
                              <img
                                className={classicStyles.avatar}
                                src={user.avatar_url || '/ethos.png'}
                                alt={user.display_name || 'User avatar'}
                                onError={(e) => { e.target.src = '/ethos.png'; }}
                              />
                              <div>
                                <div className={classicStyles.userName}>
                                  {user.display_name || user.username || 'Unknown'}
                                  {hasValidatorNft(user.profile_id, validatorNfts) && (
                                    <span className={classicStyles.validatorSymbol}>𝑽</span>
                                  )}
                                </div>
                                <div className={classicStyles.userHandle}>@{user.username || '...'}</div>
                              </div>
                            </div>
                          </td>
                          <td className="font-bold text-blue-400">
                            {selectedWeek !== '' ? 
                              (user.weekly_xp || 0).toLocaleString() : 
                              (user.cumulative_xp || 0).toLocaleString()
                            }
                          </td>
                          {selectedWeek === '' && (
                            <td className="text-green-400">
                              {(user.cumulative_xp || 0).toLocaleString()}
                            </td>
                          )}
                          <td>{(user.total_xp || 0).toLocaleString()}</td>
                          <td>
                            <span className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded">
                              Season {user.season_id}
                            </span>
                          </td>
                          {selectedWeek && (
                            <td>
                              <span className="px-2 py-1 bg-blue-700 text-blue-300 text-xs rounded">
                                Week {user.week}
                              </span>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {displayedWeeklyData.length === 0 && !weeklyLoading && (
                    <div className="text-center py-12">
                      <p className="text-gray-400 text-lg">No data found for the selected criteria</p>
                      <p className="text-gray-500 text-sm mt-2">
                        Try selecting a different season or week, or check your search term
                      </p>
                    </div>
                  )}
                  
                  {/* Pagination Controls */}
                  {filteredWeeklyData.length > weeklyItemsPerPage && (
                    <div className="flex justify-center items-center space-x-4 mt-6">
                      <button
                        onClick={() => setWeeklyCurrentPage(p => Math.max(1, p - 1))}
                        disabled={weeklyCurrentPage === 1}
                        className="px-4 py-2 bg-[#21262d] border border-[#30363d] rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#30363d] transition-colors"
                      >
                        Previous
                      </button>
                      
                      <span className="text-gray-400">
                        Page {weeklyCurrentPage} of {Math.ceil(filteredWeeklyData.length / weeklyItemsPerPage)}
                      </span>
                      
                      <button
                        onClick={() => setWeeklyCurrentPage(p => Math.min(Math.ceil(filteredWeeklyData.length / weeklyItemsPerPage), p + 1))}
                        disabled={weeklyCurrentPage >= Math.ceil(filteredWeeklyData.length / weeklyItemsPerPage)}
                        className="px-4 py-2 bg-[#21262d] border border-[#30363d] rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#30363d] transition-colors"
                      >
                        Next
                      </button>
                    </div>
                  )}
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
                              style={{ width: `${(count / (distributionStats?.totalUsers || leaderboardData.length)) * 100}%` }}
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

            {/* Weekly XP Distribution Analysis */}
            <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-6">
              <h2 className="text-2xl font-bold text-white mb-6">Weekly XP Distribution Analysis</h2>
              <p className="text-gray-400 mb-6">
                Analysis of XP distribution per week across all seasons, showing total XP distributed and number of active users.
              </p>
              
              {weeklyDistributionAnalysis.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
                  <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-4">
                    <p className="text-gray-400 text-sm">Total Weeks</p>
                    <p className="text-2xl font-bold text-white">{weeklyDistributionAnalysis.length}</p>
                  </div>
                  <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-4">
                    <p className="text-gray-400 text-sm">Season 0 XP</p>
                    <p className="text-2xl font-bold text-blue-400">
                      {ethosDistributionApi.formatXpToMillions(
                        weeklyDistributionAnalysis.filter(w => w.season === 0).reduce((sum, week) => sum + week.totalXp, 0)
                      )}
                    </p>
                  </div>
                  <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-4">
                    <p className="text-gray-400 text-sm">Season 1 XP</p>
                    <p className="text-2xl font-bold text-green-400">
                      {ethosDistributionApi.formatXpToMillions(
                        weeklyDistributionAnalysis.filter(w => w.season === 1).reduce((sum, week) => sum + week.totalXp, 0)
                      )}
                    </p>
                  </div>
                  <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-4">
                    <p className="text-gray-400 text-sm">S0 Users</p>
                    <p className="text-2xl font-bold text-blue-300">
                      {Math.max(...weeklyDistributionAnalysis.filter(w => w.season === 0).map(w => w.activeUsers), 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-4">
                    <p className="text-gray-400 text-sm">S1 Users</p>
                    <p className="text-2xl font-bold text-green-300">
                      {Math.max(...weeklyDistributionAnalysis.filter(w => w.season === 1).map(w => w.activeUsers), 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-4">
                    <p className="text-gray-400 text-sm">Total XP</p>
                    <p className="text-2xl font-bold text-purple-400">
                      {ethosDistributionApi.formatXpToMillions(
                        weeklyDistributionAnalysis.reduce((sum, week) => sum + week.totalXp, 0)
                      )}
                    </p>
                  </div>
                </div>
              )}
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#30363d]">
                      <th className="text-left py-3 px-4 text-gray-300">Season</th>
                      <th className="text-left py-3 px-4 text-gray-300">Week</th>
                      <th className="text-right py-3 px-4 text-gray-300">Weekly XP</th>
                      <th className="text-right py-3 px-4 text-gray-300">Active Users</th>
                      <th className="text-right py-3 px-4 text-gray-300">Avg XP/User</th>
                      <th className="text-right py-3 px-4 text-gray-300">Season Users</th>
                      <th className="text-right py-3 px-4 text-gray-300">% of Season</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weeklyDistributionAnalysis.map((week, index) => (
                      <tr key={`${week.season}-${week.week}`} className="border-b border-[#21262d] hover:bg-[#21262d]">
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 text-xs rounded ${
                            week.season === 0 
                              ? 'bg-blue-900 text-blue-300' 
                              : 'bg-green-900 text-green-300'
                          }`}>
                            S{week.season}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-300">
                          W{week.week}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className={`font-semibold ${
                            week.season === 0 ? 'text-blue-400' : 'text-green-400'
                          }`}>
                            {ethosDistributionApi.formatXpToMillions(week.totalXp)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className={`font-medium ${
                            week.season === 0 ? 'text-blue-300' : 'text-green-300'
                          }`}>
                            {week.activeUsers.toLocaleString()}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right text-gray-300">
                          {ethosDistributionApi.formatXpToMillions(week.avgXpPerUser)}
                        </td>
                        <td className="py-3 px-4 text-right text-gray-400">
                          {week.seasonTotalUsers?.toLocaleString() || 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end">
                            <div className="w-16 bg-gray-700 rounded-full h-2 mr-2">
                              <div
                                className={`h-2 rounded-full ${
                                  week.season === 0 
                                    ? 'bg-gradient-to-r from-blue-500 to-blue-400' 
                                    : 'bg-gradient-to-r from-green-500 to-green-400'
                                }`}
                                style={{ width: `${Math.min(week.percentageOfSeason, 100)}%` }}
                              ></div>
                            </div>
                            <span className="text-gray-300 text-xs w-12 text-right">
                              {week.percentageOfSeason.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {weeklyDistributionAnalysis.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-400 text-lg">No weekly data available</p>
                  <p className="text-gray-500 text-sm mt-2">
                    Weekly XP data will appear here once it's loaded
                  </p>
                </div>
              )}

              {/* Season Breakdown Summary */}
              {weeklyDistributionAnalysis.length > 0 && (
                <div className="mt-8 bg-[#0d1117] border border-[#30363d] rounded-lg p-6">
                  <h3 className="text-xl font-bold text-white mb-4">Season Breakdown Summary</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Season 0 Summary */}
                    <div className="space-y-4">
                      <div className="flex items-center mb-3">
                        <span className="px-3 py-1 bg-blue-900 text-blue-300 text-sm rounded mr-3">Season 0</span>
                        <span className="text-gray-400 text-sm">
                          {weeklyDistributionAnalysis.filter(w => w.season === 0).length} weeks
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Total XP:</span>
                          <span className="text-blue-400 font-semibold">
                            {ethosDistributionApi.formatXpToMillions(
                              weeklyDistributionAnalysis.filter(w => w.season === 0).reduce((sum, week) => sum + week.totalXp, 0)
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Peak Users:</span>
                          <span className="text-blue-300">
                            {Math.max(...weeklyDistributionAnalysis.filter(w => w.season === 0).map(w => w.activeUsers), 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Avg XP/Week:</span>
                          <span className="text-gray-300">
                            {ethosDistributionApi.formatXpToMillions(
                              weeklyDistributionAnalysis.filter(w => w.season === 0).reduce((sum, week) => sum + week.totalXp, 0) / 
                              Math.max(weeklyDistributionAnalysis.filter(w => w.season === 0).length, 1)
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Season 1 Summary */}
                    <div className="space-y-4">
                      <div className="flex items-center mb-3">
                        <span className="px-3 py-1 bg-green-900 text-green-300 text-sm rounded mr-3">Season 1</span>
                        <span className="text-gray-400 text-sm">
                          {weeklyDistributionAnalysis.filter(w => w.season === 1).length} weeks
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Total XP:</span>
                          <span className="text-green-400 font-semibold">
                            {ethosDistributionApi.formatXpToMillions(
                              weeklyDistributionAnalysis.filter(w => w.season === 1).reduce((sum, week) => sum + week.totalXp, 0)
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Peak Users:</span>
                          <span className="text-green-300">
                            {Math.max(...weeklyDistributionAnalysis.filter(w => w.season === 1).map(w => w.activeUsers), 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Avg XP/Week:</span>
                          <span className="text-gray-300">
                            {ethosDistributionApi.formatXpToMillions(
                              weeklyDistributionAnalysis.filter(w => w.season === 1).reduce((sum, week) => sum + week.totalXp, 0) / 
                              Math.max(weeklyDistributionAnalysis.filter(w => w.season === 1).length, 1)
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
