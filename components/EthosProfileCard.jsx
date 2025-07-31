import { useState } from 'react';
import styles from './EthosProfileCard.module.css';

export default function EthosProfileCard() {
  const [handle, setHandle] = useState('');
  const [searched, setSearched] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [data, setData] = useState(null);

  const handleSearch = async () => {
    const username = handle.trim().replace(/^@/, '');
    if (!username) return;
    setSearched(username);
    setData(null);
    setLoading(true);
    setProgress(0);
    try {
      const userRes = await fetch(`https://api.ethos.network/api/v2/users?twitter=${username}`);
      const user = await userRes.json();
      const {
        id,
        profileId,
        avatar,
        status,
        score,
        xpTotal,
        xpStreakDays,
        reviews,
        vouchesGiven,
        vouchesReceived,
      } = user;
      setProgress(50);
      const [addrRes, priceRes] = await Promise.all([
        fetch(`https://api.ethos.network/api/v1/addresses/profileId:${profileId}`),
        fetch('https://api.ethos.network/api/v1/exchange-rates/eth-price'),
      ]);
      const addrJson = await addrRes.json();
      const priceJson = await priceRes.json();
      const address = Array.isArray(addrJson) && addrJson[0] ? addrJson[0].address : null;
      const ethPrice = priceJson?.price ?? null;
      setData({
        id,
        profileId,
        avatar,
        status,
        score,
        xpTotal,
        xpStreakDays,
        reviews,
        vouchesGiven,
        vouchesReceived,
        address,
        ethPrice,
      });
      setProgress(100);
    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => {
        setLoading(false);
        setProgress(0);
      }, 300);
    }
  };

  const toEth = (wei) => (Number(wei) / 1e18).toFixed(3);

  return (
    <div className={styles.wrapper}>
      <h1 className={styles.title}>Ethos Search</h1>
      <div className={styles.searchBar}>
        <input
          className={styles.input}
          type="text"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          placeholder="Twitter handle"
        />
        <button className={styles.button} onClick={handleSearch} disabled={loading}>Search</button>
      </div>
      {loading && (
        <div className={styles.loadingContainer}>
          <div className={styles.loadingBar} style={{ width: `${progress}%` }} />
        </div>
      )}
      {data && (
        <div className={styles.card}>
          <div className={styles.header}>
            {data.avatar && <img className={styles.avatar} src={data.avatar} alt="avatar" />}
            <div>
              <h2>{searched}</h2>
              <div>@{searched}</div>
            </div>
          </div>
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Main Stats</div>
            <dl>
              <div className={styles.row}><dt>ID</dt><dd>{data.id}</dd></div>
              <div className={styles.row}><dt>Profile ID</dt><dd>{data.profileId}</dd></div>
              <div className={styles.row}><dt>Status</dt><dd>{data.status}</dd></div>
              <div className={styles.row}><dt>Score</dt><dd>{data.score}</dd></div>
              <div className={styles.row}><dt>XP Total</dt><dd>{data.xpTotal}</dd></div>
              <div className={styles.row}><dt>XP Streak Days</dt><dd>{data.xpStreakDays}</dd></div>
            </dl>
          </div>
          {data.reviews && (
            <div className={styles.section}>
              <div className={styles.sectionTitle}>Reviews Received</div>
              <dl>
                <div className={styles.row}><dt>Positive</dt><dd>{data.reviews.positive?.count ?? 0}</dd></div>
                <div className={styles.row}><dt>Neutral</dt><dd>{data.reviews.neutral?.count ?? 0}</dd></div>
                <div className={styles.row}><dt>Negative</dt><dd>{data.reviews.negative?.count ?? 0}</dd></div>
              </dl>
            </div>
          )}
          {data.vouchesGiven && (
            <div className={styles.section}>
              <div className={styles.sectionTitle}>Vouches Given</div>
              <dl>
                <div className={styles.row}><dt>Count</dt><dd>{data.vouchesGiven.count ?? 0}</dd></div>
                <div className={styles.row}><dt>Total ETH</dt><dd>{toEth(data.vouchesGiven.amountWeiTotal ?? 0)} ETH</dd></div>
              </dl>
            </div>
          )}
          {data.vouchesReceived && (
            <div className={styles.section}>
              <div className={styles.sectionTitle}>Vouches Received</div>
              <dl>
                <div className={styles.row}><dt>Count</dt><dd>{data.vouchesReceived.count ?? 0}</dd></div>
                <div className={styles.row}><dt>Total ETH</dt><dd>{toEth(data.vouchesReceived.amountWeiTotal ?? 0)} ETH</dd></div>
              </dl>
            </div>
          )}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>On-Chain</div>
            <dl>
              <div className={styles.row}><dt>Address</dt><dd>{data.address || 'N/A'}</dd></div>
              <div className={styles.row}><dt>ETH Price</dt><dd>{data.ethPrice ? `$${Number(data.ethPrice).toFixed(2)}` : 'N/A'}</dd></div>
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}
