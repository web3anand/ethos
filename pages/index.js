import { useState } from 'react';
import {
  fetchUserByTwitter,
  fetchExchangeRate,
  fetchUserAddresses,
} from '../lib/ethos';
import styles from '../styles/Home.module.css';

export default function Home() {
  const [username, setUsername] = useState('');
  const [userData, setUserData] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [ethPrice, setEthPrice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Handle search click
  const handleSearch = async () => {
    if (!username) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchUserByTwitter(username.trim());
      if (!data) {
        setError('User not found');
        return;
      }
      setUserData(data);
      const [price, addrList] = await Promise.all([
        fetchExchangeRate(),
        fetchUserAddresses(data.profileId),
      ]);
      setEthPrice(price);
      setAddresses(addrList);
    } catch (err) {
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const formatWeiToEth = (wei) => (Number(wei) / 1e18).toFixed(3);
  const reviewReceived = userData?.stats?.review?.received;
  const reviewMade = userData?.stats?.review?.made;
  const vouchGiven = userData?.stats?.vouch?.given;
  const vouchReceived = userData?.stats?.vouch?.received;
  const xpTotal = userData?.xpTotal ?? userData?.xp?.total ?? userData?.xp_total;
  const xpStreakDays =
    userData?.xpStreakDays ?? userData?.xp?.streakDays ?? userData?.xp_streakDays;

  return (
    <div className={styles.container}>
      {/* Header Bar */}
      <header className={styles.topBar}>
        <h1>Ethos Search</h1>
        <div className={styles.searchBox}>
          <input
            type="text"
            value={username}
            placeholder="Twitter handle"
            onChange={(e) => setUsername(e.target.value)}
          />
          <button onClick={handleSearch} disabled={loading}>
            {loading ? 'Loading...' : 'Search'}
          </button>
        </div>
      </header>

      {error && <div className={styles.error}>{error}</div>}

      {userData && (
        <div className={styles.profileCard}>
          {/* Top Section */}
          <div className={styles.header}>
            <img
              src={userData.avatarUrl}
              alt="avatar"
              className={styles.avatar}
            />
            <div>
              <div className={styles.userName}>{userData.displayName}</div>
              <div>ID: {userData.profileId}</div>
              <div className={styles.handle}>@{userData.username}</div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              ✓<span className={styles.statValueGreen}>Yes</span>
            </div>
            <div className={styles.statCard}>
              ✗<span className={styles.statValueRed}>No</span>
            </div>
            <div className={styles.statCard}>
              Score<span className={styles.statValuePink}>1,404</span>
            </div>
            <div className={styles.statCard}>
              Level<span className={styles.statValueGold}>No Level</span>
            </div>
          </div>

          {/* Button Row */}
          <div className={styles.buttonRow}>
            <a
              href={`https://app.ethos.network/profile/${userData.profileId}`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.actionButton}
            >
              Ethos Profile
            </a>
            <a
              href={`https://twitter.com/${userData.username}`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.actionButton}
            >
              Twitter Profile
            </a>
          </div>

          {/* Snapshot Table */}
          <div className={styles.snapshotCard}>
            <dl className={styles.dlStriped}>
              <dt>Ethos Profile ID#</dt>
              <dd>{userData.profileId}</dd>
              <dt>Contribution XP</dt>
              <dd>{xpTotal ?? 0}</dd>
              <dt>XP Streak Days</dt>
              <dd>{xpStreakDays ?? 0}</dd>
              <dt>Positive Reviews Received</dt>
              <dd>{reviewReceived?.positive?.count ?? 0}</dd>
              <dt>Neutral Reviews Received</dt>
              <dd>{reviewReceived?.neutral?.count ?? 0}</dd>
              <dt>Negative Reviews Received</dt>
              <dd>{reviewReceived?.negative?.count ?? 0}</dd>
              <dt>Positive Reviews Made</dt>
              <dd>{reviewMade?.positive?.count ?? 0}</dd>
              <dt>Neutral Reviews Made</dt>
              <dd>{reviewMade?.neutral?.count ?? 0}</dd>
              <dt>Negative Reviews Made</dt>
              <dd>{reviewMade?.negative?.count ?? 0}</dd>
              <dt>Vouches Given + ETH</dt>
              <dd>
                {vouchGiven?.count ?? 0} /{' '}
                {formatWeiToEth(vouchGiven?.amountWeiTotal ?? 0)} ETH
              </dd>
              <dt>Vouches Received + ETH</dt>
              <dd>
                {vouchReceived?.count ?? 0} /{' '}
                {formatWeiToEth(vouchReceived?.amountWeiTotal ?? 0)} ETH
              </dd>
              <dt>Primary On-chain Address</dt>
              <dd>{addresses[0]?.address ?? ''}</dd>
              <dt>ETH Price (USD)</dt>
              <dd>{ethPrice ? `$${Number(ethPrice).toFixed(2)}` : 'N/A'}</dd>
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}
