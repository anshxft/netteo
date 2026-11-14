import assert from 'node:assert/strict';
import { createPublicClient, erc20Abi, http, isAddress, getAddress } from 'viem';
import {
  CANONICAL_MEZO_TOKENS,
  SUPPORTED_SETTLEMENT_TOKENS,
  getTokenByAddress,
  getTokenBySymbol,
  requireTokenByAddress,
  isSupportedSettlementToken,
} from './tokens';
import { mezoMainnet, MEZO_MAINNET_CHAIN_ID } from './config';
import { mezoTransport } from './transport';

const entries = Object.entries(CANONICAL_MEZO_TOKENS);

// --- Structural checks (offline) ---

assert.ok(entries.length > 0, 'registry must not be empty');

for (const [key, token] of entries) {
  assert.equal(key, token.symbol, `registry key ${key} must match its symbol ${token.symbol}`);
  assert.ok(isAddress(token.address), `${key} address is not a valid address`);
  assert.equal(
    token.address,
    getAddress(token.address),
    `${key} address must be EIP-55 checksummed so string comparisons stay stable`
  );
  assert.ok(
    Number.isInteger(token.decimals) && token.decimals >= 0 && token.decimals <= 18,
    `${key} decimals must be an integer in 0..18`
  );
  assert.ok(token.name.length > 0 && token.description.length > 0, `${key} needs a name and description`);
}

// Catches the class of bug this file exists for: placeholder addresses like
// 0x0000...0002 that were previously shipped as mUSDC and mUSDT.
for (const [key, token] of entries) {
  const body = token.address.slice(2).toLowerCase();
  assert.ok(
    !/^0{30,}/.test(body),
    `${key} address ${token.address} looks like a placeholder, not a real deployment`
  );
}

const addresses = entries.map(([, t]) => t.address.toLowerCase());
assert.equal(new Set(addresses).size, addresses.length, 'two registry entries share an address');

// --- Lookup semantics ---

assert.equal(getTokenByAddress(CANONICAL_MEZO_TOKENS.MUSD.address)?.symbol, 'MUSD');
// Case-insensitive, because wallets and event logs return lowercase addresses.
assert.equal(getTokenByAddress(CANONICAL_MEZO_TOKENS.mUSDC.address.toLowerCase())?.symbol, 'mUSDC');
assert.equal(getTokenBySymbol('mUSDT')?.decimals, 6);

// An unknown token must never resolve to MUSD, or a cycle could be priced in one
// asset and settled in another.
assert.equal(getTokenByAddress('0x000000000000000000000000000000000000dEaD'), undefined);
assert.equal(getTokenByAddress(undefined), undefined);
assert.equal(getTokenBySymbol('NOPE'), undefined);
assert.throws(() => requireTokenByAddress('0x000000000000000000000000000000000000dEaD'), /verified Mezo registry/);

assert.equal(isSupportedSettlementToken(CANONICAL_MEZO_TOKENS.MUSD.address), true);
assert.equal(isSupportedSettlementToken('0x000000000000000000000000000000000000dEaD'), false);

// The settlement list must only contain registry members.
for (const token of SUPPORTED_SETTLEMENT_TOKENS) {
  assert.equal(getTokenByAddress(token.address)?.address, token.address);
}

// The decimal spread is the whole point of the registry: if every supported token
// had the same decimals, the 6-decimal code path would never be exercised.
const decimalSpread = new Set(SUPPORTED_SETTLEMENT_TOKENS.map((t) => t.decimals));
assert.ok(decimalSpread.size > 1, 'expected a mix of token decimals across supported tokens');

// --- Live verification against Mezo Mainnet ---

async function verifyOnChain() {
  if (process.env.SKIP_CHAIN_PROBE === '1') {
    console.log('tokens.test: SKIP_CHAIN_PROBE=1 set, skipping on-chain verification.');
    return;
  }

  const client = createPublicClient({ chain: mezoMainnet, transport: mezoTransport() });

  const chainId = await client.getChainId();
  assert.equal(chainId, MEZO_MAINNET_CHAIN_ID, "the RPC is not Mezo Mainnet");

  for (const [key, token] of entries) {
    const [decimals, symbol, code] = await Promise.all([
      client.readContract({ address: token.address, abi: erc20Abi, functionName: 'decimals' }),
      client.readContract({ address: token.address, abi: erc20Abi, functionName: 'symbol' }),
      client.getCode({ address: token.address }),
    ]);

    assert.ok(code && code !== '0x', `${key} ${token.address} has no contract code on Mezo Mainnet`);
    assert.equal(decimals, token.decimals, `${key} decimals: registry says ${token.decimals}, chain says ${decimals}`);
    assert.equal(symbol, token.symbol, `${key} symbol: registry says ${token.symbol}, chain says ${symbol}`);

    // supportsPermit gates one-click deposits, so it must reflect the chain, not a guess.
    const hasPermit = await client
      .readContract({
        address: token.address,
        abi: [{ type: 'function', name: 'DOMAIN_SEPARATOR', inputs: [], outputs: [{ type: 'bytes32' }], stateMutability: 'view' }] as const,
        functionName: 'DOMAIN_SEPARATOR',
      })
      .then(() => true)
      .catch(() => false);
    assert.equal(hasPermit, token.supportsPermit, `${key} supportsPermit: registry says ${token.supportsPermit}, chain says ${hasPermit}`);
  }

  console.log(`tokens.test: verified ${entries.length} token addresses, decimals and symbols on chain ${chainId}.`);
}

verifyOnChain()
  .then(() => console.log('Mezo token registry checks passed.'))
  .catch((err) => {
    console.error('Mezo token registry verification FAILED.');
    console.error(
      'If this is a network problem rather than a bad address, re-run with SKIP_CHAIN_PROBE=1 — but do not commit a registry that has never been verified.'
    );
    console.error(err);
    process.exit(1);
  });
