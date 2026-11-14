import { defineChain } from 'viem';
import { createConfig } from 'wagmi';
import { injected, safe } from 'wagmi/connectors';
import { mezoTransport } from './transport';
import {
  CANONICAL_MEZO_TOKENS,
  SUPPORTED_SETTLEMENT_TOKENS,
  getTokenByAddress,
  type TokenMetadata,
} from './tokens';

export const MEZO_MAINNET_CHAIN_ID = 31612;
export const MEZO_MAINNET_MUSD = CANONICAL_MEZO_TOKENS.MUSD.address;
export const MEZO_MAINNET_RPC_URL = process.env.NEXT_PUBLIC_MEZO_MAINNET_RPC_URL || 'https://mezo-mainnet.boar.network';
export const MEZO_MAINNET_WSS_RPC_URL = process.env.NEXT_PUBLIC_MEZO_MAINNET_WSS_RPC_URL || 'wss://mezo-mainnet.boar.network';
export const MEZO_MAINNET_EXPLORER_URL = process.env.NEXT_PUBLIC_MEZO_MAINNET_EXPLORER_URL || 'https://explorer.mezo.org';
export const CANONICAL_SETTLEMENT_KERNEL_DEPLOY_BLOCK = BigInt(
  process.env.NEXT_PUBLIC_SETTLEMENT_KERNEL_DEPLOY_BLOCK || '0'
);
export const DEFAULT_INDEXER_CONFIRMATION_DEPTH = 2n;

/** Mirrors SettlementKernel.REFUND_GRACE. config.test.ts checks it against the contract source so they cannot drift. */
export const REFUND_GRACE_SECONDS = 3 * 24 * 60 * 60;

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;

export const mezoMainnet = defineChain({
  id: MEZO_MAINNET_CHAIN_ID,
  name: 'Mezo Mainnet',
  nativeCurrency: { name: 'Bitcoin', symbol: 'BTC', decimals: 18 },
  rpcUrls: {
    default: {
      http: [MEZO_MAINNET_RPC_URL],
      webSocket: [MEZO_MAINNET_WSS_RPC_URL],
    },
  },
  blockExplorers: { default: { name: 'Mezo Explorer', url: MEZO_MAINNET_EXPLORER_URL } },
});

export const wagmiConfig = createConfig({
  chains: [mezoMainnet],
  connectors: [injected(), safe()],
  // Several providers with automatic fallback, so one throttling or going down does not take the app down.
  transports: { [mezoMainnet.id]: mezoTransport() },
  ssr: true,
});

/**
 * One SettlementKernel is deployed per settlement token, each with an immutable
 * token binding, so a cycle in one asset can never touch another asset's funds.
 * All kernels come from SettlementKernelFactory, which is the on-chain registry
 * auditors can read with getSupportedTokens().
 *
 * These must be written as literal process.env.NEXT_PUBLIC_* reads: Next.js only
 * inlines public env vars it can see statically, so process.env[name] would be
 * undefined in the browser bundle.
 */
export const SETTLEMENT_KERNEL_ADDRESSES: Record<string, `0x${string}`> = {
  MUSD: (process.env.NEXT_PUBLIC_SETTLEMENT_KERNEL_MUSD ||
    // Back-compat with the original single-asset deployment variable.
    process.env.NEXT_PUBLIC_SETTLEMENT_KERNEL_ADDRESS ||
    ZERO_ADDRESS) as `0x${string}`,
  mUSDC: (process.env.NEXT_PUBLIC_SETTLEMENT_KERNEL_MUSDC || ZERO_ADDRESS) as `0x${string}`,
  mUSDT: (process.env.NEXT_PUBLIC_SETTLEMENT_KERNEL_MUSDT || ZERO_ADDRESS) as `0x${string}`,
};

export const CONTRACT_ADDRESSES = {
  musd: MEZO_MAINNET_MUSD,
  /** The MUSD kernel. Kept for display surfaces (footer, docs, explorer links). */
  settlementKernel: SETTLEMENT_KERNEL_ADDRESSES.MUSD,
  settlementKernelFactory: (process.env.NEXT_PUBLIC_SETTLEMENT_KERNEL_FACTORY_ADDRESS || ZERO_ADDRESS) as `0x${string}`,
};

export function isSupportedNetwork(chainId: number | undefined | null): boolean {
  return chainId === MEZO_MAINNET_CHAIN_ID;
}

export function isDeployed(address: string | undefined | null): boolean {
  return !!address && address.toLowerCase() !== ZERO_ADDRESS;
}

/**
 * Resolves the kernel that settles a given token. Returns null when the token is
 * not in the verified registry or its kernel has not been deployed and configured,
 * so callers fail closed instead of writing to address zero.
 */
export function kernelForToken(tokenAddress: string | undefined | null): `0x${string}` | null {
  const token = getTokenByAddress(tokenAddress);
  if (!token) return null;
  const kernel = SETTLEMENT_KERNEL_ADDRESSES[token.symbol];
  return isDeployed(kernel) ? kernel : null;
}

/** Supported tokens whose kernel address is configured. Empty until something is deployed. */
export function liveSettlementTokens(): TokenMetadata[] {
  return SUPPORTED_SETTLEMENT_TOKENS.filter((token) => kernelForToken(token.address) !== null);
}

export interface ChainConfigurationResult {
  valid: boolean;
  /** Retained for existing callers: true when the resolved token is canonical MUSD. */
  isCanonicalMusd: boolean;
  token?: TokenMetadata;
  kernel?: `0x${string}`;
  error?: string;
}

/**
 * Fails closed. A token is settleable only when the chain matches, the token is in
 * the verified registry, and a kernel is configured for exactly that token.
 * The kernel's on-chain `musdToken()` binding is checked separately at call time,
 * because config alone cannot prove what a deployed contract holds.
 */
export function validateChainConfiguration(
  chainId?: number | null,
  tokenAddress?: string | null
): ChainConfigurationResult {
  if (chainId !== undefined && chainId !== null && !isSupportedNetwork(chainId)) {
    return {
      valid: false,
      isCanonicalMusd: false,
      error: `Unsupported network (chain ID ${chainId}). Please connect to Mezo Mainnet (chain ID ${MEZO_MAINNET_CHAIN_ID}).`,
    };
  }

  const requested = tokenAddress ?? MEZO_MAINNET_MUSD;
  const token = getTokenByAddress(requested);
  if (!token) {
    return {
      valid: false,
      isCanonicalMusd: false,
      error: 'That settlement token is not in Netteo’s verified Mezo registry. Live transactions are disabled.',
    };
  }

  const isCanonicalMusd = token.address.toLowerCase() === MEZO_MAINNET_MUSD.toLowerCase();

  const kernel = kernelForToken(token.address);
  if (!kernel) {
    return {
      valid: false,
      isCanonicalMusd,
      token,
      error: `No SettlementKernel is deployed for ${token.symbol} on Mezo Mainnet yet. ${token.symbol} settlements are disabled.`,
    };
  }

  return { valid: true, isCanonicalMusd, token, kernel };
}
