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
import LoadingBars from '../components/LoadingBars';
import SafeAvatar from '../components/SafeAvatar';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Distribution() {
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [distributionStats, setDistributionStats] = useState(null);
  const [loading, setLoading] = useState(true); // Enable loading screen
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



  // Weekly leaderboard state
  const [weeklyData, setWeeklyData] = useState([]);
  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const [weeklySearchLoading, setWeeklySearchLoading] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState('1'); // Default to Season 1
  const [selectedWeek, setSelectedWeek] = useState('13'); // Default to Week 13
  const [weeklySearchTerm, setWeeklySearchTerm] = useState('');
  const [searchTimeoutRef, setSearchTimeoutRef] = useState(null);
  const [availableSeasons, setAvailableSeasons] = useState([
    { season_id: 0, season_name: 'Season 0' },
    { season_id: 1, season_name: 'Season 1' }
  ]); // Initialize with default seasons
  const [availableWeeks, setAvailableWeeks] = useState([
    { season_id: 0, week: 0 },
    { season_id: 1, week: 0 },
    { season_id: 1, week: 1 },
    { season_id: 1, week: 2 },
    { season_id: 1, week: 3 },
    { season_id: 1, week: 4 },
    { season_id: 1, week: 5 },
    { season_id: 1, week: 6 },
    { season_id: 1, week: 7 },
    { season_id: 1, week: 8 },
    { season_id: 1, week: 9 },
    { season_id: 1, week: 10 },
    { season_id: 1, week: 11 },
    { season_id: 1, week: 12 },
    { season_id: 1, week: 13 },
    { season_id: 1, week: 14 }
  ]); // Initialize with default weeks

  const [weeklyPagination, setWeeklyPagination] = useState({ total: 0, hasMore: false });
  const [weeklyDistributionAnalysis, setWeeklyDistributionAnalysis] = useState([]);
  const [seasonTotals, setSeasonTotals] = useState({
    season0: { totalXp: 0, totalUsers: 0, weeklyXp: 0 },
    season1: { totalXp: 0, totalUsers: 0, weeklyXp: 0 }
  });
  const [totalProfilesCount, setTotalProfilesCount] = useState(0);
  const [xpUserCounts, setXpUserCounts] = useState({
    season0: { usersWithXp: 0, totalXp: 0, avgXpPerUser: 0 },
    season1: { usersWithXp: 0, totalXp: 0, avgXpPerUser: 0 },
    allSeasons: { usersWithXp: 0, totalXp: 0 }
  });

  // Fetch weekly leaderboard data
  const fetchWeeklyData = async (season = selectedSeason, week = selectedWeek, search = weeklySearchTerm) => {
    try {
      // Regular weekly data fetching for all seasons/weeks
      const params = new URLSearchParams({
        offset: '0',
        limit: '25', // Start with smaller limit for faster initial load
        clearCache: 'true', // Force cache clear
        _t: Date.now(), // Cache busting timestamp
        _r: Math.random() // Additional random cache busting
      });
      
      if (season !== undefined && season !== null && season !== '') params.append('season', season);
      if (week !== undefined && week !== null && week !== '') params.append('week', week);
      if (search) params.append('search', search);
      
      
      const response = await fetch(`/api/csv-weekly-xp?${params}`, {
        cache: 'no-store', // Disable browser caching
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      const data = await response.json();
      
      console.log(`[Distribution] 📊 Fetched data for Season ${season}, Week ${week}:`, {
        total: data.total,
        profiles: data.profiles.length,
        firstUser: data.profiles[0] ? {
          rank: data.profiles[0].rank,
          weekly_xp: data.profiles[0].weekly_xp,
          cumulative_xp: data.profiles[0].cumulative_xp,
          season_id: data.profiles[0].season_id,
          week: data.profiles[0].week
        } : null
      });
      
      
      if (response.ok) {
        setWeeklyData(data.profiles);
        setWeeklyPagination({ total: data.total, hasMore: data.pagination.hasMore });
        setAvailableSeasons(data.seasons);
        const filteredWeeks = data.weeks.filter(w => w.season_id == season);
        setAvailableWeeks(filteredWeeks);
      } else {
        console.error('Error fetching weekly data:', data.error);
        setWeeklyData([]);
      }
    } catch (error) {
      console.error('Error fetching weekly data:', error);
      setWeeklyData([]);
    } finally {
      // Loading state is handled by the calling function
    }
  };

  // Handle season change
  const handleSeasonChange = (season) => {
    console.log(`[Distribution] 🔄 Season changed to: ${season}`);
    console.log(`[Distribution] 🔍 Before state update: selectedSeason=${selectedSeason}, selectedWeek=${selectedWeek}`);
    setSelectedSeason(season);
    // Don't reset week immediately - let the user choose
    console.log(`[Distribution] 🔍 After state update: season=${season}, week=${selectedWeek}, search=${weeklySearchTerm}`);
  };

  // Handle week change
  const handleWeekChange = (week) => {
    console.log(`[Distribution] 🔄 Week changed to: ${week}`);
    console.log(`[Distribution] 🔍 Before state update: selectedSeason=${selectedSeason}, selectedWeek=${selectedWeek}`);
    console.log(`[Distribution] 🔍 Week details:`, {
      week: week,
      weekType: typeof week,
      weekFalsy: !week,
      weekUndefined: week === undefined,
      weekNull: week === null,
      weekEmpty: week === '',
      weekZero: week === 0,
      weekStringZero: week === '0'
    });
    setSelectedWeek(week);
    console.log(`[Distribution] 🔍 After state update: season=${selectedSeason}, week=${week}, search=${weeklySearchTerm}`);
    fetchWeeklyData(selectedSeason, week, weeklySearchTerm);
  };

  // Handle weekly search - only update the search term, no automatic search
  const handleWeeklySearch = (term) => {
    setWeeklySearchTerm(term);
    // No automatic search - user must trigger search manually
  };

  // Manual search trigger function
  const triggerWeeklySearch = () => {
    if (weeklySearchTerm.trim()) {
      setWeeklySearchLoading(true);
      
      // Clear any existing timeout
      if (searchTimeoutRef) {
        clearTimeout(searchTimeoutRef);
      }
      
      // Add 300ms delay before showing results
      const timeout = setTimeout(() => {
        fetchWeeklyData(selectedSeason, selectedWeek, weeklySearchTerm);
        setWeeklySearchLoading(false);
      }, 300);
      
      setSearchTimeoutRef(timeout);
    }
  };

  // Fetch weekly distribution analysis data
  const fetchWeeklyDistributionAnalysis = async () => {
    try {
      console.log('[Distribution] 📊 Fetching weekly distribution analysis...');
      
      const response = await fetch(`/api/csv-weekly-xp?offset=0&limit=100000&clearCache=true&_t=${Date.now()}&_r=${Math.random()}`); // Get all weekly data
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
              weeklyXp: 0,
              activeUsers: 0,
              users: new Set()
            };
          }

          // Use the appropriate XP value based on whether it's a specific week or season total
          const xpValue = (week !== undefined && week !== null && week !== '') ? 
            (profile.weekly_xp || 0) : (profile.cumulative_xp || profile.total_xp || 0);
          
          weeklyStats[key].totalXp += xpValue;
          weeklyStats[key].weeklyXp += profile.weekly_xp || 0;
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
        const seasonWeeklyXpTotals = {};
        
        analysis.forEach(week => {
          if (!seasonTotals[week.season]) {
            seasonTotals[week.season] = 0;
            seasonUserCounts[week.season] = new Set();
            seasonWeeklyXpTotals[week.season] = 0;
          }
          seasonTotals[week.season] += week.totalXp;
          seasonWeeklyXpTotals[week.season] += week.weeklyXp;
          
          // Track unique users per season - use the original data
          if (weeklyStats[`${week.season}-${week.week}`]?.users) {
            weeklyStats[`${week.season}-${week.week}`].users.forEach(userId => {
              seasonUserCounts[week.season].add(userId);
            });
          }
        });
        
        // Add percentage of season total and season user count
        analysis.forEach(week => {
          week.percentageOfSeason = seasonTotals[week.season] > 0 
            ? (week.totalXp / seasonTotals[week.season]) * 100 
            : 0;
          week.seasonTotalUsers = seasonUserCounts[week.season]?.size || 0;
        });
        
        // Store season totals for summary cards
        setSeasonTotals({
          season0: {
            totalXp: seasonTotals[0] || 0,
            totalUsers: seasonUserCounts[0]?.size || 0,
            weeklyXp: seasonWeeklyXpTotals[0] || 0
          },
          season1: {
            totalXp: seasonTotals[1] || 0,
            totalUsers: seasonUserCounts[1]?.size || 0,
            weeklyXp: seasonWeeklyXpTotals[1] || 0
          }
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
        setLoading(true);
        setLoadingProgress({ stage: 'Initializing...', percentage: 0 });
        console.log('[Distribution] 🚀 Starting data fetch...');
          
        // Force refresh - always use Fast API with file database
        console.log('[Distribution] 🚀 Using Fast API with file database for instant load...');
        setLoadingProgress({ stage: 'Loading user data...', percentage: 10 });
        
        // Load profiles from file database instantly
        let fastData = null;
        try {
          fastData = await fastApi.getFastLeaderboard(targetUsers, (progress) => {
            console.log(`[Distribution] Fast progress: ${progress.stage} - ${progress.percentage.toFixed(1)}%`);
            setLoadingProgress({
              stage: progress.stage || 'Loading users...',
              percentage: Math.min(progress.percentage * 0.7, 70), // Scale to 70% of total progress
              current: progress.current,
              total: progress.total
            });
          });
          
          if (fastData && fastData.length > 0) {
            console.log(`[Distribution] ✅ Fast API loaded ${fastData.length} users`);
          } else {
            console.log(`[Distribution] ⚠️ Fast API returned empty data, falling back to comprehensive API`);
            throw new Error('Fast API returned empty data');
          }
        } catch (fastApiError) {
          console.log(`[Distribution] ⚠️ Fast API failed:`, fastApiError.message);
          fastData = null; // Set to null to trigger fallback
        }
        
        console.log(`[Distribution] Raw fastData:`, fastData);
        
        if (fastData && fastData.length > 0) {
          // Add rank and xpPercentage to fast data
          const totalXp = fastData.reduce((sum, user) => sum + (user.xpTotal || user.xp || 0), 0);
          const processedData = fastData.map((user, index) => ({
            ...user,
            rank: index + 1,
            xpPercentage: totalXp > 0 ? ((user.xpTotal || user.xp || 0) / totalXp) * 100 : 0,
            xpStreakDays: Math.min(user.xpStreakDays || user.streak_days || 0, 365) // Cap streak at 365 days
          }));
          
          console.log(`[Distribution] Debug: Total XP = ${totalXp}, First user:`, processedData[0]);
          console.log(`[Distribution] Debug: First user streak:`, processedData[0]?.xpStreakDays);
          console.log(`[Distribution] Debug: Stats loaded, checking for season data...`);
          
          setLeaderboardData(processedData);
          setFilteredData(processedData);
          
          // Get fast distribution stats from complete dataset (don't pass processedData to get full stats)
          console.log('[Distribution] 📊 Calculating complete distribution stats...');
          setLoadingProgress({ stage: 'Calculating statistics...', percentage: 75 });
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
            setLoadingProgress({ stage: 'Loading season data...', percentage: 85 });
            
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
          setLoadingProgress({ stage: 'Finalizing...', percentage: 95 });
          await fetchWeeklyDistributionAnalysis();
          
          // Complete loading
          setLoadingProgress({ stage: 'Complete!', percentage: 100 });
          setTimeout(() => {
            setLoading(false);
            setLoadingProgress(null);
          }, 500); // Small delay to show completion
        } else {
          console.log('[Distribution] ⚠️ No data received from Fast API');
          
          // Try direct API call as fallback
          try {
            console.log('[Distribution] 🔄 Falling back to comprehensive profiles API...');
            const response = await fetch('/api/comprehensive-profiles?limit=10000');
            const directData = await response.json();
            console.log('[Distribution] Direct API response:', directData);
            
            if (directData && directData.profiles && directData.profiles.length > 0) {
              // Add rank and xpPercentage to direct data
              const totalXp = directData.profiles.reduce((sum, user) => sum + (user.total_xp || 0), 0);
              const processedDirectData = directData.profiles.map((user, index) => ({
                profileId: user.profile_id,
                userkey: user.profile_id,
                username: user.username,
                displayName: user.display_name,
                avatarUrl: user.avatar_url,
                description: user.description,
                score: user.score || 0,
                xpStreakDays: Math.min(user.streak_days || 0, 365), // Cap streak at 365 days
                xpTotal: user.total_xp || 0,
                isValidator: user.is_validator || false,
                season0Xp: user.season_0_xp || 0,
                season1Xp: user.season_1_xp || 0,
                status: user.status,
                userkeysCount: user.userkeys_count || 0,
                ethAddresses: user.eth_addresses || 0,
                rank: index + 1,
                xpPercentage: totalXp > 0 ? ((user.total_xp || 0) / totalXp) * 100 : 0
              }));
              
              setLeaderboardData(processedDirectData);
              setFilteredData(processedDirectData);
              console.log(`[Distribution] ✅ Direct API data loaded: ${processedDirectData.length} users`);
              console.log(`[Distribution] ✅ First user streak:`, processedDirectData[0]?.xpStreakDays);
              console.log(`[Distribution] ✅ First user display name:`, processedDirectData[0]?.displayName);
              console.log(`[Distribution] ✅ First user data:`, processedDirectData[0]);
              
              // Complete loading for fallback case
              setLoadingProgress({ stage: 'Complete!', percentage: 100 });
              setTimeout(() => {
                setLoading(false);
                setLoadingProgress(null);
              }, 500);
            } else {
              console.error('[Distribution] ❌ No profiles in direct API response');
              setLoading(false);
              setLoadingProgress(null);
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
        setLoading(false);
      } finally {
        // Only clear progress if not already cleared
        if (loading) {
          setLoadingProgress(null);
        }
      }
    }

  // Always fetch data when fast API is ready
  if (fastApi) {
    fetchDistributionData();
  }
}, [targetUsers, fastApi]);  // Removed backgroundEnhancing dependency

// Fetch total profiles count and XP user counts on component mount
useEffect(() => {
  fetchTotalProfilesCount();
  fetchXpUserCounts();
}, []);

// Cleanup search timeout on unmount
useEffect(() => {
  return () => {
    if (searchTimeoutRef) {
      clearTimeout(searchTimeoutRef);
    }
  };
}, []);


  // Load weekly data on component mount and when the weekly tab is selected
  useEffect(() => {
    if (selectedView === 'weekly') {
      console.log(`[Distribution] 🔄 useEffect triggered: season=${selectedSeason}, week=${selectedWeek}, search=${weeklySearchTerm}`);
      // Force refresh with current state values, but ensure we have valid defaults
      const season = selectedSeason || '0';
      const week = selectedWeek || '0';
      fetchWeeklyData(season, week, weeklySearchTerm);
    }
  }, [selectedView, selectedSeason, selectedWeek, weeklySearchTerm]);

  // Initial load of weekly data on component mount
  useEffect(() => {
    console.log(`[Distribution] 🔄 Initial weekly data load: season=${selectedSeason}, week=${selectedWeek}`);
    // Force load with correct defaults and update state
    setSelectedSeason('0');
    setSelectedWeek('0');
    fetchWeeklyData('0', '0', '');
  }, []); // Empty dependency array - run once on mount

  // Handle season change by triggering API call
  useEffect(() => {
    if (selectedView === 'weekly' && selectedSeason) {
      console.log(`[Distribution] 🔄 Season change useEffect: season=${selectedSeason}, week=${selectedWeek}`);
      fetchWeeklyData(selectedSeason, selectedWeek, weeklySearchTerm);
    }
  }, [selectedSeason]);

  // Handle week selection validation when available weeks change
  useEffect(() => {
    if (selectedView === 'weekly' && availableWeeks.length > 0 && selectedWeek !== '') {
      const isValidWeek = availableWeeks.some(w => w.week.toString() === selectedWeek);
      console.log(`[Distribution] 🔍 Week validation: selectedWeek=${selectedWeek}, availableWeeks=`, availableWeeks.map(w => w.week), `isValid=${isValidWeek}`);
      
      if (!isValidWeek) {
        console.log(`[Distribution] 🔄 Invalid week ${selectedWeek} for current season, resetting to empty`);
        setSelectedWeek('');
      }
    }
  }, [availableWeeks, selectedWeek, selectedView]);

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
  // Note: If leaderboard data is paginated, this might not be the true total
  const totalXp = statsTotalXp > 0 ? statsTotalXp : userProfilesTotalXp;
  
  console.log('[Distribution] XP Calculation Debug:', {
    statsTotalXp,
    userProfilesTotalXp,
    totalXp,
    leaderboardDataLength: leaderboardData.length,
    firstUserXp: leaderboardData[0]?.xpTotal || leaderboardData[0]?.xp || 0
  });
  const xpRanges = ethosDistributionApi.getXpDistributionRanges(leaderboardData.map(user => ({
    ...user,
    xpTotal: user.xpTotal || user.xp || 0
  })));

  // Calculate score tiers
  const getScoreTiers = (users) => {
    const tiers = {
      'Untrusted': { min: 0, max: 799, count: 0, color: 'red', bgColor: 'bg-red-500', order: 1 },
      'Questionable': { min: 800, max: 1199, count: 0, color: 'orange', bgColor: 'bg-orange-500', order: 2 },
      'Neutral': { min: 1200, max: 1399, count: 0, color: 'yellow', bgColor: 'bg-yellow-500', order: 3 },
      'Know': { min: 1400, max: 1599, count: 0, color: 'blue', bgColor: 'bg-blue-500', order: 4 },
      'Established': { min: 1600, max: 1799, count: 0, color: 'indigo', bgColor: 'bg-indigo-500', order: 5 },
      'Reputable': { min: 1800, max: 1999, count: 0, color: 'purple', bgColor: 'bg-purple-500', order: 6 },
      'Exemplary': { min: 2000, max: 2199, count: 0, color: 'pink', bgColor: 'bg-pink-500', order: 7 },
      'Distinguished': { min: 2200, max: 2399, count: 0, color: 'cyan', bgColor: 'bg-cyan-500', order: 8 },
      'Revered': { min: 2400, max: 2599, count: 0, color: 'emerald', bgColor: 'bg-emerald-500', order: 9 },
      'Renowned': { min: 2600, max: 2800, count: 0, color: 'amber', bgColor: 'bg-amber-500', order: 10 }
    };

    users.forEach(user => {
      const score = user.score || 0;
      for (const [tierName, tier] of Object.entries(tiers)) {
        if (score >= tier.min && score <= tier.max) {
          tier.count++;
          break;
        }
      }
    });

    // Sort tiers by order (ascending)
    const sortedTiers = Object.entries(tiers).sort((a, b) => a[1].order - b[1].order);
    return Object.fromEntries(sortedTiers);
  };

  const scoreTiers = getScoreTiers(leaderboardData);

  // Calculate season data using actual season XP data from API
  const calculateSeasonData = (users) => {
    const seasonData = {
      season0: { totalXp: 0, totalUsers: 0, weeklyXp: 0 },
      season1: { totalXp: 0, totalUsers: 0, weeklyXp: 0 }
    };

    users.forEach(user => {
      const season0Xp = user.season0Xp || user.season_0_xp || 0;
      const season1Xp = user.season1Xp || user.season_1_xp || 0;
      
      // Use actual season data if available
      if (season0Xp > 0 || season1Xp > 0) {
        seasonData.season0.totalXp += season0Xp;
        seasonData.season1.totalXp += season1Xp;
        
        // Count users who have activity in each season
        if (season0Xp > 0) seasonData.season0.totalUsers += 1;
        if (season1Xp > 0) seasonData.season1.totalUsers += 1;
      } else {
        // Fallback: estimate based on total XP if no season data
        const userXp = user.xpTotal || user.xp || 0;
        const userScore = user.score || 0;
        
        if (userScore >= 1400) {
          seasonData.season0.totalXp += userXp * 0.6;
          seasonData.season0.totalUsers += 1;
          seasonData.season1.totalXp += userXp * 0.4;
          seasonData.season1.totalUsers += 1;
        } else if (userScore >= 1200) {
          seasonData.season0.totalXp += userXp * 0.8;
          seasonData.season0.totalUsers += 1;
          seasonData.season1.totalXp += userXp * 0.2;
          seasonData.season1.totalUsers += 1;
        } else {
          seasonData.season0.totalXp += userXp * 0.9;
          seasonData.season0.totalUsers += 1;
          seasonData.season1.totalXp += userXp * 0.1;
          seasonData.season1.totalUsers += 1;
        }
      }
    });

    return seasonData;
  };

  // Calculate season data from current leaderboard
  const calculatedSeasonData = calculateSeasonData(leaderboardData);

  // Fetch total profiles count from comprehensive profiles API
  const fetchTotalProfilesCount = async () => {
    try {
      const response = await fetch('/api/comprehensive-profiles?limit=1&offset=0');
      const data = await response.json();
      if (data.cache_info && data.cache_info.profiles_count) {
        setTotalProfilesCount(data.cache_info.profiles_count);
        console.log(`[Distribution] 📊 Total profiles count: ${data.cache_info.profiles_count}`);
      }
    } catch (error) {
      console.error('[Distribution] Error fetching total profiles count:', error);
    }
  };

  // Fetch XP user counts for each season
  const fetchXpUserCounts = async () => {
    try {
      const response = await fetch('/api/xp-user-counts');
      const data = await response.json();
      setXpUserCounts(data);
      console.log('[Distribution] 📊 XP user counts:', data);
    } catch (error) {
      console.error('[Distribution] Error fetching XP user counts:', error);
    }
  };

  // Fetch total XP from all users for accurate analysis
  const fetchTotalXpFromAllUsers = async () => {
    try {
      console.log('[Distribution] 📊 Fetching total XP from all users...');
      const response = await fetch('/api/comprehensive-profiles?limit=50000&offset=0');
      const data = await response.json();
      if (data.profiles) {
        const totalXp = data.profiles.reduce((sum, user) => sum + (user.total_xp || 0), 0);
        console.log(`[Distribution] 📊 Total XP from all users: ${(totalXp / 1000000).toFixed(2)}M`);
        return totalXp;
      }
    } catch (error) {
      console.error('Error fetching total XP from all users:', error);
    }
    return 0;
  };

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
    console.log(`[Distribution] 🔍 getSortedData called with ${data.length} items, sortConfig:`, sortConfig);
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
  
  console.log(`[Distribution] 🔍 Data state: leaderboardData=${leaderboardData.length}, filteredData=${filteredData.length}, sortedData=${sortedData.length}, currentData=${currentData.length}`);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  // Helper function to get the appropriate API for formatting
  const getActiveApi = () => {
    return fastApi || ethosDistributionApi;
  };

  const handleUserClick = (user) => {
    const score = (user.score || 0).toLocaleString();
    
    // Create a simple popup showing profile picture, name, and score
    const popup = document.createElement('div');
    popup.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #1a1a1a;
      border: 2px solid #333;
      border-radius: 12px;
      padding: 24px;
      z-index: 10000;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
      text-align: center;
      min-width: 200px;
    `;
    
    popup.innerHTML = `
      <div style="display: flex; align-items: center; margin-bottom: 16px;">
        <img 
          src="${user.avatarUrl || '/ethos.png'}" 
          alt="${user.displayName || 'User'}"
          style="width: 64px; height: 64px; border-radius: 50%; object-fit: cover; border: 3px solid #444; margin-right: 16px;"
          onerror="this.src='/ethos.png'"
        />
        <div style="color: white; font-size: 18px; font-weight: 600;">
          ${user.displayName || user.username || 'Unknown User'} <span style="color: #888; font-size: 14px; font-weight: 400;">(${score})</span>
        </div>
      </div>
      <button 
        onclick="this.parentElement.remove()" 
        style="
          background: #007acc; 
          color: white; 
          border: none; 
          padding: 10px 20px; 
          border-radius: 6px; 
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
        "
      >
        OK
      </button>
    `;
    
    // Add backdrop
    const backdrop = document.createElement('div');
    backdrop.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      z-index: 9999;
    `;
    backdrop.onclick = () => {
      popup.remove();
      backdrop.remove();
    };
    
    document.body.appendChild(backdrop);
    document.body.appendChild(popup);
  };

  // REMOVED: Quick reload button functionality
  const handleForceRefresh = async () => {
    return; // Function disabled
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

  // REMOVED: Full reload button functionality
  const handleFullForceRefresh = async () => {
    return; // Function disabled
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
    
    if (fullRefreshStatus?.onCooldown) {
      alert(`Full refresh is on cooldown. Please wait ${fullRefreshStatus.remainingCooldownHours} more hours before trying again.`);
      return;
    }

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
              ⏰ 12-HOUR COOLDOWN: Once started, this cannot be run again for 12 hours!
            </p>
          </div>
          <p style="margin: 0; color: #fbbf24; font-size: 14px;">
            ⚠️ Use only when you need to ensure ALL profiles have the latest data
          </p>
          <div style="margin: 20px 0;">
            <label style="display: block; margin-bottom: 8px; color: #ccc; font-size: 14px;">
              Password Required:
            </label>
            <input 
              id="refreshPassword" 
              type="password" 
              placeholder="Enter password to confirm"
              style="
                width: 100%;
                padding: 10px;
                background: #0d1117;
                border: 1px solid #30363d;
                border-radius: 6px;
                color: white;
                font-size: 14px;
                outline: none;
              "
            />
          </div>
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
      const password = passwordInput.value;
      
      if (!password) {
        alert('Password is required to start full refresh');
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
          body: JSON.stringify({ password })
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Force refresh API error:', response.status, errorText);
          throw new Error(`API Error ${response.status}: ${errorText}`);
        }
        
        const result = await response.json();
        
        console.log('[Distribution] Full refresh started:', result);
        
        // Show success dialog
        alert(`Full refresh started successfully!\n\nThis will take 30+ minutes to complete.\nProcess ID: ${result.processId}`);
        
        // Refresh status to show the update is running
        checkFullRefreshStatus();
      } catch (error) {
        console.error('[Distribution] Full refresh error:', error);
        alert(`Full refresh failed: ${error.message}`);
      }
    });
  };

  return (
    <div className="relative">
      {/* Small Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-6 max-w-md mx-4 shadow-2xl">
            <div className="text-center">
              {/* Animated Logo/Icon */}
              <div className="mb-4">
                <div className="relative">
                  <div className="w-16 h-16 mx-auto bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center animate-pulse">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                      <span className="text-xl font-bold text-gray-800">E</span>
                    </div>
                  </div>
                  {/* Rotating ring */}
                  <div className="absolute inset-0 w-16 h-16 mx-auto border-2 border-transparent border-t-blue-400 border-r-purple-400 rounded-full animate-spin"></div>
                </div>
              </div>

              <h2 className="text-xl font-bold text-white mb-3">
                Loading XP Distribution Data...
              </h2>

              {loadingProgress && (
                <div className="mt-4">
                  <p className="text-gray-300 text-sm mb-2">
                    {loadingProgress.stage || 'Processing data'}
                  </p>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-green-400 to-blue-500 h-2 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${loadingProgress.percentage || 0}%` }}
                    ></div>
                  </div>
                  <p className="text-gray-400 text-xs mt-1">
                    {loadingProgress.percentage !== undefined ? `${loadingProgress.percentage.toFixed(1)}% Complete` : ''}
                  </p>
                </div>
              )}

              {/* Bouncing dots animation */}
              <div className="flex justify-center items-center mt-4 space-x-1">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={loading ? 'opacity-50 pointer-events-none' : ''}>
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
            <p className={classicStyles.statSubValue}>Users with XP: {xpUserCounts.allSeasons.usersWithXp.toLocaleString()}</p>
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
            {currentData.length === 0 ? (
              <div className={classicStyles.container}>
                <p style={{ textAlign: 'center', color: '#8b949e', margin: '2rem 0' }}>
                  {loading ? 'Loading leaderboard data...' : 'No data available. Please try refreshing.'}
                </p>
              </div>
            ) : (
              <>
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
                            <SafeAvatar
                              src={user.avatarUrl}
                              username={user.displayName || user.username}
                              className={classicStyles.avatar}
                              size={40}
                              alt={user.displayName || 'User avatar'}
                            />
                            <div>
                              <div className={classicStyles.userName}>
                                {user.displayName || user.username || 'Unknown'}
                                {hasValidatorNft(user.profileId, validatorNfts) && (
                                  <span className={classicStyles.validatorSymbol}>𝑽</span>
                                )}
                              </div>
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
              </>
            )}
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
                      value: season.season_id.toString(),
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
                        value: week.week.toString(),
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
                  <div className="flex gap-2">
                    <div className="relative flex-grow">
                      <input
                        type="text"
                        placeholder="Search by username, display name, or profile ID..."
                        value={weeklySearchTerm}
                        onChange={(e) => handleWeeklySearch(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            triggerWeeklySearch();
                          }
                        }}
                        className="w-full px-3 py-2 pr-10 bg-[#0d1117] border border-[#30363d] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={weeklySearchLoading}
                      />
                      {weeklySearchTerm && !weeklySearchLoading && (
                        <button
                          onClick={() => handleWeeklySearch('')}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors duration-200"
                          type="button"
                          aria-label="Clear search"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                      {weeklySearchLoading && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <LoadingBars size="small" color="gray" />
                        </div>
                      )}
                    </div>
                    <button
                      onClick={triggerWeeklySearch}
                      disabled={!weeklySearchTerm.trim() || weeklySearchLoading}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all duration-200"
                    >
                      {weeklySearchLoading ? (
                        <div className="flex items-center gap-2">
                          <LoadingBars size="small" color="white" />
                          <span>Searching...</span>
                        </div>
                      ) : (
                        'Search'
                      )}
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Summary Info */}
              <div className="flex flex-wrap gap-4 mb-6 text-sm">
                <div className="flex items-center space-x-2">
                  <span className="text-gray-400">Showing:</span>
                  <span className="text-white font-medium">
                    {(selectedWeek !== undefined && selectedWeek !== null && selectedWeek !== '') ? `Week ${selectedWeek} of ${availableSeasons.find(s => s.season_id.toString() === selectedSeason)?.season_name}` : `${availableSeasons.find(s => s.season_id.toString() === selectedSeason)?.season_name} Total`}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-gray-400">Total Results:</span>
                  <span className="text-blue-400 font-medium">{weeklyPagination.total.toLocaleString()}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-gray-400">Metric:</span>
                  <span className="text-green-400 font-medium">
                    {(selectedWeek !== undefined && selectedWeek !== null && selectedWeek !== '') ? 'Weekly XP' : 'Cumulative XP'}
                  </span>
                </div>
              </div>
            </div>

            {/* Weekly Leaderboard Table */}
            <div className={classicStyles.tableContainer}>
              {weeklyLoading ? (
                <div className="flex items-center justify-center py-12">
                  <LoadingSpinner size="lg" color="blue" text="Loading weekly data..." />
                </div>
              ) : (
                <div className={classicStyles.tableWrapper}>
                  <table className={classicStyles.table}>
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>User</th>
                        <th>{(selectedWeek !== undefined && selectedWeek !== null && selectedWeek !== '') ? 'Weekly XP' : 'Season XP'}</th>
                        {!(selectedWeek !== undefined && selectedWeek !== null && selectedWeek !== '') && <th>Cumulative XP</th>}
                        <th>Total XP</th>
                        <th>Season</th>
                        {(selectedWeek !== undefined && selectedWeek !== null && selectedWeek !== '') && <th>Week</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {weeklyData.map((user) => (
                        <tr key={`${user.profile_id}-${user.season_id}-${user.week}`}>
                          <td>
                            <span className={classicStyles.rank}>#{user.rank}</span>
                          </td>
                          <td>
                            <div className={classicStyles.userCell}>
                              <SafeAvatar
                                src={user.avatar_url}
                                username={user.display_name || user.username}
                                className={classicStyles.avatar}
                                size={40}
                                alt={user.display_name || 'User avatar'}
                              />
                              <div>
                                <div className={classicStyles.userName}>
                                  {user.display_name || user.username || 'Unknown'}
                                  {hasValidatorNft(user.profile_id, validatorNfts) && (
                                    <span className={classicStyles.validatorSymbol}>𝑽</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="font-bold text-blue-400">
                            {(selectedWeek !== undefined && selectedWeek !== null && selectedWeek !== '') ? 
                              (user.weekly_xp || 0).toLocaleString() : 
                              (user.cumulative_xp || 0).toLocaleString()
                            }
                          </td>
                          {!(selectedWeek !== undefined && selectedWeek !== null && selectedWeek !== '') && (
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
                          {(selectedWeek !== undefined && selectedWeek !== null && selectedWeek !== '') && (
                            <td>
                              <span className="px-2 py-1 bg-blue-700 text-blue-300 text-xs rounded">
                                Week {selectedWeek}
                              </span>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {weeklyData.length === 0 && !weeklyLoading && (
                    <div className="text-center py-12">
                      <p className="text-gray-400 text-lg">No data found for the selected criteria</p>
                      <p className="text-gray-500 text-sm mt-2">
                        Try selecting a different season or week, or check your search term
                      </p>
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
              
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {/* Left Column - XP Ranges and Score Tiers */}
                <div className="space-y-6">
                  {/* XP Ranges */}
                  <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-white mb-4">Users by XP Range</h3>
                    <div className="space-y-3">
                      {Object.entries(xpRanges).map(([range, count]) => (
                        <div key={range} className="flex items-center justify-between">
                          <span className="text-gray-300 text-sm">{range} XP:</span>
                          <div className="flex items-center">
                            <div className="w-20 bg-gray-700 rounded-full h-2 mr-3">
                              <div
                                className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full"
                                style={{ width: `${(count / (distributionStats?.totalUsers || leaderboardData.length)) * 100}%` }}
                              ></div>
                            </div>
                            <span className="text-white font-medium w-12 text-right text-sm">{count.toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Score Tiers */}
                  <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-6">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                      <div className="w-1 h-6 bg-gradient-to-b from-red-500 to-amber-500 rounded-full mr-3"></div>
                      Users by Score Tier
                    </h3>
                    <div className="space-y-4">
                      {Object.entries(scoreTiers).map(([tierName, tier]) => {
                        const percentage = leaderboardData.length > 0 ? (tier.count / leaderboardData.length) * 100 : 0;
                        const maxCount = Math.max(...Object.values(scoreTiers).map(t => t.count));
                        const barWidth = maxCount > 0 ? (tier.count / maxCount) * 100 : 0;
                        
                        return (
                          <div key={tierName} className="group">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center">
                                <div className={`w-3 h-3 rounded-full mr-3 ${tier.bgColor} shadow-lg ring-2 ring-${tier.color}-300 ring-opacity-50`}></div>
                                <span className="text-white font-semibold text-sm">{tierName}</span>
                                <span className="text-gray-400 text-xs ml-2">({tier.min}-{tier.max})</span>
                              </div>
                              <div className="text-right">
                                <div className="text-white font-bold text-sm">{tier.count.toLocaleString()}</div>
                                <div className="text-gray-400 text-xs">{percentage.toFixed(1)}%</div>
                              </div>
                            </div>
                            <div className="relative">
                              <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden shadow-inner">
                                <div
                                  className={`h-full ${tier.bgColor} rounded-full transition-all duration-700 ease-out relative overflow-hidden`}
                                  style={{ width: `${barWidth}%` }}
                                >
                                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-20 animate-pulse"></div>
                                </div>
                              </div>
                              {/* Tier indicator line */}
                              <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-gray-600 to-transparent opacity-50"></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-6 pt-4 border-t border-gray-700">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 text-sm font-medium">Total Users:</span>
                        <span className="text-white font-bold text-lg">{leaderboardData.length.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column - Top Contributors */}
                <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-4">Top XP Contributors</h3>
                  <div className="space-y-3">
                    {leaderboardData.slice(0, 10).map((user, index) => (
                      <div key={user.profileId} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-800 transition-colors">
                        <div className="flex items-center flex-1">
                          <span className="text-gray-400 w-6 text-sm">#{index + 1}</span>
                          <span className="text-white ml-2 text-sm truncate">{user.displayName}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-blue-400 font-semibold text-sm">
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

            {/* User Statistics Overview */}
            <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-6">
              <h2 className="text-2xl font-bold text-white mb-6">User Statistics Overview</h2>
              
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-4">
                  <p className="text-gray-400 text-sm">Total Ethos Profiles</p>
                  <p className="text-3xl font-bold text-white">
                    {totalProfilesCount > 0 ? totalProfilesCount.toLocaleString() : leaderboardData.length.toLocaleString()}
                  </p>
                </div>
                <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-4">
                  <p className="text-gray-400 text-sm">Total XP Distributed</p>
                  <p className="text-3xl font-bold text-blue-400">
                    {ethosDistributionApi.formatXpToMillions(totalXp)}
                  </p>
                </div>
                <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-4">
                  <p className="text-gray-400 text-sm">Average XP per User</p>
                  <p className="text-3xl font-bold text-green-400">
                    {ethosDistributionApi.formatXpToMillions(totalXp / leaderboardData.length)}
                  </p>
                </div>
                <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-4">
                  <p className="text-gray-400 text-sm">Top Score</p>
                  <p className="text-3xl font-bold text-purple-400">
                    {Math.max(...leaderboardData.map(user => user.score || 0)).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Season Breakdown and Users with XP */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Season 0</h3>
                    <span className="px-3 py-1 bg-blue-900 text-blue-300 text-sm font-medium rounded">
                      S0
                    </span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total XP:</span>
                      <span className="text-blue-400 font-semibold">
                        {ethosDistributionApi.formatXpToMillions(xpUserCounts.season0.totalXp)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Users with XP:</span>
                      <span className="text-blue-300">
                        {xpUserCounts.season0.usersWithXp.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Avg XP/User:</span>
                      <span className="text-gray-300">
                        {ethosDistributionApi.formatXpToMillions(xpUserCounts.season0.avgXpPerUser)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Season 1</h3>
                    <span className="px-3 py-1 bg-green-900 text-green-300 text-sm font-medium rounded">
                      S1
                    </span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total XP:</span>
                      <span className="text-green-400 font-semibold">
                        {ethosDistributionApi.formatXpToMillions(xpUserCounts.season1.totalXp)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Users with XP:</span>
                      <span className="text-green-300">
                        {xpUserCounts.season1.usersWithXp.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Avg XP/User:</span>
                      <span className="text-gray-300">
                        {ethosDistributionApi.formatXpToMillions(xpUserCounts.season1.avgXpPerUser)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Users with XP</h3>
                    <span className="px-3 py-1 bg-orange-900 text-orange-300 text-sm font-medium rounded">
                      XP Users
                    </span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Season 0:</span>
                      <span className="text-blue-300">
                        {xpUserCounts.season0.usersWithXp.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Season 1:</span>
                      <span className="text-green-300">
                        {xpUserCounts.season1.usersWithXp.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-gray-700 pt-3">
                      <span className="text-gray-400 font-semibold">Total Unique:</span>
                      <span className="text-orange-400 font-semibold">
                        {xpUserCounts.allSeasons.usersWithXp.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

          </main>
        </div>
      </div>
    </div>
  );
}
