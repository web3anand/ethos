import Image from 'next/image';
import styles from './EthosProfileCard.module.css';

export default function EthosProfileCard({ profile }) {
  if (!profile) return null;

  const { reviewStats, vouchGiven, vouchReceived, onChain, avatarUrl } = profile;

  const ethPrice = Number(onChain?.ethPrice ?? 0);
  const totalEthGiven = Number(vouchGiven?.totalEth ?? vouchGiven?.eth ?? 0);
  const totalEthReceived = Number(vouchReceived?.totalEth ?? vouchReceived?.eth ?? 0);
  const vouchGivenUsd = (totalEthGiven * ethPrice).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });
  const vouchReceivedUsd = (totalEthReceived * ethPrice).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });

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
        'Total ETH': `${totalEthGiven.toFixed(3)} ETH`,
        'Value (USD)': vouchGivenUsd,
      },
    ],
    [
      'Vouches Received',
      {
        Count: vouchReceived.count,
        'Total ETH': `${totalEthReceived.toFixed(3)} ETH`,
        'Value (USD)': vouchReceivedUsd,
      },
    ],
    [
      'On-Chain',
      {
        'Primary Address': onChain?.primaryAddress || 'N/A',
        'ETH Price (USD)': `$${ethPrice.toFixed(2)}`,
      },
    ],
  ];

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt=""
            width={64}
            height={64}
            className={styles.avatar}
          />
        ) : (
          <div className={styles.avatarFallback} />
        )}
        <div className={styles.nameBlock}>
          <div className={styles.username}>{profile.displayName}</div>
          <div className={styles.handle}>@{profile.username}</div>
        </div>
      </div>

      {sections.map(([title, data]) => (
        <div key={title} className={styles.section}>
          <h3 className={styles.sectionTitle}>{title}</h3>
          {Object.entries(data).map(([label, value]) => (
            <div key={label} className={styles.row}>
              <span className={styles.rowLabel}>{label}</span>
              <span className={styles.rowValue}>{value}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
