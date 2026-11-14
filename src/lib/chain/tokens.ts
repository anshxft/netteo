/**
 * Canonical token registry for Mezo Mainnet (Chain ID 31612).
 *
 * Every address and decimals value below was read from the chain via eth_call
 * against https://mezo-mainnet.boar.network. `tokens.test.ts` re-verifies them,
 * so a fabricated address cannot ship. Do not add an entry you have not probed.
 */

export interface TokenMetadata {
  address: `0x${string}`;
  symbol: string;
  name: string;
  decimals: number;
  /** True when the token answered EIP-2612 DOMAIN_SEPARATOR(); gates one-click permit deposits. */
  supportsPermit: boolean;
  description: string;
}

export const CANONICAL_MEZO_TOKENS: Record<string, TokenMetadata> = {
  MUSD: {
    address: '0xdD468A1DDc392dcdbEf6db6e34E89AA338F9F186',
    symbol: 'MUSD',
    name: 'Mezo USD',
    decimals: 18,
    supportsPermit: true,
    description: 'Canonical Mezo Mainnet USD stablecoin, minted against Bitcoin collateral',
  },
  mUSDC: {
    address: '0x04671C72Aab5AC02A03c1098314b1BB6B560c197',
    symbol: 'mUSDC',
    name: 'Bridged USDC',
    decimals: 6,
    supportsPermit: true,
    description: 'Circle USDC bridged to Mezo',
  },
  mUSDT: {
    address: '0xeB5a5d39dE4Ea42C2Aa6A57EcA2894376683bB8E',
    symbol: 'mUSDT',
    name: 'Bridged USDT',
    decimals: 6,
    supportsPermit: true,
    description: 'Tether USD bridged to Mezo',
  },
};

/**
 * Tokens Netteo will settle in. One SettlementKernel is deployed per token, so a
 * token only becomes selectable once its kernel address is configured and its
 * on-chain binding verifies.
 *
 * Deliberately excluded:
 * - BTC (0x7b7C...0000): precompile-backed native asset. `allowance()` reverts with
 *   a non-standard "owner address cannot be empty", so approve/transferFrom semantics
 *   need a dust-value test on mainnet before it can hold user funds.
 * - MEZO, mSolvBTC, mDAI, mUSDe and the other bridged assets: thin liquidity and
 *   untested transfer behaviour. Add one only after probing it.
 */
export const SUPPORTED_SETTLEMENT_TOKENS: TokenMetadata[] = [
  CANONICAL_MEZO_TOKENS.MUSD,
  CANONICAL_MEZO_TOKENS.mUSDC,
  CANONICAL_MEZO_TOKENS.mUSDT,
];

export const DEFAULT_SETTLEMENT_TOKEN = CANONICAL_MEZO_TOKENS.MUSD;

/**
 * Looks up a token by address. Returns undefined for anything not in the registry —
 * an unknown token must never be silently treated as MUSD, or a cycle would be
 * priced in one asset and settled in another.
 */
export function getTokenByAddress(address: string | undefined | null): TokenMetadata | undefined {
  if (!address) return undefined;
  const lower = address.toLowerCase();
  return Object.values(CANONICAL_MEZO_TOKENS).find((token) => token.address.toLowerCase() === lower);
}

export function getTokenBySymbol(symbol: string | undefined | null): TokenMetadata | undefined {
  if (!symbol) return undefined;
  return CANONICAL_MEZO_TOKENS[symbol];
}

/** Throws rather than guessing. Use where a missing token is a programming error. */
export function requireTokenByAddress(address: string | undefined | null): TokenMetadata {
  const token = getTokenByAddress(address);
  if (!token) {
    throw new Error('Unrecognised settlement token. Netteo only settles in tokens from its verified Mezo registry.');
  }
  return token;
}

export function isSupportedSettlementToken(address: string | undefined | null): boolean {
  if (!address) return false;
  const lower = address.toLowerCase();
  return SUPPORTED_SETTLEMENT_TOKENS.some((token) => token.address.toLowerCase() === lower);
}
