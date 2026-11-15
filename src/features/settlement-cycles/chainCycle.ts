'use client';

import { useMemo } from 'react';
import type { SettlementCycle } from './types';
import { SETTLED_CYCLES } from '@/lib/chain/deployments';
import { getTokenByAddress } from '@/lib/chain/tokens';
import {
  useAuthoritativeCycle,
  useCycleKernelToken,
  CYCLE_STATE_LABELS,
  CycleStateOnChain,
  type CycleAmounts,
  type OnChainCycle,
} from '@/lib/chain/useSettlementKernel';
import { ZERO_ADDRESS } from '@/lib/chain/config';

/**
 * Builds a cycle from what the kernel itself reports. Used when a cycle exists only on-chain (a shared link, a
 * receipt opened with no local record). Per-wallet amounts come from the contract; until they load, nobody is
 * listed rather than invented figures. Original claims and who-pays-whom are private to the group and not on-chain,
 * so `includedObligationIds` and `allocations` stay empty.
 */
export function buildSyntheticCycle(
  cycleId: string,
  onChain: OnChainCycle,
  _parts?: { debtors: string[]; creditors: string[] },
  projection?: any,
  amounts?: CycleAmounts
): SettlementCycle {
  const debtors = amounts?.debtors ?? [];
  const creditors = amounts?.creditors ?? [];
  const deposits: Record<string, { required: bigint; funded: bigint }> = {};
  debtors.forEach((d) => {
    deposits[d.address.toLowerCase()] = { required: d.required, funded: d.funded };
  });
  return {
    id: cycleId,
    groupId: '', // unknown for a cycle seen only on-chain; never a placeholder group id
    cycleNumber: projection?.cycle_number || 1,
    snapshotCommitment: onChain.snapshotCommitment,
    algorithmVersion: onChain.algorithmVersion || 'netteo-v1.0-deterministic',
    grossObligationTotal: onChain.grossObligationTotal,
    netDebtTotal: onChain.netDebtTotal,
    totalFunded: onChain.totalFunded,
    totalDistributed: onChain.totalDistributed,
    totalRefunded: onChain.totalRefunded,
    fundingDeadline: new Date(Number(onChain.fundingDeadline) * 1000).toISOString(),
    state: (CYCLE_STATE_LABELS[onChain.state as CycleStateOnChain] as any) || 'Funding',
    creatorAddress: onChain.creator,
    createdAt: projection?.created_at || new Date().toISOString(),
    includedObligationIds: [],
    nettingResult: {
      algorithmVersion: onChain.algorithmVersion || 'netteo-v1.0-deterministic',
      participantCount: debtors.length + creditors.length,
      obligationCount: 0,
      grossObligationTotal: onChain.grossObligationTotal,
      netFundingRequirement: onChain.netDebtTotal,
      positions: {},
      debtors: debtors.map((d) => ({ address: d.address, amount: d.required })),
      creditors: creditors.map((c) => ({ address: c.address, amount: c.amount })),
      zeroPositions: [],
      allocations: [],
      canonicalCommitmentHash: onChain.snapshotCommitment,
    },
    deposits,
    txCreationHash: projection?.creation_tx_hash,
  };
}

/** The recorded mainnet transactions for a cycle Netteo itself ran, if this is one of them. */
function recordedTxs(cycleId: string) {
  const found = SETTLED_CYCLES.find((c) => c.id.toLowerCase() === cycleId.toLowerCase());
  const hash = (name: string) => found?.txs.find((t) => t.name === name)?.hash;
  return { creation: hash('createCycle'), deposit: hash('deposit'), settlement: hash('executeSettlement') };
}

/**
 * Reads a cycle straight from Mezo Mainnet: finds which kernel holds it, then builds it from that kernel's state.
 * Needs no wallet and no local record. `cycle` is null while loading and when the id is on no Netteo kernel.
 */
export function useChainCycle(cycleId: string, enabled: boolean): { cycle: SettlementCycle | null; isLoading: boolean } {
  const hexId = (cycleId.startsWith('0x') ? cycleId : `0x${cycleId}`) as `0x${string}`;
  const chainToken = useCycleKernelToken(enabled ? hexId : null);
  const token = getTokenByAddress(chainToken.token?.address);
  const authoritative = useAuthoritativeCycle(enabled ? cycleId : null, token?.address ?? ZERO_ADDRESS);

  const cycle = useMemo(() => {
    const onChain = authoritative.cycle;
    if (!enabled || !token || !onChain || onChain.state === CycleStateOnChain.NonExistent) return null;
    const built = buildSyntheticCycle(cycleId, onChain, authoritative.participants ?? undefined, authoritative.projection, authoritative.amounts ?? undefined);
    const txs = recordedTxs(cycleId);
    return {
      ...built,
      tokenAddress: token.address,
      tokenSymbol: token.symbol,
      txCreationHash: built.txCreationHash ?? txs.creation,
      txDepositHash: txs.deposit,
      txSettlementHash: txs.settlement,
    };
  }, [enabled, token, cycleId, authoritative.cycle, authoritative.participants, authoritative.projection, authoritative.amounts]);

  return { cycle, isLoading: enabled && (chainToken.isLoading || authoritative.isLoading) };
}
