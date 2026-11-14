import { isAddress } from 'viem';
import { buildCreateGroupMessage, isChallengeFresh, validateAndConsumeNonce, verifyChallengeSignature } from '@/lib/auth/challenge';
import { DatabaseUnavailableError, groupAccess, groupIdsForWallet } from './access';
import { MAX_PARTICIPANTS, fail, isUsableUuid, ok, type ApiResult, type Db } from './types';

/** Lowercase, validate and de-duplicate wallet addresses. Returns null if any entry is not an address. */
function cleanAddresses(input: unknown): string[] | null {
  if (!Array.isArray(input)) return null;
  const out = new Set<string>();
  for (const entry of input) {
    if (typeof entry !== 'string' || !isAddress(entry)) return null;
    out.add(entry.toLowerCase());
  }
  return [...out];
}

function toGroup(row: any, members: string[]) {
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    creatorAddress: row.creator_address,
    participantLimit: MAX_PARTICIPANTS,
    participants: members.length > 0 ? members : [row.creator_address],
    createdAt: row.created_at,
    status: 'active',
  };
}

/** Only groups this wallet created or belongs to. */
export async function listGroups(db: Db, wallet: string): Promise<ApiResult> {
  const ids = await groupIdsForWallet(db, wallet);
  if (ids.length === 0) return ok({ groups: [] });

  const [groups, members] = await Promise.all([
    db.from('groups').select('id, name, description, creator_address, created_at').in('id', ids).order('created_at', { ascending: true }),
    db.from('group_members').select('group_id, wallet_address').in('group_id', ids),
  ]);
  if (groups.error || members.error) throw new DatabaseUnavailableError();

  const byGroup: Record<string, string[]> = {};
  for (const row of members.data || []) (byGroup[row.group_id] ||= []).push(row.wallet_address);

  return ok({ groups: (groups.data || []).map((g) => toGroup(g, byGroup[g.id] || [])) });
}

export async function createGroup(db: Db, body: any): Promise<ApiResult> {
  const { action, name, description, participants, signerAddress, signature, nonce, timestamp, groupId } = body ?? {};

  if (action !== 'create_group') return fail(400, 'Unsupported action');
  if (typeof signerAddress !== 'string' || !isAddress(signerAddress)) return fail(400, 'Invalid wallet address');
  if (typeof signature !== 'string' || !signature.startsWith('0x')) return fail(400, 'Missing signature');
  const signer = signerAddress.toLowerCase();

  const cleanName = typeof name === 'string' ? name.trim() : '';
  const cleanDescription = typeof description === 'string' ? description.trim() : '';
  if (cleanName.length === 0 || cleanName.length > 100) return fail(400, 'Group name must be 1 to 100 characters');
  if (cleanDescription.length > 500) return fail(400, 'Description must be 500 characters or fewer');

  const listed = participants === undefined ? [] : cleanAddresses(participants);
  if (!listed) return fail(400, 'Every participant must be a valid wallet address');
  const members = new Set<string>([signer, ...listed]);
  if (members.size > MAX_PARTICIPANTS) return fail(400, `Participant limit exceeded (maximum ${MAX_PARTICIPANTS} members allowed)`);

  const fresh = isChallengeFresh(nonce, timestamp);
  if (!fresh.valid) return fail(401, fresh.reason || 'Invalid challenge');

  // The signature covers the participants the caller sent, with the signer added if missing (as the client does).
  const signedParticipants = Array.isArray(participants) ? [...participants] : [];
  if (!signedParticipants.some((p) => String(p).toLowerCase() === signer)) signedParticipants.push(signer);
  const message = buildCreateGroupMessage({
    action: 'create_group',
    name: cleanName,
    description: cleanDescription,
    participants: signedParticipants,
    nonce,
    timestamp,
  });
  if (!(await verifyChallengeSignature(message, signature as `0x${string}`, signer))) {
    return fail(401, 'Invalid cryptographic signature for group creation');
  }

  const consumed = await validateAndConsumeNonce(nonce, timestamp, db);
  if (!consumed.valid) return fail(401, consumed.reason || 'Invalid challenge');

  // A caller-chosen id is only honoured if it is a real UUID; otherwise the database picks one.
  const idPart = isUsableUuid(groupId) ? { id: groupId } : {};
  const { data: group, error: groupError } = await db
    .from('groups')
    .insert({ ...idPart, name: cleanName, description: cleanDescription, creator_address: signer })
    .select()
    .single();
  if (groupError || !group) {
    console.error('[API groups] Group insert error:', groupError?.code);
    return fail(500, 'Failed to create working group');
  }

  const rows = [...members].map((addr) => ({ group_id: group.id, wallet_address: addr, role: addr === signer ? 'admin' : 'member' }));
  const { error: memberError } = await db.from('group_members').upsert(rows, { onConflict: 'group_id,wallet_address' });
  if (memberError) {
    console.error('[API groups] Members insert error:', memberError.code);
    await db.from('groups').delete().eq('id', group.id); // do not leave a group with no members behind
    return fail(500, 'Failed to register group participants');
  }

  return ok({ success: true, group: toGroup(group, [...members]) });
}

/**
 * Replace a group's member list. Only the creator or an admin may do this, the creator can never be
 * removed, and nobody with an open obligation in the group can be removed (history must not be rewritten).
 */
export async function updateGroupParticipants(db: Db, wallet: string, body: any): Promise<ApiResult> {
  const { groupId, participants } = body ?? {};
  if (!isUsableUuid(groupId)) return fail(400, 'Invalid group');
  const wanted = cleanAddresses(participants);
  if (!wanted) return fail(400, 'Every participant must be a valid wallet address');

  const access = await groupAccess(db, groupId, wallet);
  if (!access.exists) return fail(404, 'Group not found');
  if (!access.isAdmin) return fail(403, 'Only a group admin can change its members');

  const next = new Set<string>([access.creator, ...wanted]);
  if (next.size > MAX_PARTICIPANTS) return fail(400, `Participant limit exceeded (maximum ${MAX_PARTICIPANTS} members allowed)`);

  const removed = [...access.members].filter((addr) => !next.has(addr));
  if (removed.length > 0) {
    const list = removed.join(',');
    const open = await db
      .from('obligations')
      .select('id', { count: 'exact', head: true })
      .eq('group_id', groupId)
      .in('status', ['proposed', 'accepted', 'frozen'])
      .or(`debtor_address.in.(${list}),creditor_address.in.(${list})`);
    if ((open.count ?? 0) > 0) return fail(409, 'A member with open obligations cannot be removed');
  }

  const added = [...next].filter((addr) => !access.members.has(addr));
  if (added.length > 0) {
    const { error } = await db
      .from('group_members')
      .upsert(added.map((addr) => ({ group_id: groupId, wallet_address: addr, role: 'member' })), { onConflict: 'group_id,wallet_address' });
    if (error) return fail(500, 'Failed to add participants');
  }
  if (removed.length > 0) {
    const { error } = await db.from('group_members').delete().eq('group_id', groupId).in('wallet_address', removed);
    if (error) return fail(500, 'Failed to remove participants');
  }

  return ok({ success: true, participants: [...next] });
}
