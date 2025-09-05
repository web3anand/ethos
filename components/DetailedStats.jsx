import React, { useState, useEffect } from 'react';
import styles from './DetailedStats.module.css';
import { getUserStats } from '../utils/ethosApiClient';

// Helper function to fetch user addresses
async function fetchUserAddresses(profileId) {
  try {
    const formattedProfileId = `profileId:${profileId}`;
    const addressRes = await fetch(`https://api.ethos.network/api/v1/addresses/${formattedProfileId}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*'
      }
    });
    
    if (!addressRes.ok) {
      console.error('[DetailedStats] Failed to fetch addresses:', addressRes.status, addressRes.statusText);
      return null;
    }
    
    const response = await addressRes.json();
    // Extract primary address from the response structure
    return response?.data?.primaryAddress || null;
  } catch (error) {
    console.error('[DetailedStats] Error fetching addresses:', error);
    return null;
  }
}

// Helper function to fetch validator NFT data
async function fetchValidatorNftData(profileId) {
  try {
    const formattedProfileId = `profileId:${profileId}`;
    const nftRes = await fetch(`https://api.ethos.network/api/v2/nfts/user/${formattedProfileId}/owns-validator`, {
      method: 'GET',
      headers: {
        'Accept': '*/*'
      }
    });
    
    if (!nftRes.ok) {
      console.error('[DetailedStats] Validator NFT check failed:', nftRes.status, nftRes.statusText);
      return false;
    }
    
    const data = await nftRes.json();
    const hasValidatorNft = Array.isArray(data) && data.length > 0;
    console.log('[DetailedStats] Validator NFT status for profileId:', profileId, hasValidatorNft);
    return hasValidatorNft;
  } catch (error) {
    console.error('[DetailedStats] Error checking validator NFT:', error);
    return false;
  }
}

const DetailedStats = ({ stats }) => {
  const [userAddress, setUserAddress] = useState(null);
  const [hasValidatorNft, setHasValidatorNft] = useState(null);
  const [influenceFactor, setInfluenceFactor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchAdditionalData() {
      if (!stats?.profileId) return;
      
      setLoading(true);
      try {
        const userkey = `profileId:${stats.profileId}`;
        
        const [address, validatorNft, userStatsData] = await Promise.all([
          fetchUserAddresses(stats.profileId),
          fetchValidatorNftData(stats.profileId),
          getUserStats(userkey)
        ]);
        
        setUserAddress(address);
        setHasValidatorNft(validatorNft);
        
        // Set influence factor from getUserStats API
        if (userStatsData && userStatsData.influenceFactor !== undefined) {
          setInfluenceFactor(userStatsData.influenceFactor);
          console.log('[DetailedStats] Influence factor:', userStatsData.influenceFactor);
        } else {
          setInfluenceFactor(null);
          console.log('[DetailedStats] No influence factor data found');
        }
        
      } catch (error) {
        console.error('[DetailedStats] Error fetching additional data:', error);
        setInfluenceFactor(null);
      } finally {
        setLoading(false);
      }
    }

    fetchAdditionalData();
  }, [stats?.profileId]);

  const handleCopyAddress = () => {
    if (userAddress) {
      navigator.clipboard.writeText(userAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!stats) {
    return null;
  }

  // Helper function to format address with copy functionality
  const formatAddress = (address) => {
    if (!address) return 'No address';
    return (
      <span 
        onClick={handleCopyAddress}
        style={{ cursor: 'pointer', color: '#4F9CF9' }}
        title={copied ? 'Copied!' : 'Click to copy full address'}
      >
        {copied ? 'Copied!' : `${address.slice(0, 6)}...${address.slice(-4)}`}
      </span>
    );
  };

  const mainStats = {
    'ID': stats.id,
    'Profile ID': stats.profileId,
    'Address': loading ? 'Loading...' : formatAddress(userAddress),
    'Validator NFT': loading ? 'Loading...' : (hasValidatorNft ? '✅ Yes' : '❌ No'),
    'Status': stats.status,
    'Score': stats.score,
    'Influence Factor': loading ? 'Loading...' : (influenceFactor !== null ? influenceFactor : 'N/A'),
    'XP Total': stats.xpTotal,
    'XP Streak Days': stats.xpStreakDays,
  };

  const vouchGiven = {
    'Count': stats.vouchGiven.count,
    'Total ETH': `${stats.vouchGiven.eth}`,
    'Total USD': stats.ethPrice ? `$${(Number(stats.vouchGiven.eth) * stats.ethPrice).toLocaleString(undefined, {maximumFractionDigits:2})}` : 'Loading...',
  };

  const vouchReceived = {
    'Count': stats.vouchReceived.count,
    'Total ETH': `${stats.vouchReceived.eth}`,
    'Total USD': stats.ethPrice ? `$${(Number(stats.vouchReceived.eth) * stats.ethPrice).toLocaleString(undefined, {maximumFractionDigits:2})}` : 'Loading...',
  };

  return (
    <div className={`${styles.statsContainer} glass-container`}>
      <div className={styles.statSection}>
        <h3 className={styles.sectionTitle}>Main Stats</h3>
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <tbody>
              {Object.entries(mainStats).map(([label, value]) => (
                <tr key={label} className={styles.tableRow}>
                  <td className={styles.tableCellLabel}>{label}</td>
                  <td className={styles.tableCellValue}>
                    {typeof value === 'object' && value !== null ? value : value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className={styles.statSection}>
        <h3 className={styles.sectionTitle}>Vouches Given</h3>
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <tbody>
              {Object.entries(vouchGiven).map(([label, value]) => (
                <tr key={label} className={styles.tableRow}>
                  <td className={styles.tableCellLabel}>{label}</td>
                  <td className={styles.tableCellValue}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className={styles.statSection}>
        <h3 className={styles.sectionTitle}>Vouches Received</h3>
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <tbody>
              {Object.entries(vouchReceived).map(([label, value]) => (
                <tr key={label} className={styles.tableRow}>
                  <td className={styles.tableCellLabel}>{label}</td>
                  <td className={styles.tableCellValue}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DetailedStats;
