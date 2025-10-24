// Automatic week detection utility
// This utility automatically determines the current week based on the season_weeks.csv data

import fs from 'fs';
import path from 'path';

class WeekDetector {
  constructor() {
    this.seasonWeeks = null;
    this.lastLoaded = null;
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  // Load season weeks data with caching
  loadSeasonWeeks() {
    const now = Date.now();
    
    // Always reload for now to ensure fresh data
    // if (this.seasonWeeks && this.lastLoaded && (now - this.lastLoaded) < this.cacheTimeout) {
    //   return this.seasonWeeks;
    // }

    try {
      const dataDir = path.join(process.cwd(), 'data', 'csv');
      const seasonWeeksFile = path.join(dataDir, 'season_weeks.csv');
      
      if (!fs.existsSync(seasonWeeksFile)) {
        console.warn('⚠️ season_weeks.csv not found, using fallback week detection');
        return this.getFallbackWeek();
      }

      const content = fs.readFileSync(seasonWeeksFile, 'utf8');
      const lines = content.trim().split('\n');
      const headers = lines[0].split(',');
      
      this.seasonWeeks = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        const week = {};
        
        headers.forEach((header, index) => {
          let value = values[index] || '';
          
          // Convert numeric fields
          if (['season_id', 'week'].includes(header)) {
            value = value === '' ? 0 : parseInt(value);
          }
          
          week[header] = value;
        });
        
        this.seasonWeeks.push(week);
      }
      
      this.lastLoaded = now;
      console.log(`📅 Loaded ${this.seasonWeeks.length} season weeks for automatic detection`);
      
    } catch (error) {
      console.error('❌ Error loading season weeks:', error);
      return this.getFallbackWeek();
    }

    return this.seasonWeeks;
  }

  // Get current week based on date
  getCurrentWeek() {
    const seasonWeeks = this.loadSeasonWeeks();
    if (!seasonWeeks || seasonWeeks.length === 0) {
      return this.getFallbackWeek();
    }

    const now = new Date();
    let currentSeason = null;
    let currentWeek = null;

    // Find the current week based on date ranges
    for (const week of seasonWeeks) {
      const startDate = new Date(week.start_date);
      const endDate = new Date(week.end_date);
      
      if (now >= startDate && now <= endDate) {
        currentSeason = week.season_id;
        currentWeek = week.week;
        break;
      }
    }

    // If no current week found, get the latest week
    if (!currentSeason || currentWeek === null) {
      const latestWeek = seasonWeeks.reduce((latest, week) => {
        const weekDate = new Date(week.end_date);
        const latestDate = new Date(latest.end_date);
        return weekDate > latestDate ? week : latest;
      });
      
      currentSeason = latestWeek.season_id;
      currentWeek = latestWeek.week;
    }

    console.log(`📅 Auto-detected current week: Season ${currentSeason}, Week ${currentWeek}`);
    
    return {
      season: currentSeason,
      week: currentWeek,
      seasonWeeks: seasonWeeks,
      isCurrent: now >= new Date(seasonWeeks.find(w => w.season_id === currentSeason && w.week === currentWeek)?.start_date) && 
                 now <= new Date(seasonWeeks.find(w => w.season_id === currentSeason && w.week === currentWeek)?.end_date)
    };
  }

  // Fallback week detection when CSV is not available
  getFallbackWeek() {
    console.log('📅 Using fallback week detection (Week 18)');
    return {
      season: 1,
      week: 18,
      seasonWeeks: [],
      isCurrent: true
    };
  }

  // Get available weeks for a season
  getAvailableWeeks(seasonId) {
    const seasonWeeks = this.loadSeasonWeeks();
    if (!seasonWeeks) return [];

    return seasonWeeks
      .filter(week => week.season_id === seasonId)
      .sort((a, b) => a.week - b.week)
      .map(week => ({
        season_id: week.season_id,
        week: week.week,
        start_date: week.start_date,
        end_date: week.end_date
      }));
  }

  // Get all available seasons
  getAvailableSeasons() {
    const seasonWeeks = this.loadSeasonWeeks();
    if (!seasonWeeks) return [];

    const seasons = new Map();
    seasonWeeks.forEach(week => {
      if (!seasons.has(week.season_id)) {
        seasons.set(week.season_id, {
          season_id: week.season_id,
          season_name: `Season ${week.season_id}`,
          weeks: []
        });
      }
      seasons.get(week.season_id).weeks.push(week.week);
    });

    return Array.from(seasons.values()).sort((a, b) => a.season_id - b.season_id);
  }

  // Check if a specific week is current
  isCurrentWeek(seasonId, weekNumber) {
    const current = this.getCurrentWeek();
    return current.season === seasonId && current.week === weekNumber;
  }

  // Get next week
  getNextWeek() {
    const current = this.getCurrentWeek();
    const seasonWeeks = this.loadSeasonWeeks();
    
    if (!seasonWeeks) return null;

    const currentWeekData = seasonWeeks.find(w => 
      w.season_id === current.season && w.week === current.week
    );

    if (!currentWeekData) return null;

    const nextWeek = seasonWeeks.find(w => 
      w.season_id === current.season && w.week === current.week + 1
    );

    return nextWeek ? {
      season: nextWeek.season_id,
      week: nextWeek.week,
      start_date: nextWeek.start_date,
      end_date: nextWeek.end_date
    } : null;
  }

  // Get previous week
  getPreviousWeek() {
    const current = this.getCurrentWeek();
    const seasonWeeks = this.loadSeasonWeeks();
    
    if (!seasonWeeks) return null;

    const previousWeek = seasonWeeks.find(w => 
      w.season_id === current.season && w.week === current.week - 1
    );

    return previousWeek ? {
      season: previousWeek.season_id,
      week: previousWeek.week,
      start_date: previousWeek.start_date,
      end_date: previousWeek.end_date
    } : null;
  }
}

// Export singleton instance
export default new WeekDetector();
