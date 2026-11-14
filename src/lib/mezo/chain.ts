import { erc20Abi, type Address, type PublicClient } from 'viem';
import { hintTrials, type ProtocolParams, type TroveSnapshot } from './borrow';
import {
  MEZO_PROTOCOL,
  borrowerOperationsAbi,
  hintHelpersAbi,
  interestRateManagerAbi,
  priceFeedAbi,
  savingsVaultAbi,
  sortedTrovesAbi,
  troveManagerAbi,
} from './protocol';

/**
 * Reads from Mezo's protocol contracts. Every function takes a viem client, so the same code runs against the
 * live RPC in the app, a local fork in tests, and a read-only probe in CI.
 */

export async function readProtocolParams(client: PublicClient): Promise<ProtocolParams> {
  const price = await client.readContract({ address: MEZO_PROTOCOL.priceFeed, abi: priceFeedAbi, functionName: 'fetchPrice' });
  const [borrowingRate, minNetDebt, mcr, gasCompensation, interestRateBps, recoveryMode] = await Promise.all([
    client.readContract({ address: MEZO_PROTOCOL.borrowerOperations, abi: borrowerOperationsAbi, functionName: 'borrowingRate' }),
    client.readContract({ address: MEZO_PROTOCOL.borrowerOperations, abi: borrowerOperationsAbi, functionName: 'minNetDebt' }),
    client.readContract({ address: MEZO_PROTOCOL.troveManager, abi: troveManagerAbi, functionName: 'MCR' }),
    client.readContract({ address: MEZO_PROTOCOL.troveManager, abi: troveManagerAbi, functionName: 'MUSD_GAS_COMPENSATION' }),
    client.readContract({ address: MEZO_PROTOCOL.interestRateManager, abi: interestRateManagerAbi, functionName: 'interestRate' }),
    client.readContract({ address: MEZO_PROTOCOL.troveManager, abi: troveManagerAbi, functionName: 'checkRecoveryMode', args: [price] }),
  ]);
  return { price, borrowingRate, minNetDebt, mcr, gasCompensation, interestRateBps: Number(interestRateBps), recoveryMode };
}

export async function readTrove(client: PublicClient, owner: Address): Promise<TroveSnapshot> {
  const status = await client.readContract({
    address: MEZO_PROTOCOL.troveManager,
    abi: troveManagerAbi,
    functionName: 'getTroveStatus',
    args: [owner],
  });
  if (status !== 1) return { status, coll: 0n, debt: 0n, interestRateBps: 0 };

  const [entire, rate] = await Promise.all([
    client.readContract({ address: MEZO_PROTOCOL.troveManager, abi: troveManagerAbi, functionName: 'getEntireDebtAndColl', args: [owner] }),
    client.readContract({ address: MEZO_PROTOCOL.troveManager, abi: troveManagerAbi, functionName: 'getTroveInterestRate', args: [owner] }),
  ]);
  const [coll, principal, interest, pendingCollateral, pendingPrincipal, pendingInterest] = entire;
  return {
    status,
    coll: coll + pendingCollateral,
    // The same debt figure TroveManager.getCurrentICR divides by, so our ratio matches the protocol's.
    debt: principal + interest + pendingPrincipal + pendingInterest,
    interestRateBps: Number(rate),
  };
}

export interface SavingsPosition {
  /** sMUSD held. The vault mints sMUSD 1:1 for MUSD deposited. */
  balance: bigint;
  claimableYield: bigint;
}

export async function readSavings(client: PublicClient, owner: Address): Promise<SavingsPosition> {
  const [balance, claimableYield] = await Promise.all([
    client.readContract({ address: MEZO_PROTOCOL.savingsVault, abi: savingsVaultAbi, functionName: 'balanceOf', args: [owner] }),
    client.readContract({ address: MEZO_PROTOCOL.savingsVault, abi: savingsVaultAbi, functionName: 'claimableYield', args: [owner] }),
  ]);
  return { balance, claimableYield };
}

export interface WithdrawHints {
  upperHint: Address;
  lowerHint: Address;
}

/**
 * Hints tell Mezo where the trove sits in the sorted list after it changes. They are an optimisation, not a
 * safety check: the contract still enforces every collateral rule, and a poor hint only costs more gas.
 */
export async function buildWithdrawHints(client: PublicClient, newColl: bigint, newDebt: bigint): Promise<WithdrawHints> {
  const [nicr, troveCount] = await Promise.all([
    client.readContract({ address: MEZO_PROTOCOL.hintHelpers, abi: hintHelpersAbi, functionName: 'computeNominalCR', args: [newColl, newDebt] }),
    client.readContract({ address: MEZO_PROTOCOL.troveManager, abi: troveManagerAbi, functionName: 'getTroveOwnersCount' }),
  ]);
  const [approx] = await client.readContract({
    address: MEZO_PROTOCOL.hintHelpers,
    abi: hintHelpersAbi,
    functionName: 'getApproxHint',
    args: [nicr, hintTrials(troveCount), 42n],
  });
  const [upperHint, lowerHint] = await client.readContract({
    address: MEZO_PROTOCOL.sortedTroves,
    abi: sortedTrovesAbi,
    functionName: 'findInsertPosition',
    args: [nicr, approx, approx],
  });
  return { upperHint, lowerHint };
}

export async function readMusdAllowance(client: PublicClient, owner: Address, spender: Address, musd: Address): Promise<bigint> {
  return client.readContract({ address: musd, abi: erc20Abi, functionName: 'allowance', args: [owner, spender] });
}
