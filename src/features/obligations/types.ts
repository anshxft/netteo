export type ObligationStatus =
  | 'Proposed'
  | 'Accepted'
  | 'Disputed'
  | 'Withdrawn'
  | 'Frozen'
  | 'Settled';

export interface Obligation {
  id: string;
  groupId: string;
  proposerAddress: string;
  debtorAddress: string;
  creditorAddress: string;
  amount: bigint;          // Integer base units (10^18)
  amountDisplay: string;   // e.g. "100.00 MUSD"
  referenceLabel: string;  // Non-sensitive description/receipt
  status: ObligationStatus;
  createdAt: string;
  acceptedAt?: string;
  disputedAt?: string;
  cycleId?: string;
  dueAt?: string;
  documentReference?: string;
}

export interface ProposeObligationInput {
  groupId: string;
  debtorAddress: string;
  creditorAddress: string;
  amountMusd: string;      // Decimal string e.g. "100" or "80.50"
  referenceLabel: string;
}
