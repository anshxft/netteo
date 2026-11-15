import assert from 'node:assert/strict';
import { isInFlight, txReducer, txToLifecycle, type MezoTxState } from './txMachine';

const hash = '0xabc' as const;
const idle: MezoTxState = { status: 'idle' };

// Happy path.
let s = txReducer(idle, { type: 'start', label: 'Deposit' });
assert.deepEqual(s, { status: 'wallet', label: 'Deposit' });
s = txReducer(s, { type: 'submitted', hash });
assert.deepEqual(s, { status: 'confirming', label: 'Deposit', hash });
s = txReducer(s, { type: 'confirmed' });
assert.deepEqual(s, { status: 'success', label: 'Deposit', hash });

// A second start while in flight is ignored, so a double click cannot stack transactions.
const wallet = txReducer(idle, { type: 'start', label: 'A' });
assert.equal(txReducer(wallet, { type: 'start', label: 'B' }), wallet);
const confirming = txReducer(wallet, { type: 'submitted', hash });
assert.equal(txReducer(confirming, { type: 'start', label: 'B' }), confirming);

// Out-of-order events do nothing.
assert.equal(txReducer(idle, { type: 'submitted', hash }), idle);
assert.equal(txReducer(idle, { type: 'confirmed' }), idle);
assert.equal(txReducer(wallet, { type: 'confirmed' }), wallet);

// A late failure cannot overwrite a confirmed transaction.
assert.equal(txReducer(s, { type: 'failed', label: 'Deposit', message: 'x' }), s);
// Failure works from idle (not connected), wallet (rejected) and confirming (reverted).
for (const from of [idle, wallet, confirming]) {
  assert.equal(txReducer(from, { type: 'failed', label: 'A', message: 'm' }).status, 'error');
}

// Reset only when nothing is in flight; a retry can start again from error or success.
assert.equal(txReducer(wallet, { type: 'reset' }), wallet);
assert.equal(txReducer(confirming, { type: 'reset' }), confirming);
assert.deepEqual(txReducer(s, { type: 'reset' }), idle);
const err = txReducer(wallet, { type: 'failed', label: 'A', message: 'm' });
assert.equal(txReducer(err, { type: 'start', label: 'A' }).status, 'wallet');

// Display mapping.
assert.equal(txToLifecycle(idle), null);
assert.equal(txToLifecycle(wallet)?.state, 'awaiting_signature');
assert.equal(txToLifecycle(confirming)?.state, 'pending');
assert.equal(txToLifecycle(s)?.state, 'confirmed');
assert.equal(txToLifecycle(err)?.state, 'reverted');
assert.ok(isInFlight(wallet) && isInFlight(confirming) && !isInFlight(s) && !isInFlight(err));
console.log('tx machine: all checks passed');
