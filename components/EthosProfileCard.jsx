import { useState } from 'react';

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
      const userRes = await fetch(
        `https://api.ethos.network/api/v2/users?twitter=${username}`
      );
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
        fetch(
          `https://api.ethos.network/api/v1/addresses/profileId:${profileId}`
        ),
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
    <div className="wrapper">
      <h1>Ethos Search</h1>
      <div className="search-bar">
        <input
          type="text"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          placeholder="Twitter handle"
        />
        <button onClick={handleSearch} disabled={loading}>Search</button>
      </div>
      {loading && (
        <div className="loading-container">
          <div className="loading-bar" style={{ width: `${progress}%` }} />
        </div>
      )}
      {data && (
        <div className="card">
          <div className="header">
            {data.avatar && <img src={data.avatar} alt="avatar" />}
            <div>
              <h2>{searched}</h2>
              <div>@{searched}</div>
            </div>
          </div>
          <div className="section">
            <div className="section-title">Main Stats</div>
            <dl>
              <div className="row"><dt>ID</dt><dd>{data.id}</dd></div>
              <div className="row"><dt>Profile ID</dt><dd>{data.profileId}</dd></div>
              <div className="row"><dt>Status</dt><dd>{data.status}</dd></div>
              <div className="row"><dt>Score</dt><dd>{data.score}</dd></div>
              <div className="row"><dt>XP Total</dt><dd>{data.xpTotal}</dd></div>
              <div className="row"><dt>XP Streak Days</dt><dd>{data.xpStreakDays}</dd></div>
            </dl>
          </div>
          {data.reviews && (
            <div className="section">
              <div className="section-title">Reviews Received</div>
              <dl>
                <div className="row"><dt>Positive</dt><dd>{data.reviews.positive?.count ?? 0}</dd></div>
                <div className="row"><dt>Neutral</dt><dd>{data.reviews.neutral?.count ?? 0}</dd></div>
                <div className="row"><dt>Negative</dt><dd>{data.reviews.negative?.count ?? 0}</dd></div>
              </dl>
            </div>
          )}
          {data.vouchesGiven && (
            <div className="section">
              <div className="section-title">Vouches Given</div>
              <dl>
                <div className="row"><dt>Count</dt><dd>{data.vouchesGiven.count ?? 0}</dd></div>
                <div className="row"><dt>Total ETH</dt><dd>{toEth(data.vouchesGiven.amountWeiTotal ?? 0)} ETH</dd></div>
              </dl>
            </div>
          )}
          {data.vouchesReceived && (
            <div className="section">
              <div className="section-title">Vouches Received</div>
              <dl>
                <div className="row"><dt>Count</dt><dd>{data.vouchesReceived.count ?? 0}</dd></div>
                <div className="row"><dt>Total ETH</dt><dd>{toEth(data.vouchesReceived.amountWeiTotal ?? 0)} ETH</dd></div>
              </dl>
            </div>
          )}
          <div className="section">
            <div className="section-title">On-Chain</div>
            <dl>
              <div className="row"><dt>Address</dt><dd>{data.address || 'N/A'}</dd></div>
              <div className="row"><dt>ETH Price</dt><dd>{data.ethPrice ? `$${Number(data.ethPrice).toFixed(2)}` : 'N/A'}</dd></div>
            </dl>
          </div>
        </div>
      )}
      <style jsx>{`
        .wrapper {
          position: relative;
          max-width: 640px;
          margin: 2rem auto;
          font-family: sans-serif;
        }
        h1 {
          text-align: center;
          margin-bottom: 1rem;
        }
        .search-bar {
          display: flex;
          justify-content: center;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }
        input {
          flex: 1;
          padding: 0.5rem 0.75rem;
          border: 1px solid #ccc;
          border-radius: 8px;
        }
        button {
          padding: 0.5rem 1rem;
          background: #0ea5e9;
          color: #fff;
          border: none;
          border-radius: 8px;
          cursor: pointer;
        }
        button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .loading-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 4px;
        }
        .loading-bar {
          height: 4px;
          background: repeating-linear-gradient(
            to right,
            #0ea5e9 0 10px,
            #38bdf8 10px 20px
          );
          width: 0;
          transition: width 0.2s ease;
        }
        .card {
          background: #e0f2fe;
          border-radius: 12px;
          padding: 1rem;
        }
        .header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1rem;
        }
        .header img {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          object-fit: cover;
        }
        .section {
          margin-top: 1rem;
        }
        .section-title {
          font-weight: bold;
          text-align: center;
          margin-bottom: 0.5rem;
        }
        .row {
          display: grid;
          grid-template-columns: 140px 1fr;
          column-gap: 0.5rem;
          margin-bottom: 0.25rem;
        }
        dt {
          font-weight: bold;
        }
        dd {
          margin: 0;
        }
      `}</style>
    </div>
  );
}
