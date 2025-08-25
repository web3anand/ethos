import { useState, useEffect } from 'react';
import Head from 'next/head';
import Navbar from '../components/Navbar';
import EthosProfileCard from '../components/EthosProfileCard';
import DetailedStats from '../components/DetailedStats';
import XpDistribution from '../components/XpDistribution.jsx';
import UserActivities from '../components/UserActivities';
import { fetchUserByTwitter, fetchUserAddresses, fetchUserStats, fetchExchangeRate } from '../lib/ethos';
import { useViewport } from '../utils/useViewport';
import styles from '../styles/Home.module.css';

// Mock data for a specific user for demonstration
const MOCK_USERNAME = 'web3anand';

export default function Dashboard() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { width } = useViewport();
  const isDesktop = width > 1024;

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setError(null);
      try {
        let data = await fetchUserByTwitter(MOCK_USERNAME);
        if (!data) {
          setError('User not found');
          setLoading(false);
          return;
        }

        const [addresses, ethPrice, stats] = await Promise.all([
          fetchUserAddresses(data.profileId),
          fetchExchangeRate(),
          fetchUserStats(`profileId:${data.profileId}`),
        ]);

        const profile = {
          id: data.id,
          profileId: data.profileId,
          displayName: data.displayName,
          username: data.username,
          avatarUrl: data.avatarUrl,
          status: data.status,
          score: data.score,
          influenceScore: stats?.influenceFactor,
          xpTotal: data.xpTotal ?? data.xp?.total ?? 0,
          xpStreakDays: data.xpStreakDays ?? data.xp?.streakDays ?? 0,
          userkeys: data.userkeys || [`profileId:${data.profileId}`],
          reviewStats: data.stats?.review?.received ?? { positive: 0, neutral: 0, negative: 0 },
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

    fetchDashboardData();
  }, []);

  return (
    <>
      <Head>
        <title>Ethos Dashboard</title>
        <meta name="description" content="Ethos user dashboard with detailed stats and activities." />
      </Head>
      
      <Navbar />
      
      <div className={styles.container}>
        {loading && <div className={styles.loading}>Loading dashboard...</div>}
        {error && <div className={styles.error}>{error}</div>}
        
        {userData && isDesktop && (
          <div className={styles.desktopDashboardWrapper}>
            <div className="pfp-container-wide glass-container">
              <EthosProfileCard profile={userData} isDesktop={true} />
            </div>
            <div className="stats-container-wide glass-container">
              <DetailedStats stats={userData} />
            </div>
            <div className="xp-distribution-container-wide glass-container">
              <XpDistribution userkey={userData.userkeys[0]} />
            </div>
            <div className="activities-container-wide glass-container">
              <UserActivities profile={userData} />
            </div>
          </div>
        )}

        {userData && !isDesktop && (
          // Fallback for mobile view, can be a simpler layout
          <div>
            <EthosProfileCard profile={userData} />
            <DetailedStats stats={userData} />
            <XpDistribution userkey={userData.userkeys[0]} />
            <UserActivities profile={userData} />
          </div>
        )}
      </div>
    </>
  );
}
