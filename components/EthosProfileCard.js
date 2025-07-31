import { useState } from 'react';
import axios from 'axios';
import styles from '../styles/EthosProfileCard.module.css';

export default function EthosProfileCard() {
  const [username, setUsername] = useState('');
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const handleSearch = async () => {
    const handle = username.trim();
    if (!handle) return;
    setProgress(0);
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const userRes = await axios.get(
        `https://api.ethos.network/api/v2/users?twitter=${encodeURIComponent(handle)}`
      );
      const user = userRes.data;
      setProgress(50);

      const profileId = user.profileId ?? user.profile_id;
      const [addrRes, priceRes] = await Promise.all([
        axios.get(
          `https://api.ethos.network/api/v1/addresses/profileId:${encodeURIComponent(profileId)}`
        ),
        axios.get('https://api.ethos.network/api/v1/exchange-rates/eth-price'),
      ]);

      const addresses = Array.isArray(addrRes.data) ? addrRes.data : [];
      const ethPrice = priceRes.data?.price ?? null;

      setData({ ...user, addresses, ethPrice });
      setProgress(100);
    } catch (err) {
      setError('Failed to fetch data');
    } finally {
      setTimeout(() => setLoading(false), 300);
    }
  };

  const formatWeiToEth = (wei) => (Number(wei) / 1e18).toFixed(3);

  const reviewReceived = data?.stats?.review?.received;
  const vouchGiven = data?.stats?.vouch?.given;
  const vouchReceived = data?.stats?.vouch?.received;
  const xpTotal = data?.xpTotal ?? data?.xp?.total ?? data?.xp_total;
  const xpStreakDays = data?.xpStreakDays ?? data?.xp?.streakDays ?? data?.xp_streakDays;

  return (
    <div className={styles.cardWrapper}>
      {loading && (
        <div className={styles.loadingBar} style={{ width: `${progress}%` }} />
      )}
      <div className={styles.searchRow}>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Twitter handle"
          className={styles.input}
        />
        <button onClick={handleSearch} disabled={loading} className={styles.button}>
          Search
        </button>
      </div>
      {error && <div className={styles.error}>{error}</div>}
      {data && (
        <div className={styles.dataCard}>
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Main Stats</div>
            <dl className={styles.dl}>
              <dt>ID</dt><dd>{data.id}</dd>
              <dt>Profile ID</dt><dd>{data.profileId}</dd>
              <dt>Status</dt><dd>{data.status}</dd>
              <dt>Score</dt><dd>{data.score}</dd>
              <dt>XP Total</dt><dd>{xpTotal}</dd>
              <dt>XP Streak Days</dt><dd>{xpStreakDays}</dd>
              {data.ethPrice !== null && (
                <>
                  <dt>ETH Price (USD)</dt>
                  <dd>${Number(data.ethPrice).toFixed(2)}</dd>
                </>
              )}
              {data.addresses?.[0] && (
                <>
                  <dt>Primary Address</dt>
                  <dd>{data.addresses[0].address}</dd>
                </>
              )}
            </dl>
          </div>
          {reviewReceived && (
            <div className={styles.section}>
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
          {vouchGiven && (
            <div className={styles.section}>
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
            <div className={styles.section}>
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
