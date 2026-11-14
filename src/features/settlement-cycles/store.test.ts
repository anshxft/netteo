import assert from 'node:assert/strict';
import { createCycleFromObligations } from './store';
import { CANONICAL_OBLIGATIONS } from '../obligations/store';
import { CANONICAL_MEZO_TOKENS } from '@/lib/chain/tokens';

// In Node there is no localStorage, so loadObligations('demo') returns the three canonical
// PRD obligations. All three are Accepted and denominated in MUSD.
const GROUP = '00000000-0000-0000-0000-000000000001';
const ids = CANONICAL_OBLIGATIONS.map((o) => o.id);
const MUSDC = CANONICAL_MEZO_TOKENS.mUSDC.address;
const UNKNOWN = '0x000000000000000000000000000000000000dEaD';

assert.equal(ids.length, 3);
assert.ok(
  CANONICAL_OBLIGATIONS.every((o) => o.tokenAddress.toLowerCase() === CANONICAL_MEZO_TOKENS.MUSD.address.toLowerCase()),
  'canonical obligations are MUSD'
);

// A cycle nets exactly one currency. Netting MUSD obligations as mUSDC would treat
// 100 MUSD (10^20 base units) as 10^14 mUSDC, so the store must refuse.
assert.throws(
  () => createCycleFromObligations(GROUP, ids, undefined, 'demo', MUSDC),
  /not denominated in mUSDC/,
  'selecting MUSD obligations into an mUSDC cycle must be rejected'
);

// The message tells the user how to recover, not just that it failed.
assert.throws(
  () => createCycleFromObligations(GROUP, ids, undefined, 'demo', MUSDC),
  /pick obligations in mUSDC or switch the settlement currency/
);

// An unknown token must throw, never silently become MUSD.
assert.throws(
  () => createCycleFromObligations(GROUP, ids, undefined, 'demo', UNKNOWN),
  /verified Mezo registry/,
  'an unrecognised settlement token must be rejected'
);

// Nothing selected is still an error, and takes precedence.
assert.throws(() => createCycleFromObligations(GROUP, [], undefined, 'demo', MUSDC), /At least one accepted obligation/);

console.log('Settlement cycle currency invariant checks passed.');
