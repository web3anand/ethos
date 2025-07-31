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

  const handleSearch = async () => {
    if (!username) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchUserByTwitter(username.trim());
      if (!data) {
        setError('User not found');
        setUserData(null);
        setAddresses([]);
        setEthPrice(null);
      } else {
        setUserData(data);
        const addrList = await fetchUserAddresses(data.profileId);
        setAddresses(addrList);
        const price = await fetchExchangeRate();
        setEthPrice(price);
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
      setUserData(null);
      setAddresses([]);
      setEthPrice(null);
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
      <h1 className={styles.title}>Ethos Search</h1>
      <div className={styles.searchContainer}>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Twitter handle"
          className={styles.input}
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className={styles.button}
        >
          {loading ? 'Loading...' : 'Search'}
        </button>
      </div>
      {error && <div className={styles.error}>{error}</div>}
      {userData && (
        <div className={styles.userCard}>
          <div className={styles.header}>
            <img src={userData.avatarUrl} alt="avatar" className={styles.avatar} />
            <div>
              <div className={styles.name}>{userData.displayName}</div>
              <div className={styles.handle}>@{userData.username}</div>
            </div>
          </div>

          <div className={styles.subContainer}>
            <div className={styles.sectionTitle}>Main Stats</div>
            <dl className={styles.dl}>
              <dt>ID</dt><dd>{userData.id}</dd>
              <dt>Profile ID</dt><dd>{userData.profileId}</dd>
              <dt>Status</dt><dd>{userData.status}</dd>
              <dt>Score</dt><dd>{userData.score}</dd>
              <dt>XP Total</dt><dd>{xpTotal}</dd>
              <dt>XP Streak Days</dt><dd>{xpStreakDays}</dd>
              {ethPrice !== null && (
                <>
                  <dt>ETH Price (USD)</dt>
                  <dd>${Number(ethPrice).toFixed(2)}</dd>
                </>
              )}
            </dl>
          </div>

          {addresses.length > 0 && (
            <div className={styles.subContainer}>
              <div className={styles.sectionTitle}>Address</div>
              <dl className={styles.dl}>
                <dt>Primary Address</dt>
                <dd>{addresses[0]?.address}</dd>
              </dl>
            </div>
          )}


          {reviewReceived && (
            <div className={styles.subContainer}>
              <div className={styles.sectionTitle}>Reviews Received</div>
              <dl className={styles.dl}>
                <dt>Positive</dt>
                <dd>{reviewReceived.positive?.count ?? 0}</dd>
                <dt>Neutral</dt>
                <dd>{reviewReceived.neutral?.count ?? 0}</dd>
                <dt>Negative</dt>
                <dd>{reviewReceived.negative?.count ?? 0}</dd>
              </dl>
            </div>
          )}

          {reviewMade && (
            <div className={styles.subContainer}>
              <div className={styles.sectionTitle}>Reviews Made</div>
              <dl className={styles.dl}>
                <dt>Positive</dt>
                <dd>{reviewMade.positive?.count ?? 0}</dd>
                <dt>Neutral</dt>
                <dd>{reviewMade.neutral?.count ?? 0}</dd>
                <dt>Negative</dt>
                <dd>{reviewMade.negative?.count ?? 0}</dd>
              </dl>
            </div>
          )}

          {vouchGiven && (
            <div className={styles.subContainer}>
              <div className={styles.sectionTitle}>Vouches Given</div>
              <dl className={styles.dl}>
                <dt>Count</dt>
                <dd>{vouchGiven.count ?? 0}</dd>
                <dt>Total ETH</dt>
                <dd>{formatWeiToEth(vouchGiven.amountWeiTotal ?? 0)} ETH</dd>
              </dl>
            </div>
          )}

          {vouchReceived && (
            <div className={styles.subContainer}>
              <div className={styles.sectionTitle}>Vouches Received</div>
              <dl className={styles.dl}>
                <dt>Count</dt>
                <dd>{vouchReceived.count ?? 0}</dd>
                <dt>Total ETH</dt>
                <dd>{formatWeiToEth(vouchReceived.amountWeiTotal ?? 0)} ETH</dd>
              </dl>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
