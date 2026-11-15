import { NettingResult } from './netting';

import type { CycleState } from './machine';
export type { CycleState };

export interface SettlementCycle {
  id: string;
  chainId?: number;
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
  // Multi-currency settlement token
  tokenAddress?: string;
  tokenSymbol?: string;
  /**
   * True once the server has checked this on-chain cycle against the group's accepted obligations.
   * createCycle is open to anyone, so an unregistered cycle proves nothing about who agreed to it and the app
   * does not let a wallet deposit into one.
   */
  registered?: boolean;
  // On-chain verified transaction hashes
  txCreationHash?: string;
  txDepositHash?: string;
  txSettlementHash?: string;
}
