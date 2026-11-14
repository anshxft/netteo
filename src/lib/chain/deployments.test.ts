import assert from 'node:assert/strict';
import { createPublicClient, getAddress, http, parseAbi } from 'viem';
import { mezoMainnet } from './config';
import { mezoTransport } from './transport';
import { CANONICAL_MEZO_TOKENS } from './tokens';
import { MEZO_PROTOCOL } from '../mezo/protocol';
import { SAVINGS_ROUND_TRIP, SETTLED_CYCLES, TEST_WALLETS, V1_DEPLOYMENT, V2_DEPLOYMENT } from './deployments';

// --- Structural checks (offline) ---
const addresses: Record<string, string> = {
  'v2 factory': V2_DEPLOYMENT.factory,
  ...Object.fromEntries(Object.entries(V2_DEPLOYMENT.kernels).map(([k, a]) => [`v2 ${k} kernel`, a])),
  'v1 factory': V1_DEPLOYMENT.factory,
  ...Object.fromEntries(Object.entries(V1_DEPLOYMENT.kernels).map(([k, a]) => [`v1 ${k} kernel`, a])),
  ...TEST_WALLETS,
};
for (const [name, a] of Object.entries(addresses)) assert.equal(a, getAddress(a), `${name} must be EIP-55 checksummed`);
assert.equal(new Set(Object.values(addresses).map((a) => a.toLowerCase())).size, Object.keys(addresses).length, 'two deployments share an address');

const hashes = [
  ...V2_DEPLOYMENT.txs.map((t) => t.hash),
  ...SETTLED_CYCLES.flatMap((c) => c.txs.map((t) => t.hash)),
  ...SAVINGS_ROUND_TRIP.txs.map((t) => t.hash),
];
for (const h of hashes) assert.match(h, /^0x[0-9a-f]{64}$/, `bad transaction hash ${h}`);
assert.equal(new Set(hashes).size, hashes.length, 'a transaction hash appears twice');

if (process.env.SKIP_CHAIN_PROBE === '1') {
  console.log('Deployment record structural checks passed (live chain probe skipped).');
  process.exit(0);
}

// --- Live checks: every value the docs and landing page show must be true on Mezo Mainnet ---
const kernelAbi = parseAbi([
  'function musdToken() view returns (address)',
  'function REFUND_GRACE() view returns (uint256)',
  'function getCycle(bytes32) view returns (bytes32,string,uint256,uint256,uint256,uint256,uint256,uint256,uint8,address)',
]);
const factoryAbi = parseAbi(['function getKernel(address) view returns (address)', 'function getSupportedTokenCount() view returns (uint256)']);

async function probe() {
  const client = createPublicClient({ chain: mezoMainnet, transport: mezoTransport() });

  for (const [name, address] of Object.entries(addresses)) {
    if (name in TEST_WALLETS) continue;
    const code = await client.getCode({ address: address as `0x${string}` });
    assert.ok(code && code.length > 2, `${name} (${address}) has no code on Mezo Mainnet`);
  }

  // Each v2 kernel is bound to its own canonical token, and the factory agrees.
  assert.equal(await client.readContract({ address: V2_DEPLOYMENT.factory, abi: factoryAbi, functionName: 'getSupportedTokenCount' }), 3n);
  for (const [symbol, kernel] of Object.entries(V2_DEPLOYMENT.kernels)) {
    const token = CANONICAL_MEZO_TOKENS[symbol as keyof typeof CANONICAL_MEZO_TOKENS].address;
    const bound = await client.readContract({ address: kernel, abi: kernelAbi, functionName: 'musdToken' });
    assert.equal(bound.toLowerCase(), token.toLowerCase(), `v2 ${symbol} kernel must be bound to ${symbol}`);
    const registered = await client.readContract({ address: V2_DEPLOYMENT.factory, abi: factoryAbi, functionName: 'getKernel', args: [token] });
    assert.equal(registered.toLowerCase(), kernel.toLowerCase(), `factory must list the ${symbol} kernel`);
  }
  assert.equal(await client.readContract({ address: V2_DEPLOYMENT.kernels.MUSD, abi: kernelAbi, functionName: 'REFUND_GRACE' }), 259200n);

  // Both recorded cycles are Completed with exactly the amounts the docs state.
  for (const cycle of SETTLED_CYCLES) {
    const [, , gross, net, funded, distributed, refunded, , state] = await client.readContract({
      address: cycle.kernel as `0x${string}`,
      abi: kernelAbi,
      functionName: 'getCycle',
      args: [cycle.id],
    });
    assert.equal(state, 3, `${cycle.label}: state must be Completed`);
    assert.equal(gross, cycle.grossUnits, `${cycle.label}: gross`);
    assert.equal(net, cycle.netUnits, `${cycle.label}: net`);
    assert.equal(funded, cycle.netUnits, `${cycle.label}: funded`);
    assert.equal(distributed, cycle.netUnits, `${cycle.label}: distributed`);
    assert.equal(refunded, 0n, `${cycle.label}: refunded`);
  }

  // Every transaction exists, succeeded, and sits in the block we say it does.
  const all = [
    ...V2_DEPLOYMENT.txs,
    ...SETTLED_CYCLES.flatMap((c) => c.txs),
    ...SAVINGS_ROUND_TRIP.txs,
  ];
  for (const tx of all) {
    const receipt = await client.getTransactionReceipt({ hash: tx.hash });
    assert.equal(receipt.status, 'success', `${tx.name} ${tx.hash} must have succeeded`);
    assert.equal(Number(receipt.blockNumber), tx.block, `${tx.name} ${tx.hash} block number`);
  }

  // Protocol contracts the docs list for Mezo's own products.
  for (const [name, address] of Object.entries(MEZO_PROTOCOL)) {
    const code = await client.getCode({ address });
    assert.ok(code && code.length > 2, `${name} has no code`);
  }
}

probe()
  .then(() => console.log('Deployment record checks passed against Mezo Mainnet (addresses, bindings, cycles, transactions).'))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
