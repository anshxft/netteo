import assert from 'node:assert/strict';
import {
  saveUnsyncedProposal,
  getUnsyncedProposals,
  removeUnsyncedProposal,
  flushUnsyncedProposals,
  type UnsyncedProposal,
} from './syncService';

// Mock localStorage in Node test environment
const mockStore: Record<string, string> = {};
(globalThis as any).localStorage = {
  getItem: (key: string) => mockStore[key] || null,
  setItem: (key: string, val: string) => {
    mockStore[key] = val;
  },
  removeItem: (key: string) => {
    delete mockStore[key];
  },
  clear: () => {
    for (const k of Object.keys(mockStore)) delete mockStore[k];
  },
};
(globalThis as any).window = {
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => true,
};

async function runSyncServiceTests() {
  console.log('Running Offline Queue & SyncService Tests...\n');
  (globalThis as any).localStorage.clear();

  // Test 1: Empty queue initially
  {
    const initial = getUnsyncedProposals();
    assert.deepEqual(initial, [], 'Initial queue should be empty');
    console.log('✔ Passed: Initial offline queue is empty');
  }

  // Test 2: Save unsynced proposal
  const sampleProposal: UnsyncedProposal = {
    id: 'test-prop-001',
    groupId: '00000000-0000-0000-0000-000000000001',
    debtorAddress: '0x1111111111111111111111111111111111111111',
    creditorAddress: '0x2222222222222222222222222222222222222222',
    amountUnits: '500000000000000000000',
    referenceLabel: 'Test offline claim',
    signerAddress: '0x2222222222222222222222222222222222222222',
    signature: '0xabcd1234',
    nonce: 'nonce-sync-1',
    timestamp: Date.now(),
    queuedAt: new Date().toISOString(),
  };

  {
    saveUnsyncedProposal(sampleProposal);
    const queue = getUnsyncedProposals();
    assert.equal(queue.length, 1, 'Queue should have 1 item');
    assert.equal(queue[0].id, 'test-prop-001');
    assert.equal(queue[0].amountUnits, '500000000000000000000');
    console.log('✔ Passed: Proposal successfully enqueued to offline storage');
  }

  // Test 3: Idempotent overwrite on duplicate ID
  {
    const updatedProposal: UnsyncedProposal = {
      ...sampleProposal,
      referenceLabel: 'Updated offline claim label',
    };
    saveUnsyncedProposal(updatedProposal);
    const queue = getUnsyncedProposals();
    assert.equal(queue.length, 1, 'Queue should not duplicate on same ID');
    assert.equal(queue[0].referenceLabel, 'Updated offline claim label');
    console.log('✔ Passed: Enqueuing with same ID updates payload idempotently');
  }

  // Test 4: Remove proposal
  {
    removeUnsyncedProposal('test-prop-001');
    const queue = getUnsyncedProposals();
    assert.equal(queue.length, 0, 'Queue should be empty after removal');
    console.log('✔ Passed: Proposal successfully dequeued from offline storage');
  }

  // Test 5: Flush empty queue returns 0
  {
    const flushed = await flushUnsyncedProposals();
    assert.equal(flushed, 0, 'Empty queue flush returns 0');
    console.log('✔ Passed: Empty queue flush handled safely without errors');
  }

  // Test 6: Flush with mock successful fetch
  {
    saveUnsyncedProposal(sampleProposal);
    assert.equal(getUnsyncedProposals().length, 1);

    // Mock fetch to simulate successful API sync
    (globalThis as any).fetch = async (url: string, init: any) => {
      return {
        ok: true,
        status: 200,
        json: async () => ({ success: true, id: sampleProposal.id }),
      };
    };

    const flushed = await flushUnsyncedProposals();
    assert.equal(flushed, 1, 'Should flush 1 proposal');
    assert.equal(getUnsyncedProposals().length, 0, 'Queue should be empty after successful flush');
    console.log('✔ Passed: Queue flushed and dequeued upon successful background sync');
  }

  console.log('All 6 SyncService Offline Tests Passed Successfully!\n');
}

runSyncServiceTests().catch((err) => {
  console.error('SyncService test failed:', err);
  process.exit(1);
});
