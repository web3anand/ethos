import Image from 'next/image';
import styles from './EthosProfileCard.module.css';

export default function EthosProfileCard({ profile }) {
  if (!profile) return null;

  const { reviewStats, vouchGiven, vouchReceived, onChain, avatarUrl } = profile;

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
      },
    ],
    [
      'Vouches Received',
      {
        Count: vouchReceived.count,
        'Total ETH': `${vouchReceived.eth} ETH`,
      },
    ],
    [
      'On-Chain',
      {
        'Primary Address': onChain?.primaryAddress,
        'ETH Price (USD)': `$${Number(profile.ethPrice).toFixed(2)}`,
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
          <div className={styles.avatarFallback}>
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
