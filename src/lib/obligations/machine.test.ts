import assert from 'node:assert/strict';
import { OBLIGATION_STATES, TRANSITIONS, actionForState, availableActions, decide, isTerminalState, normalizeAction } from './machine';

const parties = { debtor: '0xAAA', creditor: '0xBBB', proposer: '0xCCC' };

// Aliases: both the imperative and the past-tense spelling resolve; junk does not.
assert.equal(normalizeAction('accepted'), 'accept');
assert.equal(normalizeAction('withdrawn'), 'withdraw');
assert.equal(normalizeAction('Withdrawn'), null, 'the API stays case-sensitive');
assert.equal(actionForState('Withdrawn'), 'withdraw', 'UI status labels map to actions');
assert.equal(normalizeAction('freeze'), null);
assert.equal(normalizeAction(undefined), null);

// Exhaustive: every (action, state, role) combination matches the rules, nothing else is allowed.
const wallets = { debtor: '0xaaa', creditor: '0xbbb', proposer: '0xccc', stranger: '0xddd' };
for (const state of OBLIGATION_STATES) {
  for (const action of Object.keys(TRANSITIONS) as (keyof typeof TRANSITIONS)[]) {
    for (const [role, wallet] of Object.entries(wallets)) {
      const d = decide(action, state, parties, wallet);
      const stateOk = state === 'proposed';
      const roleOk = action === 'withdraw' ? role === 'creditor' || role === 'proposer' : role === 'debtor';
      assert.equal(d.ok, stateOk && roleOk, `${action} from ${state} as ${role}`);
      if (!d.ok) assert.equal(d.status, stateOk ? 403 : 409);
    }
  }
}

// State is reported before role, with the message the API has always returned.
const wrongState = decide('accept', 'accepted', parties, wallets.stranger);
assert.ok(!wrongState.ok && wrongState.code === 'wrong_state' && wrongState.reason === 'A accepted obligation cannot be accepted');

// What the ledger offers.
assert.deepEqual(availableActions('proposed', parties, wallets.debtor), ['accept', 'dispute']);
assert.deepEqual(availableActions('proposed', parties, wallets.creditor), ['withdraw']);
assert.deepEqual(availableActions('proposed', parties, wallets.stranger), []);
assert.deepEqual(availableActions('accepted', parties, wallets.debtor), []);
assert.deepEqual(availableActions('proposed', parties, null), []);

assert.ok(isTerminalState('settled') && isTerminalState('disputed') && !isTerminalState('proposed'));
console.log('obligation machine: all checks passed');
