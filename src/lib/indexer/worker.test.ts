import assert from 'node:assert';
import { applyEventProjection } from './worker';
import { CANONICAL_MEZO_TOKENS } from '../chain/tokens';

const MUSD = CANONICAL_MEZO_TOKENS.MUSD.address;
const MUSDC = CANONICAL_MEZO_TOKENS.mUSDC.address;

async function runIndexerTests() {
  console.log('Running Indexer Worker Test Suite...');

  const cycleId = '0x156915a716581f2b7358b4561e75c90ae14f7404ed9aca9a30c5c4872a82ef4f';
  const debtorAddr = '0xafbca0f9c9a572a3554669bf1efddc23e4065f25';
  const creditorAddr = '0x000000000000000000000000000000000000c001';
  const MUSD_KERNEL = '0x3c5Efa1E7fb42ec5351d132bcAce83C8C4dbc3D5';
  const MUSDC_KERNEL = '0x1111111111111111111111111111111111111111';
  const musdKernelKey = MUSD_KERNEL.toLowerCase();
  const musdcKernelKey = MUSDC_KERNEL.toLowerCase();

  // In-memory mock database tracking table state
  const mockDbState: Record<string, any[]> = {
    cycle_projection: [],
    participant_position_projection: [],
    indexed_events: [],
    indexer_cursor: [],
  };

  /**
   * Generic query builder: any number of chained .eq() filters, so a kernel-scoped
   * query that drops its kernel filter would match the wrong kernel's rows and fail loudly.
   */
  const createMockDb = (options: { failOnTable?: string } = {}) => ({
    from: (table: string) => {
      const rows = () => (mockDbState[table] = mockDbState[table] || []);
      const matching = (filters: Array<[string, any]>) =>
        rows().filter((r: any) => filters.every(([col, val]) => r[col] === val));

      const builder = (mode: 'select' | 'update', updates?: any) => {
        const filters: Array<[string, any]> = [];
        const q: any = {
          eq: (col: string, val: any) => {
            filters.push([col, val]);
            return q;
          },
          single: async () => {
            const row = matching(filters)[0];
            return { data: row || null, error: row ? null : { message: 'Row not found' } };
          },
          then: (resolve: any) => {
            if (mode === 'update') {
              if (options.failOnTable === table) {
                return resolve({ error: { message: `Simulated update error on ${table}` } });
              }
              for (const r of matching(filters)) Object.assign(r, updates);
            }
            return resolve({ error: null });
          },
        };
        return q;
      };

      return {
        select: (_cols?: string) => builder('select'),
        update: (updates: any) => builder('update', updates),
        upsert: async (record: any, opts?: { onConflict?: string }) => {
          if (options.failOnTable === table) {
            return { error: { message: `Simulated write error on ${table}` } };
          }
          const keyCols = (opts?.onConflict || 'id').split(',');
          const existing = rows().find((r: any) => keyCols.every((c) => r[c] === record[c]));
          if (existing) {
            Object.assign(existing, record);
          } else {
            rows().push({ ...record });
          }
          return { error: null };
        },
      };
    },
  });

  // Mock public client that returns authoritative contract status
  const mockClient = {
    readContract: async ({ functionName }: any) => {
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

  const projFor = (kernelKey: string) =>
    mockDbState.cycle_projection.find((c: any) => c.cycle_id === cycleId && c.kernel_address === kernelKey);
  const posFor = (kernelKey: string, addr: string) =>
    mockDbState.participant_position_projection.find(
      (p: any) => p.cycle_id === cycleId && p.kernel_address === kernelKey && p.participant_address === addr
    );

  // Test 1: CycleCreated projection & participant initialization
  const mockDb1 = createMockDb();
  await applyEventProjection(
    mockDb1,
    mockClient,
    MUSD_KERNEL,
    {
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
    },
    MUSD
  );

  const cycleProj = projFor(musdKernelKey)!;
  assert.ok(cycleProj, 'CycleCreated must insert cycle_projection row');
  assert.strictEqual(cycleProj.state, 'Funding');
  assert.strictEqual(cycleProj.last_updated_block, 100);
  assert.strictEqual(cycleProj.kernel_address, musdKernelKey, 'projection must record its kernel');
  assert.strictEqual(cycleProj.token_address, MUSD.toLowerCase(), 'projection must record its token');

  const initialDebtor = posFor(musdKernelKey, debtorAddr);
  assert.ok(initialDebtor, 'CycleCreated must initialize debtor in participant_position_projection');
  assert.strictEqual(initialDebtor.required_amount, (80n * 10n ** 18n).toString());

  const initialCreditor = posFor(musdKernelKey, creditorAddr);
  assert.ok(initialCreditor, 'CycleCreated must initialize creditor in participant_position_projection');
  assert.strictEqual(initialCreditor.required_amount, (80n * 10n ** 18n).toString());
  console.log('✔ Passed: CycleCreated projection and participant initialization');

  // Test 2: DepositReceived with Solidity parameter names (debtor, totalDebtorFunded, totalCycleFunded)
  await applyEventProjection(
    mockDb1,
    mockClient,
    MUSD_KERNEL,
    {
      blockNumber: 105n,
      eventName: 'DepositReceived',
      args: {
        cycleId,
        debtor: debtorAddr,
        amount: 80n * 10n ** 18n,
        totalDebtorFunded: 80n * 10n ** 18n,
        totalCycleFunded: 80n * 10n ** 18n,
      },
    },
    MUSD
  );

  const debtorProj = posFor(musdKernelKey, debtorAddr)!;
  assert.ok(debtorProj, 'DepositReceived must update participant_position_projection');
  assert.strictEqual(debtorProj.position_type, 'debtor');
  assert.strictEqual(debtorProj.funded_amount, (80n * 10n ** 18n).toString());
  assert.strictEqual(debtorProj.is_fully_funded, true);
  console.log('✔ Passed: DepositReceived projection with matching Solidity args');

  // Test 3: DepositReceived without client read preserves existing DB required_amount
  await applyEventProjection(
    mockDb1,
    {},
    MUSD_KERNEL,
    {
      blockNumber: 105n,
      eventName: 'DepositReceived',
      args: {
        cycleId,
        debtor: debtorAddr,
        amount: 40n * 10n ** 18n,
        totalDebtorFunded: 40n * 10n ** 18n,
        totalCycleFunded: 40n * 10n ** 18n,
      },
    },
    MUSD
  );
  const partialDebtor = posFor(musdKernelKey, debtorAddr)!;
  // required_amount must remain 80 MUSD, NOT fall back to 40 MUSD!
  assert.strictEqual(partialDebtor.required_amount, (80n * 10n ** 18n).toString());
  assert.strictEqual(partialDebtor.is_fully_funded, false);
  console.log('✔ Passed: DepositReceived preserves authoritative required_amount without client read');

  // Reset to full funding for subsequent settlement tests
  debtorProj.funded_amount = (80n * 10n ** 18n).toString();
  debtorProj.is_fully_funded = true;

  // Test 4: CycleReadyToSettle projection
  await applyEventProjection(
    mockDb1,
    mockClient,
    MUSD_KERNEL,
    { blockNumber: 106n, eventName: 'CycleReadyToSettle', args: { cycleId, totalFunded: 80n * 10n ** 18n } },
    MUSD
  );
  assert.strictEqual(cycleProj.state, 'ReadyToSettle');
  console.log('✔ Passed: CycleReadyToSettle projection');

  // Test 5: CycleSettled projection and creditor payout distribution
  await applyEventProjection(
    mockDb1,
    mockClient,
    MUSD_KERNEL,
    {
      blockNumber: 110n,
      eventName: 'CycleSettled',
      args: { cycleId, totalDistributed: 80n * 10n ** 18n, creditorCount: 1n, timestamp: 1780000050n },
    },
    MUSD
  );
  assert.strictEqual(cycleProj.state, 'Completed');
  assert.strictEqual(cycleProj.total_distributed, (80n * 10n ** 18n).toString());
  const settledCreditor = posFor(musdKernelKey, creditorAddr)!;
  assert.strictEqual(settledCreditor.distributed_amount, (80n * 10n ** 18n).toString());
  console.log('✔ Passed: CycleSettled projection and creditor payout distribution');

  // Test 6: CycleExpired projection
  await applyEventProjection(
    mockDb1,
    mockClient,
    MUSD_KERNEL,
    { blockNumber: 112n, eventName: 'CycleExpired', args: { cycleId, totalFunded: 40n * 10n ** 18n, timestamp: 1780000100n } },
    MUSD
  );
  assert.strictEqual(cycleProj.state, 'Expired');
  console.log('✔ Passed: CycleExpired projection');

  // Test 7: RefundClaimed projection
  await applyEventProjection(
    mockDb1,
    mockClient,
    MUSD_KERNEL,
    {
      blockNumber: 114n,
      eventName: 'RefundClaimed',
      args: { cycleId, participant: debtorAddr, amount: 40n * 10n ** 18n, timestamp: 1780000120n },
    },
    MUSD
  );
  const refundedDebtor = posFor(musdKernelKey, debtorAddr)!;
  assert.strictEqual(refundedDebtor.refunded_amount, (40n * 10n ** 18n).toString());
  console.log('✔ Passed: RefundClaimed projection');

  // Test 8: Replay & Failure Atomicity: Error in projection halts batch and holds cursor
  const failingDb = createMockDb({ failOnTable: 'participant_position_projection' });
  let threw = false;
  try {
    await applyEventProjection(
      failingDb,
      mockClient,
      MUSD_KERNEL,
      {
        blockNumber: 115n,
        eventName: 'DepositReceived',
        args: {
          cycleId,
          debtor: debtorAddr,
          amount: 80n * 10n ** 18n,
          totalDebtorFunded: 80n * 10n ** 18n,
          totalCycleFunded: 80n * 10n ** 18n,
        },
      },
      MUSD
    );
  } catch (err: any) {
    threw = true;
    assert.match(err.message, /DepositReceived participant_position_projection failed/);
  }
  assert.strictEqual(threw, true, 'Worker must throw on projection error to prevent advancing cursor');
  console.log('✔ Passed: Failure atomicity prevents advancing cursor on error');

  // Test 9: Idempotent Replay Verification: Re-applying events does not corrupt or duplicate state
  const preReplayCount = mockDbState.participant_position_projection.length;
  await applyEventProjection(
    mockDb1,
    mockClient,
    MUSD_KERNEL,
    {
      blockNumber: 105n,
      eventName: 'DepositReceived',
      args: {
        cycleId,
        debtor: debtorAddr,
        amount: 80n * 10n ** 18n,
        totalDebtorFunded: 80n * 10n ** 18n,
        totalCycleFunded: 80n * 10n ** 18n,
      },
    },
    MUSD
  );
  const postReplayCount = mockDbState.participant_position_projection.length;
  assert.strictEqual(preReplayCount, postReplayCount, 'Replay must be idempotent and not create duplicate rows');
  console.log('✔ Passed: Idempotent replay maintains clean projection state without duplication');

  // Test 10: The same cycleId on two kernels must stay two independent projections.
  // createCycle is permissionless with a caller-chosen id, so anyone can reuse a victim's id
  // on another token's kernel. Keying by cycleId alone would let that overwrite the victim.
  const musdProjBefore = JSON.stringify(projFor(musdKernelKey));
  await applyEventProjection(
    mockDb1,
    mockClient,
    MUSDC_KERNEL,
    {
      blockNumber: 200n,
      eventName: 'CycleCreated',
      args: {
        cycleId,
        snapshotCommitment: '0x1111111111111111111111111111111111111111111111111111111111111111',
        netDebtTotal: 5n * 10n ** 6n,
        grossObligationTotal: 9n * 10n ** 6n,
        fundingDeadline: 1790000000n,
        creator: creditorAddr,
      },
    },
    MUSDC
  );

  const cyclesWithId = mockDbState.cycle_projection.filter((c: any) => c.cycle_id === cycleId);
  assert.strictEqual(cyclesWithId.length, 2, 'same cycleId on two kernels must yield two projection rows');
  assert.strictEqual(
    JSON.stringify(projFor(musdKernelKey)),
    musdProjBefore,
    'a cycle created on the mUSDC kernel must not modify the MUSD kernel\'s projection'
  );
  const usdcProj = projFor(musdcKernelKey)!;
  assert.strictEqual(usdcProj.token_address, MUSDC.toLowerCase());
  assert.strictEqual(usdcProj.net_debt_total, (5n * 10n ** 6n).toString());

  // A later event on the mUSDC kernel must only touch the mUSDC row.
  await applyEventProjection(
    mockDb1,
    mockClient,
    MUSDC_KERNEL,
    { blockNumber: 201n, eventName: 'CycleReadyToSettle', args: { cycleId, totalFunded: 5n * 10n ** 6n } },
    MUSDC
  );
  assert.strictEqual(usdcProj.state, 'ReadyToSettle');
  assert.strictEqual(projFor(musdKernelKey)!.state, 'Expired', 'MUSD cycle state must be unaffected by the mUSDC event');
  assert.strictEqual(
    mockDbState.participant_position_projection.filter((p: any) => p.cycle_id === cycleId).length,
    4,
    'each kernel keeps its own debtor and creditor position rows'
  );
  console.log('✔ Passed: Same cycleId on different kernels stays fully isolated');

  // Test 11: An unrecognised kernel is refused rather than projected under a guessed currency.
  let refused = false;
  try {
    await applyEventProjection(createMockDb(), mockClient, '0x9999999999999999999999999999999999999999', {
      blockNumber: 300n,
      eventName: 'CycleCreated',
      args: {
        cycleId: '0x' + 'ab'.repeat(32),
        snapshotCommitment: '0x' + '00'.repeat(32),
        netDebtTotal: 1n,
        grossObligationTotal: 1n,
        fundingDeadline: 1n,
        creator: creditorAddr,
      },
    });
  } catch (err: any) {
    refused = true;
    assert.match(err.message, /unrecognised kernel/);
  }
  assert.strictEqual(refused, true, 'events from a kernel with no configured token must be refused');
  console.log('✔ Passed: Unrecognised kernel is refused');

  console.log('\nAll Indexer Worker Tests Passed Successfully!');
}

runIndexerTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
