import { useState } from 'react';
import Image from 'next/image';
import styles from './EthosProfileCard.module.css';

export default function EthosProfileCard() {
  const [handle, setHandle] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const toEth = (wei) => (Number(wei) / 1e18).toFixed(3);

  const handleSearch = async () => {
    const username = handle.trim().replace(/^@/, '');
    if (!username) return;

    setError('');
    setData(null);
    setLoading(true);
    setProgress(0);

    try {
      const userRes = await fetch(
        `https://api.ethos.network/api/v2/user/by/x/${username}`
      );
      if (!userRes.ok) {
        throw new Error(`User lookup failed (${userRes.status})`);
      }
      const userJson = await userRes.json();
      const {
        id,
        profileId,
        displayName,
        username: uname,
        avatarUrl,
        status,
        score,
        xpTotal,
        xpStreakDays,
        stats: {
          review: { received: { positive = 0, neutral = 0, negative = 0 } = {} } = {},
          vouch: {
            given: { count: vGiven = 0, amountWeiTotal: wGiven = '0' } = {},
            received: { count: vRecv = 0, amountWeiTotal: wRecv = '0' } = {},
          } = {},
        } = {},
      } = userJson;
      setProgress(40);

      const addrRes = await fetch(
        `https://api.ethos.network/api/v1/addresses/profileId:${profileId}`
      );
      if (!addrRes.ok) {
        throw new Error(`Address lookup failed (${addrRes.status})`);
      }
      const { data: addrList } = await addrRes.json();
      const primaryAddress = addrList[0]?.address ?? 'N/A';
      setProgress(60);

      const priceRes = await fetch(
        'https://api.ethos.network/api/v1/exchange-rates/eth-price'
      );
      if (!priceRes.ok) {
        throw new Error(`Price lookup failed (${priceRes.status})`);
      }
      const {
        data: { price: ethPrice } = {},
      } = await priceRes.json();
      setProgress(100);

      setData({
        id,
        profileId,
        displayName,
        username: uname,
        avatarUrl,
        status,
        score,
        xpTotal,
        xpStreakDays,
        reviewStats: { positive, neutral, negative },
        vouchGiven: { count: vGiven, eth: toEth(wGiven) },
        vouchReceived: { count: vRecv, eth: toEth(wRecv) },
        primaryAddress,
        ethPrice,
      });
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  const renderSections = (profile) => {
    const sections = [
      ['Main Stats', {
        ID: profile.id,
        'Profile ID': profile.profileId,
        Status: profile.status,
        Score: profile.score,
        'XP Total': profile.xpTotal,
        'XP Streak Days': profile.xpStreakDays,
      }],
      ['Reviews Received', {
        Positive: profile.reviewStats.positive,
        Neutral: profile.reviewStats.neutral,
        Negative: profile.reviewStats.negative,
      }],
      ['Vouches Given', {
        Count: profile.vouchGiven.count,
        'Total ETH': `${profile.vouchGiven.eth} ETH`,
      }],
      ['Vouches Received', {
        Count: profile.vouchReceived.count,
        'Total ETH': `${profile.vouchReceived.eth} ETH`,
      }],
      ['On-Chain', {
        'Primary Address': profile.primaryAddress,
        'ETH Price (USD)': `$${Number(profile.ethPrice).toFixed(2)}`,
      }],
    ];

    return sections.map(([title, dataSection]) => (
      <div key={title} className={styles.section}>
        <h3 className={styles.sectionTitle}>{title}</h3>
        {Object.entries(dataSection).map(([label, value]) => (
          <div key={label} className={styles.row}>
            <span className={styles.rowLabel}>{label}</span>
            <span className={styles.rowValue}>{value}</span>
          </div>
        ))}
      </div>
    ));
  };

  return (
    <div className={styles.wrapper}>
      <h1 className={styles.title}>Ethos Search</h1>

      <div className={styles.searchBar}>
        <input
          type="text"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          placeholder="Twitter handle"
        />
        <button onClick={handleSearch} disabled={loading || !handle.trim()}>
          {loading ? 'Searching…' : 'Search'}
        </button>
      </div>

      {loading && (
        <div className={styles.loadingContainer}>
          <div className={styles.loadingBar} style={{ width: `${progress}%` }} />
        </div>
      )}

      {error && <div className={styles.error}>⚠️ {error}</div>}

      {data && (
        <div className={styles.card}>
          <div className={styles.header}>
            {data.avatarUrl && (
              <Image
                src={data.avatarUrl}
                alt=""
                width={64}
                height={64}
                className={styles.avatar}
              />
            )}
            <div className={styles.nameBlock}>
              <div className={styles.username}>{data.displayName}</div>
              <div className={styles.handle}>@{data.username}</div>
            </div>
          </div>

          {renderSections(data)}
        </div>
      )}
    </div>
  );
}
