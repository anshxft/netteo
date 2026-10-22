'use client';

import React from 'react';
import { useAccount, useSwitchChain } from 'wagmi';
import { MEZO_TESTNET_CHAIN_ID, isSupportedNetwork } from '@/lib/chain/config';
import { useMezoGasBalance } from '@/lib/chain/useMezoGasBalance';
import { Button } from '@/components/common/Button';
import { Icon } from '@/components/icons/Icon';
import { AlertTriangle, RefreshCw, Fuel, ExternalLink } from 'lucide-react';

export function NetworkGuard() {
  const { isConnected, chainId } = useAccount();
  const { switchChain, isPending } = useSwitchChain();
  const { isZeroGas, isLowGas, formatted, faucetUrl } = useMezoGasBalance();

  if (!isConnected) {
    return null;
  }

  // 1. Wrong Network Guard
  if (!isSupportedNetwork(chainId)) {
    return (
      <aside
        role="alert"
        style={{
          backgroundColor: 'var(--color-danger-bg)',
          borderBottom: '1px solid var(--color-danger-border)',
          color: 'var(--color-danger)',
          padding: 'var(--space-xs) var(--space-xl)',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 'var(--space-sm)',
          fontWeight: 500,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
          <Icon icon={AlertTriangle} size="sm" color="var(--color-danger)" />
          <span>
            <strong>Wrong Network:</strong> You are connected to Chain ID {chainId || 'Unknown'}.
            Netteo settlements execute exclusively on Mezo Testnet (Chain ID {MEZO_TESTNET_CHAIN_ID}).
          </span>
        </div>

        <Button
          variant="destructive"
          disabled={isPending}
          isLoading={isPending}
          loadingText="Switching..."
          onClick={() => switchChain({ chainId: MEZO_TESTNET_CHAIN_ID })}
          style={{ minHeight: '30px', padding: '0 var(--space-sm)', fontSize: '12px' }}
        >
          <Icon icon={RefreshCw} size="sm" />
          Switch to Mezo Testnet
        </Button>
      </aside>
    );
  }

  // 2. Zero BTC Gas Guard (Official Mezo Faucet Onboarding)
  if (isZeroGas) {
    return (
      <aside
        role="alert"
        style={{
          backgroundColor: 'var(--color-warning-bg)',
          borderBottom: '1px solid var(--color-warning-border)',
          color: 'var(--color-warning)',
          padding: 'var(--space-xs) var(--space-xl)',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 'var(--space-sm)',
          fontWeight: 500,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
          <Icon icon={Fuel} size="sm" color="var(--color-warning)" />
          <span>
            <strong>Zero Gas Balance:</strong> Your wallet has 0.00 BTC for gas fees on Mezo Testnet. You need testnet BTC to submit on-chain settlements.
          </span>
        </div>

        <a
          href={faucetUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ textDecoration: 'none' }}
        >
          <Button
            variant="secondary"
            style={{
              minHeight: '30px',
              padding: '0 var(--space-sm)',
              fontSize: '12px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Icon icon={ExternalLink} size="sm" />
            <span>Get Testnet BTC (Faucet)</span>
          </Button>
        </a>
      </aside>
    );
  }

  return null;
}
