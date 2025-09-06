import EthosDatabase from '../database/index.js';

// Singleton database instance
let dbInstance = null;

export function getDatabase() {
  if (!dbInstance) {
    dbInstance = new EthosDatabase();
  }
  return dbInstance;
}

// API wrapper functions for easy use in Next.js pages
export class EthosDatabaseAPI {
  constructor() {
    this.db = getDatabase();
  }

  // Profile queries
  async getProfile(profileId) {
    return this.db.getProfile(profileId);
  }

  async getTopProfiles(limit = 100) {
    return this.db.getTopProfiles(limit);
  }

  async getAllProfiles(limit = 1000, offset = 0) {
    return this.db.getAllProfiles(limit, offset);
  }

  async searchProfiles(query, limit = 50) {
    const stmt = this.db.db.prepare(`
      SELECT * FROM profiles 
      WHERE username LIKE ? OR display_name LIKE ?
      ORDER BY score DESC
      LIMIT ?
    `);
    const searchTerm = `%${query}%`;
    return stmt.all(searchTerm, searchTerm, limit);
  }

  // Statistics queries
  async getProfileStats(profileId) {
    return this.db.getProfileStats(profileId);
  }

  async getLeaderboard(limit = 100) {
    const stmt = this.db.db.prepare(`
      SELECT 
        p.*,
        us.reviews_given,
        us.reviews_received,
        us.vouches_given,
        us.vouches_received,
        us.positive_ratio,
        us.reciprocity_ratio
      FROM profiles p
      LEFT JOIN user_stats us ON p.profile_id = us.profile_id
      ORDER BY p.score DESC
      LIMIT ?
    `);
    return stmt.all(limit);
  }

  async getDistributionData() {
    const stmt = this.db.db.prepare(`
      SELECT 
        CASE 
          WHEN score >= 5000 THEN '5000+'
          WHEN score >= 2500 THEN '2500-4999'
          WHEN score >= 1000 THEN '1000-2499'
          WHEN score >= 500 THEN '500-999'
          WHEN score >= 100 THEN '100-499'
          ELSE '0-99'
        END as score_range,
        COUNT(*) as count
      FROM profiles
      WHERE score > 0
      GROUP BY score_range
      ORDER BY MIN(score) DESC
    `);
    return stmt.all();
  }

  // R4R Analysis queries
  async getR4RAnalysis(profileId) {
    return this.db.getR4RAnalysis(profileId);
  }

  async getHighRiskProfiles(limit = 100) {
    const stmt = this.db.db.prepare(`
      SELECT p.*, r.risk_score, r.reciprocity_ratio, r.reviewer_reputation
      FROM profiles p
      JOIN r4r_analysis r ON p.profile_id = r.profile_id
      WHERE r.risk_score > 0.7
      ORDER BY r.risk_score DESC
      LIMIT ?
    `);
    return stmt.all(limit);
  }

  // Activity and engagement queries
  async getMostActiveUsers(limit = 100) {
    const stmt = this.db.db.prepare(`
      SELECT p.*, us.*, (us.reviews_given + us.reviews_received + us.vouches_given + us.vouches_received) as total_activity
      FROM profiles p
      JOIN user_stats us ON p.profile_id = us.profile_id
      ORDER BY total_activity DESC
      LIMIT ?
    `);
    return stmt.all(limit);
  }

  async getRecentlyActive(days = 7, limit = 100) {
    const stmt = this.db.db.prepare(`
      SELECT * FROM profiles
      WHERE last_synced >= datetime('now', '-${days} days')
      ORDER BY last_synced DESC
      LIMIT ?
    `);
    return stmt.all(limit);
  }

  // ETH price queries
  async getLatestEthPrice() {
    return this.db.getLatestEthPrice();
  }

  async getEthPriceHistory(days = 30) {
    const stmt = this.db.db.prepare(`
      SELECT * FROM eth_prices
      WHERE recorded_at >= datetime('now', '-${days} days')
      ORDER BY recorded_at DESC
    `);
    return stmt.all();
  }

  // Analytics and insights
  async getDashboardStats() {
    const stats = this.db.getDatabaseStats();
    
    // Get additional analytics
    const totalScore = this.db.db.prepare('SELECT SUM(score) as total FROM profiles').get();
    const avgScore = this.db.db.prepare('SELECT AVG(score) as avg FROM profiles WHERE score > 0').get();
    const topUser = this.db.db.prepare('SELECT username, score FROM profiles ORDER BY score DESC LIMIT 1').get();
    const latestSync = this.db.db.prepare('SELECT * FROM sync_logs WHERE status = "completed" ORDER BY completed_at DESC LIMIT 1').get();

    return {
      ...stats,
      totalCredibilityScore: totalScore.total || 0,
      averageScore: Math.round(avgScore.avg || 0),
      topUser: topUser,
      lastSync: latestSync?.completed_at
    };
  }

  async getNetworkGrowth(days = 30) {
    const stmt = this.db.db.prepare(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as new_profiles
      FROM profiles
      WHERE created_at >= datetime('now', '-${days} days')
      GROUP BY DATE(created_at)
      ORDER BY date
    `);
    return stmt.all();
  }

  // User key queries
  async getUsersByAddress(address) {
    const stmt = this.db.db.prepare(`
      SELECT p.* FROM profiles p
      JOIN user_keys uk ON p.profile_id = uk.profile_id
      WHERE uk.key_type = 'address' AND uk.key_value = ?
    `);
    return stmt.all(address);
  }

  async getUsersBySocialAccount(platform, accountId) {
    const stmt = this.db.db.prepare(`
      SELECT p.* FROM profiles p
      JOIN user_keys uk ON p.profile_id = uk.profile_id
      WHERE uk.key_type = ? AND uk.key_value = ?
    `);
    return stmt.all(`service:${platform}`, accountId);
  }

  // Sync status
  async getSyncLogs(limit = 20) {
    return this.db.getSyncLogs(limit);
  }

  async getLastSyncStatus() {
    const stmt = this.db.db.prepare(`
      SELECT sync_type, status, completed_at, records_processed, duration_ms
      FROM sync_logs
      WHERE status IN ('completed', 'failed')
      ORDER BY completed_at DESC
      LIMIT 5
    `);
    return stmt.all();
  }
}

// Export singleton instance
export const ethosDB = new EthosDatabaseAPI();
