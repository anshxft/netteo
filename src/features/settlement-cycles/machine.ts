/**
 * Settlement-cycle phases and what each one allows. Mirrors the on-chain `SettlementKernel.CycleState`
 * (the contract is the authority; this is how the app reads it):
 *
 *   Funding ──fully funded──▶ ReadyToSettle ──execute──▶ Completed
 *      │                          │
 *      ├──creator cancels──▶ Cancelled      (refunds open)
 *      └──deadline passes──▶ Expired        (refunds open) ──▶ Refunded once everyone is repaid
 *                                 └─ a fully funded cycle that cannot pay out opens refunds after a grace period
 *
 * Pure so the execution view, the cycle list and tests agree on one vocabulary and one set of rules.
 */

export const CYCLE_STATES = ['Funding', 'ReadyToSettle', 'Completed', 'Expired', 'Refunded', 'Cancelled'] as const;
export type CycleState = (typeof CYCLE_STATES)[number];

export interface CycleFacts {
  /** Funded amount has reached the net requirement. */
  isFunded: boolean;
  /** A ReadyToSettle cycle whose deadline plus the grace period has passed. */
  refundGraceElapsed: boolean;
}

export interface CycleCapabilities {
  canDeposit: boolean;
  /** Executing a settlement: needs a fully funded cycle that is still live. */
  canSettle: boolean;
  canCancel: boolean;
  /** Depositors may withdraw what they put in. */
  refundsOpen: boolean;
  /** Nothing further can happen. */
  isFinal: boolean;
}

export function cycleCapabilities(state: CycleState, facts: CycleFacts): CycleCapabilities {
  const live = state === 'Funding' || state === 'ReadyToSettle';
  return {
    canDeposit: state === 'Funding',
    canSettle: facts.isFunded && live,
    canCancel: state === 'Funding' && !facts.isFunded,
    refundsOpen: state === 'Expired' || state === 'Cancelled' || (state === 'ReadyToSettle' && facts.refundGraceElapsed),
    isFinal: state === 'Completed' || state === 'Refunded',
  };
}

const SHORT_LABEL: Record<CycleState, string> = {
  Funding: 'Waiting for deposits',
  ReadyToSettle: 'Ready to settle',
  Completed: 'Settled',
  Expired: 'Expired',
  Refunded: 'Refunded',
  Cancelled: 'Cancelled',
};

/** `short` for lists; `detail` adds the fact a reader needs on the cycle page itself. */
export function cycleLabel(state: CycleState, style: 'short' | 'detail' = 'short'): string {
  if (style === 'detail') {
    if (state === 'ReadyToSettle') return 'Ready to Settle (100% Funded)';
    if (state === 'Cancelled') return 'Cancelled (Refunds Active)';
    return state;
  }
  return SHORT_LABEL[state] ?? state;
}
