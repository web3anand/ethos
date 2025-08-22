import { useState } from 'react';
import Head from 'next/head';
import Navbar from '../components/Navbar';
import SearchBar from '../components/SearchBar';
import fetchUserSuggestions from '../utils/fetchUserSuggestions';
import {
  fetchUserByTwitter,
  fetchExchangeRate,
  fetchUserAddresses,
} from '../lib/ethos';
import EthosProfileCard from '../components/EthosProfileCard';
import styles from '../styles/Home.module.css';


export default function Home() {
  const [username, setUsername] = useState('');
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async (searchName) => {
    const searchValue = typeof searchName === 'string' ? searchName : username;
    if (!searchValue) return;
    setLoading(true);
    setError(null);
    setUserData(null);
    try {
      let data = await fetchUserByTwitter(searchValue.trim());
      // If not found, try to find a suggestion by display name
      if (!data) {
        const suggestions = await fetchUserSuggestions(searchValue.trim());
        const match = suggestions.find(s =>
          s.displayName && s.displayName.toLowerCase() === searchValue.trim().toLowerCase()
        );
        if (match) {
          data = await fetchUserByTwitter(match.username);
        }
      }
      if (!data) {
        setError('User not found');
        return;
      }
      const [addresses, ethPrice] = await Promise.all([
        fetchUserAddresses(data.profileId),
        fetchExchangeRate(),
      ]);
      const profile = {
        id: data.id,
        profileId: data.profileId,
        displayName: data.displayName,
        username: data.username,
        avatarUrl: data.avatarUrl,
        status: data.status,
        score: data.score,
        xpTotal: data.xpTotal ?? data.xp?.total ?? 0,
        xpStreakDays: data.xpStreakDays ?? data.xp?.streakDays ?? 0,
        reviewStats: data.stats?.review?.received ?? {
          positive: 0,
          neutral: 0,
          negative: 0,
        },
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

  const handleSuggestionSelect = (suggestion) => {
    setUsername(suggestion.username);
    setError(null);
    handleSearch(suggestion.username);
  };

  return (
    <>
      <Head>
        <title>Check Your Social Score - Ethos</title>
        <meta name="description" content="Check your social reputation score and credibility with Ethos" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, user-scalable=no" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="theme-color" content="#4f7cf0" />
        
        {/* Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;500;600;700&family=Great+Vibes&family=Allura&family=Alex+Brush&display=swap" rel="stylesheet" />
        
        {/* iOS specific meta tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Ethos Score" />
        
        {/* Prevent zoom on input focus for iOS */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
      </Head>
      
      <Navbar />
      <div className={styles.container}>
        <h1 className={styles.title}>Check reputation</h1>
        <div className={styles.searchContainer}>
          <SearchBar
            username={username}
            setUsername={setUsername}
            onSearch={handleSearch}
            loading={loading}
            onSuggestionSelect={handleSuggestionSelect}
          />
        </div>
        {error && <div className={styles.error}>{error}</div>}
        {userData && <EthosProfileCard profile={userData} />}
      </div>
    </>
  );
}
