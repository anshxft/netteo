import assert from 'node:assert/strict';
import { CYCLE_STATES, cycleCapabilities, cycleLabel } from './machine';

const funded = { isFunded: true, refundGraceElapsed: false };
const unfunded = { isFunded: false, refundGraceElapsed: false };

// Executing needs a live, fully funded cycle: never on a cancelled, expired, refunded or completed one.
for (const state of CYCLE_STATES) {
  const live = state === 'Funding' || state === 'ReadyToSettle';
  assert.equal(cycleCapabilities(state, funded).canSettle, live, `settle when funded in ${state}`);
  assert.equal(cycleCapabilities(state, unfunded).canSettle, false, `never settle unfunded in ${state}`);
}

// Deposits only while Funding; cancel only while Funding and not yet fully funded.
assert.equal(cycleCapabilities('Funding', unfunded).canDeposit, true);
assert.equal(cycleCapabilities('ReadyToSettle', funded).canDeposit, false);
assert.equal(cycleCapabilities('Funding', unfunded).canCancel, true);
assert.equal(cycleCapabilities('Funding', funded).canCancel, false);
assert.equal(cycleCapabilities('Cancelled', unfunded).canCancel, false);

// Refunds: expired and cancelled always; a ReadyToSettle cycle only after the grace period.
assert.equal(cycleCapabilities('Expired', unfunded).refundsOpen, true);
assert.equal(cycleCapabilities('Cancelled', unfunded).refundsOpen, true);
assert.equal(cycleCapabilities('ReadyToSettle', funded).refundsOpen, false);
assert.equal(cycleCapabilities('ReadyToSettle', { isFunded: true, refundGraceElapsed: true }).refundsOpen, true);
assert.equal(cycleCapabilities('Funding', { isFunded: false, refundGraceElapsed: true }).refundsOpen, false);

assert.equal(cycleCapabilities('Completed', funded).isFinal, true);
assert.equal(cycleCapabilities('Funding', unfunded).isFinal, false);

// Every state has a human label; the detail wording the cycle page always used is preserved.
for (const state of CYCLE_STATES) {
  assert.ok(cycleLabel(state).length > 0 && !/[A-Z][a-z]+[A-Z]/.test(cycleLabel(state)), `${state} label is readable`);
}
assert.equal(cycleLabel('ReadyToSettle', 'detail'), 'Ready to Settle (100% Funded)');
assert.equal(cycleLabel('Cancelled', 'detail'), 'Cancelled (Refunds Active)');
assert.equal(cycleLabel('Funding', 'detail'), 'Funding');
console.log('cycle machine: all checks passed');
