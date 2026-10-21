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

    const { data: membersData } = await supabase
      .from('group_members')
      .select('group_id, wallet_address');

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
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase] Failed to save obligation to database:', err);
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
