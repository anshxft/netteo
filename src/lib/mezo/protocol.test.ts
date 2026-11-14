import assert from 'node:assert/strict';
import { createPublicClient, getAddress, http } from 'viem';
import { MEZO_MAINNET_MUSD, mezoMainnet, MEZO_MAINNET_RPC_URL } from '../chain/config';
import { readProtocolParams } from './chain';
import { MEZO_PROTOCOL, savingsVaultAbi } from './protocol';

// --- Structural checks (offline) ---
const entries = Object.entries(MEZO_PROTOCOL);
for (const [name, address] of entries) {
  assert.equal(address, getAddress(address), `${name} must be EIP-55 checksummed`);
  assert.ok(!/^0{30,}/.test(address.slice(2)), `${name} looks like a placeholder address`);
}
assert.equal(new Set(entries.map(([, a]) => a.toLowerCase())).size, entries.length, 'two protocol entries share an address');

// --- Live checks: a wrong address must fail CI, not production ---
if (process.env.SKIP_CHAIN_PROBE === '1') {
  console.log('Mezo protocol address checks passed (live chain probe skipped).');
  process.exit(0);
}

async function probe() {
  const client = createPublicClient({ chain: mezoMainnet, transport: http(MEZO_MAINNET_RPC_URL) });

  for (const [name, address] of entries) {
    const code = await client.getCode({ address });
    assert.ok(code && code.length > 2, `${name} (${address}) has no code on Mezo Mainnet`);
  }

  const params = await readProtocolParams(client);
  assert.ok(params.minNetDebt > 0n, 'minNetDebt must be positive');
  assert.ok(params.borrowingRate > 0n && params.borrowingRate <= 10n ** 17n, 'issuance fee must be between 0 and 10%');
  assert.ok(params.mcr >= 10n ** 18n, 'MCR must be at least 100%');
  // Sanity band for the BTC price: catches a feed returning wrong decimals.
  assert.ok(params.price > 1_000n * 10n ** 18n && params.price < 1_000_000n * 10n ** 18n, 'BTC price outside a sane range');

  const bound = await client.readContract({ address: MEZO_PROTOCOL.savingsVault, abi: savingsVaultAbi, functionName: 'musdToken' });
  assert.equal(bound.toLowerCase(), MEZO_MAINNET_MUSD.toLowerCase(), 'the Savings Vault must be bound to canonical MUSD');
}

probe()
  .then(() => console.log('Mezo protocol address and parameter checks passed (live chain).'))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
