import assert from 'node:assert';
import { applyEventProjection } from './worker';

async function runIndexerTests() {
  console.log('Running Indexer Worker Test Suite...');

  const cycleId = '0x86f68074ecf1bd09816578912b271440fe1c40cfd1887614961fed0d17e2f88a';
  const debtorAddr = '0xafbca0f9c9a572a3554669bf1efddc23e4065f25';
  const creditorAddr = '0x000000000000000000000000000000000000c001';

  // In-memory mock database tracking table state
  const mockDbState: Record<string, any[]> = {
    cycle_projection: [],
    participant_position_projection: [],
  };

  const createMockDb = (options: { failOnTable?: string } = {}) => ({
    from: (table: string) => ({
      upsert: async (record: any) => {
        if (options.failOnTable === table) {
          return { error: { message: `Simulated write error on ${table}` } };
        }
        mockDbState[table] = mockDbState[table] || [];
        const existingIdx = mockDbState[table].findIndex(
          (r: any) => r.cycle_id === record.cycle_id && (!record.participant_address || r.participant_address === record.participant_address)
        );
        if (existingIdx >= 0) {
          mockDbState[table][existingIdx] = { ...mockDbState[table][existingIdx], ...record };
        } else {
          mockDbState[table].push(record);
        }
        return { error: null };
      },
      update: (updates: any) => ({
        eq: (col1: string, val1: any) => ({
          eq: async (col2: string, val2: any) => {
            if (options.failOnTable === table) {
              return { error: { message: `Simulated update error on ${table}` } };
            }
            const record = mockDbState[table]?.find(
              (r: any) => r[col1] === val1 && r[col2] === val2
            );
            if (record) Object.assign(record, updates);
            return { error: null };
          },
          then: async (resolve: any) => {
            if (options.failOnTable === table) {
              return resolve({ error: { message: `Simulated update error on ${table}` } });
            }
            const record = mockDbState[table]?.find((r: any) => r[col1] === val1);
            if (record) Object.assign(record, updates);
            return resolve({ error: null });
          },
        }),
      }),
    }),
  });

  // Mock public client that returns authoritative contract getDebtorStatus
  const mockClient = {
    readContract: async ({ functionName, args }: any) => {
      if (functionName === 'getDebtorStatus') {
        const required = 80n * 10n ** 18n;
        const funded = 80n * 10n ** 18n;
        return [required, funded, true];
      }
      return null;
    },
  };

  // Test 1: CycleCreated projection
  const mockDb1 = createMockDb();
  await applyEventProjection(mockDb1, mockClient, '0x50bb6B07138414fE509B2E2936cF31C9de3e1BbA', {
    blockNumber: 100n,
    eventName: 'CycleCreated',
    args: {
      cycleId,
      snapshotCommitment: '0x724cdee5b23448abd20d917dd2a3a5e013db848b525e61ef8aeb218b616431e4',
      netDebtTotal: 80n * 10n ** 18n,
      grossObligationTotal: 200n * 10n ** 18n,
      fundingDeadline: 1780000000n,
      creator: debtorAddr,
    },
  });

  const cycleProj = mockDbState.cycle_projection.find((c: any) => c.cycle_id === cycleId);
  assert.ok(cycleProj, 'CycleCreated must insert cycle_projection row');
  assert.strictEqual(cycleProj.state, 'Funding');
  assert.strictEqual(cycleProj.last_updated_block, 100);
  console.log('✔ Passed: CycleCreated projection');

  // Test 2: DepositReceived with Solidity parameter names (debtor, totalDebtorFunded, totalCycleFunded)
  await applyEventProjection(mockDb1, mockClient, '0x50bb6B07138414fE509B2E2936cF31C9de3e1BbA', {
    blockNumber: 105n,
    eventName: 'DepositReceived',
    args: {
      cycleId,
      debtor: debtorAddr,
      amount: 80n * 10n ** 18n,
      totalDebtorFunded: 80n * 10n ** 18n,
      totalCycleFunded: 80n * 10n ** 18n,
    },
  });

  const debtorProj = mockDbState.participant_position_projection.find(
    (p: any) => p.cycle_id === cycleId && p.participant_address === debtorAddr
  );
  assert.ok(debtorProj, 'DepositReceived must upsert participant_position_projection');
  assert.strictEqual(debtorProj.position_type, 'debtor');
  assert.strictEqual(debtorProj.funded_amount, (80n * 10n ** 18n).toString());
  assert.strictEqual(debtorProj.is_fully_funded, true);
  console.log('✔ Passed: DepositReceived projection with matching Solidity args');

  // Test 3: CycleReadyToSettle projection
  await applyEventProjection(mockDb1, mockClient, '0x50bb6B07138414fE509B2E2936cF31C9de3e1BbA', {
    blockNumber: 106n,
    eventName: 'CycleReadyToSettle',
    args: { cycleId, totalFunded: 80n * 10n ** 18n },
  });
  assert.strictEqual(cycleProj.state, 'ReadyToSettle');
  console.log('✔ Passed: CycleReadyToSettle projection');

  // Test 4: CycleSettled projection
  await applyEventProjection(mockDb1, mockClient, '0x50bb6B07138414fE509B2E2936cF31C9de3e1BbA', {
    blockNumber: 110n,
    eventName: 'CycleSettled',
    args: { cycleId, totalDistributed: 80n * 10n ** 18n, creditorCount: 2n, timestamp: 1780000050n },
  });
  assert.strictEqual(cycleProj.state, 'Completed');
  console.log('✔ Passed: CycleSettled projection');

  // Test 5: Replay & Failure Atomicity: Error in projection throws without updating state
  const failingDb = createMockDb({ failOnTable: 'participant_position_projection' });
  let threw = false;
  try {
    await applyEventProjection(failingDb, mockClient, '0x50bb6B07138414fE509B2E2936cF31C9de3e1BbA', {
      blockNumber: 115n,
      eventName: 'DepositReceived',
      args: {
        cycleId,
        debtor: debtorAddr,
        amount: 80n * 10n ** 18n,
        totalDebtorFunded: 80n * 10n ** 18n,
        totalCycleFunded: 80n * 10n ** 18n,
      },
    });
  } catch (err: any) {
    threw = true;
    assert.match(err.message, /DepositReceived participant_position_projection failed/);
  }
  assert.strictEqual(threw, true, 'Worker must throw on projection error to prevent advancing cursor');
  console.log('✔ Passed: Failure atomicity prevents advancing cursor on error');

  console.log('All Indexer Worker Tests Passed Successfully!');
}

runIndexerTests();
