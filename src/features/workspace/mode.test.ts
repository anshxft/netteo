import assert from 'node:assert/strict';
import { DEFAULT_WORKSPACE_MODE, MODE_STORAGE_KEY, getActiveWorkspaceMode } from './mode';

// A first-time visitor must land on real Mezo Mainnet, not on the mock-token sandbox.
assert.equal(DEFAULT_WORKSPACE_MODE, 'live');
assert.equal(getActiveWorkspaceMode(), 'live', 'no window (server render) defaults to live');

const store = new Map<string, string>();
(globalThis as any).window = {};
(globalThis as any).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
};

assert.equal(getActiveWorkspaceMode(), 'live', 'nothing stored defaults to live');
store.set(MODE_STORAGE_KEY, 'demo');
assert.equal(getActiveWorkspaceMode(), 'demo', 'an explicit demo choice is remembered');
store.set(MODE_STORAGE_KEY, 'garbage');
assert.equal(getActiveWorkspaceMode(), 'live', 'an unknown stored value falls back to live');

console.log('Workspace default-mode checks passed.');
