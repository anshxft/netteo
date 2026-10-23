'use client';

import React from 'react';
import Link from 'next/link';
import styles from './AppNav.module.css';
import { AppNav } from './AppNav';
import { WalletBadge } from './WalletBadge';
import { useWorkspace } from '@/features/workspace/WorkspaceContext';
import { Button } from '@/components/common/Button';
import { Icon } from '@/components/icons/Icon';
import { ArrowRight } from 'lucide-react';

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
  const { mode, toggleMode } = useWorkspace();
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

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          <Link href="/obligations" style={{ textDecoration: 'none' }}>
            <Button
              variant="primary"
              style={{ minHeight: '38px', padding: '0 var(--space-md)', fontSize: '13px' }}
              icon={<Icon icon={ArrowRight} size="sm" color="#FFFFFF" />}
              iconPosition="right"
              enableLift
              enableArrowSlide
            >
              Open Desk
            </Button>
          </Link>

          {!isLandingPage && (
            <button
              type="button"
              onClick={toggleMode}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: '9999px',
                border: mode === 'demo' ? '1px solid rgba(127, 1, 31, 0.3)' : '1px solid var(--color-border)',
                backgroundColor: mode === 'demo' ? 'rgba(127, 1, 31, 0.08)' : 'var(--color-surface)',
                color: mode === 'demo' ? 'var(--color-wine)' : 'var(--color-ink)',
                cursor: 'pointer',
                transition: 'all var(--motion-fast)',
              }}
              title={mode === 'demo' ? 'Currently in Demo Sandbox with mock tokens. Click to switch to Live Mezo Testnet.' : 'Currently in Live Mezo mode. Click to switch to Demo Sandbox.'}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: mode === 'demo' ? 'var(--color-success)' : 'var(--color-wine)',
                }}
              />
              <span>{mode === 'demo' ? 'Demo Sandbox' : 'Live Mezo'}</span>
            </button>
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
