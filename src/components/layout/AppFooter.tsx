'use client';

import React from 'react';
import Link from 'next/link';
import styles from './AppFooter.module.css';
import { Icon } from '@/components/icons/Icon';
import { Copy, ExternalLink, ShieldCheck, Check } from 'lucide-react';
import { useToast } from '@/components/ui/Toast/ToastContext';
import { NetteoLogoMark } from '@/components/common/NetteoLogo';
import { kernelForToken } from '@/lib/chain/config';
import { SUPPORTED_SETTLEMENT_TOKENS } from '@/lib/chain/tokens';

export function AppFooter() {
  const { toast } = useToast();
  const [copiedAddress, setCopiedAddress] = React.useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAddress(text);
    toast.success('Address Copied', `${label} copied to clipboard`);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  // One kernel per supported token; only deployed kernels are listed, so nothing here is invented.
  const contracts = SUPPORTED_SETTLEMENT_TOKENS.flatMap((token) => {
    const kernel = kernelForToken(token.address);
    return [
      ...(kernel ? [{ label: `${token.symbol} Settlement Kernel`, address: kernel as string }] : []),
      { label: `${token.symbol} Token`, address: token.address as string },
    ];
  }).map((contract) => ({
    ...contract,
    display: `${contract.address.slice(0, 6)}...${contract.address.slice(-4)}`,
  }));

  return (
    <footer className={styles.footerWrapper} role="contentinfo">
      <div className={styles.footerContainer}>
        <div className={styles.footerGrid}>
          {/* Column 1: Brand & Network Status */}
          <div className={styles.col}>
            <div className={styles.brandRow}>
              <NetteoLogoMark size={28} />
              <span className={styles.brandName}>Netteo</span>
            </div>
            <p className={styles.brandDesc}>
              Autonomous multilateral obligation netting and atomic settlement in Mezo stablecoins.
            </p>
            <div className={styles.networkStatusBadge}>
              <span className={styles.pulseDot} />
              <span>Mezo Mainnet • Chain 31612</span>
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
            <span className={styles.colHeader}>Deployed Contracts</span>
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
              Net positions always sum to zero. Deposits are collected before anyone is paid, and depositors can reclaim them after the 72-hour funding deadline if a cycle is not fully funded. Not independently audited.
            </p>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className={styles.bottomBar}>
          <span>&copy; {new Date().getFullYear()} Netteo Protocol. Mainnet settlement in MUSD, mUSDC and mUSDT.</span>
          <div className={styles.bottomLinks}>
            <a
              href="https://explorer.mezo.org"
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
