import { defineChain } from 'viem';
import { createConfig, http } from 'wagmi';
import { injected } from 'wagmi/connectors';

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
 * Wagmi configuration
 */
export const wagmiConfig = createConfig({
  chains: [mezoTestnet],
  connectors: [injected()],
  transports: {
    [mezoTestnet.id]: http(process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc.test.mezo.org'),
  },
  ssr: true,
});

/**
 * Verified contract addresses
 */
export const CONTRACT_ADDRESSES = {
  musd: (process.env.NEXT_PUBLIC_MUSD_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`,
  settlementKernel: (process.env.NEXT_PUBLIC_SETTLEMENT_KERNEL_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`,
};

/**
 * Fail-closed network validation: returns true ONLY if connected to Mezo Testnet (31611)
 */
export function isSupportedNetwork(chainId: number | undefined | null): boolean {
  return chainId === MEZO_TESTNET_CHAIN_ID;
}
