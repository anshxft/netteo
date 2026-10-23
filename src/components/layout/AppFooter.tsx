'use client';

import React from 'react';
import Link from 'next/link';
import styles from './AppFooter.module.css';
import { Icon } from '@/components/icons/Icon';
import { Copy, ExternalLink, ShieldCheck, Check } from 'lucide-react';
import { useToast } from '@/components/ui/Toast/ToastContext';

export function AppFooter() {
  const { toast } = useToast();
  const [copiedAddress, setCopiedAddress] = React.useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAddress(text);
    toast.success('Address Copied', `${label} copied to clipboard`);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  const contracts = [
    {
      label: 'Settlement Kernel (Mezo)',
      address: '0x3c5Efa1E7fb42ec5351d132bcAce83C8C4dbc3D5',
      display: '0x3c5E...c3D5',
    },
    {
      label: 'Canonical MUSD Token',
      address: '0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503',
      display: '0x1189...c503',
    },
  ];

  return (
    <footer className={styles.footerWrapper} role="contentinfo">
      <div className={styles.footerContainer}>
        <div className={styles.footerGrid}>
          {/* Column 1: Brand & Network Status */}
          <div className={styles.col}>
            <div className={styles.brandRow}>
              <div className={styles.brandLogo}>N</div>
              <span className={styles.brandName}>Netteo</span>
            </div>
            <p className={styles.brandDesc}>
              Autonomous multilateral obligation netting and atomic settlement in MUSD on Mezo.
            </p>
            <div className={styles.networkStatusBadge}>
              <span className={styles.pulseDot} />
              <span>Mezo Testnet • Chain 31611</span>
            </div>
          </div>

          {/* Column 2: Protocol Desks */}
          <div className={styles.col}>
            <span className={styles.colHeader}>Pages</span>
            <ul className={styles.linkList}>
              <li>
                <Link href="/obligations" className={styles.footerLink}>
                  Payments
                </Link>
              </li>
              <li>
                <Link href="/cycles" className={styles.footerLink}>
                  Settlements
                </Link>
              </li>
              <li>
                <Link href="/groups" className={styles.footerLink}>
                  Groups
                </Link>
              </li>
              <li>
                <Link href="/audit" className={styles.footerLink}>
                  Receipts
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Verified Smart Contracts */}
          <div className={styles.col}>
            <span className={styles.colHeader}>Verified Contracts</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {contracts.map((c) => (
                <div key={c.address} className={styles.contractCard}>
                  <div className={styles.contractAddressRow}>
                    <span className={styles.contractLabel}>{c.label}</span>
                    <button
                      type="button"
                      aria-label={`Copy ${c.label} address`}
                      className={styles.copyButton}
                      onClick={() => copyToClipboard(c.address, c.label)}
                    >
                      <Icon icon={copiedAddress === c.address ? Check : Copy} size="sm" />
                    </button>
                  </div>
                  <span className={styles.contractAddress}>{c.display}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Column 4: Invariants & Solvency */}
          <div className={styles.col}>
            <span className={styles.colHeader}>Solvency Invariants</span>
            <p className={styles.solvencyNote}>
              Non-custodial and mathematically zero-sum. Deposits are collected prior to distribution, with a 72-hour automated refund timeout if any party defaults.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-success)' }}>
              <Icon icon={ShieldCheck} size="sm" color="var(--color-success)" />
              <span>Cryptographically Verified</span>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className={styles.bottomBar}>
          <span>&copy; {new Date().getFullYear()} Netteo Protocol. Experimental fintech software on Mezo Testnet.</span>
          <div className={styles.bottomLinks}>
            <a
              href="https://explorer.test.mezo.org"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.footerLink}
            >
              <span>Mezo Explorer</span>
              <Icon icon={ExternalLink} size="sm" />
            </a>
            <a
              href="https://mezo.org"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.footerLink}
            >
              <span>Mezo Network</span>
              <Icon icon={ExternalLink} size="sm" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
