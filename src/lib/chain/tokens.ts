/**
 * Canonical Token Registry for Mezo Testnet (Matsnet, Chain ID 31611)
 * Adheres to Mezo developer documentation and Matsnet token allocations.
 */

export interface TokenMetadata {
  address: `0x${string}`;
  symbol: string;
  name: string;
  decimals: number;
  isCdpEligible: boolean; // Can be used as CDP collateral
  description: string;
}

export const CANONICAL_MEZO_TOKENS: Record<string, TokenMetadata> = {
  MUSD: {
    address: '0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503',
    symbol: 'MUSD',
    name: 'Mezo USD',
    decimals: 18,
    isCdpEligible: false,
    description: 'Mezo native USD-pegged stablecoin 100% backed by Bitcoin reserves',
  },
  tBTC: {
    address: '0x7b7C000000000000000000000000000000000000',
    symbol: 'tBTC',
    name: 'Mezo Bitcoin',
    decimals: 18,
    isCdpEligible: true,
    description: 'Decentralized 1:1 Bitcoin-backed token and primary Mezo CDP collateral asset',
  },
  mUSDC: {
    address: '0x0000000000000000000000000000000000000002',
    symbol: 'mUSDC',
    name: 'Bridged USDC',
    decimals: 6,
    isCdpEligible: false,
    description: 'Circle USDC bridged into the Mezo Layer 2 ecosystem',
  },
  mUSDT: {
    address: '0x0000000000000000000000000000000000000003',
    symbol: 'mUSDT',
    name: 'Bridged USDT',
    decimals: 6,
    isCdpEligible: false,
    description: 'Tether USD bridged into the Mezo Layer 2 ecosystem',
  },
};

export const SUPPORTED_SETTLEMENT_TOKENS: TokenMetadata[] = [
  CANONICAL_MEZO_TOKENS.MUSD,
  CANONICAL_MEZO_TOKENS.tBTC,
  CANONICAL_MEZO_TOKENS.mUSDC,
];

export function getTokenByAddress(address: string | undefined): TokenMetadata {
  if (!address) return CANONICAL_MEZO_TOKENS.MUSD;
  const lower = address.toLowerCase();
  for (const token of Object.values(CANONICAL_MEZO_TOKENS)) {
    if (token.address.toLowerCase() === lower) {
      return token;
    }
  }
  return CANONICAL_MEZO_TOKENS.MUSD;
}

export function getTokenBySymbol(symbol: string | undefined): TokenMetadata {
  if (!symbol) return CANONICAL_MEZO_TOKENS.MUSD;
  return CANONICAL_MEZO_TOKENS[symbol] || CANONICAL_MEZO_TOKENS.MUSD;
}
