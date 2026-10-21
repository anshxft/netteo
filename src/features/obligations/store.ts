'use client';

import { Obligation, ObligationStatus, ProposeObligationInput } from './types';
import { normalizeAddress } from '../settlement-cycles/netting';

const STORAGE_KEY = 'netteo_obligations_v1';
const BASE_DECIMALS = 18n;

export function parseMusdToBaseUnits(amountStr: string): bigint {
  const clean = amountStr.trim();
  if (!clean || !/^\d+(\.\d{1,18})?$/.test(clean)) {
    throw new Error('Invalid MUSD amount. Must be a positive numeric value with up to 18 decimals.');
  }

  const [whole, frac = ''] = clean.split('.');
  const paddedFrac = frac.padEnd(Number(BASE_DECIMALS), '0').slice(0, Number(BASE_DECIMALS));
  const total = BigInt(whole) * 10n ** BASE_DECIMALS + BigInt(paddedFrac);
  if (total <= 0n) {
    throw new Error('Obligation amount must be strictly greater than zero.');
  }
  return total;
}

export function formatBaseUnitsToDisplay(amount: bigint): string {
  const base = 10n ** BASE_DECIMALS;
  const whole = amount / base;
  const rem = amount % base;
  const fracStr = rem.toString().padStart(Number(BASE_DECIMALS), '0').slice(0, 2);
  return `${whole.toLocaleString()}.${fracStr} MUSD`;
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
    referenceLabel: 'Shared API subscription reimbursement',
    status: 'Accepted',
    createdAt: '2026-10-20T12:00:00.000Z',
    acceptedAt: '2026-10-20T12:15:00.000Z',
  },
];

export function loadObligations(): Obligation[] {
  if (typeof window === 'undefined') {
    return CANONICAL_OBLIGATIONS;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      saveObligations(CANONICAL_OBLIGATIONS);
      return CANONICAL_OBLIGATIONS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      saveObligations(CANONICAL_OBLIGATIONS);
      return CANONICAL_OBLIGATIONS;
    }
    return parsed.map((item) => ({
      ...item,
      id: item.id === 'ob-genesis-001' ? '00000000-0000-0000-0000-000000000011' :
          item.id === 'ob-genesis-002' ? '00000000-0000-0000-0000-000000000012' :
          item.id === 'ob-genesis-003' ? '00000000-0000-0000-0000-000000000013' : item.id,
      groupId: item.groupId === 'grp-genesis-001' ? '00000000-0000-0000-0000-000000000001' : item.groupId,
      amount: BigInt(item.amount),
    }));
  } catch {
    return CANONICAL_OBLIGATIONS;
  }
}

export function saveObligations(obligations: Obligation[]): void {
  if (typeof window === 'undefined') return;
  try {
    const serialized = obligations.map((ob) => ({
      ...ob,
      amount: ob.amount.toString(),
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
  } catch (err) {
    console.error('Failed to save obligations to local storage', err);
  }
}

export function proposeObligation(
  input: ProposeObligationInput,
  proposerAddress: string = '0x1111111111111111111111111111111111111111'
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

  const amountUnits = parseMusdToBaseUnits(input.amountMusd);

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
    amountDisplay: formatBaseUnitsToDisplay(amountUnits),
    referenceLabel: label,
    status: 'Proposed',
    createdAt: new Date().toISOString(),
  };

  const current = loadObligations();
  const updated = [newObligation, ...current];
  saveObligations(updated);
  return newObligation;
}

export function updateObligationStatus(id: string, newStatus: ObligationStatus): Obligation {
  const obligations = loadObligations();
  const index = obligations.findIndex((o) => o.id === id);
  if (index === -1) {
    throw new Error('Obligation not found.');
  }

  const target = obligations[index];
  if (target.status === 'Frozen' || target.status === 'Settled') {
    throw new Error(`Cannot modify obligation in ${target.status} status.`);
  }

  const now = new Date().toISOString();
  const updated: Obligation = {
    ...target,
    status: newStatus,
    acceptedAt: newStatus === 'Accepted' ? now : target.acceptedAt,
    disputedAt: newStatus === 'Disputed' ? now : target.disputedAt,
  };

  obligations[index] = updated;
  saveObligations(obligations);
  return updated;
}
