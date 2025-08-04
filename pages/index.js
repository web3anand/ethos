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
        id: data.id,
        profileId: data.profileId,
        displayName: data.displayName,
        username: data.username,
        avatarUrl: data.avatarUrl,
        reviewStats: data.stats.review.received,
        vouchGiven: data.stats.vouch.given,
        vouchReceived: data.stats.vouch.received,
        xpTotal: data.xpTotal,
        xpStreakDays: data.xpStreakDays,
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

          <Section title="Reviews Received">
            <Row label="Positive" value={userData.reviewStats.positive} />
            <Row label="Neutral" value={userData.reviewStats.neutral} />
            <Row label="Negative" value={userData.reviewStats.negative} />
          </Section>

          <Section title="Vouches Given">
            <Row label="Count" value={userData.vouchGiven.count} />
            <Row
              label="Total ETH"
              value={`${formatWeiToEth(userData.vouchGiven.amountWeiTotal)} ETH`}
            />
          </Section>

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
