'use client';

import React from 'react';
import Link from 'next/link';
import styles from './AppNav.module.css';
import { AppNav } from './AppNav';
import { WalletBadge } from './WalletBadge';

export interface AppHeaderProps {
  walletAddress?: string | null;
  chainId?: number | null;
  onConnectWallet?: () => void;
  onDisconnectWallet?: () => void;
}

/**
 * Standard Application Header
 * Incorporates brand, network verification indicator, primary navigation, and wallet status.
 */
export function AppHeader({
  walletAddress,
  chainId = 31611,
  onConnectWallet,
  onDisconnectWallet,
}: AppHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xl)', height: '100%' }}>
          <Link href="/" className={styles.brandGroup}>
            <span className={styles.brandTitle}>Netteo</span>
            <div className={styles.brandTag}>
              <span className={styles.networkDot} />
              <span>Mezo Testnet</span>
            </div>
          </Link>
          <AppNav />
        </div>

        <WalletBadge
          address={walletAddress}
          chainId={chainId}
          onConnect={onConnectWallet}
          onDisconnect={onDisconnectWallet}
        />
      </div>
    </header>
  );
}
