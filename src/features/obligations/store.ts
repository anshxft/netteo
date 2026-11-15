'use client';

import { Obligation, ObligationStatus, ProposeObligationInput } from './types';
import { normalizeAddress } from '../settlement-cycles/netting';
import { DEFAULT_SETTLEMENT_TOKEN, getTokenBySymbol, requireTokenByAddress } from '@/lib/chain/tokens';
import { actionForState } from '@/lib/obligations/machine';

const STORAGE_KEY = 'netteo_obligations_v1';

/**
 * Parses a user-typed decimal amount into the token's own base units.
 *
 * `decimals` is mandatory: MUSD uses 18 while mUSDC and mUSDT use 6, so a fixed
 * 18 would inflate every bridged-stablecoin amount by 10^12. Excess precision is
 * rejected rather than truncated — silently dropping a digit changes what the user
 * agreed to owe.
 */
export function parseAmountToBaseUnits(amountStr: string, decimals: number): bigint {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 18) {
    throw new Error('Invalid token decimals.');
  }

  const clean = amountStr.trim();
  const pattern = decimals === 0 ? /^\d+$/ : new RegExp(`^\\d+(\\.\\d{1,${decimals}})?$`);
  if (!clean || !pattern.test(clean)) {
    throw new Error(
      decimals === 0
        ? 'Invalid amount. Must be a positive whole number.'
        : `Invalid amount. Must be a positive number with at most ${decimals} decimal places.`
    );
  }

  const [whole, frac = ''] = clean.split('.');
  const total = BigInt(whole) * 10n ** BigInt(decimals) + BigInt(frac.padEnd(decimals, '0'));
  if (total <= 0n) {
    throw new Error('Obligation amount must be strictly greater than zero.');
  }
  return total;
}

/**
 * Formats base units for display. When only a symbol is given, decimals are looked
 * up from the verified token registry so display and parsing can never disagree.
 */
export function formatBaseUnitsToDisplay(
  amount: bigint,
  symbol: string = DEFAULT_SETTLEMENT_TOKEN.symbol,
  decimals?: number
): string {
  const dec = BigInt(decimals ?? getTokenBySymbol(symbol)?.decimals ?? DEFAULT_SETTLEMENT_TOKEN.decimals);
  const base = 10n ** dec;
  const negative = amount < 0n;
  const abs = negative ? -amount : amount;
  const whole = abs / base;
  const rem = abs % base;
  const fracStr = rem.toString().padStart(Number(dec), '0').slice(0, 2);
  return `${negative ? '-' : ''}${whole.toLocaleString()}.${fracStr} ${symbol}`;
}

// PRD §2 Canonical initial obligations
export const CANONICAL_OBLIGATIONS: Obligation[] = [
  {
    id: '00000000-0000-0000-0000-000000000011',
    groupId: '00000000-0000-0000-0000-000000000001',
    proposerAddress: '0x1111111111111111111111111111111111111111',
    debtorAddress: '0x1111111111111111111111111111111111111111',
    creditorAddress: '0x2222222222222222222222222222222222222222',
    amount: 100n * 10n ** 18n,
    amountDisplay: '100.00 MUSD',
    tokenAddress: DEFAULT_SETTLEMENT_TOKEN.address,
    referenceLabel: 'Design sprint deliverables (Invoice #104)',
    status: 'Accepted',
    createdAt: '2026-10-20T10:15:00.000Z',
    acceptedAt: '2026-10-20T10:30:00.000Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000012',
    groupId: '00000000-0000-0000-0000-000000000001',
    proposerAddress: '0x2222222222222222222222222222222222222222',
    debtorAddress: '0x2222222222222222222222222222222222222222',
    creditorAddress: '0x3333333333333333333333333333333333333333',
    amount: 80n * 10n ** 18n,
    amountDisplay: '80.00 MUSD',
    tokenAddress: DEFAULT_SETTLEMENT_TOKEN.address,
    referenceLabel: 'RPC infrastructure node maintenance',
    status: 'Accepted',
    createdAt: '2026-10-20T11:00:00.000Z',
    acceptedAt: '2026-10-20T11:20:00.000Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000013',
    groupId: '00000000-0000-0000-0000-000000000001',
    proposerAddress: '0x3333333333333333333333333333333333333333',
    debtorAddress: '0x3333333333333333333333333333333333333333',
    creditorAddress: '0x1111111111111111111111111111111111111111',
    amount: 20n * 10n ** 18n,
    amountDisplay: '20.00 MUSD',
    tokenAddress: DEFAULT_SETTLEMENT_TOKEN.address,
    referenceLabel: 'Shared API subscription reimbursement',
    status: 'Accepted',
    createdAt: '2026-10-20T12:00:00.000Z',
    acceptedAt: '2026-10-20T12:15:00.000Z',
  },
];

import { getActiveWorkspaceMode } from '../workspace/mode';
export { getActiveWorkspaceMode };

function getStorageKey(mode?: 'demo' | 'live'): string {
  const m = mode || getActiveWorkspaceMode();
  return m === 'live' ? 'netteo_live_obligations_v1' : 'netteo_demo_obligations_v1';
}

/**
 * Human-readable friendly aliases for demo participants
 */
export const DEMO_PARTICIPANT_NAMES: Record<string, string> = {
  '0x1111111111111111111111111111111111111111': 'Alice (Design)',
  '0x2222222222222222222222222222222222222222': 'Bob (Infra)',
  '0x3333333333333333333333333333333333333333': 'Charlie (Audit)',
};

export function getParticipantDisplayName(address: string, isDemo: boolean = false): string {
  const normalized = address.toLowerCase();
  if (isDemo && DEMO_PARTICIPANT_NAMES[normalized]) {
    return DEMO_PARTICIPANT_NAMES[normalized];
  }
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function loadObligations(mode?: 'demo' | 'live'): Obligation[] {
  const activeMode = mode || getActiveWorkspaceMode();
  if (typeof window === 'undefined') {
    return activeMode === 'demo' ? CANONICAL_OBLIGATIONS : [];
  }
  try {
    const storageKey = getStorageKey(activeMode);
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      if (activeMode === 'demo') {
        saveObligations(CANONICAL_OBLIGATIONS, 'demo');
        return CANONICAL_OBLIGATIONS;
      }
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      if (activeMode === 'demo') {
        saveObligations(CANONICAL_OBLIGATIONS, 'demo');
        return CANONICAL_OBLIGATIONS;
      }
      return [];
    }
    return parsed.map((item) => ({
      ...item,
      id: item.id === 'ob-genesis-001' ? '00000000-0000-0000-0000-000000000011' :
          item.id === 'ob-genesis-002' ? '00000000-0000-0000-0000-000000000012' :
          item.id === 'ob-genesis-003' ? '00000000-0000-0000-0000-000000000013' : item.id,
      groupId: item.groupId === 'grp-genesis-001' ? '00000000-0000-0000-0000-000000000001' : item.groupId,
      amount: BigInt(item.amount),
      // Records stored before multi-token support were all MUSD.
      tokenAddress: item.tokenAddress || DEFAULT_SETTLEMENT_TOKEN.address,
    }));
  } catch {
    return activeMode === 'demo' ? CANONICAL_OBLIGATIONS : [];
  }
}

export function saveObligations(obligations: Obligation[], mode?: 'demo' | 'live'): void {
  if (typeof window === 'undefined') return;
  try {
    const storageKey = getStorageKey(mode);
    const serialized = obligations.map((ob) => ({
      ...ob,
      amount: ob.amount.toString(),
    }));
    localStorage.setItem(storageKey, JSON.stringify(serialized));
  } catch (err) {
    console.error('Failed to save obligations to local storage', err);
  }
}

export function proposeObligation(
  input: ProposeObligationInput,
  proposerAddress: string = '0x1111111111111111111111111111111111111111',
  mode?: 'demo' | 'live'
): Obligation {
  const debtor = normalizeAddress(input.debtorAddress.trim());
  const creditor = normalizeAddress(input.creditorAddress.trim());

  if (debtor === creditor) {
    throw new Error('Self-obligations are prohibited: debtor and creditor cannot be the same address.');
  }

  const label = input.referenceLabel.trim();
  if (!label) {
    throw new Error('Reference label or invoice description is required.');
  }

  const token = requireTokenByAddress(input.tokenAddress ?? DEFAULT_SETTLEMENT_TOKEN.address);
  const amountUnits = parseAmountToBaseUnits(input.amountMusd, token.decimals);

  const newId = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `00000000-0000-4000-8000-${Date.now().toString(16).padStart(12, '0')}`;

  const newObligation: Obligation = {
    id: newId,
    groupId: input.groupId,
    proposerAddress: normalizeAddress(proposerAddress),
    debtorAddress: debtor,
    creditorAddress: creditor,
    amount: amountUnits,
    amountDisplay: formatBaseUnitsToDisplay(amountUnits, token.symbol, token.decimals),
    tokenAddress: token.address,
    referenceLabel: label,
    status: 'Proposed',
    createdAt: new Date().toISOString(),
  };

  const current = loadObligations(mode);
  const updated = [newObligation, ...current];
  saveObligations(updated, mode);
  return newObligation;
}

export function updateObligationStatus(
  id: string,
  newStatus: ObligationStatus,
  mode?: 'demo' | 'live'
): Obligation {
  const obligations = loadObligations(mode);
  const index = obligations.findIndex((o) => o.id === id);
  if (index === -1) {
    throw new Error('Obligation not found.');
  }

  const target = obligations[index];
  if (target.status === 'Frozen' || target.status === 'Settled') {
    throw new Error(`Cannot modify obligation in ${target.status} status.`);
  }
  // A user response (accept / dispute / withdraw) is only valid on a proposed claim; freeze and settle are cycle-driven.
  const response = actionForState(newStatus);
  if (response && target.status !== 'Proposed') {
    throw new Error(`A ${target.status.toLowerCase()} obligation cannot be ${newStatus.toLowerCase()}.`);
  }

  const now = new Date().toISOString();
  const updated: Obligation = {
    ...target,
    status: newStatus,
    acceptedAt: newStatus === 'Accepted' ? now : target.acceptedAt,
    disputedAt: newStatus === 'Disputed' ? now : target.disputedAt,
  };

  obligations[index] = updated;
  saveObligations(obligations, mode);
  return updated;
}
