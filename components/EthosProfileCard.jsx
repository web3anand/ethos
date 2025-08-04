import { useState } from 'react';
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
      // 1) v2: lookup user by X handle
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
          review: {
            received: { positive = 0, neutral = 0, negative = 0 } = {},
          } = {},
          vouch: {
            given:   { count: vGiven = 0,   amountWeiTotal: wGiven = '0' } = {},
            received:{ count: vRecv = 0,   amountWeiTotal: wRecv = '0' } = {},
          } = {},
        } = {},
      } = userJson;
      setProgress(40);

      // 2) v1: fetch on-chain address
      const addrRes = await fetch(
        `https://api.ethos.network/api/v1/addresses/profileId:${profileId}`
      );
      if (!addrRes.ok) {
        throw new Error(`Address lookup failed (${addrRes.status})`);
      }
      const { data: addrList } = await addrRes.json();
      const primaryAddress = addrList[0]?.address ?? 'N/A';
      setProgress(60);

      // 3) v1: fetch ETH price
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

      // 4) commit to state
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
        vouchGiven:    { count: vGiven, eth: toEth(wGiven) },
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
        <button
          onClick={handleSearch}
          disabled={loading || !handle.trim()}
        >
          {loading ? 'Searching…' : 'Search'}
        </button>
      </div>

      {loading && (
        <div className={styles.loadingContainer}>
          <div
            className={styles.loadingBar}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {error && <div className={styles.error}>⚠️ {error}</div>}

      {data && (
        <div className={styles.card}>
          {/* Header */}
          <div className={styles.header}>
            {data.avatarUrl && (
              <img
                src={data.avatarUrl}
                alt=""
                className={styles.avatar}
              />
            )}
            <div>
              <h2>{data.displayName}</h2>
              <div className={styles.handle}>@{data.username}</div>
            </div>
          </div>

          {/* Main Stats */}
          <Section title="Main Stats">
            <Row label="ID"            value={data.id} />
            <Row label="Profile ID"    value={data.profileId} />
            <Row label="Status"        value={data.status} />
            <Row label="Score"         value={data.score} />
            <Row label="XP Total"      value={data.xpTotal} />
            <Row label="XP Streak Days" value={data.xpStreakDays} />
          </Section>

          {/* Reviews Received */}
          <Section title="Reviews Received">
            <Row label="Positive" value={data.reviewStats.positive} />
            <Row label="Neutral"  value={data.reviewStats.neutral}  />
            <Row label="Negative" value={data.reviewStats.negative} />
          </Section>

          {/* Vouches Given */}
          <Section title="Vouches Given">
            <Row label="Count"     value={data.vouchGiven.count} />
            <Row label="Total ETH" value={`${data.vouchGiven.eth} ETH`} />
          </Section>

          {/* Vouches Received */}
          <Section title="Vouches Received">
            <Row label="Count"     value={data.vouchReceived.count} />
            <Row label="Total ETH" value={`${data.vouchReceived.eth} ETH`} />
          </Section>

          {/* On-Chain */}
          <Section title="On-Chain">
            <Row label="Primary Address" value={data.primaryAddress} />
            <Row
              label="ETH Price (USD)"
              value={`$${Number(data.ethPrice).toFixed(2)}`}
            />
          </Section>
        </div>
      )}
    </div>
  );
}

// ––– Sub-components –––
function Section({ title, children }) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionTitle}>{title}</div>
      <dl>{children}</dl>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className={styles.row}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
