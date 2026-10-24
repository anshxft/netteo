import { supabase } from './supabase';
import { Group } from '@/features/groups/types';
import { Obligation, ObligationStatus } from '@/features/obligations/types';
import { SettlementCycle } from '@/features/settlement-cycles/types';

/**
 * Service to sync off-chain entities (Groups, Group Members, Obligations, Settlement Cycles)
 * directly with Supabase Postgres tables when available.
 * Conforms to architecture.md §7 & §9 and PrD.md Journey A & B.
 */

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function ensureUuid(id?: string, fallback: string = '00000000-0000-0000-0000-000000000001'): string {
  if (!id) return fallback;
  return UUID_REGEX.test(id) ? id : fallback;
}

// --- Groups Sync ---

export async function syncGroupsFromSupabase(): Promise<Group[] | null> {
  if (!supabase) return null;
  try {
    const { data: groupsData, error: groupsError } = await supabase
      .from('groups')
      .select('id, name, description, creator_address, created_at')
      .order('created_at', { ascending: true });

    if (groupsError || !groupsData || groupsData.length === 0) return null;

    const groupIds = groupsData.map((g) => g.id);
    const { data: membersData } = await supabase
      .from('group_members')
      .select('group_id, wallet_address')
      .in('group_id', groupIds);

    const membersByGroup: Record<string, string[]> = {};
    if (membersData) {
      for (const m of membersData) {
        if (!membersByGroup[m.group_id]) membersByGroup[m.group_id] = [];
        membersByGroup[m.group_id].push(m.wallet_address);
      }
    }

    return groupsData.map((g) => ({
      id: g.id,
      name: g.name,
      description: g.description || '',
      participantLimit: 10,
      participants: membersByGroup[g.id] || [g.creator_address],
      createdAt: g.created_at,
      status: 'active',
    }));
  } catch (err) {
    console.warn('[Supabase] Failed to fetch groups from database:', err);
    return null;
  }
}

export async function syncGroupToSupabase(group: Group, creatorAddress: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const validId = ensureUuid(group.id);
    const { error: groupError } = await supabase.from('groups').upsert({
      id: validId,
      name: group.name,
      description: group.description,
      creator_address: creatorAddress.toLowerCase(),
    });

    if (groupError) {
      console.warn('[Supabase] Group insert warning:', groupError.message);
      return false;
    }

    // Insert members
    const memberRows = group.participants.map((addr) => ({
      group_id: validId,
      wallet_address: addr.toLowerCase(),
      role: addr.toLowerCase() === creatorAddress.toLowerCase() ? 'admin' : 'member',
    }));

    await supabase.from('group_members').upsert(memberRows, { onConflict: 'group_id,wallet_address' });
    return true;
  } catch (err) {
    console.warn('[Supabase] Failed to persist group to database:', err);
    return false;
  }
}

// --- Obligations Sync ---

export async function syncObligationsFromSupabase(): Promise<Obligation[] | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('obligations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) return null;

    return data.map((o) => ({
      id: o.id,
      groupId: o.group_id,
      proposerAddress: o.proposer_address,
      debtorAddress: o.debtor_address,
      creditorAddress: o.creditor_address,
      amount: BigInt(o.amount_units),
      amountDisplay: `${(BigInt(o.amount_units) / 10n ** 18n).toString()} MUSD`,
      referenceLabel: o.reference_label,
      dueAt: o.due_at || undefined,
      status: (o.status.charAt(0).toUpperCase() + o.status.slice(1)) as ObligationStatus,
      documentReference: o.document_reference || undefined,
      createdAt: o.created_at,
      acceptedAt: o.accepted_at || undefined,
      disputedAt: o.disputed_at || undefined,
    }));
  } catch (err) {
    console.warn('[Supabase] Failed to fetch obligations from database:', err);
    return null;
  }
}

export async function syncObligationToSupabase(
  obligation: Obligation,
  groupId: string = '00000000-0000-0000-0000-000000000001'
): Promise<boolean> {
  if (!supabase) return false;
  try {
    const validGroupId = ensureUuid(groupId);
    const validId = ensureUuid(obligation.id, undefined);

    const { error } = await supabase.from('obligations').upsert({
      id: validId,
      group_id: validGroupId,
      proposer_address: obligation.proposerAddress.toLowerCase(),
      debtor_address: obligation.debtorAddress.toLowerCase(),
      creditor_address: obligation.creditorAddress.toLowerCase(),
      amount_units: obligation.amount.toString(),
      reference_label: obligation.referenceLabel,
      due_at: obligation.dueAt || null,
      status: obligation.status.toLowerCase(),
      document_reference: obligation.documentReference || null,
    });

    if (error) {
      console.warn('[Supabase] Obligation insert warning:', error.message);
      saveUnsyncedProposal({
        id: validId || obligation.id,
        groupId: validGroupId,
        debtorAddress: obligation.debtorAddress,
        creditorAddress: obligation.creditorAddress,
        amountUnits: obligation.amount.toString(),
        referenceLabel: obligation.referenceLabel,
        signerAddress: obligation.proposerAddress,
        queuedAt: new Date().toISOString(),
      });
      return false;
    }
    removeUnsyncedProposal(obligation.id);
    return true;
  } catch (err) {
    console.warn('[Supabase] Failed to save obligation to database:', err);
    saveUnsyncedProposal({
      id: obligation.id,
      groupId,
      debtorAddress: obligation.debtorAddress,
      creditorAddress: obligation.creditorAddress,
      amountUnits: obligation.amount.toString(),
      referenceLabel: obligation.referenceLabel,
      signerAddress: obligation.proposerAddress,
      queuedAt: new Date().toISOString(),
    });
    return false;
  }
}

export async function syncObligationStatusToSupabase(
  obligationId: string,
  newStatus: ObligationStatus
): Promise<boolean> {
  if (!supabase) return false;
  try {
    const validId = ensureUuid(obligationId);
    const updates: Record<string, any> = {
      status: newStatus.toLowerCase(),
      updated_at: new Date().toISOString(),
    };
    if (newStatus === 'Accepted') updates.accepted_at = new Date().toISOString();
    if (newStatus === 'Disputed') updates.disputed_at = new Date().toISOString();

    const { error } = await supabase
      .from('obligations')
      .update(updates)
      .eq('id', validId);

    return !error;
  } catch (err) {
    console.warn('[Supabase] Failed to update obligation status:', err);
    return false;
  }
}

// --- Settlement Cycles Sync ---

export async function syncCycleToSupabase(cycle: SettlementCycle): Promise<boolean> {
  if (!supabase) return false;
  try {
    const validGroupId = ensureUuid(cycle.groupId);
    const participantCount = Object.keys(cycle.nettingResult?.positions || {}).length || 2;
    const obligationCount = cycle.includedObligationIds?.length || 1;

    const { error } = await supabase.from('cycles').upsert({
      cycle_id: cycle.id,
      group_id: validGroupId,
      snapshot_commitment: cycle.snapshotCommitment,
      algorithm_version: cycle.algorithmVersion || '1.0.0',
      participant_count: participantCount,
      obligation_count: obligationCount,
      gross_obligation_total: cycle.grossObligationTotal.toString(),
      net_debtor_total: cycle.netDebtTotal.toString(),
      funding_deadline: cycle.fundingDeadline,
      state: cycle.state,
      creator_address: (cycle.creatorAddress || '0x0000000000000000000000000000000000000000').toLowerCase(),
      created_at: cycle.createdAt,
      funded_at: cycle.state === 'ReadyToSettle' || cycle.state === 'Completed' ? cycle.completedAt || new Date().toISOString() : null,
      settled_at: cycle.state === 'Completed' ? cycle.completedAt || new Date().toISOString() : null,
    });

    if (error) {
      console.warn('[Supabase] Cycle upsert warning:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase] Failed to persist cycle to database:', err);
    return false;
  }
}

export async function syncCyclesFromSupabase(): Promise<SettlementCycle[] | null> {
  if (!supabase) return null;
  try {
    const { data: dbCycles, error } = await supabase
      .from('cycles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !dbCycles || dbCycles.length === 0) return null;

    // Read cycle projections for updated total_funded and state if available
    const { data: projections } = await supabase
      .from('cycle_projection')
      .select('*');

    const projMap: Record<string, any> = {};
    if (projections) {
      for (const p of projections) {
        projMap[p.cycle_id.toLowerCase()] = p;
      }
    }

    return dbCycles.map((c, index) => {
      const proj = projMap[c.cycle_id.toLowerCase()];
      return {
        id: c.cycle_id,
        groupId: c.group_id,
        cycleNumber: index + 1,
        snapshotCommitment: c.snapshot_commitment,
        algorithmVersion: c.algorithm_version || 'netteo-v1.0-deterministic',
        grossObligationTotal: BigInt(c.gross_obligation_total || '0'),
        netDebtTotal: BigInt(c.net_debtor_total || '0'),
        totalFunded: proj ? BigInt(proj.total_funded || '0') : 0n,
        totalDistributed: proj ? BigInt(proj.total_distributed || '0') : 0n,
        totalRefunded: proj ? BigInt(proj.total_refunded || '0') : 0n,
        fundingDeadline: c.funding_deadline || new Date().toISOString(),
        state: (proj?.state || c.state || 'Funding') as any,
        creatorAddress: c.creator_address,
        createdAt: c.created_at,
        completedAt: c.settled_at || null,
        includedObligationIds: [],
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
      };
    });
  } catch (err) {
    console.warn('[Supabase] Failed to fetch cycles from database:', err);
    return null;
  }
}

// --- Offline Queue & Background Sync ---

export interface UnsyncedProposal {
  id: string;
  groupId: string;
  debtorAddress: string;
  creditorAddress: string;
  amountUnits: string;
  referenceLabel: string;
  signerAddress?: string;
  signature?: string;
  nonce?: string;
  timestamp?: number;
  queuedAt: string;
}

export const UNSYNCED_PROPOSALS_STORAGE_KEY = 'netteo_unsynced_proposals';

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

export async function flushUnsyncedProposals(): Promise<number> {
  const queue = getUnsyncedProposals();
  if (queue.length === 0) return 0;

  let flushed = 0;
  for (const item of queue) {
    try {
      if (item.signature && item.signerAddress) {
        const res = await fetch('/api/obligations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'propose',
            groupId: item.groupId,
            debtorAddress: item.debtorAddress,
            creditorAddress: item.creditorAddress,
            amountUnits: item.amountUnits,
            referenceLabel: item.referenceLabel,
            signerAddress: item.signerAddress,
            signature: item.signature,
            nonce: item.nonce,
            timestamp: item.timestamp,
          }),
        });

        if (res.ok) {
          removeUnsyncedProposal(item.id);
          flushed++;
          continue;
        }
      }

      // Fallback direct Supabase insert if signed API was bypassed or unavailable
      if (supabase) {
        const { error } = await supabase.from('obligations').upsert({
          id: ensureUuid(item.id, undefined),
          group_id: ensureUuid(item.groupId),
          proposer_address: (item.signerAddress || item.creditorAddress).toLowerCase(),
          debtor_address: item.debtorAddress.toLowerCase(),
          creditor_address: item.creditorAddress.toLowerCase(),
          amount_units: item.amountUnits,
          reference_label: item.referenceLabel,
          status: 'proposed',
        });

        if (!error) {
          removeUnsyncedProposal(item.id);
          flushed++;
        }
      }
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


