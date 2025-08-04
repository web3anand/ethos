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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const xpTotal = userData?.xpTotal ?? userData?.xp?.total ?? 0;
  const xpStreakDays = userData?.xpStreakDays ?? userData?.xp?.streakDays ?? 0;
  const vouchReceived =
    userData?.stats?.vouch?.received ?? { count: 0, amountWeiTotal: '0' };

  const handleSearch = async () => {
    if (!username) return;
    setLoading(true);
    setError(null);
    setUserData(null);
    try {
      const data = await fetchUserByTwitter(username.trim());
      if (!data) {
        setError('User not found');
        return;
      }
      console.log('v2 user:', data);
      const [addresses, ethPrice] = await Promise.all([
        fetchUserAddresses(data.profileId),
        fetchExchangeRate(),
      ]);
      console.log('v1 addresses:', addresses, 'ethPrice:', ethPrice);
      setUserData({
        ...data,
        addresses,
        ethPrice,
      });
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const formatWeiToEth = (wei) => (Number(wei) / 1e18).toFixed(3);

  console.log(userData);

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
          <img src={userData.avatarUrl} alt="" className={styles.avatar} />
          <h2 className={styles.name}>{userData.displayName}</h2>
          <p className={styles.handle}>@{userData.username}</p>

          <div className={styles.subContainer}>
            <div className={styles.sectionTitle}>Main Stats</div>
            <dl className={styles.dl}>
              <dt>ID</dt><dd>{userData.id}</dd>
              <dt>Profile ID</dt><dd>{userData.profileId}</dd>
              <dt>Status</dt><dd>{userData.status}</dd>
              <dt>Score</dt><dd>{userData.score}</dd>
              <dt>XP Total</dt><dd>{xpTotal}</dd>
              <dt>XP Streak Days</dt><dd>{xpStreakDays}</dd>
            </dl>
          </div>

          <Section title="Reviews Received">
            <Row
              label="Positive"
              value={userData.stats.review.received.positive}
            />
            <Row
              label="Neutral"
              value={userData.stats.review.received.neutral}
            />
            <Row
              label="Negative"
              value={userData.stats.review.received.negative}
            />
          </Section>

          <Section title="Vouches Given">
            <Row label="Count" value={userData.stats.vouch.given.count} />
            <Row
              label="Total ETH"
              value={`${formatWeiToEth(
                userData.stats.vouch.given.amountWeiTotal
              )} ETH`}
            />
          </Section>

          <div className={styles.subContainer}>
            <div className={styles.sectionTitle}>Vouches Received</div>
            <dl className={styles.dl}>
              <dt>Count</dt>
              <dd>{vouchReceived.count}</dd>
              <dt>Total ETH</dt>
              <dd>{formatWeiToEth(vouchReceived.amountWeiTotal)} ETH</dd>
            </dl>
          </div>

          <Section title="On-Chain">
            <Row
              label="Primary Address"
              value={userData.addresses[0]?.address ?? 'N/A'}
            />
            <Row
              label="ETH Price (USD)"
              value={`$${userData.ethPrice.toFixed(2)}`}
            />
          </Section>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className={styles.subContainer}>
      <div className={styles.sectionTitle}>{title}</div>
      <dl className={styles.dl}>{children}</dl>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </>
  );
}
