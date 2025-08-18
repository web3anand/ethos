import { useState } from 'react';
import {
  fetchUserByTwitter,
  fetchExchangeRate,
  fetchUserAddresses,
} from '../lib/ethos';
import EthosProfileCard from '../components/EthosProfileCard';
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
      const [addresses, ethPrice] = await Promise.all([
        fetchUserAddresses(data.profileId),
        fetchExchangeRate(),
      ]);
      const profile = {
        id: data.id,
        profileId: data.profileId,
        displayName: data.displayName,
        username: data.username,
        avatarUrl: data.avatarUrl,
        status: data.status,
        score: data.score,
        xpTotal: data.xpTotal ?? data.xp?.total ?? 0,
        xpStreakDays: data.xpStreakDays ?? data.xp?.streakDays ?? 0,
        reviewStats: data.stats?.review?.received ?? {
          positive: 0,
          neutral: 0,
          negative: 0,
        },
        vouchGiven: {
          count: data.stats?.vouch?.given?.count ?? 0,
          eth: (Number(data.stats?.vouch?.given?.amountWeiTotal || 0) / 1e18).toFixed(3),
        },
        vouchReceived: {
          count: data.stats?.vouch?.received?.count ?? 0,
          eth: (Number(data.stats?.vouch?.received?.amountWeiTotal || 0) / 1e18).toFixed(3),
        },
        onChain: {
          primaryAddress: addresses.primaryAddress,
          allAddresses: addresses.allAddresses,
        },
        ethPrice,
      };
      setUserData(profile);
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

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
      {userData && <EthosProfileCard profile={userData} />}
    </div>
  );
}
