'use client';

import React from 'react';
import Link from 'next/link';
import styles from './AppNav.module.css';
import { AppNav } from './AppNav';
import { WalletBadge } from './WalletBadge';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { NetteoLogoMark } from '@/components/common/NetteoLogo';
import { WorkspaceModeSelector } from './WorkspaceModeSelector';
import { BookOpen } from 'lucide-react';
import { Icon } from '@/components/icons/Icon';

export interface AppHeaderProps {
  walletAddress?: string | null;
  chainId?: number | null;
  isLandingPage?: boolean;
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
  isLandingPage = false,
  onConnectWallet,
  onDisconnectWallet,
}: AppHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xl)', height: '100%' }}>
          <Link href="/" className={styles.brandGroup} title="Netteo — Multilateral Netting on Mezo">
            <NetteoLogoMark size={28} />
            <span className={styles.brandTitle}>Netteo</span>
            <div className={styles.brandTag}>
              <span className={styles.networkDot} />
              <span>Mezo Testnet</span>
            </div>
          </Link>
          <AppNav />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          <Link
            href="/docs"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              fontSize: '12px',
              fontWeight: 600,
              borderRadius: '9999px',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-ink)',
              textDecoration: 'none',
              transition: 'all var(--motion-fast)',
            }}
            title="Netteo Protocol Documentation"
          >
            <Icon icon={BookOpen} size="sm" color="var(--color-wine)" />
            <span>Docs</span>
          </Link>

          <ThemeToggle size="sm" />

          {/* Workspace Mode Selector (Demo vs Live) styled with var(--color-wine-subtle) */}
          {!isLandingPage && (
            <WorkspaceModeSelector />
          )}

          <WalletBadge
            address={walletAddress}
            chainId={chainId}
            onConnect={onConnectWallet}
            onDisconnect={onDisconnectWallet}
          />
        </div>
      </div>
    </header>
  );
}
