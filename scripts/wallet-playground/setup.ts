/**
 * Wallet playground, step 1: prepare a local fork of Mezo Mainnet with a funded test wallet.
 *
 * Nothing here touches the real chain. It uses anvil's own dev account (0xf39F...2266), which anvil can sign for,
 * and gives it what a real Mezo user would have: BTC for gas and collateral, a Bitcoin-backed MUSD loan, and MUSD
 * in the Savings Vault. Then you can drive the real Netteo UI against it (see README.md in this folder).
 *
 *   anvil --fork-url https://mezo-mainnet.boar.network --port 8547
 *   npx tsx scripts/wallet-playground/setup.ts
 */
import { createPublicClient, createWalletClient, erc20Abi, http, parseAbi, type Address } from 'viem';
import { mezoMainnet, MEZO_MAINNET_MUSD } from '../../src/lib/chain/config';
import { mezoTransport } from '../../src/lib/chain/transport';
import { buildWithdrawHints, readProtocolParams, readSavings, readTrove } from '../../src/lib/mezo/chain';
import { MEZO_PROTOCOL, priceFeedAbi, savingsVaultAbi } from '../../src/lib/mezo/protocol';

const FORK = process.env.FORK_URL ?? 'http://127.0.0.1:8547';
/** anvil's first dev account. Its key is public knowledge, so it must only ever be used on a local fork. */
export const TEST_WALLET: Address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

const ONE = 10n ** 18n;
// A fresh fork pulls state from the remote RPC on first use, so early transactions can take well over viem's 10s default.
const forkTransport = () => http(FORK, { timeout: 180_000 });
const fork = createPublicClient({ chain: mezoMainnet, transport: forkTransport() });
const live = createPublicClient({ chain: mezoMainnet, transport: mezoTransport() });
const rpc = (method: string, params: unknown[]) => fork.request({ method, params } as never);
const openTroveAbi = parseAbi(['function openTrove(uint256 _debtAmount, address _upperHint, address _lowerHint) payable']);

async function main() {
  if ((await fork.getChainId()) !== 31612) throw new Error('The fork is not Mezo Mainnet (chain 31612). Start anvil with --fork-url first.');

  // Mezo's price oracle is not plain EVM code, so it cannot run on a fork. Etch the live price in its place.
  const price = await live.readContract({ address: MEZO_PROTOCOL.priceFeed, abi: priceFeedAbi, functionName: 'fetchPrice' });
  await rpc('anvil_setCode', [MEZO_PROTOCOL.priceFeed, `0x7f${price.toString(16).padStart(64, '0')}60005260206000f3`]);
  await rpc('anvil_setBalance', [TEST_WALLET, '0x' + (1_000n * ONE).toString(16)]);

  const wallet = createWalletClient({ account: TEST_WALLET, chain: mezoMainnet, transport: forkTransport() });
  const send = async (hash: Promise<`0x${string}`>) => {
    const receipt = await fork.waitForTransactionReceipt({ hash: await hash });
    if (receipt.status !== 'success') throw new Error('A setup transaction reverted');
  };

  // A Bitcoin-backed loan: 1 BTC of collateral, 2,000 MUSD of debt (above Mezo's 1,800 MUSD minimum).
  const params = await readProtocolParams(fork);
  const debt = 2_000n * ONE;
  const totalDebt = debt + (debt * params.borrowingRate) / ONE + params.gasCompensation;
  const hints = await buildWithdrawHints(fork, ONE, totalDebt);
  await send(
    wallet.writeContract({
      address: MEZO_PROTOCOL.borrowerOperations,
      abi: openTroveAbi,
      functionName: 'openTrove',
      args: [debt, hints.upperHint, hints.lowerHint],
      value: ONE,
    })
  );

  // Put 700 MUSD in the Savings Vault, leaving the wallet with the rest.
  const saved = 700n * ONE;
  await send(wallet.writeContract({ address: MEZO_MAINNET_MUSD, abi: erc20Abi, functionName: 'approve', args: [MEZO_PROTOCOL.savingsVault, saved] }));
  await send(wallet.writeContract({ address: MEZO_PROTOCOL.savingsVault, abi: savingsVaultAbi, functionName: 'deposit', args: [saved] }));

  const [trove, savings, musd] = await Promise.all([
    readTrove(fork, TEST_WALLET),
    readSavings(fork, TEST_WALLET),
    fork.readContract({ address: MEZO_MAINNET_MUSD, abi: erc20Abi, functionName: 'balanceOf', args: [TEST_WALLET] }),
  ]);
  const f = (v: bigint) => (Number(v / 10n ** 14n) / 10_000).toLocaleString();
  console.log(`Test wallet ${TEST_WALLET} is ready on the fork:`);
  console.log(`  BTC price        $${Number(price / ONE).toLocaleString()} (the live price)`);
  console.log(`  Bitcoin loan     ${f(trove.coll)} BTC collateral, ${f(trove.debt)} MUSD debt`);
  console.log(`  Savings Vault    ${f(savings.balance)} MUSD`);
  console.log(`  Wallet           ${f(musd)} MUSD`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
