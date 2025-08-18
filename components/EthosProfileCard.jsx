import { useState } from 'react';
import Image from 'next/image';
import styles from './EthosProfileCard.module.css';

function truncateMiddle(str = '', left = 6, right = 4) {
  if (!str) return '';
  if (str.length <= left + right + 3) return str;
  return `${str.slice(0, left)}...${str.slice(-right)}`;
}

export default function EthosProfileCard({ profile }) {
  if (!profile) return null;

  const {
    reviewStats,
    vouchGiven,
    vouchReceived,
    onChain,
    avatarUrl,
    id,
    profileId,
    status,
    score,
    xpTotal,
    xpStreakDays,
    displayName,
    username,
    ethPrice,
  } = profile;

  // Track which key was last copied (for tooltip)
  const [copiedKey, setCopiedKey] = useState(null);
  const copyValue = async (label, value) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(String(value));
      setCopiedKey(label);
      setTimeout(() => setCopiedKey(null), 1400);
    } catch {
      // no-op; could show error toast if needed
    }
  };

  const primaryAddress = onChain?.primaryAddress || '';
  const statusClass =
    status?.toLowerCase() === 'active'
      ? styles.badgeSuccess
      : status?.toLowerCase() === 'inactive'
      ? styles.badgeMuted
      : styles.badgeWarn;

  const sections = [
    [
      'Main Stats',
      [
        { label: 'ID', value: id, copy: true, kind: 'id' },
        { label: 'Profile ID', value: profileId, copy: true, kind: 'id' },
        { label: 'Status', value: status, badge: statusClass },
        { label: 'Score', value: score?.toLocaleString(), copy: true, kind: 'number' },
        { label: 'XP Total', value: xpTotal?.toLocaleString(), copy: true, kind: 'number' },
        { label: 'XP Streak Days', value: xpStreakDays?.toLocaleString(), copy: true, kind: 'number' },
      ],
    ],
    [
      'Reviews Received',
      [
        { label: 'Positive', value: reviewStats?.positive ?? 0, tone: 'positive' },
        { label: 'Neutral', value: reviewStats?.neutral ?? 0, tone: 'neutral' },
        { label: 'Negative', value: reviewStats?.negative ?? 0, tone: 'negative' },
      ],
    ],
    [
      'Vouches Given',
      [
        { label: 'Count', value: vouchGiven?.count ?? 0, copy: true, kind: 'number' },
        { label: 'Total ETH', value: `${vouchGiven?.eth ?? '0.000'} ETH`, copy: true, raw: vouchGiven?.eth },
      ],
    ],
    [
      'Vouches Received',
      [
        { label: 'Count', value: vouchReceived?.count ?? 0, copy: true, kind: 'number' },
        { label: 'Total ETH', value: `${vouchReceived?.eth ?? '0.000'} ETH`, copy: true, raw: vouchReceived?.eth },
      ],
    ],
    [
      'On-Chain',
      [
        {
          label: 'Primary Address',
          value: primaryAddress ? truncateMiddle(primaryAddress) : '—',
          copy: Boolean(primaryAddress),
          raw: primaryAddress,
          mono: true,
        },
        {
          label: 'ETH Price (USD)',
          value: ethPrice ? `$${Number(ethPrice).toFixed(2)}` : '—',
          copy: Boolean(ethPrice),
          raw: ethPrice ? Number(ethPrice).toFixed(2) : '',
        },
      ],
    ],
  ];

  return (
    <div className={styles.card} role="region" aria-label="Ethos Profile Card">
      <div className={styles.header}>
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={`${displayName || username} avatar`}
            width={64}
            height={64}
            className={styles.avatar}
          />
        ) : (
          <div className={styles.avatarFallback} aria-hidden />
        )}

        <div className={styles.nameBlock}>
          <div className={styles.usernameRow}>
            <div className={styles.username}>{displayName}</div>
            <span className={`${styles.badge} ${statusClass}`}>{status || 'UNKNOWN'}</span>
          </div>
          <div className={styles.handle}>
            @{username}
            <button
              className={styles.copyGhost}
              aria-label="Copy handle"
              title={copiedKey === 'handle' ? 'Copied!' : 'Copy'}
              onClick={() => copyValue('handle', username)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
                <path d="M9 9h10v10H9z" fill="none" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M5 5h10v10" fill="none" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
            </button>
            {copiedKey === 'handle' && <span className={styles.copied}>Copied</span>}
          </div>
        </div>
      </div>

      {/* Meta strip */}
      <div className={styles.metaStrip}>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Reputation</span>
          <span className={styles.metaValue}>{(score ?? 0).toLocaleString()}</span>
        </div>
        <div className={styles.metaDivider} />
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Reviews</span>
          <span className={styles.metaValue}>
            {(reviewStats?.positive ?? 0) + (reviewStats?.neutral ?? 0) + (reviewStats?.negative ?? 0)}
          </span>
        </div>
        <div className={styles.metaDivider} />
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Streak</span>
          <span className={styles.metaValue}>{xpStreakDays ?? 0}d</span>
        </div>
      </div>

      {sections.map(([title, rows]) => (
        <section key={title} className={styles.section} aria-labelledby={`${title}-id`}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle} id={`${title}-id`}>{title}</h3>
            {title === 'Reviews Received' && (
              <div className={styles.legend}>
                <span className={`${styles.dot} ${styles.dotPositive}`} /> Positive
                <span className={`${styles.dot} ${styles.dotNeutral}`} /> Neutral
                <span className={`${styles.dot} ${styles.dotNegative}`} /> Negative
              </div>
            )}
          </div>

          {rows.map(({ label, value, copy, raw, mono, badge, tone }) => (
            <div key={label} className={styles.row}>
              <span className={styles.rowLabel}>{label}</span>

              <div className={styles.rowValueWrap}>
                {badge ? (
                  <span className={`${styles.badge} ${badge}`}>{value}</span>
                ) : (
                  <span
                    className={`${styles.rowValue} ${mono ? styles.mono : ''} ${
                      tone ? styles[`tone_${tone}`] : ''
                    }`}
                  >
                    {value}
                  </span>
                )}

                {copy && (
                  <button
                    className={styles.copyGhost}
                    aria-label={`Copy ${label}`}
                    title={copiedKey === label ? 'Copied!' : 'Copy'}
                    onClick={() => copyValue(label, raw ?? value)}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
                      <path d="M9 9h10v10H9z" fill="none" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M5 5h10v10" fill="none" stroke="currentColor" strokeWidth="1.5"/>
                    </svg>
                  </button>
                )}
                {copiedKey === label && <span className={styles.copied}>Copied</span>}
              </div>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
