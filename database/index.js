import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class EthosDatabase {
  constructor(dbPath = null) {
    this.dbPath = dbPath || path.join(__dirname, 'ethos.db');
    this.db = null;
    this.init();
  }

  init() {
    try {
      // Create database connection
      this.db = new Database(this.dbPath);
      this.db.pragma('journal_mode = WAL'); // Better concurrent access
      this.db.pragma('foreign_keys = ON'); // Enable foreign key constraints
      
      // Read and execute schema
      const schemaPath = path.join(__dirname, 'schema.sql');
      const schema = fs.readFileSync(schemaPath, 'utf8');
      this.db.exec(schema);
      
      console.log('✅ Database initialized successfully');
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw error;
    }
  }

  // Profile operations
  upsertProfile(profileData) {
    const stmt = this.db.prepare(`
      INSERT INTO profiles (
        profile_id, username, display_name, avatar_url, description,
        score, xp_total, xp_streak_days, status, primary_address, updated_at, last_synced
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(profile_id) DO UPDATE SET
        username = excluded.username,
        display_name = excluded.display_name,
        avatar_url = excluded.avatar_url,
        description = excluded.description,
        score = excluded.score,
        xp_total = excluded.xp_total,
        xp_streak_days = excluded.xp_streak_days,
        status = excluded.status,
        primary_address = excluded.primary_address,
        updated_at = CURRENT_TIMESTAMP,
        last_synced = CURRENT_TIMESTAMP
    `);

    return stmt.run(
      profileData.profileId || profileData.id,
      profileData.username,
      profileData.displayName,
      profileData.avatarUrl,
      profileData.description,
      profileData.score || 0,
      profileData.xpTotal || 0,
      profileData.xpStreakDays || 0,
      profileData.status || 'ACTIVE',
      profileData.primaryAddr || profileData.primaryAddress
    );
  }

  // User keys operations
  upsertUserKeys(profileId, userkeys = []) {
    // First, delete existing keys for this profile
    const deleteStmt = this.db.prepare('DELETE FROM user_keys WHERE profile_id = ?');
    deleteStmt.run(profileId);

    // Insert new keys
    const insertStmt = this.db.prepare(`
      INSERT INTO user_keys (profile_id, key_type, key_value, is_primary)
      VALUES (?, ?, ?, ?)
    `);

    const insertMany = this.db.transaction((keys) => {
      for (const key of keys) {
        if (typeof key === 'string') {
          const [type, value] = key.includes(':') ? key.split(':', 2) : ['unknown', key];
          insertStmt.run(profileId, type, value, false);
        }
      }
    });

    insertMany(userkeys);
  }

  // User statistics operations
  upsertUserStats(profileId, stats) {
    const stmt = this.db.prepare(`
      INSERT INTO user_stats (
        profile_id, reviews_given, reviews_received, vouches_given, vouches_received,
        positive_received, negative_received, neutral_received,
        positive_given, negative_given, neutral_given,
        credibility_score, reciprocity_ratio, vouch_reciprocity_ratio,
        positive_ratio, negative_ratio, neutral_ratio, calculated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(profile_id) DO UPDATE SET
        reviews_given = excluded.reviews_given,
        reviews_received = excluded.reviews_received,
        vouches_given = excluded.vouches_given,
        vouches_received = excluded.vouches_received,
        positive_received = excluded.positive_received,
        negative_received = excluded.negative_received,
        neutral_received = excluded.neutral_received,
        positive_given = excluded.positive_given,
        negative_given = excluded.negative_given,
        neutral_given = excluded.neutral_given,
        credibility_score = excluded.credibility_score,
        reciprocity_ratio = excluded.reciprocity_ratio,
        vouch_reciprocity_ratio = excluded.vouch_reciprocity_ratio,
        positive_ratio = excluded.positive_ratio,
        negative_ratio = excluded.negative_ratio,
        neutral_ratio = excluded.neutral_ratio,
        calculated_at = CURRENT_TIMESTAMP
    `);

    const reviewStats = stats.review || {};
    const vouchStats = stats.vouch || {};

    return stmt.run(
      profileId,
      reviewStats.given || 0,
      reviewStats.received || 0,
      vouchStats.given || 0,
      vouchStats.received || 0,
      reviewStats.receivedPositive || 0,
      reviewStats.receivedNegative || 0,
      reviewStats.receivedNeutral || 0,
      reviewStats.givenPositive || 0,
      reviewStats.givenNegative || 0,
      reviewStats.givenNeutral || 0,
      stats.credibilityScore || 0,
      stats.reciprocityRatio || 0,
      stats.vouchReciprocityRatio || 0,
      stats.positiveRatio || 0,
      stats.negativeRatio || 0,
      stats.neutralRatio || 0
    );
  }

  // R4R analysis operations
  upsertR4RAnalysis(profileId, analysisData) {
    const stmt = this.db.prepare(`
      INSERT INTO r4r_analysis (
        profile_id, analysis_data, risk_score, reciprocity_ratio,
        reviewer_reputation, total_activity, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(profile_id) DO UPDATE SET
        analysis_data = excluded.analysis_data,
        risk_score = excluded.risk_score,
        reciprocity_ratio = excluded.reciprocity_ratio,
        reviewer_reputation = excluded.reviewer_reputation,
        total_activity = excluded.total_activity,
        updated_at = CURRENT_TIMESTAMP
    `);

    const metrics = analysisData.metrics || {};
    const ratios = metrics.ratios || {};
    const reviewerRep = analysisData.reviewerReputation || {};

    return stmt.run(
      profileId,
      JSON.stringify(analysisData),
      analysisData.riskScore || 0,
      parseFloat(ratios.reciprocityRatio) || 0,
      parseFloat(reviewerRep.averageReviewerCredibility) || 0,
      metrics.balance?.totalActivity || 0
    );
  }

  // ETH price operations
  insertEthPrice(priceUsd) {
    const stmt = this.db.prepare(`
      INSERT INTO eth_prices (price_usd) VALUES (?)
    `);
    return stmt.run(priceUsd);
  }

  // Sync log operations
  startSyncLog(syncType) {
    const stmt = this.db.prepare(`
      INSERT INTO sync_logs (sync_type, status, started_at)
      VALUES (?, 'started', CURRENT_TIMESTAMP)
    `);
    const result = stmt.run(syncType);
    return result.lastInsertRowid;
  }

  completeSyncLog(logId, recordsProcessed, recordsUpdated, recordsCreated, errorMessage = null) {
    const stmt = this.db.prepare(`
      UPDATE sync_logs 
      SET status = ?, records_processed = ?, records_updated = ?, records_created = ?,
          error_message = ?, completed_at = CURRENT_TIMESTAMP,
          duration_ms = (julianday(CURRENT_TIMESTAMP) - julianday(started_at)) * 24 * 60 * 60 * 1000
      WHERE id = ?
    `);
    
    const status = errorMessage ? 'failed' : 'completed';
    return stmt.run(status, recordsProcessed, recordsUpdated, recordsCreated, errorMessage, logId);
  }

  // Query operations
  getProfile(profileId) {
    const stmt = this.db.prepare('SELECT * FROM profiles WHERE profile_id = ?');
    return stmt.get(profileId);
  }

  getAllProfiles(limit = 1000, offset = 0) {
    const stmt = this.db.prepare('SELECT * FROM profiles ORDER BY score DESC LIMIT ? OFFSET ?');
    return stmt.all(limit, offset);
  }

  getTopProfiles(limit = 100) {
    const stmt = this.db.prepare(`
      SELECT p.*, us.* FROM profiles p
      LEFT JOIN user_stats us ON p.profile_id = us.profile_id
      ORDER BY p.score DESC
      LIMIT ?
    `);
    return stmt.all(limit);
  }

  getProfileStats(profileId) {
    const stmt = this.db.prepare('SELECT * FROM user_stats WHERE profile_id = ?');
    return stmt.get(profileId);
  }

  getR4RAnalysis(profileId) {
    const stmt = this.db.prepare('SELECT * FROM r4r_analysis WHERE profile_id = ?');
    const result = stmt.get(profileId);
    if (result && result.analysis_data) {
      result.analysis_data = JSON.parse(result.analysis_data);
    }
    return result;
  }

  getLatestEthPrice() {
    const stmt = this.db.prepare('SELECT * FROM eth_prices ORDER BY recorded_at DESC LIMIT 1');
    return stmt.get();
  }

  getSyncLogs(limit = 100) {
    const stmt = this.db.prepare('SELECT * FROM sync_logs ORDER BY started_at DESC LIMIT ?');
    return stmt.all(limit);
  }

  // Statistics and analytics
  getDatabaseStats() {
    const stats = {};
    
    const tables = ['profiles', 'user_keys', 'reviews', 'user_stats', 'r4r_analysis', 'sync_logs'];
    for (const table of tables) {
      const stmt = this.db.prepare(`SELECT COUNT(*) as count FROM ${table}`);
      stats[table] = stmt.get().count;
    }
    
    return stats;
  }

  // Close database connection
  close() {
    if (this.db) {
      this.db.close();
      console.log('📀 Database connection closed');
    }
  }
}

export default EthosDatabase;
