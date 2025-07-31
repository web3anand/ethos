import { useState } from 'react';
import Head from 'next/head';
import { fetchUserByTwitter } from '../lib/ethos';

export default function Home() {
  const [username, setUsername] = useState('');
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async () => {
    if (!username) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchUserByTwitter(username.trim());
      if (data === null) {
        setError('User not found');
        setUserData(null);
      } else {
        setUserData(data);
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
      setUserData(null);
    } finally {
      setLoading(false);
    }
  };

  // Safely access nested stats using optional chaining
  const reviewStats = userData?.stats?.review?.received;
  const positive = reviewStats?.positive?.count ?? 0;
  const neutral = reviewStats?.neutral?.count ?? 0;
  const negative = reviewStats?.negative?.count ?? 0;
  const totalReviews = positive + neutral + negative;

  const vouchStats = userData?.stats?.vouch;
  const vouchesGiven = vouchStats?.given?.count ?? 0;
  const vouchesReceived = vouchStats?.received?.count ?? 0;
  const vouchGivenWei = vouchStats?.given?.amountWeiTotal ?? 0;
  const vouchReceivedWei = vouchStats?.received?.amountWeiTotal ?? 0;

  // XP totals may exist at top level or nested inside `xp`
  const xpTotal =
    userData?.xpTotal ?? userData?.xp?.total ?? userData?.xp_total;
  const xpStreakDays =
    userData?.xpStreakDays ?? userData?.xp?.streakDays ?? userData?.xp_streakDays;

  return (
    <div className="container">
      <Head>
        <title>Ethos Search</title>
      </Head>
      <h1>Ethos Search</h1>
      <div className="search-form">
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Twitter handle"
        />
        <button onClick={handleSearch} disabled={loading}>
          {loading ? 'Loading...' : 'Search'}
        </button>
      </div>
      {error && <p className="error">{error}</p>}
      {/* Only render the card if userData is present */}
      {userData && (
        <div className="user-card">
          <img className="avatar" src={userData?.avatarUrl} alt="avatar" />
          <h2>
            {userData?.displayName}{' '}
            <span className="username">@{userData?.username}</span>
          </h2>
          {userData?.description && <p className="description">{userData.description}</p>}
          <ul>
            <li>ID: {userData?.id}</li>
            <li>Profile ID: {userData?.profileId}</li>
            <li>Status: {userData?.status}</li>
            <li>Userkeys: {userData?.userkeys?.join(', ')}</li>
            <li>Score: {userData?.score}</li>
            <li>XP Total: {xpTotal}</li>
            <li>XP Streak Days: {xpStreakDays}</li>
            {reviewStats && (
              <li>
                Reviews Received: {positive} positive, {neutral} neutral, {negative}{' '}
                negative (total {totalReviews})
              </li>
            )}
            {vouchStats && (
              <>
                <li>
                  Vouches Given: {vouchesGiven} (total {vouchGivenWei} wei)
                </li>
                <li>
                  Vouches Received: {vouchesReceived} (total {vouchReceivedWei} wei)
                </li>
              </>
            )}
            <li>
              <a
                className="ethos-link"
                href={userData?.links?.profile}
                target="_blank"
                rel="noopener noreferrer"
              >
                View on Ethos
              </a>
            </li>
            {userData?.links?.scoreBreakdown && (
              <li>
                <a
                  className="ethos-link"
                  href={userData.links.scoreBreakdown}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Score Breakdown
                </a>
              </li>
            )}
          </ul>

          {/* Display any additional top-level fields generically */}
          {(() => {
            const knownKeys = [
              'id',
              'profileId',
              'displayName',
              'username',
              'description',
              'status',
              'avatarUrl',
              'userkeys',
              'score',
              'xpTotal',
              'xpStreakDays',
              'xp',
              'links',
              'stats',
            ];
            return (
              <ul className="additional">
                {Object.entries(userData)
                  .filter(([k]) => !knownKeys.includes(k))
                  .map(([k, v]) => (
                    <li key={k}>
                      <strong>{k}:</strong> {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                    </li>
                  ))}
              </ul>
            );
          })()}
        </div>
      )}
      <style jsx>{`
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 2rem;
          text-align: center;
        }
        .search-form {
          display: flex;
          justify-content: center;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }
        input {
          flex: 1;
          padding: 0.5rem;
          border: 1px solid #ccc;
          border-radius: 4px;
        }
        button {
          padding: 0.5rem 1rem;
          border: none;
          background: #0ea5e9;
          color: #fff;
          border-radius: 4px;
          cursor: pointer;
        }
        button:disabled {
          opacity: 0.6;
        }
        .error {
          color: #dc2626;
          margin-bottom: 1rem;
        }
        .user-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          background: #fff;
          padding: 1.5rem;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .avatar {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          object-fit: cover;
        }
        .username {
          color: #555;
        }
        ul {
          list-style: none;
          padding: 0;
          margin: 0;
          text-align: left;
        }
        .description {
          margin: 0.5rem 0;
          color: #444;
        }
        .additional {
          margin-top: 1rem;
          padding-top: 0.5rem;
          border-top: 1px solid #eee;
        }
        li {
          margin: 0.25rem 0;
        }
        .ethos-link {
          margin-top: 0.5rem;
          background: #0ea5e9;
          color: #fff;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          text-decoration: none;
        }
      `}</style>
    </div>
  );
}
