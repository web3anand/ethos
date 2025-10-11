// Test script to verify API completeness and data quality
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG = {
  BASE_URL: 'http://localhost:3000',
  PROFILES_API: '/api/comprehensive-profiles',
  WEEKLY_XP_API: '/api/csv-weekly-xp',
  BATCH_SIZE: 1000,
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
};

class ApiTester {
  constructor() {
    this.results = {
      profiles: {
        total: 0,
        batches: 0,
        errors: [],
        sample: null,
        fields: new Set(),
        validation: {
          missingProfileId: 0,
          missingUsername: 0,
          missingDisplayName: 0,
          missingAvatarUrl: 0,
          invalidScore: 0,
          invalidXp: 0,
          invalidStreak: 0,
        }
      },
      weeklyXp: {
        total: 0,
        seasons: {},
        errors: [],
        sample: null,
        fields: new Set(),
        validation: {
          missingProfileId: 0,
          missingSeasonId: 0,
          missingWeek: 0,
          missingWeeklyXp: 0,
          invalidWeeklyXp: 0,
        }
      }
    };
  }

  async testProfilesApi() {
    console.log('🧪 Testing Profiles API...');
    
    const allProfiles = [];
    let offset = 0;
    let hasMore = true;
    let batchCount = 0;

    while (hasMore) {
      try {
        const url = `${CONFIG.BASE_URL}${CONFIG.PROFILES_API}?offset=${offset}&limit=${CONFIG.BATCH_SIZE}`;
        console.log(`📡 Testing batch ${batchCount + 1}: ${url}`);
        
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.profiles || !Array.isArray(data.profiles)) {
          throw new Error('Invalid response format - missing profiles array');
        }

        allProfiles.push(...data.profiles);
        hasMore = data.profiles.length === CONFIG.BATCH_SIZE;
        offset += CONFIG.BATCH_SIZE;
        batchCount++;
        
        console.log(`✅ Batch ${batchCount}: ${data.profiles.length} profiles (total: ${allProfiles.length})`);
        
        // Store sample from first batch
        if (batchCount === 1 && data.profiles.length > 0) {
          this.results.profiles.sample = data.profiles[0];
        }
        
        // Collect field names
        data.profiles.forEach(profile => {
          Object.keys(profile).forEach(key => this.results.profiles.fields.add(key));
        });
        
        // Validate data quality
        this.validateProfiles(data.profiles);
        
        // Add delay to avoid overwhelming the API
        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
      } catch (error) {
        console.error(`❌ Error in batch ${batchCount + 1}:`, error.message);
        this.results.profiles.errors.push({
          batch: batchCount + 1,
          offset,
          error: error.message
        });
        break;
      }
    }

    this.results.profiles.total = allProfiles.length;
    this.results.profiles.batches = batchCount;
    
    console.log(`✅ Profiles API test completed: ${allProfiles.length} profiles in ${batchCount} batches`);
    return allProfiles;
  }

  async testWeeklyXpApi() {
    console.log('🧪 Testing Weekly XP API...');
    
    const seasons = [
      { id: 0, name: 'Season 0', weeks: [0] },
      { id: 1, name: 'Season 1', weeks: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] }
    ];

    const allWeeklyData = [];

    for (const season of seasons) {
      this.results.weeklyXp.seasons[season.id] = {
        name: season.name,
        weeks: {},
        totalRecords: 0
      };

      for (const week of season.weeks) {
        let offset = 0;
        let hasMore = true;
        let batchCount = 0;
        let seasonWeekRecords = [];

        console.log(`📡 Testing Season ${season.id}, Week ${week}...`);

        while (hasMore) {
          try {
            const url = `${CONFIG.BASE_URL}${CONFIG.WEEKLY_XP_API}?season=${season.id}&week=${week}&offset=${offset}&limit=${CONFIG.BATCH_SIZE}`;
            
            const response = await fetch(url);
            
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (!data.profiles || !Array.isArray(data.profiles)) {
              throw new Error('Invalid response format - missing profiles array');
            }

            seasonWeekRecords.push(...data.profiles);
            hasMore = data.profiles.length === CONFIG.BATCH_SIZE;
            offset += CONFIG.BATCH_SIZE;
            batchCount++;
            
            console.log(`✅ Season ${season.id}, Week ${week}, Batch ${batchCount}: ${data.profiles.length} records`);
            
            // Store sample from first batch of first season/week
            if (season.id === 0 && week === 0 && batchCount === 1 && data.profiles.length > 0) {
              this.results.weeklyXp.sample = data.profiles[0];
            }
            
            // Collect field names
            data.profiles.forEach(record => {
              Object.keys(record).forEach(key => this.results.weeklyXp.fields.add(key));
            });
            
            // Validate data quality
            this.validateWeeklyXp(data.profiles);
            
            // Add delay to avoid overwhelming the API
            if (hasMore) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
            
          } catch (error) {
            console.error(`❌ Error in Season ${season.id}, Week ${week}, Batch ${batchCount + 1}:`, error.message);
            this.results.weeklyXp.errors.push({
              season: season.id,
              week,
              batch: batchCount + 1,
              offset,
              error: error.message
            });
            break;
          }
        }

        this.results.weeklyXp.seasons[season.id].weeks[week] = {
          records: seasonWeekRecords.length,
          batches: batchCount
        };
        this.results.weeklyXp.seasons[season.id].totalRecords += seasonWeekRecords.length;
        allWeeklyData.push(...seasonWeekRecords);
        
        console.log(`✅ Season ${season.id}, Week ${week} completed: ${seasonWeekRecords.length} records`);
      }
    }

    this.results.weeklyXp.total = allWeeklyData.length;
    console.log(`✅ Weekly XP API test completed: ${allWeeklyData.length} total records`);
    return allWeeklyData;
  }

  validateProfiles(profiles) {
    profiles.forEach(profile => {
      // Check required fields
      if (!profile.profile_id) this.results.profiles.validation.missingProfileId++;
      if (!profile.username) this.results.profiles.validation.missingUsername++;
      if (!profile.display_name) this.results.profiles.validation.missingDisplayName++;
      if (!profile.avatar_url) this.results.profiles.validation.missingAvatarUrl++;
      
      // Check data types and ranges
      if (profile.score && (isNaN(profile.score) || profile.score < 0)) {
        this.results.profiles.validation.invalidScore++;
      }
      if (profile.total_xp && (isNaN(profile.total_xp) || profile.total_xp < 0)) {
        this.results.profiles.validation.invalidXp++;
      }
      if (profile.streak_days && (isNaN(profile.streak_days) || profile.streak_days < 0 || profile.streak_days > 365)) {
        this.results.profiles.validation.invalidStreak++;
      }
    });
  }

  validateWeeklyXp(records) {
    records.forEach(record => {
      // Check required fields
      if (!record.profile_id) this.results.weeklyXp.validation.missingProfileId++;
      if (record.season_id === undefined || record.season_id === null) this.results.weeklyXp.validation.missingSeasonId++;
      if (record.week === undefined || record.week === null) this.results.weeklyXp.validation.missingWeek++;
      if (record.weekly_xp === undefined || record.weekly_xp === null) this.results.weeklyXp.validation.missingWeeklyXp++;
      
      // Check data types and ranges
      if (record.weekly_xp && (isNaN(record.weekly_xp) || record.weekly_xp < 0)) {
        this.results.weeklyXp.validation.invalidWeeklyXp++;
      }
    });
  }

  generateReport() {
    console.log('\n📊 API COMPLETENESS REPORT');
    console.log('='.repeat(50));
    
    // Profiles Report
    console.log('\n👥 PROFILES API:');
    console.log(`   Total Profiles: ${this.results.profiles.total}`);
    console.log(`   Batches Fetched: ${this.results.profiles.batches}`);
    console.log(`   Fields Found: ${Array.from(this.results.profiles.fields).join(', ')}`);
    console.log(`   Errors: ${this.results.profiles.errors.length}`);
    
    if (this.results.profiles.sample) {
      console.log('\n   Sample Profile:');
      console.log(`     Profile ID: ${this.results.profiles.sample.profile_id}`);
      console.log(`     Username: ${this.results.profiles.sample.username}`);
      console.log(`     Display Name: ${this.results.profiles.sample.display_name}`);
      console.log(`     Score: ${this.results.profiles.sample.score}`);
      console.log(`     Total XP: ${this.results.profiles.sample.total_xp}`);
    }
    
    console.log('\n   Data Quality Issues:');
    Object.entries(this.results.profiles.validation).forEach(([field, count]) => {
      if (count > 0) {
        console.log(`     ${field}: ${count} issues`);
      }
    });
    
    // Weekly XP Report
    console.log('\n📅 WEEKLY XP API:');
    console.log(`   Total Records: ${this.results.weeklyXp.total}`);
    console.log(`   Fields Found: ${Array.from(this.results.weeklyXp.fields).join(', ')}`);
    console.log(`   Errors: ${this.results.weeklyXp.errors.length}`);
    
    console.log('\n   Season Breakdown:');
    Object.entries(this.results.weeklyXp.seasons).forEach(([seasonId, seasonData]) => {
      console.log(`     Season ${seasonId} (${seasonData.name}): ${seasonData.totalRecords} records`);
      Object.entries(seasonData.weeks).forEach(([week, weekData]) => {
        console.log(`       Week ${week}: ${weekData.records} records (${weekData.batches} batches)`);
      });
    });
    
    if (this.results.weeklyXp.sample) {
      console.log('\n   Sample Weekly Record:');
      console.log(`     Profile ID: ${this.results.weeklyXp.sample.profile_id}`);
      console.log(`     Season ID: ${this.results.weeklyXp.sample.season_id}`);
      console.log(`     Week: ${this.results.weeklyXp.sample.week}`);
      console.log(`     Weekly XP: ${this.results.weeklyXp.sample.weekly_xp}`);
    }
    
    console.log('\n   Data Quality Issues:');
    Object.entries(this.results.weeklyXp.validation).forEach(([field, count]) => {
      if (count > 0) {
        console.log(`     ${field}: ${count} issues`);
      }
    });
    
    // Error Details
    if (this.results.profiles.errors.length > 0) {
      console.log('\n❌ PROFILES API ERRORS:');
      this.results.profiles.errors.forEach(error => {
        console.log(`   Batch ${error.batch} (offset ${error.offset}): ${error.error}`);
      });
    }
    
    if (this.results.weeklyXp.errors.length > 0) {
      console.log('\n❌ WEEKLY XP API ERRORS:');
      this.results.weeklyXp.errors.forEach(error => {
        console.log(`   Season ${error.season}, Week ${error.week}, Batch ${error.batch}: ${error.error}`);
      });
    }
    
    // Summary
    console.log('\n📋 SUMMARY:');
    const totalErrors = this.results.profiles.errors.length + this.results.weeklyXp.errors.length;
    const totalValidationIssues = Object.values(this.results.profiles.validation).reduce((a, b) => a + b, 0) +
                                 Object.values(this.results.weeklyXp.validation).reduce((a, b) => a + b, 0);
    
    console.log(`   Total API Errors: ${totalErrors}`);
    console.log(`   Total Validation Issues: ${totalValidationIssues}`);
    console.log(`   Profiles: ${this.results.profiles.total} (${this.results.profiles.batches} batches)`);
    console.log(`   Weekly Records: ${this.results.weeklyXp.total}`);
    
    if (totalErrors === 0 && totalValidationIssues === 0) {
      console.log('   ✅ All APIs are working correctly!');
    } else {
      console.log('   ⚠️  Some issues detected - check details above');
    }
  }

  async run() {
    console.log('🚀 Starting API Completeness Test...\n');
    
    try {
      await this.testProfilesApi();
      await this.testWeeklyXpApi();
      this.generateReport();
    } catch (error) {
      console.error('❌ Test failed:', error);
    }
  }
}

// Run the test
const tester = new ApiTester();
tester.run();
