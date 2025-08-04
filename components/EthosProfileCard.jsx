import { useState } from 'react';
import styles from './EthosProfileCard.module.css';

export default function EthosProfileCard() {
  const [handle, setHandle] = useState('');
  const [searched, setSearched] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const toEth = (wei) => (Number(wei) / 1e18).toFixed(3);

  const handleSearch = async () => {
    const username = handle.trim().replace(/^@/, '');
    if (!username) return;

    setError('');
    setSearched(username);
    setData(null);
    setLoading(true);
    setProgress(0);

    try {
      // 1) v2: user lookup by X handle
      const userRes = await fetch(
        `https://api.ethos.network/api/v2/user/by/x/${username}`
      );
      if (!userRes.ok) throw new Error(`User lookup failed (${userRes.status})`);
      const userJson = await userRes.json();
      setProgress(20);

      const {
        id,
        profileId,
        avatarUrl: avatar,
        status,
        score,
        xpTotal,
        xpStreakDays,
        stats: {
          review: { received: reviewStats = {} } = {},
          vouch: {
            given: { count: vouchesGiven = 0, amountWeiTotal: givenWei = '0' } = {},
            received: { count: vouchesReceived = 0, amountWeiTotal: receivedWei = '0' } = {}
          } = {}
        } = {}
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
        `https://api.ethos.network/api/v1/exchange-rates/eth-price`
      );
      if (!priceRes.ok) throw new Error(`Price lookup failed (${priceRes.status})`);
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

      // 6) commit to state
      setData({
        id,
        profileId,
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
            {data.avatar && (
              <img className={styles.avatar} src={data.avatar} alt="" />
            )}
            <div>
              <h2>{searched}</h2>
              <div className={styles.handle}>@{searched}</div>
            </div>
          </div>

          <Section title="Main Stats">
            <Row label="ID" value={data.id} />
            <Row label="Profile ID" value={data.profileId} />
            <Row label="Status" value={data.status} />
            <Row label="Score" value={data.score} />
            <Row label="XP Total" value={data.xpTotal} />
            <Row label="XP Streak Days" value={data.xpStreakDays} />
          </Section>

          <Section title="Reviews Received">
            <Row
              label="Total Reviews"
              value={data.reviewsCount ?? 0}
            />
          </Section>

          <Section title="Vouches Given">
            <Row label="Count" value={data.vouchesGiven} />
            <Row label="Total ETH" value={`${data.vouchesGivenEth} ETH`} />
          </Section>

          <Section title="Vouches Received">
            <Row label="Count" value={data.vouchesReceived} />
            <Row
              label="Total ETH"
              value={`${data.vouchesReceivedEth} ETH`}
            />
          </Section>

          <Section title="On-Chain">
            <Row label="Primary Address" value={data.address} />
            <Row
              label="ETH Price"
              value={data.ethPrice ? `$${Number(data.ethPrice).toFixed(2)}` : 'N/A'}
            />
            <Row
              label="Total Vouched ETH"
              value={`${data.totalVouchedEth ?? 0} ETH`}
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
