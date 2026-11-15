import assert from 'node:assert/strict';
import { deriveScreenState } from './screenState';

const base = { isLoading: false, error: null, count: 0, needsWallet: false };

assert.equal(deriveScreenState({ ...base, isLoading: true, error: 'x', count: 3 }), 'loading', 'loading wins');
assert.equal(deriveScreenState({ ...base, error: 'boom', count: 3 }), 'error', 'an error beats stale rows');
assert.equal(deriveScreenState({ ...base, count: 2, needsWallet: true }), 'ready', 'rows beat the wallet prompt');
assert.equal(deriveScreenState({ ...base, needsWallet: true }), 'needs-wallet');
assert.equal(deriveScreenState(base), 'empty');
assert.equal(deriveScreenState({ ...base, error: '' }), 'empty', 'an empty error string is no error');
console.log('screen state: all checks passed');
