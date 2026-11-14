import assert from 'node:assert/strict';
import { createPublicClient, createWalletClient, erc20Abi, http, type Address } from 'viem';
import { mezoMainnet, MEZO_MAINNET_MUSD } from '../chain/config';
import { NETTEO_MIN_ICR, ONE, borrowingFee, computeIcr, planBorrow } from './borrow';
import { buildWithdrawHints, readProtocolParams, readSavings, readTrove } from './chain';
import { MEZO_PROTOCOL, borrowerOperationsAbi, priceFeedAbi, savingsVaultAbi, troveManagerAbi } from './protocol';

/**
 * Executes the borrowing and savings paths against REAL mainnet contract state on a local fork.
 * Skipped unless MEZO_MAINNET_FORK_URL points at an anvil fork (nothing here touches mainnet):
 *
 *   anvil --fork-url https://mezo-mainnet.boar.network --port 8547
 *   MEZO_MAINNET_FORK_URL=http://127.0.0.1:8547 npx tsx src/lib/mezo/fork.test.ts
 */
const FORK = process.env.MEZO_MAINNET_FORK_URL;
if (!FORK) {
  console.log('Mezo fork checks skipped (set MEZO_MAINNET_FORK_URL to an anvil fork of Mezo Mainnet).');
  process.exit(0);
}

// Two of the four troves that exist on mainnet. One is very healthy, one sits close to liquidation.
const HEALTHY: Address = '0x593c427d8C7bf5C555Ed41cd7CB7cCe8C9F15bB5';
const FRAGILE: Address = '0xA7F5Dc5955a599524A28DFf21389D88c49DBf738';

const pub = createPublicClient({ chain: mezoMainnet, transport: http(FORK) });
const live = createPublicClient({
  chain: mezoMainnet,
  transport: http(process.env.MEZO_LIVE_RPC_URL ?? 'https://mainnet.mezo.public.validationcloud.io'),
});
const rpc = (method: string, params: unknown[]) => pub.request({ method, params } as never);

async function actAs(account: Address) {
  await rpc('anvil_impersonateAccount', [account]);
  await rpc('anvil_setBalance', [account, '0x56BC75E2D63100000']); // 100 BTC for gas
  return createWalletClient({ account, chain: mezoMainnet, transport: http(FORK) });
}
const musdOf = (a: Address) =>
  pub.readContract({ address: MEZO_MAINNET_MUSD, abi: erc20Abi, functionName: 'balanceOf', args: [a] });

/**
 * Mezo's oracle is not plain EVM code, so PriceFeed.fetchPrice() reverts on a fork. Read the real price from the
 * live chain and etch a one-line stub at the oracle address. Every other contract here (BorrowerOperations,
 * TroveManager, SortedTroves, HintHelpers, the Savings Vault, MUSD) still runs its genuine mainnet code.
 */
async function stubOracleWithLivePrice() {
  const price = await live.readContract({ address: MEZO_PROTOCOL.priceFeed, abi: priceFeedAbi, functionName: 'fetchPrice' });
  // PUSH32 price, PUSH1 0, MSTORE, PUSH1 32, PUSH1 0, RETURN
  const code = `0x7f${price.toString(16).padStart(64, '0')}60005260206000f3`;
  await rpc('anvil_setCode', [MEZO_PROTOCOL.priceFeed, code]);
  return price;
}

async function main() {
  const livePrice = await stubOracleWithLivePrice();
  const params = await readProtocolParams(pub);
  assert.equal(params.price, livePrice, 'the fork must serve the real mainnet price');
  assert.equal(params.minNetDebt, 1800n * ONE, 'minNetDebt must still be 1,800 MUSD');
  assert.equal(params.borrowingRate, 10n ** 15n, 'issuance fee must still be 0.1%');
  assert.equal(params.mcr, (ONE * 110n) / 100n);
  assert.equal(params.recoveryMode, false);
  console.log(`  params: price=$${Number(params.price / ONE)}, fee=${params.borrowingRate}, rate=${params.interestRateBps}bps`);

  // 1. Our ratio matches the protocol's own, for both real troves.
  for (const owner of [HEALTHY, FRAGILE]) {
    const t = await readTrove(pub, owner);
    const onChain = await pub.readContract({
      address: MEZO_PROTOCOL.troveManager,
      abi: troveManagerAbi,
      functionName: 'getCurrentICR',
      args: [owner, params.price],
    });
    assert.equal(computeIcr(t.coll, params.price, t.debt), onChain, `ICR for ${owner} must equal TroveManager.getCurrentICR`);
  }

  // 2. A wallet with no trove is reported as such.
  assert.equal((await readTrove(pub, '0xb31B137c24e5f020bF07D93BBa99DAf950908a9e')).status, 0);

  // 3. Real borrow on the healthy trove: our plan and hints, executed by the real BorrowerOperations.
  const before = await readTrove(pub, HEALTHY);
  const amount = 500n * ONE;
  const plan = planBorrow(amount, before, params);
  assert.equal(plan.kind, 'ok');
  if (plan.kind !== 'ok') return;

  const hints = await buildWithdrawHints(pub, before.coll, plan.newDebt);
  const wallet = await actAs(HEALTHY);
  const musdBefore = await musdOf(HEALTHY);

  const { request } = await pub.simulateContract({
    account: HEALTHY,
    address: MEZO_PROTOCOL.borrowerOperations,
    abi: borrowerOperationsAbi,
    functionName: 'withdrawMUSD',
    args: [amount, hints.upperHint, hints.lowerHint],
  });
  const hash = await wallet.writeContract(request);
  const receipt = await pub.waitForTransactionReceipt({ hash });
  assert.equal(receipt.status, 'success', 'withdrawMUSD must succeed with our hints');

  const musdAfter = await musdOf(HEALTHY);
  assert.equal(musdAfter - musdBefore, amount, 'the wallet must receive exactly the amount, the fee goes to the debt');
  const after = await readTrove(pub, HEALTHY);
  const debtIncrease = after.debt - before.debt;
  const expected = amount + borrowingFee(amount, params.borrowingRate);
  // Interest keeps accruing between reads, so allow a small positive drift and nothing below the expected rise.
  assert.ok(debtIncrease >= expected, `debt must rise by at least amount + fee (${debtIncrease} vs ${expected})`);
  assert.ok(debtIncrease - expected < ONE, 'debt rise must be within 1 MUSD of amount + fee (accrued interest only)');
  assert.ok(computeIcr(after.coll, params.price, after.debt) >= NETTEO_MIN_ICR, 'healthy trove stays above the floor');
  console.log(`  borrow: +${amount / ONE} MUSD received, debt +${debtIncrease} (fee ${plan.fee})`);

  // 4. The fragile trove: Netteo refuses, and Mezo itself would revert, so our policy is stricter than the backstop.
  const fragile = await readTrove(pub, FRAGILE);
  const refusal = planBorrow(2000n * ONE, fragile, params);
  assert.equal(refusal.kind, 'unsafe');
  const fragileHints = await buildWithdrawHints(pub, fragile.coll, fragile.debt + 2000n * ONE);
  await assert.rejects(
    pub.simulateContract({
      account: FRAGILE,
      address: MEZO_PROTOCOL.borrowerOperations,
      abi: borrowerOperationsAbi,
      functionName: 'withdrawMUSD',
      args: [2000n * ONE, fragileHints.upperHint, fragileHints.lowerHint],
    }),
    'the protocol must also reject a borrow that breaches its own minimum ratio'
  );

  // 5. Savings Vault: deposit then withdraw real MUSD against the real vault.
  const vault = MEZO_PROTOCOL.savingsVault;
  assert.equal(
    (await pub.readContract({ address: vault, abi: savingsVaultAbi, functionName: 'musdToken' })).toLowerCase(),
    MEZO_MAINNET_MUSD.toLowerCase(),
    'the vault must be bound to canonical MUSD'
  );
  const dep = 100n * ONE;
  const s0 = await readSavings(pub, HEALTHY);
  const m0 = await musdOf(HEALTHY);
  await pub.waitForTransactionReceipt({
    hash: await wallet.writeContract({ address: MEZO_MAINNET_MUSD, abi: erc20Abi, functionName: 'approve', args: [vault, dep] }),
  });
  await pub.waitForTransactionReceipt({
    hash: await wallet.writeContract({ address: vault, abi: savingsVaultAbi, functionName: 'deposit', args: [dep] }),
  });
  const s1 = await readSavings(pub, HEALTHY);
  assert.equal(s1.balance - s0.balance, dep, 'deposit mints sMUSD 1:1');
  assert.equal(m0 - (await musdOf(HEALTHY)), dep, 'deposit pulls exactly the MUSD amount');

  await pub.waitForTransactionReceipt({
    hash: await wallet.writeContract({ address: vault, abi: savingsVaultAbi, functionName: 'withdraw', args: [dep] }),
  });
  const s2 = await readSavings(pub, HEALTHY);
  assert.equal(s2.balance, s0.balance, 'withdraw burns the sMUSD');
  assert.equal(await musdOf(HEALTHY), m0, 'withdraw returns the MUSD');
  console.log(`  savings: deposit and withdraw ${dep / ONE} MUSD round-trip, claimable yield ${s2.claimableYield}`);
}

main()
  .then(() => console.log('Mezo fork checks passed (real mainnet contract state).'))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
