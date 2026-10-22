import assert from 'node:assert';
import { applyEventProjection } from './worker';

async function runIndexerTests() {
  console.log('Running Indexer Worker Test Suite...');

  const cycleId = '0x156915a716581f2b7358b4561e75c90ae14f7404ed9aca9a30c5c4872a82ef4f';
  const debtorAddr = '0xafbca0f9c9a572a3554669bf1efddc23e4065f25';
  const creditorAddr = '0x000000000000000000000000000000000000c001';

  // In-memory mock database tracking table state
  const mockDbState: Record<string, any[]> = {
    cycle_projection: [],
    participant_position_projection: [],
    indexed_events: [],
    indexer_cursor: [],
  };

  const createMockDb = (options: { failOnTable?: string } = {}) => ({
    from: (table: string) => ({
      select: (_cols?: string) => ({
        eq: (col1: string, val1: any) => ({
          eq: (col2: string, val2: any) => ({
            single: async () => {
              const row = mockDbState[table]?.find((r: any) => r[col1] === val1 && r[col2] === val2);
              return { data: row || null, error: row ? null : { message: 'Row not found' } };
            },
          }),
          single: async () => {
            const row = mockDbState[table]?.find((r: any) => r[col1] === val1);
            return { data: row || null, error: row ? null : { message: 'Row not found' } };
          },
        }),
      }),
      upsert: async (record: any) => {
        if (options.failOnTable === table) {
          return { error: { message: `Simulated write error on ${table}` } };
        }
        mockDbState[table] = mockDbState[table] || [];
        const existingIdx = mockDbState[table].findIndex(
          (r: any) =>
            r.cycle_id === record.cycle_id &&
            (!record.participant_address || r.participant_address === record.participant_address) &&
            (!record.id || r.id === record.id)
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

  // Mock public client that returns authoritative contract status
  const mockClient = {
    readContract: async ({ functionName, args }: any) => {
      if (functionName === 'getCycleParticipants') {
        return [[debtorAddr], [creditorAddr]];
      }
      if (functionName === 'getDebtorStatus') {
        const required = 80n * 10n ** 18n;
        const funded = 80n * 10n ** 18n;
        return [required, funded, true];
      }
      if (functionName === 'getCreditorPayout') {
        return 80n * 10n ** 18n;
      }
      return null;
    },
  };

  // Test 1: CycleCreated projection & participant initialization
  const mockDb1 = createMockDb();
  await applyEventProjection(mockDb1, mockClient, '0x3c5Efa1E7fb42ec5351d132bcAce83C8C4dbc3D5', {
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

  const initialDebtor = mockDbState.participant_position_projection.find(
    (p: any) => p.cycle_id === cycleId && p.participant_address === debtorAddr
  );
  assert.ok(initialDebtor, 'CycleCreated must initialize debtor in participant_position_projection');
  assert.strictEqual(initialDebtor.required_amount, (80n * 10n ** 18n).toString());

  const initialCreditor = mockDbState.participant_position_projection.find(
    (p: any) => p.cycle_id === cycleId && p.participant_address === creditorAddr
  );
  assert.ok(initialCreditor, 'CycleCreated must initialize creditor in participant_position_projection');
  assert.strictEqual(initialCreditor.required_amount, (80n * 10n ** 18n).toString());
  console.log('✔ Passed: CycleCreated projection and participant initialization');

  // Test 2: DepositReceived with Solidity parameter names (debtor, totalDebtorFunded, totalCycleFunded)
  await applyEventProjection(mockDb1, mockClient, '0x3c5Efa1E7fb42ec5351d132bcAce83C8C4dbc3D5', {
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
  assert.ok(debtorProj, 'DepositReceived must update participant_position_projection');
  assert.strictEqual(debtorProj.position_type, 'debtor');
  assert.strictEqual(debtorProj.funded_amount, (80n * 10n ** 18n).toString());
  assert.strictEqual(debtorProj.is_fully_funded, true);
  console.log('✔ Passed: DepositReceived projection with matching Solidity args');

  // Test 3: DepositReceived without client read preserves existing DB required_amount
  const clientWithoutRead = {};
  await applyEventProjection(mockDb1, clientWithoutRead, '0x3c5Efa1E7fb42ec5351d132bcAce83C8C4dbc3D5', {
    blockNumber: 105n,
    eventName: 'DepositReceived',
    args: {
      cycleId,
      debtor: debtorAddr,
      amount: 40n * 10n ** 18n,
      totalDebtorFunded: 40n * 10n ** 18n,
      totalCycleFunded: 40n * 10n ** 18n,
    },
  });
  const partialDebtor = mockDbState.participant_position_projection.find(
    (p: any) => p.cycle_id === cycleId && p.participant_address === debtorAddr
  );
  // required_amount must remain 80 MUSD, NOT fall back to 40 MUSD!
  assert.strictEqual(partialDebtor.required_amount, (80n * 10n ** 18n).toString());
  assert.strictEqual(partialDebtor.is_fully_funded, false);
  console.log('✔ Passed: DepositReceived preserves authoritative required_amount without client read');

  // Reset to full funding for subsequent settlement tests
  debtorProj.funded_amount = (80n * 10n ** 18n).toString();
  debtorProj.is_fully_funded = true;

  // Test 4: CycleReadyToSettle projection
  await applyEventProjection(mockDb1, mockClient, '0x3c5Efa1E7fb42ec5351d132bcAce83C8C4dbc3D5', {
    blockNumber: 106n,
    eventName: 'CycleReadyToSettle',
    args: { cycleId, totalFunded: 80n * 10n ** 18n },
  });
  assert.strictEqual(cycleProj.state, 'ReadyToSettle');
  console.log('✔ Passed: CycleReadyToSettle projection');

  // Test 5: CycleSettled projection and creditor payout distribution
  await applyEventProjection(mockDb1, mockClient, '0x3c5Efa1E7fb42ec5351d132bcAce83C8C4dbc3D5', {
    blockNumber: 110n,
    eventName: 'CycleSettled',
    args: { cycleId, totalDistributed: 80n * 10n ** 18n, creditorCount: 1n, timestamp: 1780000050n },
  });
  assert.strictEqual(cycleProj.state, 'Completed');
  assert.strictEqual(cycleProj.total_distributed, (80n * 10n ** 18n).toString());
  const settledCreditor = mockDbState.participant_position_projection.find(
    (p: any) => p.cycle_id === cycleId && p.participant_address === creditorAddr
  );
  assert.strictEqual(settledCreditor.distributed_amount, (80n * 10n ** 18n).toString());
  console.log('✔ Passed: CycleSettled projection and creditor payout distribution');

  // Test 6: CycleExpired projection
  await applyEventProjection(mockDb1, mockClient, '0x3c5Efa1E7fb42ec5351d132bcAce83C8C4dbc3D5', {
    blockNumber: 112n,
    eventName: 'CycleExpired',
    args: { cycleId, totalFunded: 40n * 10n ** 18n, timestamp: 1780000100n },
  });
  assert.strictEqual(cycleProj.state, 'Expired');
  console.log('✔ Passed: CycleExpired projection');

  // Test 7: RefundClaimed projection
  await applyEventProjection(mockDb1, mockClient, '0x3c5Efa1E7fb42ec5351d132bcAce83C8C4dbc3D5', {
    blockNumber: 114n,
    eventName: 'RefundClaimed',
    args: { cycleId, participant: debtorAddr, amount: 40n * 10n ** 18n, timestamp: 1780000120n },
  });
  const refundedDebtor = mockDbState.participant_position_projection.find(
    (p: any) => p.cycle_id === cycleId && p.participant_address === debtorAddr
  );
  assert.strictEqual(refundedDebtor.refunded_amount, (40n * 10n ** 18n).toString());
  console.log('✔ Passed: RefundClaimed projection');

  // Test 8: Replay & Failure Atomicity: Error in projection halts batch and holds cursor
  const failingDb = createMockDb({ failOnTable: 'participant_position_projection' });
  let threw = false;
  try {
    await applyEventProjection(failingDb, mockClient, '0x3c5Efa1E7fb42ec5351d132bcAce83C8C4dbc3D5', {
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

  // Test 9: Idempotent Replay Verification: Re-applying events does not corrupt or duplicate state
  const preReplayCount = mockDbState.participant_position_projection.length;
  await applyEventProjection(mockDb1, mockClient, '0x3c5Efa1E7fb42ec5351d132bcAce83C8C4dbc3D5', {
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
  const postReplayCount = mockDbState.participant_position_projection.length;
  assert.strictEqual(preReplayCount, postReplayCount, 'Replay must be idempotent and not create duplicate rows');
  console.log('✔ Passed: Idempotent replay maintains clean projection state without duplication');

  console.log('\nAll Indexer Worker Tests Passed Successfully!');
}

runIndexerTests();
