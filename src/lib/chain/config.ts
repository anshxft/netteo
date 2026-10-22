import { defineChain } from 'viem';
import { createConfig, http } from 'wagmi';
import { injected, safe } from 'wagmi/connectors';

export const MEZO_TESTNET_CHAIN_ID = 31611;

/**
 * Mezo Testnet chain definition adhering to ADR-04 & .env.example
 */
export const mezoTestnet = defineChain({
  id: MEZO_TESTNET_CHAIN_ID,
  name: 'Mezo Testnet',
  nativeCurrency: {
    name: 'Bitcoin',
    symbol: 'BTC',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc.test.mezo.org'],
      webSocket: [process.env.NEXT_PUBLIC_WSS_RPC_URL || 'wss://rpc-ws.test.mezo.org'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Mezo Explorer',
      url: process.env.NEXT_PUBLIC_EXPLORER_URL || 'https://explorer.test.mezo.org',
    },
  },
  testnet: true,
});

/**
 * Wagmi configuration supporting injected extensions and Mezo Safe App iframes
 */
export const wagmiConfig = createConfig({
  chains: [mezoTestnet],
  connectors: [injected(), safe()],
  transports: {
    [mezoTestnet.id]: http(process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc.test.mezo.org'),
  },
  ssr: true,
});

export const CANONICAL_MEZO_TESTNET_MUSD = '0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503' as const;
export const CANONICAL_SETTLEMENT_KERNEL_DEPLOY_BLOCK = 16281871n;
export const DEFAULT_INDEXER_CONFIRMATION_DEPTH = 2n;

/**
 * Verified contract addresses
 */
export const CONTRACT_ADDRESSES = {
  musd: (process.env.NEXT_PUBLIC_MUSD_ADDRESS || CANONICAL_MEZO_TESTNET_MUSD) as `0x${string}`,
  settlementKernel: (process.env.NEXT_PUBLIC_SETTLEMENT_KERNEL_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`,
  settlementKernelFactory: (process.env.NEXT_PUBLIC_SETTLEMENT_KERNEL_FACTORY_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`,
};

/**
 * Fail-closed network validation: returns true ONLY if connected to Mezo Testnet (31611)
 */
export function isSupportedNetwork(chainId: number | undefined | null): boolean {
  return chainId === MEZO_TESTNET_CHAIN_ID;
}

/**
 * Fail-closed configuration check for live mode operations.
 * Verifies chain ID, valid non-zero contract addresses, and token alignment.
 */
export function validateChainConfiguration(chainId?: number | null): {
  valid: boolean;
  isCanonicalMusd: boolean;
  error?: string;
} {
  if (chainId !== undefined && chainId !== null && !isSupportedNetwork(chainId)) {
    return {
      valid: false,
      isCanonicalMusd: false,
      error: `Unsupported network (chain ID ${chainId}). Please connect to Mezo Testnet (chain ID ${MEZO_TESTNET_CHAIN_ID}).`,
    };
  }

  const kernel = CONTRACT_ADDRESSES.settlementKernel;
  const musd = CONTRACT_ADDRESSES.musd;

  if (!kernel || kernel === '0x0000000000000000000000000000000000000000') {
    return {
      valid: false,
      isCanonicalMusd: false,
      error: 'SettlementKernel contract address is not configured. Live transactions are disabled.',
    };
  }

  if (!musd || musd === '0x0000000000000000000000000000000000000000') {
    return {
      valid: false,
      isCanonicalMusd: false,
      error: 'MUSD token address is not configured. Live settlements are disabled.',
    };
  }

  const isCanonicalMusd = musd.toLowerCase() === CANONICAL_MEZO_TESTNET_MUSD.toLowerCase();

  return {
    valid: true,
    isCanonicalMusd,
  };
}
