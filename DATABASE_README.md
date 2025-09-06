# Ethos Database & Sync System

This system provides a comprehensive SQLite database solution for storing and syncing Ethos Network data, with automated scheduling and API access.

## 🗃️ Database Structure

The database includes the following tables:

### Core Tables
- **`profiles`** - User profiles with scores, XP, and basic info
- **`user_keys`** - Associated addresses, social accounts, and identifiers
- **`user_stats`** - Aggregated statistics (reviews, vouches, ratios)
- **`r4r_analysis`** - R4R (Review for Review) analysis cache
- **`reviews`** - Individual reviews and vouches (future use)

### System Tables
- **`sync_logs`** - Track synchronization operations
- **`eth_prices`** - ETH price history

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Test Database Setup
```bash
npm run test:database
```

### 3. Run Initial Data Sync
```bash
npm run sync:full
```

### 4. Start Automated Sync Scheduler
```bash
npm run sync:start
```

## 📋 Available Commands

### Manual Sync Commands
```bash
npm run sync:full        # Complete data synchronization
npm run sync:profiles    # Sync profiles and stats only
npm run sync:r4r         # Sync R4R analysis only
npm run sync:eth-price   # Update ETH price only
npm run sync:status      # Show sync status and logs
```

### Scheduler Commands
```bash
npm run sync:start       # Start automated sync scheduler
```

## ⏰ Automated Sync Schedule

When running `npm run sync:start`, the following schedules are active:

- **Full Sync**: Every 6 hours
- **Profile Updates**: Every 2 hours  
- **ETH Price**: Every 15 minutes

## 🔧 API Usage

### In Next.js Pages/Components

```javascript
import { ethosDB } from '../utils/databaseApi.js';

// Get top profiles
const topProfiles = await ethosDB.getTopProfiles(100);

// Search profiles
const searchResults = await ethosDB.searchProfiles('ethereum');

// Get profile details
const profile = await ethosDB.getProfile(12345);
const stats = await ethosDB.getProfileStats(12345);

// Get leaderboard
const leaderboard = await ethosDB.getLeaderboard(50);

// Get dashboard statistics
const dashboardStats = await ethosDB.getDashboardStats();

// Get distribution data
const distribution = await ethosDB.getDistributionData();
```

### Database Stats Example Response
```javascript
{
  profiles: 21080,
  user_keys: 89234,
  user_stats: 21080,
  r4r_analysis: 15432,
  sync_logs: 45,
  totalCredibilityScore: 45678900,
  averageScore: 2167,
  topUser: { username: 'serpinxbt', score: 2548 },
  lastSync: '2025-09-05T10:30:45.123Z'
}
```

## 📊 Query Examples

### Get High-Activity Users
```javascript
const activeUsers = await ethosDB.getMostActiveUsers(50);
```

### Get High-Risk Profiles (R4R Analysis)
```javascript
const riskProfiles = await ethosDB.getHighRiskProfiles(100);
```

### Get Users by Wallet Address
```javascript
const users = await ethosDB.getUsersByAddress('0x1234...');
```

### Get Network Growth Data
```javascript
const growth = await ethosDB.getNetworkGrowth(30); // Last 30 days
```

## 🗂️ File Structure

```
database/
├── index.js           # Main database class
├── schema.sql         # Database schema
└── ethos.db          # SQLite database file (created automatically)

scripts/
├── sync-ethos-data.js # Data synchronization logic
├── scheduler.js       # Automated sync scheduler
└── test-database.js   # Database testing

utils/
└── databaseApi.js     # Next.js API wrapper
```

## 🔍 Monitoring & Logs

### Check Sync Status
```bash
npm run sync:status
```

### View Recent Sync Logs
```javascript
const logs = await ethosDB.getSyncLogs(20);
```

### Get Last Sync Status
```javascript
const status = await ethosDB.getLastSyncStatus();
```

## 🛠️ Advanced Usage

### Direct Database Access
```javascript
import EthosDatabase from '../database/index.js';

const db = new EthosDatabase();
const customQuery = db.db.prepare('SELECT * FROM profiles WHERE score > ?');
const results = customQuery.all(2000);
```

### Custom Sync Operations
```javascript
import EthosDataSync from '../scripts/sync-ethos-data.js';

const dataSync = new EthosDataSync();
await dataSync.syncProfiles();
await dataSync.syncR4RAnalysis();
```

## 📈 Performance Notes

- **Database**: SQLite with WAL mode for better concurrent access
- **Caching**: Built-in caching in API client with 5-minute TTL
- **Indexing**: Optimized indexes for common queries
- **Batch Operations**: Efficient bulk inserts and updates

## 🔒 Data Integrity

- Foreign key constraints enabled
- Automatic timestamps for all records
- Comprehensive error handling and logging
- Transaction-based operations for data consistency

## 🚨 Troubleshooting

### Database File Permissions
If you get permission errors, ensure the `database/` directory is writable.

### Sync Failures
Check sync logs for detailed error messages:
```bash
npm run sync:status
```

### Memory Usage
For large datasets, the sync process might use significant memory. Monitor with:
```bash
node --max-old-space-size=4096 scripts/scheduler.js sync full
```

## 🔮 Future Enhancements

- Real-time WebSocket sync updates
- Database backup and restore utilities
- Advanced analytics and reporting
- Multi-database replication support
- GraphQL API layer
