'use client';

import React from 'react';
import Link from 'next/link';
import styles from './LandingFooter.module.css';

export function LandingFooter() {
  return (
    <footer className={styles.footerWrapper} aria-label="Netteo Footer">
      <div className={styles.footerInner}>
        <div className={styles.topRow}>
          {/* Brand Col */}
          <div className={styles.brandCol}>
            <div className={styles.brandTitle}>Netteo</div>
            <p className={styles.brandTagline}>
              Many obligations. One net settlement.
              <br />
              Multilateral debt clearing & atomic stablecoin execution on Mezo.
            </p>
            <div className={styles.networkStatus}>
              <span className={styles.statusDot} />
              <span>Mezo Testnet (Chain ID 31611)</span>
            </div>
          </div>

          {/* Links Columns */}
          <div className={styles.linksGrid}>
            <div className={styles.linkCol}>
              <span className={styles.colHeader}>Workspace</span>
              <Link href="/obligations" className={styles.colLink}>
                Obligations Desk
              </Link>
              <Link href="/cycles" className={styles.colLink}>
                Settlement Cycles
              </Link>
              <Link href="/groups" className={styles.colLink}>
                Partner Groups
              </Link>
              <Link href="/audit" className={styles.colLink}>
                Audit Statements
              </Link>
            </div>

            <div className={styles.linkCol}>
              <span className={styles.colHeader}>Protocol</span>
              <a href="#how-it-works" className={styles.colLink}>
                Clearing Flow
              </a>
              <a href="#simulator" className={styles.colLink}>
                Netting Solver
              </a>
              <a href="#architecture" className={styles.colLink}>
                Zero-Sum Invariant
              </a>
              <a
                href="https://github.com/syther069/netteo"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.colLink}
              >
                GitHub Repository ↗
              </a>
            </div>

            <div className={styles.linkCol}>
              <span className={styles.colHeader}>Ecosystem</span>
              <a
                href="https://mezo.org"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.colLink}
              >
                Mezo Network ↗
              </a>
              <a
                href="https://explorer.test.mezo.org"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.colLink}
              >
                Block Explorer ↗
              </a>
              <a href="#faq" className={styles.colLink}>
                FAQ & Security
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className={styles.bottomBar}>
          <p className={styles.copyText}>
            © {new Date().getFullYear()} Netteo. Non-custodial autonomous debt clearing.
          </p>
          <div className={styles.metaText}>
            <span>WCAG AA Accessible</span>
            <span>•</span>
            <span>Audited Smart Contracts</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
