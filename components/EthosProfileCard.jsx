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
    const input = handle.trim().replace(/^@/, '');
    if (!input) return;

    setError('');
    setData(null);
    setLoading(true);
    setProgress(0);

    try {
      const userRes = await fetch(
        `https://api.ethos.network/api/v2/user/by/x/${input}`
      );
      if (!userRes.ok) throw new Error(`User lookup failed (${userRes.status})`);
      const {
        id,
        profileId,
        displayName,
        username,
        avatarUrl,
        stats: {
          review: { received: { positive = 0, neutral = 0, negative = 0 } = {} } = {},
          vouch: {
            given: { count: givenCount = 0, amountWeiTotal: givenWei = '0' } = {},
            received: { count: receivedCount = 0, amountWeiTotal: receivedWei = '0' } = {}
          } = {}
        } = {}
      } = await userRes.json();
      setProgress(50);

      const priceRes = await fetch(
        'https://api.ethos.network/api/v1/exchange-rates/eth-price'
      );
      if (!priceRes.ok) throw new Error(`Price lookup failed (${priceRes.status})`);
      const { data: { price: ethPrice } = {} } = await priceRes.json();
      setProgress(100);

      setData({
        id,
        profileId,
        displayName,
        username,
        avatarUrl,
        reviewStats: { positive, neutral, negative },
        vouchGiven: { count: givenCount, eth: toEth(givenWei) },
        vouchReceived: { count: receivedCount, eth: toEth(receivedWei) },
        ethPrice
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
        <button onClick={handleSearch} disabled={loading || !handle.trim()}>
          Search
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
          <div className={styles.headerContainer}>
            {data.avatarUrl && (
              <img src={data.avatarUrl} alt="" className={styles.avatar} />
            )}
            <div className={styles.nameBlock}>
              <h2 className={styles.displayName}>{data.displayName}</h2>
              <div className={styles.handle}>@{data.username}</div>
            </div>
          </div>

          <Section title="Reviews Received">
            <Row label="Positive" value={data.reviewStats.positive} />
            <Row label="Neutral" value={data.reviewStats.neutral} />
            <Row label="Negative" value={data.reviewStats.negative} />
          </Section>

          <Section title="Vouches Given">
            <Row label="Count" value={data.vouchGiven.count} />
            <Row label="Total ETH" value={`${data.vouchGiven.eth} ETH`} />
          </Section>

          <Section title="Vouches Received">
            <Row label="Count" value={data.vouchReceived.count} />
            <Row label="Total ETH" value={`${data.vouchReceived.eth} ETH`} />
          </Section>

          <Section title="On-Chain">
            <Row
              label="ETH Price"
              value={`$${Number(data.ethPrice).toFixed(2)}`}
            />
          </Section>
        </div>
      )}
    </div>
  );
}

// Reusable sub-components
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
