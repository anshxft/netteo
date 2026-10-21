import { NettingResult } from './netting';

export type CycleState =
  | 'Funding'
  | 'ReadyToSettle'
  | 'Completed'
  | 'Expired'
  | 'Refunded';

export interface SettlementCycle {
  id: string;
  groupId: string;
  cycleNumber: number;
  snapshotCommitment: string;
  algorithmVersion: string;
  grossObligationTotal: bigint;
  netDebtTotal: bigint;
  totalFunded: bigint;
  totalDistributed: bigint;
  totalRefunded: bigint;
  fundingDeadline: string; // ISO timestamp
  state: CycleState;
  creatorAddress: string;
  createdAt: string;
  completedAt?: string;
  refundedAt?: string;
  includedObligationIds: string[];
  nettingResult: NettingResult;
  // Per-debtor deposit tracking
  deposits: Record<string, {
    required: bigint;
    funded: bigint;
  }>;
  // On-chain verified transaction hashes
  txCreationHash?: string;
  txDepositHash?: string;
  txSettlementHash?: string;
}
