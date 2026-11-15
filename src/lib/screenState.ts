/**
 * Which of the mutually exclusive body states a list screen is in. Every list view (payments, groups, cycles)
 * used to re-derive this from three or four booleans; one function keeps the precedence identical everywhere:
 *
 *   loading  >  error  >  ready (has rows)  >  needs-wallet (live mode, no wallet)  >  empty
 *
 * "Offline" is not a body state: it is a banner that sits on top of whichever state applies, so it is not here.
 */
export type ScreenState = 'loading' | 'error' | 'ready' | 'needs-wallet' | 'empty';

export function deriveScreenState(input: {
  isLoading: boolean;
  error?: string | null;
  count: number;
  needsWallet: boolean;
}): ScreenState {
  if (input.isLoading) return 'loading';
  if (input.error) return 'error';
  if (input.count > 0) return 'ready';
  return input.needsWallet ? 'needs-wallet' : 'empty';
}
