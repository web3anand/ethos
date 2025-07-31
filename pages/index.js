import { useState } from 'react';
import Head from 'next/head';
import { fetchUserByTwitter } from '../lib/ethos';
import styles from '../styles/Home.module.css';

export default function Home() {
  const [username, setUsername] = useState('');
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Trigger search using the helper and update state accordingly
  const handleSearch = async () => {
    if (!username) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchUserByTwitter(username.trim());
      if (data === null) {
        setError('User not found');
        setUserData(null);
      } else {
        setUserData(data);
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
      setUserData(null);
    } finally {
      setLoading(false);
    }
  };

  // Optional chaining for nested stats
  const reviewReceived = userData?.stats?.review?.received;
  const reviewMade = userData?.stats?.review?.made;
  const vouchStats = userData?.stats?.vouch;

  // XP totals may come from various field names
  const xpTotal = userData?.xpTotal ?? userData?.xp?.total ?? userData?.xp_total;
  const xpStreakDays =
    userData?.xpStreakDays ?? userData?.xp?.streakDays ?? userData?.xp_streakDays;

  return (
    <div className={styles.container}>
      <Head>
        <title>Ethos Search</title>
      </Head>
      <h1>Ethos Search</h1>
      <div className={styles.searchForm}>
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
      {error && <p className={styles.error}>{error}</p>}
      {userData && (
        <div className={styles.userCard}>
          <div className={styles.header}>
            <img
              className={styles.avatar}
              src={userData?.avatarUrl}
              alt="avatar"
            />
            <div>
              <div className={styles.displayName}>{userData?.displayName}</div>
              <div className={styles.username}>@{userData?.username}</div>
            </div>
          </div>
          <ul className={styles.mainStats}>
            <li className={styles.statsItem}>ID: {userData?.id}</li>
            <li className={styles.statsItem}>Profile ID: {userData?.profileId}</li>
            <li className={styles.statsItem}>Status: {userData?.status}</li>
            <li className={styles.statsItem}>Score: {userData?.score}</li>
            <li className={styles.statsItem}>XP Total: {xpTotal}</li>
            <li className={styles.statsItem}>XP Streak Days: {xpStreakDays}</li>
          </ul>
          {(reviewReceived || reviewMade) && (
            <div className={styles.reviews}>
              {reviewReceived && (
                <div className={styles.subSection}>
                  <div className={styles.sectionTitle}>Reviews Received</div>
                  <ul className={styles.subList}>
                    <li>Positive: {reviewReceived?.positive?.count ?? 0}</li>
                    <li>Neutral: {reviewReceived?.neutral?.count ?? 0}</li>
                    <li>Negative: {reviewReceived?.negative?.count ?? 0}</li>
                  </ul>
                </div>
              )}
              {reviewMade && (
                <div className={styles.subSection}>
                  <div className={styles.sectionTitle}>Reviews Made</div>
                  <ul className={styles.subList}>
                    <li>Positive: {reviewMade?.positive?.count ?? 0}</li>
                    <li>Neutral: {reviewMade?.neutral?.count ?? 0}</li>
                    <li>Negative: {reviewMade?.negative?.count ?? 0}</li>
                  </ul>
                </div>
              )}
            </div>
          )}
          {vouchStats && (
            <div className={styles.vouches}>
              <div className={styles.sectionTitle}>Vouches</div>
              <ul className={styles.subList}>
                <li>
                  Given: {vouchStats?.given?.count ?? 0} (
                  {vouchStats?.given?.amountWeiTotal ?? 0} wei)
                </li>
                <li>
                  Received: {vouchStats?.received?.count ?? 0} (
                  {vouchStats?.received?.amountWeiTotal ?? 0} wei)
                </li>
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
