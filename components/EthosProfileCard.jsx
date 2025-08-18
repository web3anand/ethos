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
        'Primary Address': onChain?.primaryAddress
          ? onChain.primaryAddress
          : <span style={{color: '#aaa'}}>Not available</span>,
        'ETH Price (USD)': `$${Number(profile.ethPrice).toFixed(2)}`,
      },
    ],
  ];

  return (
    <div className={styles.card}>
      <div className={styles.topCard}>
        <div className={styles.avatarBigBlock}>
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt=""
              width={128}
              height={128}
              className={styles.avatarBig}
            />
          ) : (
            <div className={styles.avatarBigFallback}>
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
        <div className={styles.statusPillContainer}>
          <span className={styles.statusPill}>{profile.status || 'KNOWN'}</span>
        </div>
      </div>
      <div className={styles.infoBar}>
        <span className={styles.infoName}>{profile.displayName?.toUpperCase()}</span>
        <span className={styles.infoHandle}>@{profile.username?.toUpperCase()}</span>
      </div>

      {sections.map(([title, data]) => (
        <div key={title} className={styles.section}>
          <h3 className={styles.sectionTitle}>{title}</h3>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <tbody>
                {Object.entries(data).map(([label, value]) => (
                  <tr key={label} className={styles.tableRow}>
                    <td className={styles.tableCellLabel}>{label}</td>
                    <td className={styles.tableCellValue}>
                      {value}
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
      ))}
    </div>
  );
}
