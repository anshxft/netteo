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
  amount: bigint;          // Integer base units of tokenAddress's own decimals
  amountDisplay: string;   // e.g. "100.00 MUSD"
  /**
   * Settlement token this obligation is denominated in. `amount` is in THIS token's
   * base units, so it is never comparable across tokens (1 MUSD = 10^18, 1 mUSDC = 10^6).
   * A cycle may only net obligations that share a token.
   */
  tokenAddress: string;
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
  /** Defaults to canonical MUSD when omitted. */
  tokenAddress?: string;
  referenceLabel: string;
}
