import { TROVE_STATUS } from './protocol';

/** Pure bigint math for borrowing MUSD against BTC on Mezo. No I/O, so every rule here is unit-tested. */

export const ONE = 10n ** 18n;

/**
 * Netteo's own safety floor. Mezo liquidates a trove below 110% (MCR). Netteo refuses to build a borrow that
 * would leave the wallet under 150%, because a settlement is not worth a liquidation.
 */
export const NETTEO_MIN_ICR = (ONE * 150n) / 100n;

export interface TroveSnapshot {
  status: number;
  /** Collateral in BTC base units (18 decimals), including pending redistribution. */
  coll: bigint;
  /** principal + interest + pending principal + pending interest, in MUSD base units. */
  debt: bigint;
  /** Annual interest rate in basis points (100 = 1%). */
  interestRateBps: number;
}

export interface ProtocolParams {
  /** BTC price in USD, 18 decimals. */
  price: bigint;
  /** Issuance fee as a fraction of 1e18 (1e15 = 0.1%). */
  borrowingRate: bigint;
  /** Minimum net debt for a trove (excludes the gas deposit). */
  minNetDebt: bigint;
  mcr: bigint;
  gasCompensation: bigint;
  /** Rate a brand-new loan would get, in basis points. */
  interestRateBps: number;
  recoveryMode: boolean;
}

/** collateral ratio, 1e18 = 100%. A trove with no debt has an unbounded ratio. */
export function computeIcr(coll: bigint, price: bigint, debt: bigint): bigint {
  if (debt === 0n) return (1n << 255n) - 1n;
  return (coll * price) / debt;
}

export function borrowingFee(amount: bigint, borrowingRate: bigint): bigint {
  return (amount * borrowingRate) / ONE;
}

/**
 * Largest amount that can still be withdrawn while the ratio, after the issuance fee is added to the debt,
 * stays at or above `minIcr`. Zero if the trove is already at or below it.
 */
export function maxSafeBorrow(trove: TroveSnapshot, params: ProtocolParams, minIcr: bigint = NETTEO_MIN_ICR): bigint {
  if (trove.status !== TROVE_STATUS.active) return 0n;
  const collValue = (trove.coll * params.price) / ONE;
  const maxDebt = (collValue * ONE) / minIcr;
  if (maxDebt <= trove.debt) return 0n;
  // debt + a * (1 + rate) <= maxDebt
  return ((maxDebt - trove.debt) * ONE) / (ONE + params.borrowingRate);
}

export type BorrowPlan =
  | { kind: 'no-trove' }
  | { kind: 'recovery-mode' }
  | { kind: 'unsafe'; maxSafe: bigint; shortfall: bigint; resultingIcr: bigint }
  | {
      kind: 'ok';
      amount: bigint;
      fee: bigint;
      newDebt: bigint;
      currentIcr: bigint;
      resultingIcr: bigint;
      /** Estimated interest for 30 days on the amount borrowed, at the trove's own rate. */
      monthlyInterest: bigint;
    };

/**
 * Plan a withdrawal of exactly `shortfall` MUSD. The fee is added to the debt, not deducted from what the
 * wallet receives, so borrowing `shortfall` leaves the wallet holding exactly enough to deposit.
 */
export function planBorrow(shortfall: bigint, trove: TroveSnapshot, params: ProtocolParams, minIcr: bigint = NETTEO_MIN_ICR): BorrowPlan {
  if (trove.status !== TROVE_STATUS.active) return { kind: 'no-trove' };
  if (params.recoveryMode) return { kind: 'recovery-mode' };

  const fee = borrowingFee(shortfall, params.borrowingRate);
  const newDebt = trove.debt + shortfall + fee;
  const resultingIcr = computeIcr(trove.coll, params.price, newDebt);

  if (shortfall <= 0n || resultingIcr < minIcr) {
    return { kind: 'unsafe', maxSafe: maxSafeBorrow(trove, params, minIcr), shortfall, resultingIcr };
  }

  return {
    kind: 'ok',
    amount: shortfall,
    fee,
    newDebt,
    currentIcr: computeIcr(trove.coll, params.price, trove.debt),
    resultingIcr,
    monthlyInterest: (shortfall * BigInt(trove.interestRateBps) * 30n) / (10_000n * 365n),
  };
}

export interface NettingBenefit {
  /** MUSD that did not have to be funded up front because claims cancelled each other. */
  avoided: bigint;
  /** One-time issuance fee that borrowing `avoided` MUSD on Mezo would have cost. */
  feeAvoided: bigint;
  /** Interest that borrowing `avoided` MUSD for `days` would have cost, at the current rate for new loans. */
  interestAvoided: bigint;
  days: number;
}

/**
 * What netting saves someone who funds settlements by borrowing MUSD against BTC.
 * Without netting a debtor must fund everything they owe (`grossPayable`) before they are repaid;
 * with netting only `netDebit` is funded. Rates are Mezo's own, read from chain: this is an estimate of
 * borrowing cost avoided, not a promise of savings.
 */
export function nettingBenefit(grossPayable: bigint, netDebit: bigint, params: ProtocolParams, days = 30): NettingBenefit {
  const avoided = grossPayable > netDebit ? grossPayable - netDebit : 0n;
  return {
    avoided,
    feeAvoided: borrowingFee(avoided, params.borrowingRate),
    interestAvoided: (avoided * BigInt(params.interestRateBps) * BigInt(days)) / (10_000n * 365n),
    days,
  };
}

/** Number of random trials Liquity-style hint helpers need: 15 * sqrt(troves), at least 15. */
export function hintTrials(troveCount: bigint): bigint {
  const target = troveCount > 0n ? troveCount : 1n;
  // integer sqrt by Newton
  let x = target;
  let y = (x + 1n) / 2n;
  while (y < x) {
    x = y;
    y = (x + target / x) / 2n;
  }
  const trials = 15n * x;
  return trials < 15n ? 15n : trials;
}
