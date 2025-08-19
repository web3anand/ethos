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
        className={styles.copyBtn + (copied ? ' ' + styles.copied : '')}
        onClick={handleCopy}
        tabIndex={0}
        aria-label="Copy address"
        type="button"
      >
        <span style={{display:'inline-flex',alignItems:'center'}}>
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style={{marginRight:2}}>
            <rect x="5" y="5" width="10" height="12" rx="2" fill="#fff" stroke="#ff3c00" strokeWidth="1.2"/>
            <rect x="3" y="3" width="10" height="12" rx="2" fill="#ffede6" stroke="#ff3c00" strokeWidth="1.2"/>
          </svg>
        </span>
      </button>
    </span>
  );
}


import Image from 'next/image';
import styles from './EthosProfileCard.module.css';
import { useEffect, useState, useRef } from 'react';
import fetchEthPrice from '../utils/fetchEthPrice';
import { fetchUserAddresses } from '../lib/ethos';

// Copy button with tooltip for address

// Score levels for mapping score to name and color
const scoreLevels = [
  { min: 0, max: 499, name: 'Untrusted', color: '#e74c3c' },
  { min: 500, max: 799, name: 'Questionable', color: '#e1b000' },
  { min: 800, max: 999, name: 'Neutral', color: '#e2e2e2', text: '#222' },
  { min: 1000, max: 1299, name: 'Known', color: '#8cb6e6' },
  { min: 1300, max: 1599, name: 'Established', color: '#5fa8d3' },
  { min: 1600, max: 1899, name: 'Reputable', color: '#3b82f6' },
  { min: 1900, max: 2199, name: 'Exemplary', color: '#34d399' },
  { min: 2200, max: 2499, name: 'Distinguished', color: '#22c55e' },
  { min: 2500, max: 2799, name: 'Revered', color: '#a78bfa' },
  { min: 2800, max: Infinity, name: 'Renowned', color: '#a855f7' },
];

// Score name and color mapping
function getScoreLevel(score) {
  return scoreLevels.find(l => score >= l.min && score <= l.max) || scoreLevels[0];
}

export default function EthosProfileCard({ profile }) {
  const [ethPrice, setEthPrice] = useState(null);
  const [primaryAddress, setPrimaryAddress] = useState(null);

  useEffect(() => {
    fetchEthPrice().then(setEthPrice).catch(() => setEthPrice(null));
  }, []);

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
// Copy button with tooltip for address
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
              <Image
                src={avatarUrl}
                alt={profile.displayName || 'Avatar'}
                width={80}
                height={80}
                className={styles.profileCardAvatar}
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
              style={{ background: scoreLevel.color }}
            >
              {scoreLevel.name}
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
                        ? value
                        : (typeof value === 'number'
                            ? value.toLocaleString()
                            : (typeof value === 'string' && !isNaN(Number(value)) && value.trim() !== '' && isFinite(Number(value))
                                ? Number(value).toLocaleString()
                                : value))
                    )}
                    {(label === 'ID' || label === 'Profile ID') && (
                      <button
                        className={styles.copyBtn}
                        title={`Copy ${label}`}
                        onClick={() => navigator.clipboard.writeText(String(value))}
                      >
                        📋
                      </button>
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
                            ? value.toLocaleString()
                            : (typeof value === 'string' && !isNaN(Number(value)) && value.trim() !== '' && isFinite(Number(value))
                                ? Number(value).toLocaleString()
                                : value))
                    }</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

