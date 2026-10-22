'use client';

import React from 'react';
import styles from './AppNav.module.css';
import { Button } from '../common/Button';
import { useMezoGasBalance } from '@/lib/chain/useMezoGasBalance';
import { Icon } from '@/components/icons/Icon';
import { Fuel, ExternalLink } from 'lucide-react';

export interface WalletBadgeProps {
  address?: string | null;
  chainId?: number | null;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

/**
 * Wallet status and connection badge.
 * Displays connected account checksum format, native BTC gas balance, and network state.
 * Truthful interface: Shows exact connection and gas status on Mezo Testnet (Chain ID 31611).
 */
export function WalletBadge({
  address,
  chainId,
  onConnect,
  onDisconnect,
}: WalletBadgeProps) {
  const isCorrectNetwork = !chainId || chainId === 31611;
  const { formatted: btcBalance, isZeroGas, isLowGas, faucetUrl } = useMezoGasBalance();

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

      {/* Connected Account Badge */}
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

      {/* Native BTC Gas Balance Pill */}
      {isCorrectNetwork && (
        <a
          href={faucetUrl}
          target="_blank"
          rel="noopener noreferrer"
          title={isZeroGas ? 'Zero BTC gas balance! Click to request testnet BTC from Mezo Faucet.' : `Native gas balance: ${btcBalance}. Click to visit Mezo Faucet.`}
          style={{
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '12px',
            fontVariantNumeric: 'tabular-nums',
            fontWeight: 500,
            padding: '4px 8px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: isZeroGas
              ? 'var(--color-warning-bg)'
              : 'var(--color-sand)',
            border: isZeroGas
              ? '1px solid var(--color-warning-border)'
              : '1px solid var(--color-border)',
            color: isZeroGas
              ? 'var(--color-warning)'
              : 'var(--color-ink)',
            transition: 'opacity var(--motion-fast)',
          }}
        >
          <Icon icon={Fuel} size="sm" color={isZeroGas ? 'var(--color-warning)' : 'var(--color-wine)'} />
          <span>{btcBalance}</span>
          {isZeroGas && <span style={{ fontSize: '11px', textDecoration: 'underline' }}>Faucet</span>}
        </a>
      )}

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
