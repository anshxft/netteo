import assert from 'node:assert/strict';

async function main() {
  // The primary provider is dead. Reads must still succeed through the fallbacks Mezo lists.
  process.env.NEXT_PUBLIC_MEZO_MAINNET_RPC_URL = 'http://127.0.0.1:9';
  const { MEZO_MAINNET_RPC_URLS, mezoTransport } = await import('./transport');
  const { createPublicClient } = await import('viem');

  assert.equal(MEZO_MAINNET_RPC_URLS[0], 'http://127.0.0.1:9', 'the configured primary comes first');
  assert.ok(MEZO_MAINNET_RPC_URLS.length >= 3, 'at least two fallback providers are configured');
  assert.equal(new Set(MEZO_MAINNET_RPC_URLS).size, MEZO_MAINNET_RPC_URLS.length, 'no duplicate providers');
  console.log('Fallback list configured:', MEZO_MAINNET_RPC_URLS.length, 'providers.');

  if (process.env.SKIP_CHAIN_PROBE === '1') {
    console.log('SKIP_CHAIN_PROBE=1 set, skipping the live fallback check.');
    return;
  }

  const client = createPublicClient({ transport: mezoTransport() });
  const chainId = await client.getChainId();
  assert.equal(chainId, 31612, 'reads must reach Mezo Mainnet even when the primary RPC is down');
  console.log('Fallback transport reached chain', chainId, 'with the primary RPC down.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
