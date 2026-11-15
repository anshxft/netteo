/**
 * Transaction lifecycle for any wallet-signed Mezo action.
 *
 *   idle ──start──▶ wallet ──submitted──▶ confirming ──confirmed──▶ success
 *     ▲                 └────────────failed────────────┴──────────▶ error
 *     └─────────────────────── reset (only when not in flight) ◀───────┘
 *
 * Pure reducer: an event that is not legal in the current state is ignored, so a late callback or a double
 * click can never move a settled transaction backwards or start a second one on top of the first.
 */
import type { Hex } from 'viem';

export type MezoTxState =
  | { status: 'idle' }
  | { status: 'wallet'; label: string }
  | { status: 'confirming'; label: string; hash: Hex }
  | { status: 'success'; label: string; hash: Hex }
  | { status: 'error'; label: string; message: string };

export type MezoTxEvent =
  | { type: 'start'; label: string }
  | { type: 'submitted'; hash: Hex }
  | { type: 'confirmed' }
  | { type: 'failed'; label: string; message: string }
  | { type: 'reset' };

/** What the generic <TransactionStatus> component renders. */
export type TransactionLifecycleState = 'awaiting_signature' | 'pending' | 'confirmed' | 'reverted';

export const isInFlight = (tx: MezoTxState) => tx.status === 'wallet' || tx.status === 'confirming';

export function txReducer(tx: MezoTxState, event: MezoTxEvent): MezoTxState {
  switch (event.type) {
    case 'start':
      return isInFlight(tx) ? tx : { status: 'wallet', label: event.label };
    case 'submitted':
      return tx.status === 'wallet' ? { status: 'confirming', label: tx.label, hash: event.hash } : tx;
    case 'confirmed':
      return tx.status === 'confirming' ? { status: 'success', label: tx.label, hash: tx.hash } : tx;
    case 'failed':
      // A pre-flight failure (no wallet connected) arrives from idle; a real one from an in-flight state.
      return tx.status === 'success' ? tx : { status: 'error', label: event.label, message: event.message };
    case 'reset':
      return isInFlight(tx) ? tx : { status: 'idle' };
  }
}

/** The display model for a transaction, or null when there is nothing to show. */
export function txToLifecycle(
  tx: MezoTxState
): { state: TransactionLifecycleState; hash?: string; message?: string; title: string } | null {
  switch (tx.status) {
    case 'wallet':
      return { state: 'awaiting_signature', title: `${tx.label}: confirm in your wallet` };
    case 'confirming':
      return { state: 'pending', hash: tx.hash, title: `${tx.label}: confirming on Mezo` };
    case 'success':
      return { state: 'confirmed', hash: tx.hash, title: `${tx.label}: confirmed` };
    case 'error':
      return { state: 'reverted', message: tx.message, title: `${tx.label}: not completed` };
    default:
      return null;
  }
}
