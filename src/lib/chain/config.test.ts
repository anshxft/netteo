import assert from 'node:assert/strict';

async function main() {
  // config.ts reads NEXT_PUBLIC_* at import time, so set the environment first and import after.
  // Mixed state on purpose: mUSDC has a kernel configured, MUSD and mUSDT do not.
  const MUSDC_KERNEL = '0x2222222222222222222222222222222222222222';
  delete process.env.NEXT_PUBLIC_SETTLEMENT_KERNEL_ADDRESS;
  delete process.env.NEXT_PUBLIC_SETTLEMENT_KERNEL_MUSD;
  delete process.env.NEXT_PUBLIC_SETTLEMENT_KERNEL_MUSDT;
  process.env.NEXT_PUBLIC_SETTLEMENT_KERNEL_MUSDC = MUSDC_KERNEL;

  const config = await import('./config');
  const { CANONICAL_MEZO_TOKENS } = await import('./tokens');
  const {
    CONTRACT_ADDRESSES,
    MEZO_MAINNET_CHAIN_ID,
    MEZO_MAINNET_MUSD,
    ZERO_ADDRESS,
    isSupportedNetwork,
    isDeployed,
    kernelForToken,
    liveSettlementTokens,
    validateChainConfiguration,
    REFUND_GRACE_SECONDS,
  } = config;

  // The app tells users when a stuck cycle becomes refundable, so its grace period must equal the contract's.
  const { readFileSync } = await import('node:fs');
  const source = readFileSync('contracts/SettlementKernel.sol', 'utf8');
  const grace = /REFUND_GRACE\s*=\s*(\d+)\s*days/.exec(source);
  assert.ok(grace, 'REFUND_GRACE not found in SettlementKernel.sol');
  assert.equal(REFUND_GRACE_SECONDS, Number(grace![1]) * 24 * 60 * 60, 'app and contract grace periods must match');

  const MUSD = CANONICAL_MEZO_TOKENS.MUSD.address;
  const MUSDC = CANONICAL_MEZO_TOKENS.mUSDC.address;
  const MUSDT = CANONICAL_MEZO_TOKENS.mUSDT.address;
  const UNKNOWN = '0x000000000000000000000000000000000000dEaD';

  // --- Network ---
  assert.equal(MEZO_MAINNET_CHAIN_ID, 31612);
  assert.equal(CONTRACT_ADDRESSES.musd, MEZO_MAINNET_MUSD);
  assert.equal(MEZO_MAINNET_MUSD, MUSD, 'canonical MUSD constant must come from the verified registry');
  assert.equal(isSupportedNetwork(31612), true);
  assert.equal(isSupportedNetwork(31611), false, 'testnet must not be accepted as mainnet');
  assert.equal(isSupportedNetwork(undefined), false);

  // --- isDeployed ---
  assert.equal(isDeployed(ZERO_ADDRESS), false);
  assert.equal(isDeployed(undefined), false);
  assert.equal(isDeployed(MUSDC_KERNEL), true);

  // --- Kernel resolution is per token ---
  assert.equal(kernelForToken(MUSDC), MUSDC_KERNEL);
  assert.equal(kernelForToken(MUSDC.toLowerCase()), MUSDC_KERNEL, 'lookup must be case-insensitive');
  assert.equal(kernelForToken(MUSD), null, 'MUSD has no kernel configured, so it must not borrow another token\'s');
  assert.equal(kernelForToken(MUSDT), null);
  assert.equal(kernelForToken(UNKNOWN), null, 'a token outside the registry never resolves to a kernel');
  assert.equal(kernelForToken(undefined), null);
  assert.equal(kernelForToken(ZERO_ADDRESS), null);

  // Only deployed tokens are offered for live settlement.
  assert.deepEqual(
    liveSettlementTokens().map((t) => t.symbol),
    ['mUSDC']
  );

  // --- validateChainConfiguration fails closed, per token ---
  const wrongChain = validateChainConfiguration(31611, MUSDC);
  assert.equal(wrongChain.valid, false);
  assert.match(wrongChain.error!, /Unsupported network/);

  const deployed = validateChainConfiguration(31612, MUSDC);
  assert.equal(deployed.valid, true);
  assert.equal(deployed.kernel, MUSDC_KERNEL);
  assert.equal(deployed.token?.symbol, 'mUSDC');
  assert.equal(deployed.isCanonicalMusd, false, 'mUSDC is not MUSD');

  const undeployed = validateChainConfiguration(31612, MUSD);
  assert.equal(undeployed.valid, false);
  assert.match(undeployed.error!, /No SettlementKernel is deployed for MUSD/);
  assert.equal(undeployed.isCanonicalMusd, true);

  // Omitting the token means "MUSD", the default settlement asset.
  assert.equal(validateChainConfiguration(31612).valid, false);
  assert.match(validateChainConfiguration(31612).error!, /MUSD/);

  const unknown = validateChainConfiguration(31612, UNKNOWN);
  assert.equal(unknown.valid, false);
  assert.match(unknown.error!, /verified Mezo registry/);
  assert.equal(unknown.kernel, undefined, 'an invalid configuration must never carry a kernel address');

  console.log('Mainnet chain, token registry and per-token kernel configuration checks passed.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
