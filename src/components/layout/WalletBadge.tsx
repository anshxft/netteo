'use client';

import React from 'react';
import styles from './AppNav.module.css';
import { Button } from '../common/Button';

export interface WalletBadgeProps {
  address?: string | null;
  chainId?: number | null;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

/**
 * Wallet status and connection badge.
 * Displays connected account checksum format or Connect Wallet CTA.
 * Truthful interface: Shows exact connection and network status without hallucinating state.
 */
export function WalletBadge({
  address,
  chainId,
  onConnect,
  onDisconnect,
}: WalletBadgeProps) {
  const isCorrectNetwork = !chainId || chainId === 31611;

  if (!address) {
    return (
      <Button
        variant="secondary"
        onClick={onConnect}
        style={{ minHeight: '36px', padding: '0 var(--space-md)', fontSize: '13px' }}
      >
        Connect Wallet
      </Button>
    );
  }

  const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;

  return (
    <div className={styles.walletGroup}>
      {!isCorrectNetwork && (
        <span
          style={{
            fontSize: '12px',
            color: 'var(--color-danger)',
            backgroundColor: 'var(--color-danger-bg)',
            border: '1px solid var(--color-danger-border)',
            padding: '2px 8px',
            borderRadius: 'var(--radius-sm)',
            fontWeight: 500,
          }}
        >
          Wrong Network
        </span>
      )}
      <div className={styles.walletBadge} title={`Connected: ${address}`}>
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: isCorrectNetwork ? 'var(--color-success)' : 'var(--color-danger)',
          }}
        />
        <span>{shortAddress}</span>
      </div>
      {onDisconnect && (
        <Button
          variant="tertiary"
          onClick={onDisconnect}
          style={{ minHeight: '36px', padding: '0 var(--space-xs)', fontSize: '12px', color: 'var(--color-muted)' }}
          title="Disconnect wallet"
        >
          Disconnect
        </Button>
      )}
    </div>
  );
}
