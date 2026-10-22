'use client';

import { SettlementCycle, CycleState } from './types';
import { calculateNetting, ObligationInput, NETTING_ALGORITHM_VERSION } from './netting';
import { loadObligations, updateObligationStatus } from '../obligations/store';
import { normalizeAddress } from './netting';
import { MEZO_TESTNET_CHAIN_ID, CONTRACT_ADDRESSES } from '@/lib/chain/config';

const STORAGE_KEY = 'netteo_cycles_v1';

const BASE = 10n ** 18n;

export const VERIFIED_MEZO_CYCLE: SettlementCycle = {
  id: '0x156915a716581f2b7358b4561e75c90ae14f7404ed9aca9a30c5c4872a82ef4f',
  groupId: '00000000-0000-0000-0000-000000000001',
  cycleNumber: 1,
  snapshotCommitment: '0xcdb6f6f7e7a350421452940424aa83123b09abd7f42ee71f788ac04c86f845a3',
  algorithmVersion: 'netteo-v1.0-deterministic',
  grossObligationTotal: 200n * BASE,
  netDebtTotal: 80n * BASE,
  totalFunded: 80n * BASE,
  totalDistributed: 80n * BASE,
  totalRefunded: 0n,
  fundingDeadline: new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
  state: 'Completed',
  creatorAddress: '0xaFbcA0F9c9a572a3554669BF1efdDC23e4065F25',
  createdAt: '2026-10-22T06:47:00.000Z',
  completedAt: '2026-10-22T06:47:15.000Z',
  includedObligationIds: [
    '00000000-0000-0000-0000-000000000011',
    '00000000-0000-0000-0000-000000000012',
    '00000000-0000-0000-0000-000000000013',
  ],
  txCreationHash: '0x313721ea293d6511735a44cfa30d4d60890f3879397d6bf6c4f6ca8e7eb97341',
  txDepositHash: '0x6c99d70ef12fef7b87405cd09ea828068cbcf61f745b91055b1374fcd05c382f',
  txSettlementHash: '0x87b397ec8053f1d4c58dd23bdcc633d7f480cc137f18d496fb2fcec59f7dc491',
  nettingResult: {
    positions: {
      '0xafbca0f9c9a572a3554669bf1efddc23e4065f25': {
        address: '0xafbca0f9c9a572a3554669bf1efddc23e4065f25',
        grossPayable: 100n * BASE,
        grossReceivable: 20n * BASE,
        netPosition: -80n * BASE,
      },
      '0x000000000000000000000000000000000000b001': {
        address: '0x000000000000000000000000000000000000b001',
        grossPayable: 80n * BASE,
        grossReceivable: 100n * BASE,
        netPosition: 20n * BASE,
      },
      '0x000000000000000000000000000000000000c002': {
        address: '0x000000000000000000000000000000000000c002',
        grossPayable: 20n * BASE,
        grossReceivable: 80n * BASE,
        netPosition: 60n * BASE,
      },
    },
    creditors: [
      { address: '0x000000000000000000000000000000000000b001', amount: 20n * BASE },
      { address: '0x000000000000000000000000000000000000c002', amount: 60n * BASE },
    ],
    debtors: [
      { address: '0xafbca0f9c9a572a3554669bf1efddc23e4065f25', amount: 80n * BASE },
    ],
    allocations: [
      {
        from: '0xafbca0f9c9a572a3554669bf1efddc23e4065f25',
        to: '0x000000000000000000000000000000000000b001',
        amount: 20n * BASE,
      },
      {
        from: '0xafbca0f9c9a572a3554669bf1efddc23e4065f25',
        to: '0x000000000000000000000000000000000000c002',
        amount: 60n * BASE,
      },
    ],
    grossObligationTotal: 200n * BASE,
    netFundingRequirement: 80n * BASE,
    participantCount: 3,
    obligationCount: 3,
    zeroPositions: [],
    algorithmVersion: 'netteo-v1.0-deterministic',
    canonicalCommitmentHash: '0xcdb6f6f7e7a350421452940424aa83123b09abd7f42ee71f788ac04c86f845a3',
  },
  deposits: {
    '0xafbca0f9c9a572a3554669bf1efddc23e4065f25': {
      required: 80n * BASE,
      funded: 80n * BASE,
    },
  },
};

export function getActiveWorkspaceMode(): 'demo' | 'live' {
  if (typeof window === 'undefined') return 'demo';
  try {
    const mode = localStorage.getItem('netteo_workspace_mode_v1');
    return mode === 'live' ? 'live' : 'demo';
  } catch {
    return 'demo';
  }
}

function getStorageKey(mode?: 'demo' | 'live'): string {
  const m = mode || getActiveWorkspaceMode();
  return m === 'live' ? 'netteo_live_cycles_v1' : 'netteo_demo_cycles_v1';
}

export function loadCycles(mode?: 'demo' | 'live'): SettlementCycle[] {
  const activeMode = mode || getActiveWorkspaceMode();
  if (typeof window === 'undefined') {
    return activeMode === 'demo' ? [VERIFIED_MEZO_CYCLE] : [];
  }
  try {
    const storageKey = getStorageKey(activeMode);
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      if (activeMode === 'demo') {
        saveCycles([VERIFIED_MEZO_CYCLE], 'demo');
      }
      return [VERIFIED_MEZO_CYCLE];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      if (activeMode === 'demo') {
        saveCycles([VERIFIED_MEZO_CYCLE], 'demo');
      }
      return [VERIFIED_MEZO_CYCLE];
    }

    return parsed.map((item) => ({
      ...item,
      grossObligationTotal: BigInt(item.grossObligationTotal),
      netDebtTotal: BigInt(item.netDebtTotal),
      totalFunded: BigInt(item.totalFunded),
      totalDistributed: BigInt(item.totalDistributed || 0),
      totalRefunded: BigInt(item.totalRefunded || 0),
      nettingResult: {
        ...item.nettingResult,
        grossObligationTotal: BigInt(item.nettingResult.grossObligationTotal),
        netFundingRequirement: BigInt(item.nettingResult.netFundingRequirement),
        positions: Object.fromEntries(
          Object.entries(item.nettingResult.positions).map(([addr, pos]: [string, any]) => [
            addr,
            {
              ...pos,
              grossPayable: BigInt(pos.grossPayable),
              grossReceivable: BigInt(pos.grossReceivable),
              netPosition: BigInt(pos.netPosition),
            },
          ])
        ),
        creditors: item.nettingResult.creditors.map((c: any) => ({ ...c, amount: BigInt(c.amount) })),
        debtors: item.nettingResult.debtors.map((d: any) => ({ ...d, amount: BigInt(d.amount) })),
        allocations: item.nettingResult.allocations.map((a: any) => ({ ...a, amount: BigInt(a.amount) })),
      },
      deposits: Object.fromEntries(
        Object.entries(item.deposits || {}).map(([addr, dep]: [string, any]) => [
          addr,
          {
            required: BigInt(dep.required),
            funded: BigInt(dep.funded),
          },
        ])
      ),
    }));
  } catch {
    return [];
  }
}

export function saveCycles(cycles: SettlementCycle[], mode?: 'demo' | 'live'): void {
  if (typeof window === 'undefined') return;
  try {
    const storageKey = getStorageKey(mode);
    const serialized = cycles.map((c) => ({
      ...c,
      grossObligationTotal: c.grossObligationTotal.toString(),
      netDebtTotal: c.netDebtTotal.toString(),
      totalFunded: c.totalFunded.toString(),
      totalDistributed: c.totalDistributed.toString(),
      totalRefunded: c.totalRefunded.toString(),
      nettingResult: {
        ...c.nettingResult,
        grossObligationTotal: c.nettingResult.grossObligationTotal.toString(),
        netFundingRequirement: c.nettingResult.netFundingRequirement.toString(),
        positions: Object.fromEntries(
          Object.entries(c.nettingResult.positions).map(([addr, pos]) => [
            addr,
            {
              ...pos,
              grossPayable: pos.grossPayable.toString(),
              grossReceivable: pos.grossReceivable.toString(),
              netPosition: pos.netPosition.toString(),
            },
          ])
        ),
        creditors: c.nettingResult.creditors.map((cr) => ({ ...cr, amount: cr.amount.toString() })),
        debtors: c.nettingResult.debtors.map((db) => ({ ...db, amount: db.amount.toString() })),
        allocations: c.nettingResult.allocations.map((al) => ({ ...al, amount: al.amount.toString() })),
      },
      deposits: Object.fromEntries(
        Object.entries(c.deposits).map(([addr, dep]) => [
          addr,
          {
            required: dep.required.toString(),
            funded: dep.funded.toString(),
          },
        ])
      ),
    }));
    localStorage.setItem(storageKey, JSON.stringify(serialized));
  } catch (err) {
    console.error('Failed to save settlement cycles to storage', err);
  }
}

export function getCycleById(id: string, mode?: 'demo' | 'live'): SettlementCycle | undefined {
  if (id && id.toLowerCase() === VERIFIED_MEZO_CYCLE.id.toLowerCase()) {
    return VERIFIED_MEZO_CYCLE;
  }
  const cycles = loadCycles(mode);
  return cycles.find((c) => c.id.toLowerCase() === id.toLowerCase());
}

export function createCycleFromObligations(
  groupId: string,
  obligationIds: string[],
  creatorAddress: string = '0xC00100000000000000000000000000000000C001',
  mode?: 'demo' | 'live'
): SettlementCycle {
  if (!obligationIds || obligationIds.length === 0) {
    throw new Error('At least one accepted obligation is required to assemble a settlement cycle.');
  }

  const allObligations = loadObligations(mode);
  const selected = allObligations.filter((o) => obligationIds.includes(o.id));

  // Verify all are Accepted and belonging to groupId
  for (const ob of selected) {
    if (ob.status !== 'Accepted') {
      throw new Error(`Obligation ${ob.id} cannot be frozen into a cycle because its status is ${ob.status}.`);
    }
  }

  // Convert to netting inputs
  const nettingInputs: ObligationInput[] = selected.map((o) => ({
    id: o.id,
    debtor: o.debtorAddress,
    creditor: o.creditorAddress,
    amount: o.amount,
    referenceLabel: o.referenceLabel,
  }));

  // Run pure deterministic netting algorithm
  const nettingResult = calculateNetting(nettingInputs, 10, 30, {
    chainId: MEZO_TESTNET_CHAIN_ID,
    tokenAddress: CONTRACT_ADDRESSES.musd,
  });

  const existingCycles = loadCycles(mode);
  const cycleNumber = existingCycles.length + 1;
  const cycleId = `cycle-${Date.now().toString(36)}`;
  const deadline = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(); // 72-hour funding window

  // Initialize per-debtor deposit expectations
  const deposits: Record<string, { required: bigint; funded: bigint }> = {};
  for (const debtor of nettingResult.debtors) {
    deposits[debtor.address] = {
      required: debtor.amount,
      funded: 0n,
    };
  }

  const newCycle: SettlementCycle = {
    id: cycleId,
    groupId,
    cycleNumber,
    snapshotCommitment: nettingResult.canonicalCommitmentHash,
    algorithmVersion: NETTING_ALGORITHM_VERSION,
    grossObligationTotal: nettingResult.grossObligationTotal,
    netDebtTotal: nettingResult.netFundingRequirement,
    totalFunded: 0n,
    totalDistributed: 0n,
    totalRefunded: 0n,
    fundingDeadline: deadline,
    state: nettingResult.netFundingRequirement === 0n ? 'ReadyToSettle' : 'Funding',
    creatorAddress: normalizeAddress(creatorAddress),
    createdAt: new Date().toISOString(),
    includedObligationIds: obligationIds,
    nettingResult,
    deposits,
  };

  // Mark all selected obligations as Frozen
  for (const id of obligationIds) {
    updateObligationStatus(id, 'Frozen', mode);
  }

  const updatedCycles = [newCycle, ...existingCycles];
  saveCycles(updatedCycles, mode);
  return newCycle;
}

export function depositToCycle(
  cycleId: string,
  debtorAddress: string,
  amount: bigint,
  mode?: 'demo' | 'live'
): SettlementCycle {
  const normalizedDebtor = normalizeAddress(debtorAddress);
  const cycles = loadCycles(mode);
  const cycleIndex = cycles.findIndex((c) => c.id === cycleId);
  if (cycleIndex === -1) {
    throw new Error('Settlement cycle not found.');
  }

  const cycle = cycles[cycleIndex];
  if (cycle.state !== 'Funding') {
    throw new Error(`Cycle is not in Funding state (currently ${cycle.state}).`);
  }

  if (new Date() > new Date(cycle.fundingDeadline)) {
    cycle.state = 'Expired';
    cycles[cycleIndex] = cycle;
    saveCycles(cycles, mode);
    throw new Error('Funding deadline has expired. Depositors may claim refunds.');
  }

  const debtorDeposit = cycle.deposits[normalizedDebtor];
  if (!debtorDeposit) {
    throw new Error(`Address ${normalizedDebtor} is not a net debtor for this cycle.`);
  }

  const remaining = debtorDeposit.required - debtorDeposit.funded;
  if (amount > remaining) {
    throw new Error('Deposit exceeds remaining net debt required for this participant.');
  }

  debtorDeposit.funded += amount;
  cycle.totalFunded += amount;

  if (cycle.totalFunded >= cycle.netDebtTotal) {
    cycle.state = 'ReadyToSettle';
  }

  cycles[cycleIndex] = cycle;
  saveCycles(cycles, mode);
  return cycle;
}

export function executeCycleSettlement(cycleId: string, mode?: 'demo' | 'live'): SettlementCycle {
  const cycles = loadCycles(mode);
  const cycleIndex = cycles.findIndex((c) => c.id === cycleId);
  if (cycleIndex === -1) {
    throw new Error('Settlement cycle not found.');
  }

  const cycle = cycles[cycleIndex];
  if (cycle.state !== 'ReadyToSettle' && cycle.totalFunded < cycle.netDebtTotal) {
    throw new Error('Cannot execute settlement: Cycle is not 100% funded.');
  }

  cycle.state = 'Completed';
  cycle.totalDistributed = cycle.netDebtTotal;
  cycle.completedAt = new Date().toISOString();

  // Mark all included obligations as Settled
  for (const obId of cycle.includedObligationIds) {
    updateObligationStatus(obId, 'Settled', mode);
  }

  cycles[cycleIndex] = cycle;
  saveCycles(cycles, mode);
  return cycle;
}

export function claimRefundFromCycle(
  cycleId: string,
  debtorAddress: string,
  mode?: 'demo' | 'live'
): SettlementCycle {
  const normalized = normalizeAddress(debtorAddress);
  const cycles = loadCycles(mode);
  const cycleIndex = cycles.findIndex((c) => c.id === cycleId);
  if (cycleIndex === -1) {
    throw new Error('Settlement cycle not found.');
  }

  const cycle = cycles[cycleIndex];
  if (cycle.state === 'Completed') {
    throw new Error('Cannot refund a completed settlement cycle.');
  }

  const deposit = cycle.deposits[normalized];
  if (!deposit || deposit.funded === 0n) {
    throw new Error('No refundable deposit found for this participant.');
  }

  const refundAmount = deposit.funded;
  deposit.funded = 0n;
  cycle.totalRefunded += refundAmount;

  if (cycle.totalRefunded >= cycle.totalFunded) {
    cycle.state = 'Refunded';
    cycle.refundedAt = new Date().toISOString();
  }

  cycles[cycleIndex] = cycle;
  saveCycles(cycles, mode);
  return cycle;
}
