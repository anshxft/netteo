import { calculateNetting } from '@/features/settlement-cycles/netting';
import { MEZO_MAINNET_CHAIN_ID, kernelForToken } from '@/lib/chain/config';
import { getTokenByAddress } from '@/lib/chain/tokens';
import { DatabaseUnavailableError, groupAccess, groupIdsForWallet } from './access';
import { MAX_OBLIGATIONS_PER_CYCLE, MAX_PARTICIPANTS, OBLIGATION_COLUMNS, fail, isUsableUuid, ok, type ApiResult, type Db } from './types';

/** What the server needs to read from a SettlementKernel. A fake is used in tests. */
export interface ChainReader {
  getCycle(
    kernel: string,
    cycleId: string
  ): Promise<{
    snapshotCommitment: string;
    grossObligationTotal: bigint;
    netDebtTotal: bigint;
    fundingDeadline: bigint;
    state: number;
    creator: string;
  } | null>;
  getParticipants(kernel: string, cycleId: string): Promise<{ debtors: string[]; creditors: string[] }>;
  getDebtorRequired(kernel: string, cycleId: string, debtor: string): Promise<bigint>;
  getCreditorPayout(kernel: string, cycleId: string, creditor: string): Promise<bigint>;
}

export interface CycleDeps {
  chain: ChainReader;
  kernelFor?: (token: string) => string | null;
}

const lower = (value: string) => value.toLowerCase();

/**
 * Link an on-chain cycle to a group, but only if the chain agrees with the group's own accepted obligations.
 *
 * createCycle is open to anyone, so a cycle on-chain proves nothing about who agreed to it. Here the server
 * rebuilds the net positions from the group's accepted obligations and requires the contract's commitment,
 * totals, participants and every per-wallet amount to match. A cycle someone invented to make you pay them
 * can never pass, so it never becomes "registered", and the app refuses deposits into unregistered cycles.
 */
export async function registerCycle(db: Db, wallet: string, body: any, deps: CycleDeps): Promise<ApiResult> {
  const { cycleId, tokenAddress, groupId, obligationIds } = body ?? {};

  if (typeof cycleId !== 'string' || !/^0x[0-9a-fA-F]{64}$/.test(cycleId)) return fail(400, 'Invalid cycle id');
  if (!isUsableUuid(groupId)) return fail(400, 'Invalid group');
  const token = typeof tokenAddress === 'string' ? getTokenByAddress(tokenAddress) : undefined;
  if (!token) return fail(400, 'Unsupported settlement token');
  if (
    !Array.isArray(obligationIds) ||
    obligationIds.length === 0 ||
    obligationIds.length > MAX_OBLIGATIONS_PER_CYCLE ||
    !obligationIds.every(isUsableUuid) ||
    new Set(obligationIds).size !== obligationIds.length
  ) {
    return fail(400, 'Invalid obligation list');
  }

  const kernel = (deps.kernelFor ?? kernelForToken)(token.address);
  if (!kernel) return fail(400, `No settlement kernel is deployed for ${token.symbol}`);
  const id = lower(cycleId);

  const access = await groupAccess(db, groupId, wallet);
  if (!access.exists) return fail(404, 'Group not found');
  if (!access.isMember) return fail(403, 'You are not a member of this working group');

  // Already registered: same answer, no second write.
  const existing = await db.from('cycles').select('cycle_id, group_id, kernel_address').eq('cycle_id', id).maybeSingle();
  if (existing.error) throw new DatabaseUnavailableError();
  if (existing.data) {
    const same = existing.data.group_id === groupId && lower(String(existing.data.kernel_address)) === lower(kernel);
    return same ? ok({ success: true, registered: true, alreadyRegistered: true }) : fail(409, 'This cycle id is already registered elsewhere');
  }

  const onChain = await deps.chain.getCycle(kernel, id);
  if (!onChain) return fail(404, 'Cycle not found on-chain yet. Wait for the transaction to confirm and retry.');
  if (lower(onChain.creator) !== wallet) return fail(403, 'Only the wallet that created the cycle on-chain can register it');

  const { data: rows, error } = await db.from('obligations').select(OBLIGATION_COLUMNS).in('id', obligationIds);
  if (error) throw new DatabaseUnavailableError();
  if (!rows || rows.length !== obligationIds.length) return fail(400, 'One or more obligations were not found');
  for (const row of rows) {
    if (row.group_id !== groupId) return fail(400, 'Every obligation must belong to this group');
    if (lower(row.token_address) !== lower(token.address)) return fail(400, `Every obligation must be denominated in ${token.symbol}`);
    if (row.status !== 'accepted') return fail(409, 'Only accepted obligations can be settled');
  }

  let netting;
  try {
    netting = calculateNetting(
      rows.map((r: any) => ({ id: r.id, debtor: r.debtor_address, creditor: r.creditor_address, amount: BigInt(r.amount_units) })),
      MAX_PARTICIPANTS,
      MAX_OBLIGATIONS_PER_CYCLE,
      { chainId: MEZO_MAINNET_CHAIN_ID, tokenAddress: token.address }
    );
  } catch (err: any) {
    return fail(400, err?.message || 'These obligations cannot be netted');
  }

  const mismatch = await findMismatch(deps.chain, kernel, id, onChain, netting);
  if (mismatch) return fail(409, `The on-chain cycle does not match this group's accepted obligations: ${mismatch}`);

  const deadline = new Date(Number(onChain.fundingDeadline) * 1000).toISOString();
  const { error: cycleError } = await db.from('cycles').insert({
    cycle_id: id,
    group_id: groupId,
    token_address: lower(token.address),
    kernel_address: lower(kernel),
    snapshot_commitment: onChain.snapshotCommitment,
    algorithm_version: netting.algorithmVersion,
    participant_count: netting.participantCount,
    obligation_count: netting.obligationCount,
    gross_obligation_total: netting.grossObligationTotal.toString(),
    net_debtor_total: netting.netFundingRequirement.toString(),
    funding_deadline: deadline,
    state: 'Funding',
    creator_address: wallet,
  });
  if (cycleError) return fail(500, 'Failed to register cycle');

  const { error: linkError } = await db.from('cycle_obligations').insert(obligationIds.map((obligation_id: string) => ({ cycle_id: id, obligation_id })));
  if (linkError) {
    await db.from('cycles').delete().eq('cycle_id', id);
    return fail(500, 'Failed to link obligations to the cycle');
  }

  // Frozen only if they are still accepted; a concurrent withdrawal cannot be overwritten.
  await db.from('obligations').update({ status: 'frozen', updated_at: new Date().toISOString() }).in('id', obligationIds).eq('status', 'accepted');

  return ok({ success: true, registered: true }, 201);
}

/** Returns a human-readable reason the chain disagrees with the group's obligations, or null if they match. */
async function findMismatch(
  chain: ChainReader,
  kernel: string,
  cycleId: string,
  onChain: NonNullable<Awaited<ReturnType<ChainReader['getCycle']>>>,
  netting: ReturnType<typeof calculateNetting>
): Promise<string | null> {
  if (lower(onChain.snapshotCommitment) !== lower(netting.canonicalCommitmentHash)) return 'snapshot commitment differs';
  if (onChain.grossObligationTotal !== netting.grossObligationTotal) return 'gross total differs';
  if (onChain.netDebtTotal !== netting.netFundingRequirement) return 'net total differs';

  const participants = await chain.getParticipants(kernel, cycleId);
  const sameSet = (a: string[], b: string[]) => a.length === b.length && new Set(a.map(lower)).size === a.length && a.every((x) => b.map(lower).includes(lower(x)));
  if (!sameSet(participants.debtors, netting.debtors.map((d) => d.address))) return 'debtor list differs';
  if (!sameSet(participants.creditors, netting.creditors.map((c) => c.address))) return 'creditor list differs';

  const [required, payouts] = await Promise.all([
    Promise.all(netting.debtors.map((d) => chain.getDebtorRequired(kernel, cycleId, d.address))),
    Promise.all(netting.creditors.map((c) => chain.getCreditorPayout(kernel, cycleId, c.address))),
  ]);
  if (netting.debtors.some((d, i) => required[i] !== d.amount)) return 'a debtor amount differs';
  if (netting.creditors.some((c, i) => payouts[i] !== c.amount)) return 'a creditor amount differs';
  return null;
}

/** Registered cycles for the wallet's groups, with the indexer's projection when there is one. */
export async function listCycles(db: Db, wallet: string): Promise<ApiResult> {
  const groupIds = await groupIdsForWallet(db, wallet);
  if (groupIds.length === 0) return ok({ cycles: [] });

  const { data: cycles, error } = await db
    .from('cycles')
    .select(
      'cycle_id, group_id, token_address, kernel_address, snapshot_commitment, algorithm_version, participant_count, obligation_count, gross_obligation_total::text, net_debtor_total::text, funding_deadline, state, creator_address, created_at, funded_at, settled_at'
    )
    .in('group_id', groupIds)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw new DatabaseUnavailableError();
  if (!cycles || cycles.length === 0) return ok({ cycles: [] });

  const ids = cycles.map((c) => c.cycle_id);
  const [links, projections] = await Promise.all([
    db.from('cycle_obligations').select('cycle_id, obligation_id').in('cycle_id', ids),
    db
      .from('cycle_projection')
      .select('kernel_address, cycle_id, total_funded::text, total_distributed::text, total_refunded::text, state')
      .in('cycle_id', ids),
  ]);

  const obligationsByCycle: Record<string, string[]> = {};
  for (const row of links.data || []) (obligationsByCycle[row.cycle_id] ||= []).push(row.obligation_id);
  const projectionByKey: Record<string, any> = {};
  for (const row of projections.data || []) projectionByKey[`${lower(row.kernel_address)}:${lower(row.cycle_id)}`] = row;

  return ok({
    cycles: cycles.map((c) => ({
      ...c,
      obligation_ids: obligationsByCycle[c.cycle_id] || [],
      projection: projectionByKey[`${lower(String(c.kernel_address))}:${lower(c.cycle_id)}`] || null,
    })),
  });
}
