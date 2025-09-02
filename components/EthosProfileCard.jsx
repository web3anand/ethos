import Image from 'next/image';
import styles from './EthosProfileCard.module.css';
import { useEffect, useState, useRef } from 'react';
import fetchEthPrice from '../utils/fetchEthPrice';
import { fetchUserAddresses } from '../lib/ethos';
import { getUserStats } from '../utils/ethosApiClient';
import UserActivities from './UserActivities';
import XpDistribution from './XpDistribution';
// import EthosLogo from './EthosLogo';

// Copy button with tooltip for address
function CopyAddress({ address }) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef();
  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setCopied(false), 1200);
  };
  return (
    <span style={{ fontFamily: 'monospace', display: 'inline-flex', alignItems: 'center' }}>
      {address.slice(0, 6)}...{address.slice(-4)}
      <button
        className={`${styles.copyBtn}${copied ? ' ' + styles.copied : ''}`}
        onClick={handleCopy}
        tabIndex={0}
        aria-label="Copy address"
        type="button"
      >
        <span style={{display:'inline-flex',alignItems:'center'}}>
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style={{marginRight:2}}>
            <rect x="5" y="5" width="10" height="12" rx="2" strokeWidth="1.2"/>
            <rect x="3" y="3" width="10" height="12" rx="2" strokeWidth="1.2"/>
          </svg>
        </span>
      </button>
    </span>
  );
}

// Helper function to fetch validator NFT data
async function fetchValidatorNftData(profileId) {
  try {
    // Format the profileId correctly
    const formattedProfileId = `profileId:${profileId}`;
    
    // First get user's addresses
    const addressRes = await fetch(`https://api.ethos.network/api/v1/addresses/${formattedProfileId}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*'
      }
    });
    
    if (!addressRes.ok) {
      console.error('[EthosProfileCard] Failed to fetch addresses:', addressRes.status, addressRes.statusText);
      return null;
    }
    
    // Then check for validator NFTs
    const nftRes = await fetch(`https://api.ethos.network/api/v2/nfts/user/${formattedProfileId}/owns-validator`, {
      method: 'GET',
      headers: {
        'Accept': '*/*'
      }
    });
    
    if (!nftRes.ok) {
      console.error('[EthosProfileCard] Validator NFT check failed:', nftRes.status, nftRes.statusText);
      return null;
    }
    
    const data = await nftRes.json();
    // API returns an array of validator NFTs, get the first one if exists
    const validatorNft = Array.isArray(data) && data.length > 0 ? data[0] : null;
    console.log('[EthosProfileCard] Validator NFT data for', formattedProfileId, ':', validatorNft);
    return validatorNft;
  } catch (error) {
    console.error('[EthosProfileCard] Error checking validator NFT:', error);
    return null;
  }
}

// Copy button with tooltip for address

// Score levels for mapping score to name and color
const scoreLevels = [
  { min: 0, max: 799, name: 'Untrusted', color: '#e74c3c' },
  { min: 800, max: 1199, name: 'Questionable', color: '#e1b000' },
  { min: 1200, max: 1399, name: 'Neutral', color: '#e2e2e2', text: '#222' },
  { min: 1400, max: 1599, name: 'Known', color: '#8cb6e6' },
  { min: 1600, max: 1799, name: 'Established', color: '#5fa8d3' },
  { min: 1800, max: 1999, name: 'Reputable', color: '#3b82f6' },
  { min: 2000, max: 2199, name: 'Exemplary', color: '#34d399' },
  { min: 2200, max: 2399, name: 'Distinguished', color: '#22c55e' },
  { min: 2400, max: 2599, name: 'Revered', color: '#a78bfa' },
  { min: 2600, max: 2800, name: 'Renowned', color: '#a855f7' },
];

// Score name and color mapping
function getScoreLevel(score) {
  return scoreLevels.find(l => score >= l.min && score <= l.max) || scoreLevels[0];
}

export default function EthosProfileCard({ profile, isDesktop = false }) {
  const [ethPrice, setEthPrice] = useState(null);
  const [primaryAddress, setPrimaryAddress] = useState(null);
  const [validatorNft, setValidatorNft] = useState(null); // Store full NFT data
  const [influenceScore, setInfluenceScore] = useState(null);

  useEffect(() => {
    fetchEthPrice().then(setEthPrice).catch(() => setEthPrice(null));
  }, []);

  // Fetch influencer score
  useEffect(() => {
    let cancelled = false;
    async function fetchInfluenceScore() {
      if (!profile) {
        setInfluenceScore(null);
        return;
      }

      // Try to get userkey for stats API
      let userkey = null;
      
      // Check if profile has userkeys array with X service
      if (profile.userkeys && Array.isArray(profile.userkeys)) {
        const xUserkey = profile.userkeys.find(uk => uk.service === 'x.com');
        if (xUserkey) {
          userkey = `service:x.com:${xUserkey.username}`;
        }
      }
      
      // If no X userkey found, try using profileId
      if (!userkey && profile.profileId) {
        userkey = `profileId:${profile.profileId}`;
      }

      if (!userkey) {
        console.log('[EthosProfileCard] No suitable userkey found for influence score');
        setInfluenceScore(null);
        return;
      }

      try {
        console.log('[EthosProfileCard] Fetching influence score for userkey:', userkey);
        const stats = await getUserStats(userkey);
        if (!cancelled && stats && stats.influenceFactor !== undefined) {
          setInfluenceScore(stats.influenceFactor);
          console.log('[EthosProfileCard] Influence score:', stats.influenceFactor);
        } else {
          setInfluenceScore(null);
        }
      } catch (error) {
        console.error('[EthosProfileCard] Error fetching influence score:', error);
        if (!cancelled) setInfluenceScore(null);
      }
    }
    
    fetchInfluenceScore();
    return () => { cancelled = true; };
  }, [profile]);

  useEffect(() => {
    let cancelled = false;
    async function fetchValidatorNft() {
      if (!profile || !profile.profileId) {
        console.log('[EthosProfileCard] No profile or profileId available');
        setValidatorNft(null);
        return;
      }
      setValidatorNft(null); // loading
      console.log('[EthosProfileCard] Checking validator NFT for profileId:', profile.profileId);
      const nftData = await fetchValidatorNftData(profile.profileId);
      if (!cancelled) setValidatorNft(nftData);
    }
    fetchValidatorNft();
    return () => { cancelled = true; };
  }, [profile]);

  useEffect(() => {
    let cancelled = false;
    async function resolvePrimaryAddress() {
      if (!profile) return;
      console.log('[EthosProfileCard] profile:', profile);
      // 1. Try onChain.primaryAddress
      if (profile.onChain && profile.onChain.primaryAddress) {
        setPrimaryAddress(profile.onChain.primaryAddress);
        console.log('[EthosProfileCard] Using onChain.primaryAddress:', profile.onChain.primaryAddress);
        return;
      }
      // 2. Try profile.primaryAddress
      if (profile.primaryAddress) {
        setPrimaryAddress(profile.primaryAddress);
        console.log('[EthosProfileCard] Using profile.primaryAddress:', profile.primaryAddress);
        return;
      }
      // 3. Try fetchUserAddresses
      if (profile.profileId) {
        try {
          const addresses = await fetchUserAddresses(profile.profileId);
          console.log('[EthosProfileCard] fetched addresses:', addresses);
          if (!cancelled && Array.isArray(addresses) && addresses.length > 0 && addresses[0].address) {
            setPrimaryAddress(addresses[0].address);
            console.log('[EthosProfileCard] Using fetched address:', addresses[0].address);
            return;
          }
        } catch (e) {
          console.error('[EthosProfileCard] Error fetching addresses:', e);
        }
      }
      // Not available
      setPrimaryAddress(null);
      console.log('[EthosProfileCard] No primary address found');
    }
    resolvePrimaryAddress();
    return () => { cancelled = true; };
  }, [profile]);

  if (!profile) return null;

  const { reviewStats, vouchGiven, vouchReceived, onChain, avatarUrl, score } = profile;
  const scoreLevel = getScoreLevel(Number(score));

  const vouchGivenUsd = ethPrice && vouchGiven.eth ? (Number(vouchGiven.eth) * ethPrice) : null;
  const vouchReceivedUsd = ethPrice && vouchReceived.eth ? (Number(vouchReceived.eth) * ethPrice) : null;

  if (isDesktop) {
    // Render a simplified version for the desktop dashboard's left column
    return (
      <div className={styles.desktopContainer}>
        <div className={styles.profileCardBanner}>
          <div className={styles.profileCardRow}>
            <div
              className={styles.profileCardAvatarWrap}
              style={{ '--pfp-ring': scoreLevel.color }}
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={profile.displayName || 'Avatar'}
                  width={80}
                  height={80}
                  className={styles.profileCardAvatar}
                  onError={(e) => {
                    e.target.src = '/ethos.png';
                  }}
                />
              ) : (
                <div className={styles.profileCardAvatarFallback}>
                  {profile.displayName
                    ? profile.displayName
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)
                    : '?'}
                </div>
              )}
            </div>
            <div className={styles.profileCardEthosPillWrap}>
              <div
                className={styles.profileCardEthosPill}
                style={{ 
                  background: scoreLevel.color,
                  padding: '8px 16px',
                  borderRadius: '20px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                <span style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'flex-start',
                  gap: '12px',
                  minWidth: 'auto',
                  width: '100%'
                }}>
                  <Image
                    src="/ethos.png"
                    alt="Ethos Logo"
                    width={24}
                    height={24}
                    style={{
                      flexShrink: 0,
                      objectFit: 'contain'
                    }}
                  />
                  <span 
                    style={{
                      fontWeight: 600,
                      color: scoreLevel.color === '#e2e2e2' ? '#222' : '#fff',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      fontSize: 'inherit'
                    }}
                    data-length={scoreLevel.name.length}
                  >{scoreLevel.name}</span>
                </span>
              </div>
            </div>
          </div>
          <div className={styles.nameBar}>
            <span className={styles.profileCardName}>{profile.displayName}</span>
          </div>
        </div>
      </div>
    );
  }

  const sections = [
    [
      'Main Stats',
      {
        ID: profile.id,
        'Profile ID': profile.profileId,
        Status: profile.status,
        Score: profile.score,
        'Influence Factor': influenceScore !== null ? influenceScore : 'Loading...',
        'XP Total': profile.xpTotal,
        'XP Streak Days': profile.xpStreakDays,
      },
    ],
    [
      'Reviews Received',
      {
        Positive: reviewStats.positive,
        Neutral: reviewStats.neutral,
        Negative: reviewStats.negative,
      },
    ],
    [
      'Vouches Given',
      {
        Count: vouchGiven.count,
        'Total ETH': `${vouchGiven.eth} ETH`,
        ...(ethPrice && vouchGiven.eth ? { 'Total USD': `$${(Number(vouchGiven.eth) * ethPrice).toLocaleString(undefined, {maximumFractionDigits:2})}` } : {}),
      },
    ],
    [
      'Vouches Received',
      {
        Count: vouchReceived.count,
        'Total ETH': `${vouchReceived.eth} ETH`,
        ...(ethPrice && vouchReceived.eth ? { 'Total USD': `$${(Number(vouchReceived.eth) * ethPrice).toLocaleString(undefined, {maximumFractionDigits:2})}` } : {}),
      },
    ],
    [
      'On-Chain',
      {
        'Primary Address': primaryAddress
          ? (
              <CopyAddress address={primaryAddress} />
            )
          : <span style={{color: '#aaa'}}>Not available</span>,
'Validator NFT': validatorNft === null
          ? <span style={{color:'#aaa'}}>Checking...</span>
          : validatorNft
            ? (
                <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <span style={{color:'#22c55e', fontWeight:600}}>Yes</span>
                  {validatorNft.imageUrl && (
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '4px',
                      overflow: 'hidden',
                      border: '1px solid #ddd'
                    }}>
                      <img
                        src={validatorNft.imageUrl}
                        alt={validatorNft.name || 'Validator NFT'}
                        width={32}
                        height={32}
                        style={{objectFit: 'cover'}}
                        onError={(e) => {
                          e.target.src = '/ethos.png';
                        }}
                      />
                    </div>
                  )}
                  {validatorNft.name && (
                    <span style={{color: '#666', fontSize: '0.9em'}}>
                      {validatorNft.name}
                    </span>
                  )}
                </div>
              )
            : <span style={{color:'#e74c3c', fontWeight:600}}>No</span>,
        'ETH Price (USD)': ethPrice ? `$${ethPrice.toLocaleString(undefined, {maximumFractionDigits:2})}` : 'Loading...',
      },
    ],
  ];

  return (
    <div className={styles.card}>
      <div className={styles.profileCardBanner}>
        <div className={styles.profileCardRow}>
          <div
            className={styles.profileCardAvatarWrap}
            style={{ '--pfp-ring': scoreLevel.color }}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={profile.displayName || 'Avatar'}
                width={80}
                height={80}
                className={styles.profileCardAvatar}
                onError={(e) => {
                  e.target.src = '/ethos.png';
                }}
              />
            ) : (
              <div className={styles.profileCardAvatarFallback}>
                {profile.displayName
                  ? profile.displayName
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)
                  : '?'}
              </div>
            )}
          </div>
          <div className={styles.profileCardEthosPillWrap}>
            <div
              className={styles.profileCardEthosPill}
              style={{ 
                background: scoreLevel.color,
                padding: '8px 16px',
                borderRadius: '20px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              <span style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'flex-start',
                gap: '12px',
                minWidth: '280px',
                width: '100%'
              }}>
                <Image
                  src="/ethos.png"
                  alt="Ethos Logo"
                  width={24}
                  height={24}
                  style={{
                    flexShrink: 0,
                    objectFit: 'contain'
                  }}
                />
                <span 
                  style={{
                    fontWeight: 600,
                    color: scoreLevel.color === '#e2e2e2' ? '#222' : '#fff',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                  data-length={scoreLevel.name.length}
                >{scoreLevel.name}</span>
              </span>
            </div>
          </div>
        </div>
        <div className={styles.nameBar}>
          <span className={styles.profileCardName}>{profile.displayName}</span>
        </div>
      </div>

      {/* Highlighted Main Stats section */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Main Stats</h3>
        <div className={styles.mainStatsHighlight}>
          <table className={styles.table}>
            <tbody>
              {Object.entries(sections[0][1]).map(([label, value]) => (
                <tr key={label} className={styles.tableRow}>
                  <td className={styles.tableCellLabel}>{label}</td>
                  <td className={styles.tableCellValue}>
                    {label === 'Status' && String(value).toLowerCase() === 'active' ? (
                      <span className={styles.statusActive}>ACTIVE</span>
                    ) : (
                      (label === 'ID' || label === 'Profile ID')
                        ? (
                            <>
                              <span>{value}</span>
                              <button
                                className={styles.copyBtn}
                                title={`Copy ${label}`}
                                onClick={() => navigator.clipboard.writeText(String(value))}
                                tabIndex={0}
                                aria-label={`Copy ${label}`}
                                type="button"
                              >
                                <span style={{display:'inline-flex',alignItems:'center'}}>
                                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style={{marginRight:2}}>
                                    <rect x="5" y="5" width="10" height="12" rx="2" fill="#fff" stroke="#ff3c00" strokeWidth="1.2"/>
                                    <rect x="3" y="3" width="10" height="12" rx="2" fill="#ffede6" stroke="#ff3c00" strokeWidth="1.2"/>
                                  </svg>
                                </span>
                              </button>
                            </>
                          )
                        : (typeof value === 'number'
                            ? <span className={styles.numericValue}>{value.toLocaleString()}</span>
                            : (typeof value === 'string' && !isNaN(Number(value)) && value.trim() !== '' && isFinite(Number(value))
                                ? <span className={styles.numericValue}>{Number(value).toLocaleString()}</span>
                                : value))
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Render the rest of the sections except Main Stats */}
      {sections.slice(1).map(([title, data], idx) => (
        <div key={title} className={styles.section}>
          <h3 className={styles.sectionTitle}>{title}</h3>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <tbody>
                {Object.entries(data).map(([label, value]) => (
                  <tr key={label} className={styles.tableRow}>
                    <td className={styles.tableCellLabel}>{label}</td>
                    <td className={styles.tableCellValue}>{
                      (label === 'ID' || label === 'Profile ID')
                        ? value
                        : (typeof value === 'number'
                            ? <span className={styles.numericValue}>{value.toLocaleString()}</span>
                            : (typeof value === 'string' && !isNaN(Number(value)) && value.trim() !== '' && isFinite(Number(value))
                                ? <span className={styles.numericValue}>{Number(value).toLocaleString()}</span>
                                : value))
                    }</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* User Activities Section */}
      <UserActivities profile={profile} />

      {/* XP Distribution Section */}
      <XpDistribution profile={profile} />
    </div>
  );
}

