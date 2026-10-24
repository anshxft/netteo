'use client';

import React from 'react';
import styles from './TrustStrip.module.css';

const ECOSYSTEM_PARTNERS = [
  'Mezo Network (Bitcoin L2)',
  'Genesis Infra Pod',
  'DevDAO Guild',
  'Euler Security Pod',
  'CoreLabs Studio',
  'Station3 Collective',
  'Uniswap Grantee Pod',
  'Autonomous Protocol Pod',
];

export function TrustStrip() {
  // Duplicate list to achieve continuous infinite marquee loop
  const marqueeItems = [...ECOSYSTEM_PARTNERS, ...ECOSYSTEM_PARTNERS];

  return (
    <div className={styles.trustSection}>
      <span className={styles.trustLabel}>
        Trusted by leading Web3 collectives, service pods, and Mezo builders
      </span>

      <div className={styles.marqueeContainer} aria-label="Ecosystem Partners and Collectives">
        <div className={styles.marqueeTrack}>
          {marqueeItems.map((item, idx) => (
            <div key={`${item}-${idx}`} className={styles.badgeItem}>
              <span className={styles.badgeGlyph} />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
