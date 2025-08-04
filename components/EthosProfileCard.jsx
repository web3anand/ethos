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

      } = userJson;
      const vouchesGivenEth = toEth(givenWei);
      const vouchesReceivedEth = toEth(receivedWei);
      setProgress(40);

      // 2) v1: get on-chain addresses
      const addrRes = await fetch(
        `https://api.ethos.network/api/v1/addresses/profileId:${profileId}`
      );
      if (!addrRes.ok) throw new Error(`Address lookup failed (${addrRes.status})`);
      const { data: addrList } = await addrRes.json();
      const address = addrList[0]?.address ?? 'N/A';
      setProgress(55);

      // 3) v1: ETH price
      const priceRes = await fetch(
        'https://api.ethos.network/api/v1/exchange-rates/eth-price'
      );
      if (!priceRes.ok) throw new Error(`Price lookup failed (${priceRes.status})`);
      const { data: { price: ethPrice } = {} } = await priceRes.json();
      const {
        data: { price: ethPrice } = {}
      } = await priceRes.json();
      setProgress(70);

      // 4) v1: reviews count
      const revRes = await fetch(
        `https://api.ethos.network/api/v1/reviews/count`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subject: [`profileId:${profileId}`] })
        }
      );
      if (!revRes.ok) throw new Error(`Review count failed (${revRes.status})`);
      const {
        data: { count: reviewsCount }
      } = await revRes.json();
      setProgress(85);

      // 5) v1: total vouch ETH
      const vouchedRes = await fetch(
        `https://api.ethos.network/api/v1/vouches/vouched-ethereum`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ target: `profileId:${profileId}` })
        }
      );
      if (!vouchedRes.ok)
        throw new Error(`Vouched ETH lookup failed (${vouchedRes.status})`);
      const {
        data: { vouchedEth: totalVouchedEth }
      } = await vouchedRes.json();
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
        avatar,
        status,
        score,
        xpTotal,
        xpStreakDays,
        reviewStats,
        reviewsCount,
        vouchesGiven,
        vouchesGivenEth,
        vouchesReceived,
        vouchesReceivedEth,
        address,
        ethPrice,
        totalVouchedEth
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
          <div className={styles.header}>
            <img src={data.avatarUrl} alt="" className={styles.avatar} />
            <div>
              <h2>{data.displayName}</h2>
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
            <Row label="Primary Address" value={data.address} />
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
