import Image from 'next/image';
import styles from './EthosProfileCard.module.css';
import { useEffect, useState, useRef } from 'react';
import fetchEthPrice from '../utils/fetchEthPrice';
import { fetchUserAddresses } from '../lib/ethos';
import { getUserStats, getUserByProfileId } from '../utils/ethosApiClient';
import UserActivities from './UserActivities';
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

  useEffect(() => {
    fetchEthPrice().then(setEthPrice).catch(() => setEthPrice(null));
  }, []);


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

  const [completeProfile, setCompleteProfile] = useState(profile);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile && profile.profileId && (!profile.userkeys || profile.userkeys.length === 0)) {
      setLoading(true);
      getUserByProfileId(profile.profileId)
        .then(completeData => {
          console.log('[EthosProfileCard] Fetched complete profile data:', completeData);
          setCompleteProfile(completeData);
          setLoading(false);
        })
        .catch(error => {
          console.error('[EthosProfileCard] Error fetching complete profile:', error);
          setCompleteProfile(profile);
          setLoading(false);
        });
    } else {
      setCompleteProfile(profile);
    }
  }, [profile]);

  if (!completeProfile) return null;

  const { reviewStats, vouchGiven, vouchReceived, onChain, avatarUrl, score } = completeProfile;
  const scoreLevel = getScoreLevel(Number(score));

  // Helper function to extract social media usernames from userkeys
  const getSocialUsername = (service) => {
    if (!completeProfile.userkeys || !Array.isArray(completeProfile.userkeys)) return null;
    
    for (const key of completeProfile.userkeys) {
      // Handle string format: "service:x.com:username"
      if (typeof key === 'string' && key.startsWith(`service:${service}:`)) {
        return key.split(':')[2];
      }
      // Handle object format: {service: 'x.com', username: 'username'}
      if (typeof key === 'object' && key.service === service) {
        return key.username;
      }
    }
    return null;
  };

  // Special handling for Farcaster - use main username if available
  const getFarcasterUsername = () => {
    // First try to get from userkeys
    const farcasterId = getSocialUsername('farcaster');
    if (farcasterId) {
      // For Farcaster, we might need to use the main username instead of user ID
      // Check if the main username looks like a Farcaster username
      if (completeProfile.username && completeProfile.username.startsWith('@')) {
        return completeProfile.username.substring(1); // Remove @ prefix
      }
      return farcasterId; // Fallback to user ID
    }
    return null;
  };

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
            <div className={styles.nameBar}>
              <span className={styles.profileCardName}>{completeProfile.displayName}</span>
              <div className={styles.socialLinks}>
                {getSocialUsername('x.com') && (
                  <a 
                    href={`https://x.com/i/user/${getSocialUsername('x.com')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.socialLink}
                    title="X (Twitter)"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                  </a>
                )}
                {getSocialUsername('discord') && (
                  <a 
                    href={`https://discord.com/users/${getSocialUsername('discord')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.socialLink}
                    title="Discord"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.445.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                    </svg>
                  </a>
                )}
                {getSocialUsername('telegram') && (
                  <span 
                    className={styles.socialLink}
                    title="Telegram (User ID only - no direct link available)"
                    style={{ opacity: 0.6, cursor: 'not-allowed' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-.14.05-.22.08-.09.03-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                    </svg>
                  </span>
                )}
                {getFarcasterUsername() && (
                  <a 
                    href={`https://warpcast.com/${getFarcasterUsername()}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.socialLink}
                    title="Farcaster"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                    </svg>
                  </a>
                )}
              </div>
            </div>
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
          <div className={styles.nameBar}>
            <span className={styles.profileCardName}>{profile.displayName}</span>
          </div>
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

    </div>
  );
}

