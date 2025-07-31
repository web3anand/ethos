import { useState } from 'react';
import { fetchUserByTwitter, fetchExchangeRate } from '../lib/ethos';
import styles from '../styles/Home.module.css';

export default function Home() {
  const [username, setUsername] = useState('');
  const [userData, setUserData] = useState(null);
  const [ethPrice, setEthPrice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async () => {
    if (!username) return;
    setLoading(true);
    setError(null);
    try {
      const [user, price] = await Promise.all([
        fetchUserByTwitter(username.trim()),
        fetchExchangeRate(),
      ]);
      if (!user) {
        setError('User not found');
        setUserData(null);
        setEthPrice(null);
      } else {
        setUserData(user);
        setEthPrice(price);
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
      setUserData(null);
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
            <div>ID: {userData.id}</div>
            <div>Profile ID: {userData.profileId}</div>
            <div>Status: {userData.status}</div>
            <div>Score: {userData.score}</div>
            <div>XP Total: {xpTotal}</div>
            <div>XP Streak Days: {xpStreakDays}</div>
            {ethPrice !== null && <div>ETH ${ethPrice}</div>}
          </div>
          {reviewReceived && (
            <div className={styles.subContainer}>
              <div>Reviews Received</div>
              <div>Positive: {reviewReceived.positive?.count ?? 0}</div>
              <div>Neutral: {reviewReceived.neutral?.count ?? 0}</div>
              <div>Negative: {reviewReceived.negative?.count ?? 0}</div>
            </div>
          )}
          {reviewMade && (
            <div className={styles.subContainer}>
              <div>Reviews Made</div>
              <div>Positive: {reviewMade.positive?.count ?? 0}</div>
              <div>Neutral: {reviewMade.neutral?.count ?? 0}</div>
              <div>Negative: {reviewMade.negative?.count ?? 0}</div>
            </div>
          )}
          {vouchGiven && (
            <div className={styles.subContainer}>
              <div>Vouches Given: {vouchGiven.count ?? 0}</div>
              <div>{formatWeiToEth(vouchGiven.amountWeiTotal ?? 0)} ETH</div>
            </div>
          )}
          {vouchReceived && (
            <div className={styles.subContainer}>
              <div>Vouches Received: {vouchReceived.count ?? 0}</div>
              <div>{formatWeiToEth(vouchReceived.amountWeiTotal ?? 0)} ETH</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
