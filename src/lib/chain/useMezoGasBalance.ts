'use client';

import { useAccount, useBalance } from 'wagmi';
import { formatEther } from 'viem';
import { MEZO_MAINNET_CHAIN_ID, isSupportedNetwork } from './config';

export const MINIMUM_BTC_GAS_THRESHOLD = 100000000000000n; // 0.0001 BTC in base units

export interface MezoGasBalanceResult {
  balance: bigint;
  formatted: string;
  isZeroGas: boolean;
  isLowGas: boolean;
  isLoading: boolean;
  refetch: () => void;
}

/**
 * Hook to inspect connected user's native BTC gas balance on Mezo Mainnet (Chain ID 31612).
 */
export function useMezoGasBalance(): MezoGasBalanceResult {
  const { address, chainId, isConnected } = useAccount();
  const isCorrectNetwork = isSupportedNetwork(chainId);

  const { data, isLoading, refetch } = useBalance({
    address,
    chainId: MEZO_MAINNET_CHAIN_ID,
    query: {
      enabled: isConnected && !!address && isCorrectNetwork,
      refetchInterval: 15000,
    },
  });

  const balance = data?.value ?? 0n;
  const isZeroGas = isConnected && isCorrectNetwork && balance === 0n;
  const isLowGas = isConnected && isCorrectNetwork && balance > 0n && balance < MINIMUM_BTC_GAS_THRESHOLD;

  // Format to 4 decimal places with tabular numeric styling
  const rawFormatted = formatEther(balance);
  const parts = rawFormatted.split('.');
  const formatted = `${parts[0]}.${(parts[1] || '0').slice(0, 4)} BTC`;

  return {
    balance,
    formatted,
    isZeroGas,
    isLowGas,
    isLoading,
    refetch: () => {
      refetch();
    },
  };
}
