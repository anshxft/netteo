'use client';

import React from 'react';
import { useAccount, useSwitchChain, useReadContracts } from 'wagmi';
import { MEZO_MAINNET_CHAIN_ID, isSupportedNetwork, validateChainConfiguration, kernelForToken, liveSettlementTokens } from '@/lib/chain/config';
import { useMezoGasBalance } from '@/lib/chain/useMezoGasBalance';
import { Button } from '@/components/common/Button';
import { Icon } from '@/components/icons/Icon';
import { AlertTriangle, RefreshCw, Fuel } from 'lucide-react';
import { settlementKernelAbi } from '@/lib/chain/abi';

export function NetworkGuard() {
  const { isConnected, chainId } = useAccount();
  const { switchChain, isPending } = useSwitchChain();
  const { isZeroGas, formatted } = useMezoGasBalance();
  // Every deployed kernel must prove, on-chain, that it is bound to the token we think it is.
  const deployedTokens = liveSettlementTokens();
  const { data: bindings, isLoading: isCheckingKernel } = useReadContracts({
    contracts: deployedTokens.map((t) => ({
      address: kernelForToken(t.address)!,
      abi: settlementKernelAbi,
      functionName: 'musdToken' as const,
      chainId: MEZO_MAINNET_CHAIN_ID,
    })),
    allowFailure: true,
    query: { enabled: isSupportedNetwork(chainId) && deployedTokens.length > 0 },
  });
  const unverifiedTokens = deployedTokens.filter(
    (t, i) => String(bindings?.[i]?.result ?? '').toLowerCase() !== t.address.toLowerCase()
  );

  if (!isConnected) {
    return null;
  }

  const chainConfiguration = deployedTokens.length > 0 ? { valid: true as const } : validateChainConfiguration(chainId);

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
            Netteo settlements execute exclusively on Mezo Mainnet (Chain ID {MEZO_MAINNET_CHAIN_ID}).
          </span>
        </div>

        <Button
          variant="destructive"
          disabled={isPending}
          isLoading={isPending}
          loadingText="Switching..."
          onClick={() => switchChain({ chainId: MEZO_MAINNET_CHAIN_ID })}
          style={{ minHeight: '30px', padding: '0 var(--space-sm)', fontSize: '12px' }}
        >
          <Icon icon={RefreshCw} size="sm" />
          Switch to Mezo Mainnet
        </Button>
      </aside>
    );
  }

  if (!chainConfiguration.valid) {
    return (
      <aside role="alert" style={{ backgroundColor: 'var(--color-warning-bg)', borderBottom: '1px solid var(--color-warning-border)', color: 'var(--color-warning)', padding: 'var(--space-xs) var(--space-xl)', fontSize: '13px' }}>
        <strong>Mainnet settlement unavailable:</strong> {chainConfiguration.error}
      </aside>
    );
  }

  if (isCheckingKernel || unverifiedTokens.length > 0) {
    return (
      <aside role="alert" style={{ backgroundColor: 'var(--color-warning-bg)', borderBottom: '1px solid var(--color-warning-border)', color: 'var(--color-warning)', padding: 'var(--space-xs) var(--space-xl)', fontSize: '13px' }}>
        <strong>Mainnet settlement unavailable:</strong> {isCheckingKernel
          ? 'Verifying SettlementKernel token bindings…'
          : `The ${unverifiedTokens.map((t) => t.symbol).join(', ')} SettlementKernel is missing or is not bound to its canonical Mezo token. Transactions are disabled.`}
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
            <strong>BTC required for gas:</strong> Your wallet has {formatted} on Mezo Mainnet. Add BTC before submitting a settlement.
          </span>
        </div>
      </aside>
    );
  }

  return null;
}
