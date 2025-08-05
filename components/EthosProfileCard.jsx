import Image from 'next/image';
import styles from './EthosProfileCard.module.css';

export default function EthosProfileCard({ profile }) {
  if (!profile) return null;

  const {
    username,
    handle,
    vouchesGiven,
    vouchesReceived,
    onChain,
  } = profile;

  const priceNum =
    typeof onChain.ethPrice === 'string'
      ? parseFloat(onChain.ethPrice.replace(/[$,]/g, ''))
      : Number(onChain.ethPrice || 0);

  const totalEthGiven = Number(vouchesGiven.totalEth ?? 0);
  const totalEthReceived = Number(vouchesReceived.totalEth ?? 0);

  const vouchGivenUsd = (totalEthGiven * priceNum).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });
  const vouchReceivedUsd = (totalEthReceived * priceNum).toLocaleString(
    'en-US',
    { style: 'currency', currency: 'USD' }
  );
  const ethPriceUsd = priceNum.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        {profile.avatarUrl ? (
          <Image
            src={profile.avatarUrl}
            alt=""
            width={64}
            height={64}
            className={styles.avatar}
          />
        ) : (
          <div className={styles.avatarFallback} />
        )}
        <div className={styles.nameBlock}>
          <div className={styles.username}>{username}</div>
          <div className={styles.handle}>@{handle}</div>
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Vouches Given</h3>
        <div className={styles.row}>
          <span className={styles.rowLabel}>Count</span>
          <span className={styles.rowValue}>{vouchesGiven.count ?? 0}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>Total ETH</span>
          <span className={styles.rowValue}>{`${totalEthGiven.toFixed(3)} ETH`}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>Value (USD)</span>
          <span className={styles.rowValue}>{vouchGivenUsd}</span>
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Vouches Received</h3>
        <div className={styles.row}>
          <span className={styles.rowLabel}>Count</span>
          <span className={styles.rowValue}>{vouchesReceived.count ?? 0}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>Total ETH</span>
          <span className={styles.rowValue}>{`${totalEthReceived.toFixed(3)} ETH`}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>Value (USD)</span>
          <span className={styles.rowValue}>{vouchReceivedUsd}</span>
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>On-Chain</h3>
        <div className={styles.row}>
          <span className={styles.rowLabel}>Primary Address</span>
          <span className={styles.rowValue}>{onChain.primaryAddress || 'N/A'}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>ETH Price (USD)</span>
          <span className={styles.rowValue}>{ethPriceUsd}</span>
        </div>
      </div>
    </div>
  );
}
