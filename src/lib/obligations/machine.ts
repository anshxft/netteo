/**
 * Obligation lifecycle: the single source of truth for who may do what to a payment claim, and when.
 *
 *   proposed ──accept──▶ accepted ──(cycle created)──▶ frozen ──(cycle completed)──▶ settled
 *      ├────dispute────▶ disputed
 *      └────withdraw───▶ withdrawn
 *
 * Pure and dependency-free so the API (authority), the ledger UI (which buttons to show) and the local demo
 * store (mirror) all ask the same function. `decide` returns a machine-readable `code` next to the human
 * `reason`, so an agent or test can branch on the code and never parse prose.
 */

export const OBLIGATION_STATES = ['proposed', 'accepted', 'disputed', 'withdrawn', 'frozen', 'settled'] as const;
export type ObligationState = (typeof OBLIGATION_STATES)[number];

/** Actions a wallet can sign. Freeze and settle are driven by cycles, never by a user signature. */
export const TRANSITIONS = {
  accept: { from: ['proposed'], to: 'accepted' },
  dispute: { from: ['proposed'], to: 'disputed' },
  withdraw: { from: ['proposed'], to: 'withdrawn' },
} as const;

export type ObligationAction = keyof typeof TRANSITIONS;

/** States a cycle moves obligations through; shown here so the whole lifecycle reads in one place. */
export const CYCLE_TRANSITIONS = {
  freeze: { from: ['accepted'], to: 'frozen' },
  settle: { from: ['frozen'], to: 'settled' },
} as const;

/** Terminal states: nothing may change them. */
export const isTerminalState = (s: ObligationState) => s === 'disputed' || s === 'withdrawn' || s === 'settled';

const ACTION_ALIASES: Record<string, ObligationAction> = {
  accept: 'accept',
  accepted: 'accept',
  dispute: 'dispute',
  disputed: 'dispute',
  withdraw: 'withdraw',
  withdrawn: 'withdraw',
};

/** Older clients signed the past-tense word ("accepted"); both spellings mean the same action. */
export function normalizeAction(raw: unknown): ObligationAction | null {
  return typeof raw === 'string' ? (ACTION_ALIASES[raw] ?? null) : null;
}

/** The action that produces a given status, for UI code that thinks in target statuses. */
export function actionForState(state: string): ObligationAction | null {
  return normalizeAction(state.toLowerCase());
}

export interface Parties {
  debtor: string;
  creditor: string;
  proposer: string;
}

const same = (a?: string | null, b?: string | null) => !!a && !!b && a.toLowerCase() === b.toLowerCase();

/** Accept and dispute belong to the debtor; withdraw to whoever raised or is owed the claim. */
export function mayPerform(action: ObligationAction, parties: Parties, wallet?: string | null): boolean {
  if (action === 'withdraw') return same(wallet, parties.proposer) || same(wallet, parties.creditor);
  return same(wallet, parties.debtor);
}

export type Decision =
  | { ok: true; to: ObligationState }
  | { ok: false; status: 403 | 409; code: 'wrong_state' | 'not_debtor' | 'not_party'; reason: string };

/** Can `wallet` apply `action` to an obligation currently in `from`? State is checked before role. */
export function decide(action: ObligationAction, from: string, parties: Parties, wallet?: string | null): Decision {
  const rule = TRANSITIONS[action];
  if (!(rule.from as readonly string[]).includes(from)) {
    return { ok: false, status: 409, code: 'wrong_state', reason: `A ${from} obligation cannot be ${rule.to}` };
  }
  if (!mayPerform(action, parties, wallet)) {
    return action === 'withdraw'
      ? { ok: false, status: 403, code: 'not_party', reason: 'Only the proposer or creditor can withdraw this obligation' }
      : { ok: false, status: 403, code: 'not_debtor', reason: 'Only the designated debtor can accept or dispute this obligation' };
  }
  return { ok: true, to: rule.to };
}

/** Actions this wallet could sign right now: what the ledger should offer, and what an agent may attempt. */
export function availableActions(from: string, parties: Parties, wallet?: string | null): ObligationAction[] {
  return (Object.keys(TRANSITIONS) as ObligationAction[]).filter((a) => decide(a, from, parties, wallet).ok);
}
