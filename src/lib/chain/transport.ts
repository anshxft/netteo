import { fallback, http, type Transport } from 'viem';

/**
 * Mezo's docs list mainnet RPCs from third-party providers and advise a dedicated provider for production
 * (rate limits). The primary can be set with NEXT_PUBLIC_MEZO_MAINNET_RPC_URL; the other providers Mezo
 * lists are kept as automatic fallbacks, so one provider throttling or going down does not take the app down.
 *
 * Literal process.env.NEXT_PUBLIC_* reads are required: Next.js only inlines variables it can see statically.
 */
export const MEZO_MAINNET_RPC_URLS: string[] = [
  process.env.NEXT_PUBLIC_MEZO_MAINNET_RPC_URL || 'https://mezo-mainnet.boar.network',
  'https://rpc_evm-mezo.imperator.co',
  'https://mainnet.mezo.public.validationcloud.io',
].filter((url, index, all) => all.indexOf(url) === index);

export function mezoTransport(): Transport {
  return fallback(MEZO_MAINNET_RPC_URLS.map((url) => http(url)), { rank: false });
}
