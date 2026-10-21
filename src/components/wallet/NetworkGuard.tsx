'use client';

import React from 'react';
import { useAccount, useSwitchChain } from 'wagmi';
import { MEZO_TESTNET_CHAIN_ID, isSupportedNetwork } from '@/lib/chain/config';
import { Button } from '@/components/common/Button';
import { Icon } from '@/components/icons/Icon';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export function NetworkGuard() {
  const { isConnected, chainId } = useAccount();
  const { switchChain, isPending } = useSwitchChain();

  if (!isConnected || isSupportedNetwork(chainId)) {
    return null;
  }

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
