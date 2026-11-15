import assert from 'node:assert/strict';
import {
  NETTEO_MIN_ICR,
  ONE,
  borrowingFee,
  computeIcr,
  hintTrials,
  maxSafeBorrow,
  nettingBenefit,
  planBorrow,
  type ProtocolParams,
  type TroveSnapshot,
} from './borrow';

// Real mainnet vector (block ~13.22M): a live trove and the protocol parameters, read with cast.
const params: ProtocolParams = {
  price: 66503812750000000000000n, // $66,503.81
  borrowingRate: 1000000000000000n, // 0.1%
  minNetDebt: 1800n * ONE,
  mcr: (ONE * 110n) / 100n,
  gasCompensation: 200n * ONE,
  interestRateBps: 100,
  recoveryMode: false,
};

const live: TroveSnapshot = {
  status: 1,
  coll: 43902407963913597n,
  debt: 2001000001956325820060n + 111745972914229262n, // principal + interest
  interestRateBps: 100,
};

// 1. computeIcr reproduces Mezo's own getCurrentICR exactly for a real trove.
assert.equal(computeIcr(live.coll, params.price, live.debt), 1459027723727830187n, 'must match on-chain ICR');

// 2. Fee: 0.1% of 1000 MUSD is exactly 1 MUSD (matches BorrowerOperations.getBorrowingFee(1000e18)).
assert.equal(borrowingFee(1000n * ONE, params.borrowingRate), ONE);

// 3. A trove at 145.9% is already under Netteo's 150% floor, so nothing may be borrowed from it.
assert.equal(maxSafeBorrow(live, params), 0n);
const refused = planBorrow(10n * ONE, live, params);
assert.equal(refused.kind, 'unsafe');

// 4. A healthy trove: 1 BTC collateral, 20,000 MUSD debt (ICR ~332%).
const healthy: TroveSnapshot = { status: 1, coll: ONE, debt: 20_000n * ONE, interestRateBps: 100 };
const max = maxSafeBorrow(healthy, params);
assert.ok(max > 0n);
// Borrowing exactly the max keeps the ratio at or above the floor, one wei more breaks it.
const atMax = planBorrow(max, healthy, params);
assert.equal(atMax.kind, 'ok');
if (atMax.kind === 'ok') assert.ok(atMax.resultingIcr >= NETTEO_MIN_ICR, 'max borrow must respect the floor');
assert.equal(planBorrow(max + ONE, healthy, params).kind, 'unsafe', 'one MUSD over the max must be refused');

// 5. The fee is added to debt, the wallet receives exactly the shortfall.
const small = planBorrow(500n * ONE, healthy, params);
assert.equal(small.kind, 'ok');
if (small.kind === 'ok') {
  assert.equal(small.amount, 500n * ONE);
  assert.equal(small.fee, borrowingFee(500n * ONE, params.borrowingRate));
  assert.equal(small.newDebt, healthy.debt + 500n * ONE + small.fee);
  assert.ok(small.resultingIcr < small.currentIcr, 'borrowing lowers the ratio');
  assert.equal(small.monthlyInterest, (500n * ONE * 100n * 30n) / (10_000n * 365n));
}

// 6. Refuse in the states where a borrow must not be offered.
assert.equal(planBorrow(ONE, { ...healthy, status: 0 }, params).kind, 'no-trove');
assert.equal(planBorrow(ONE, { ...healthy, status: 3 }, params).kind, 'no-trove', 'a liquidated trove is not usable');
assert.equal(planBorrow(ONE, healthy, { ...params, recoveryMode: true }).kind, 'recovery-mode');
assert.equal(planBorrow(0n, healthy, params).kind, 'unsafe', 'a zero borrow is not a plan');

// 7. Netting benefit: the canonical example. A owes 100 gross and nets to 80; B owes 80 and nets to 0 (receives 20);
//    C owes 20 and nets to 0. Borrowing cost avoided is computed from gross minus net, per participant.
const a = nettingBenefit(100n * ONE, 80n * ONE, params);
assert.equal(a.avoided, 20n * ONE);
assert.equal(a.feeAvoided, (20n * ONE * params.borrowingRate) / ONE);
assert.equal(a.interestAvoided, (20n * ONE * 100n * 30n) / (10_000n * 365n));
const b = nettingBenefit(80n * ONE, 0n, params);
assert.equal(b.avoided, 80n * ONE);
assert.equal(nettingBenefit(10n * ONE, 50n * ONE, params).avoided, 0n, 'net above gross never reports a saving');

// 8. Hint trials: at least 15, growing with sqrt of the trove count.
assert.equal(hintTrials(0n), 15n);
assert.equal(hintTrials(4n), 30n);
assert.equal(hintTrials(100n), 150n);

console.log('Mezo borrowing math checks passed.');
