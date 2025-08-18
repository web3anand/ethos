import Image from 'next/image';
import styles from './EthosProfileCard.module.css';

// Score name and color mapping
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

function getScoreLevel(score) {
  return scoreLevels.find(l => score >= l.min && score <= l.max) || scoreLevels[0];
}

export default function EthosProfileCard({ profile }) {
  if (!profile) return null;

  const { reviewStats, vouchGiven, vouchReceived, onChain, avatarUrl, score } = profile;
  const scoreLevel = getScoreLevel(Number(score));


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
      <div className={styles.profileTopMinimal}>
        <div className={styles.avatarEthosRow}>
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt=""
              width={80}
              height={80}
              className={styles.avatarBigSmall}
            />
          ) : (
            <div className={styles.avatarBigFallbackSmall}>
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
          <span
            className={styles.ethosTag}
            style={{ background: scoreLevel.color, color: scoreLevel.text || '#fff' }}
          >
            {scoreLevel.name}
          </span>
        </div>
        <div className={styles.profileNameBlock}>
          <span className={styles.profileName}>{profile.displayName}</span>
          <span className={styles.profileHandle}>@{profile.username}</span>
        </div>
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
