import { Group } from '@/features/groups/types';
import { Obligation, ObligationStatus } from '@/features/obligations/types';
import { SettlementCycle } from '@/features/settlement-cycles/types';
import { MEZO_MAINNET_CHAIN_ID } from '@/lib/chain/config';
import { DEFAULT_SETTLEMENT_TOKEN, getTokenByAddress } from '@/lib/chain/tokens';
import { formatBaseUnitsToDisplay } from '@/features/obligations/store';
import { buildProposeObligationMessage } from '@/lib/auth/challenge';
import { authedFetch, signWithWallet } from '@/lib/auth/clientSession';

/**
 * Keeps the app's local copy in step with the shared ledger.
 *
 * Everything goes through the API. The browser has no direct database access: the public key can neither read
 * nor write the private tables (see schema.sql). Reads need a wallet session (one signature, see clientSession.ts)
 * and return only that wallet's data; writes carry their own signature or session and are checked server-side.
 *
 * The "...FromSupabase" names are kept so callers do not change; they now call the API.
 * Conforms to architecture.md §7 & §9 and PrD.md Journey A & B.
 */

async function readJson(path: string): Promise<any | null> {
  try {
    const res = await authedFetch(path);
    if (!res || !res.ok) return null; // no session, signed out, or server error: callers fall back to local data
    return await res.json();
  } catch {
    return null;
  }
}

// --- Groups ---

export async function syncGroupsFromSupabase(): Promise<Group[] | null> {
  const data = await readJson('/api/groups');
  return data && Array.isArray(data.groups) ? (data.groups as Group[]) : null;
}

/** Replace a group's members (group admin only; the server enforces it). Returns an error message on failure. */
export async function updateGroupParticipantsOnServer(groupId: string, participants: string[]): Promise<string | null> {
  try {
    const res = await authedFetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_participants', groupId, participants }),
    });
    if (!res) return 'Sign in with your wallet to change group members.';
    if (res.ok) return null;
    const body = await res.json().catch(() => ({}));
    return body.error || 'The server rejected this change.';
  } catch {
    return 'Network error. Try again.';
  }
}

// --- Obligations ---

function toObligation(row: any): Obligation | null {
  // Rows written before multi-token support have no token and were all MUSD.
  const token = getTokenByAddress(row.token_address || DEFAULT_SETTLEMENT_TOKEN.address);
  if (!token) {
    // Never guess: an unknown token would be shown and netted with the wrong decimals.
    console.warn('[Sync] Skipping obligation with unrecognised settlement token.');
    return null;
  }
  const amount = BigInt(row.amount_units); // text from the API, so no digits are lost
  return {
    id: row.id,
    groupId: row.group_id,
    proposerAddress: row.proposer_address,
    debtorAddress: row.debtor_address,
    creditorAddress: row.creditor_address,
    amount,
    amountDisplay: formatBaseUnitsToDisplay(amount, token.symbol, token.decimals),
    tokenAddress: token.address,
    referenceLabel: row.reference_label,
    dueAt: row.due_at || undefined,
    status: (String(row.status).charAt(0).toUpperCase() + String(row.status).slice(1)) as ObligationStatus,
    documentReference: row.document_reference || undefined,
    createdAt: row.created_at,
    acceptedAt: row.accepted_at || undefined,
    disputedAt: row.disputed_at || undefined,
  };
}

/** Obligations in this wallet's groups. An empty list is a real answer; null means "could not load". */
export async function syncObligationsFromSupabase(): Promise<Obligation[] | null> {
  const data = await readJson('/api/obligations');
  if (!data || !Array.isArray(data.obligations)) return null;
  return data.obligations.map(toObligation).filter((o: Obligation | null): o is Obligation => o !== null);
}

// --- Settlement cycles ---

/** Registers an on-chain cycle with its group. The server only accepts it if the chain matches the group's obligations. */
export async function registerCycleWithServer(input: {
  cycleId: string;
  tokenAddress: string;
  groupId: string;
  obligationIds: string[];
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await authedFetch('/api/cycles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res) return { ok: false, error: 'Sign in with your wallet to register this settlement.' };
    if (res.ok) return { ok: true };
    const body = await res.json().catch(() => ({}));
    return { ok: false, error: body.error || 'The server could not verify this settlement.' };
  } catch {
    return { ok: false, error: 'Network error while registering the settlement.' };
  }
}

/** Registered cycles for this wallet's groups. Every cycle returned has passed the server's on-chain check. */
export async function syncCyclesFromSupabase(): Promise<SettlementCycle[] | null> {
  const data = await readJson('/api/cycles');
  if (!data || !Array.isArray(data.cycles)) return null;

  const cycles: SettlementCycle[] = [];
  data.cycles.forEach((c: any, index: number) => {
    const token = getTokenByAddress(c.token_address || DEFAULT_SETTLEMENT_TOKEN.address);
    if (!token) return;
    const p = c.projection;
    cycles.push({
      id: c.cycle_id,
      chainId: MEZO_MAINNET_CHAIN_ID,
      groupId: c.group_id,
      cycleNumber: data.cycles.length - index,
      snapshotCommitment: c.snapshot_commitment,
      algorithmVersion: c.algorithm_version || 'netteo-v1.0-deterministic',
      grossObligationTotal: BigInt(c.gross_obligation_total || '0'),
      netDebtTotal: BigInt(c.net_debtor_total || '0'),
      totalFunded: BigInt(p?.total_funded || '0'),
      totalDistributed: BigInt(p?.total_distributed || '0'),
      totalRefunded: BigInt(p?.total_refunded || '0'),
      fundingDeadline: c.funding_deadline || new Date().toISOString(),
      state: (p?.state || c.state || 'Funding') as SettlementCycle['state'],
      creatorAddress: c.creator_address,
      createdAt: c.created_at,
      completedAt: c.settled_at || undefined,
      includedObligationIds: c.obligation_ids || [],
      nettingResult: {
        positions: {},
        creditors: [],
        debtors: [],
        allocations: [],
        grossObligationTotal: BigInt(c.gross_obligation_total || '0'),
        netFundingRequirement: BigInt(c.net_debtor_total || '0'),
        participantCount: c.participant_count || 2,
        obligationCount: c.obligation_count || 1,
        zeroPositions: [],
        algorithmVersion: c.algorithm_version || 'netteo-v1.0-deterministic',
        canonicalCommitmentHash: c.snapshot_commitment,
      },
      deposits: {},
      tokenAddress: token.address,
      tokenSymbol: token.symbol,
      registered: true,
    });
  });
  return cycles;
}

// --- Offline Queue & Background Sync ---

export interface UnsyncedProposal {
  id: string;
  groupId: string;
  debtorAddress: string;
  creditorAddress: string;
  amountUnits: string;
  /** Must match what was signed. Absent only on items queued before multi-token support (all MUSD). */
  tokenAddress?: string;
  referenceLabel: string;
  signerAddress?: string;
  signature?: string;
  nonce?: string;
  timestamp?: number;
  queuedAt: string;
  /** Set when the server permanently refused this item (for example the group no longer exists). Not retried. */
  failedReason?: string;
}

export const UNSYNCED_PROPOSALS_STORAGE_KEY = 'netteo_unsynced_proposals';

/** The server rejects signatures older than 5 minutes, so anything older than this is signed again before sending. */
const SIGNATURE_FRESH_MS = 4 * 60 * 1000;

export function getUnsyncedProposals(): UnsyncedProposal[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(UNSYNCED_PROPOSALS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveUnsyncedProposal(proposal: UnsyncedProposal): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getUnsyncedProposals();
    const updated = [...existing.filter((p) => p.id !== proposal.id), proposal];
    localStorage.setItem(UNSYNCED_PROPOSALS_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('[SyncService] Failed to queue unsynced proposal:', err);
  }
}

export function removeUnsyncedProposal(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getUnsyncedProposals();
    const filtered = existing.filter((p) => p.id !== id);
    localStorage.setItem(UNSYNCED_PROPOSALS_STORAGE_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.warn('[SyncService] Failed to dequeue unsynced proposal:', err);
  }
}

/** A queued proposal ready to send: its own signature while still fresh, otherwise signed again by the wallet. */
async function withFreshSignature(item: UnsyncedProposal): Promise<UnsyncedProposal | null> {
  const fresh = item.signature && item.signerAddress && item.timestamp && Date.now() - item.timestamp < SIGNATURE_FRESH_MS;
  if (fresh) return item;
  if (!item.signerAddress) return null;

  const nonce = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `nonce-${Date.now()}`;
  const timestamp = Date.now();
  const token = getTokenByAddress(item.tokenAddress || DEFAULT_SETTLEMENT_TOKEN.address);
  if (!token) return null;

  const signature = await signWithWallet(
    item.signerAddress,
    buildProposeObligationMessage({
      action: 'propose',
      groupId: item.groupId,
      debtorAddress: item.debtorAddress,
      creditorAddress: item.creditorAddress,
      amountUnits: item.amountUnits,
      tokenAddress: token.address,
      referenceLabel: item.referenceLabel,
      nonce,
      timestamp,
    })
  );
  return signature ? { ...item, signature, nonce, timestamp, tokenAddress: token.address } : null;
}

export async function flushUnsyncedProposals(): Promise<number> {
  const queue = getUnsyncedProposals();
  if (queue.length === 0) return 0;

  let flushed = 0;
  for (const item of queue) {
    if (item.failedReason) continue;
    try {
      const ready = await withFreshSignature(item);
      if (!ready) continue; // wallet not connected or the prompt was declined: keep it queued

      const res = await fetch('/api/obligations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'propose',
          groupId: ready.groupId,
          debtorAddress: ready.debtorAddress,
          creditorAddress: ready.creditorAddress,
          amountUnits: ready.amountUnits,
          tokenAddress: ready.tokenAddress,
          referenceLabel: ready.referenceLabel,
          signerAddress: ready.signerAddress,
          signature: ready.signature,
          nonce: ready.nonce,
          timestamp: ready.timestamp,
        }),
      });

      if (res.ok) {
        removeUnsyncedProposal(item.id);
        flushed++;
      } else if ([400, 403, 404, 409].includes(res.status)) {
        // Retrying cannot help (bad group, not a member, ...). Keep the item, stop retrying, remember why.
        const body = await res.json().catch(() => ({}));
        saveUnsyncedProposal({ ...item, failedReason: body.error || `Rejected (${res.status})` });
      }
      // 401/5xx/network: leave it queued and try again later.
    } catch (err) {
      console.warn(`[SyncService] Retry sync failed for proposal ${item.id}:`, err);
    }
  }

  return flushed;
}

// Auto-register background flush when coming back online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    flushUnsyncedProposals().then((count) => {
      if (count > 0) {
        window.dispatchEvent(new CustomEvent('netteo_proposals_synced', { detail: { count } }));
      }
    });
  });
}
