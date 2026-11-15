import { isAddress } from 'viem';
import {
  buildObligationActionMessage,
  buildProposeObligationMessage,
  isChallengeFresh,
  validateAndConsumeNonce,
  verifyChallengeSignature,
} from '@/lib/auth/challenge';
import { getTokenByAddress } from '@/lib/chain/tokens';
import { decide, normalizeAction } from '@/lib/obligations/machine';
import { DatabaseUnavailableError, groupAccess, groupIdsForWallet } from './access';
import { MAX_AMOUNT_UNITS, OBLIGATION_COLUMNS, fail, isUsableUuid, ok, type ApiResult, type Db } from './types';

/** Only what the wallet may see: obligations in its own groups, or naming it as debtor, creditor or proposer. */
export async function listObligations(db: Db, wallet: string): Promise<ApiResult> {
  const groupIds = await groupIdsForWallet(db, wallet);
  // wallet comes from a verified session (0x + 40 hex) and group ids from our own table, so these are safe to inline.
  const filters = [`debtor_address.eq.${wallet}`, `creditor_address.eq.${wallet}`, `proposer_address.eq.${wallet}`];
  if (groupIds.length > 0) filters.push(`group_id.in.(${groupIds.join(',')})`);

  const { data, error } = await db
    .from('obligations')
    .select(OBLIGATION_COLUMNS)
    .or(filters.join(','))
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) throw new DatabaseUnavailableError();
  return ok({ obligations: data || [] });
}

export async function proposeObligation(db: Db, body: any): Promise<ApiResult> {
  const { groupId, debtorAddress, creditorAddress, amountUnits, tokenAddress, referenceLabel, signerAddress, signature, nonce, timestamp } =
    body ?? {};

  if (!isUsableUuid(groupId)) return fail(400, 'Invalid group');
  if (![debtorAddress, creditorAddress, signerAddress].every((a) => typeof a === 'string' && isAddress(a))) {
    return fail(400, 'Invalid wallet address');
  }
  const debtor = debtorAddress.toLowerCase();
  const creditor = creditorAddress.toLowerCase();
  const signer = signerAddress.toLowerCase();
  if (debtor === creditor) return fail(400, 'Debtor and creditor cannot be the same address');

  // The signature covers this exact string, so it must be canonical: digits only, no leading zeros.
  if (typeof amountUnits !== 'string' || !/^[1-9][0-9]{0,38}$/.test(amountUnits) || BigInt(amountUnits) >= MAX_AMOUNT_UNITS) {
    return fail(400, 'Invalid amount');
  }

  const token = typeof tokenAddress === 'string' ? getTokenByAddress(tokenAddress) : undefined;
  if (!token) return fail(400, 'Unsupported settlement token');

  const label = typeof referenceLabel === 'string' ? referenceLabel.trim() : '';
  if (label.length === 0 || label.length > 150) return fail(400, 'Reference must be 1 to 150 characters');
  if (typeof signature !== 'string' || !signature.startsWith('0x')) return fail(400, 'Missing signature');
  if (referenceLabel.length > 400) return fail(400, 'Reference must be 1 to 150 characters'); // bound what we hash and verify

  // Cheapest checks first: freshness needs no network, the signature may, the nonce write is last.
  const fresh = isChallengeFresh(nonce, timestamp);
  if (!fresh.valid) return fail(401, fresh.reason || 'Invalid challenge');

  const message = buildProposeObligationMessage({
    action: 'propose',
    groupId,
    debtorAddress: debtor,
    creditorAddress: creditor,
    amountUnits,
    tokenAddress: token.address,
    referenceLabel: referenceLabel,
    nonce,
    timestamp,
  });
  if (!(await verifyChallengeSignature(message, signature as `0x${string}`, signer))) {
    return fail(401, 'Invalid cryptographic signature for proposed obligation');
  }

  const consumed = await validateAndConsumeNonce(nonce, timestamp, db);
  if (!consumed.valid) return fail(401, consumed.reason || 'Invalid challenge');

  // Proposer, debtor and creditor must all belong to this group (PRD Journey B).
  const access = await groupAccess(db, groupId, signer);
  if (!access.exists) return fail(404, 'Group not found');
  if (!access.isMember) return fail(403, 'Signer is not a member of this working group');
  if (!access.members.has(debtor) || !access.members.has(creditor)) {
    return fail(400, 'Debtor and creditor must both be members of this working group');
  }

  const { data, error } = await db
    .from('obligations')
    .insert({
      group_id: groupId,
      proposer_address: signer,
      debtor_address: debtor,
      creditor_address: creditor,
      amount_units: amountUnits,
      token_address: token.address.toLowerCase(),
      reference_label: label,
      status: 'proposed',
    })
    .select(OBLIGATION_COLUMNS)
    .single();

  if (error || !data) return fail(500, 'Failed to persist obligation');
  return ok({ success: true, obligation: data });
}

export async function changeObligationStatus(db: Db, body: any): Promise<ApiResult> {
  const { action, obligationId, signerAddress, signature, nonce, timestamp } = body ?? {};

  const normalized = normalizeAction(action);
  if (!normalized) return fail(400, 'Unsupported action');
  if (!isUsableUuid(obligationId)) return fail(400, 'Invalid obligation id');
  if (typeof signerAddress !== 'string' || !isAddress(signerAddress)) return fail(400, 'Invalid wallet address');
  if (typeof signature !== 'string' || !signature.startsWith('0x')) return fail(400, 'Missing signature');
  const signer = signerAddress.toLowerCase();

  const fresh = isChallengeFresh(nonce, timestamp);
  if (!fresh.valid) return fail(401, fresh.reason || 'Invalid challenge');

  // Older clients signed the raw action word ("accepted"), newer ones the normalized one ("accept").
  let valid = await verifyChallengeSignature(
    buildObligationActionMessage({ action: normalized, obligationId, nonce, timestamp }),
    signature as `0x${string}`,
    signer
  );
  if (!valid && action !== normalized) {
    valid = await verifyChallengeSignature(
      buildObligationActionMessage({ action: action as any, obligationId, nonce, timestamp }),
      signature as `0x${string}`,
      signer
    );
  }
  if (!valid) return fail(401, 'Invalid cryptographic signature');

  const consumed = await validateAndConsumeNonce(nonce, timestamp, db);
  if (!consumed.valid) return fail(401, consumed.reason || 'Invalid challenge');

  const { data: existing, error: readError } = await db.from('obligations').select(OBLIGATION_COLUMNS).eq('id', obligationId).maybeSingle();
  if (readError) throw new DatabaseUnavailableError(); // a failed read is not "not found"
  if (!existing) return fail(404, 'Obligation not found');

  // Lifecycle rules (state first, then role) live in one shared machine; see src/lib/obligations/machine.ts.
  const decision = decide(
    normalized,
    existing.status,
    { debtor: existing.debtor_address, creditor: existing.creditor_address, proposer: existing.proposer_address },
    signer
  );
  if (!decision.ok) return fail(decision.status, decision.reason, decision.code);

  const now = new Date().toISOString();
  const patch: Record<string, string> = { status: decision.to, updated_at: now };
  if (decision.to === 'accepted') patch.accepted_at = now;
  if (decision.to === 'disputed') patch.disputed_at = now;

  // The status in the WHERE clause makes this atomic: if another request changed the row after we read it,
  // nothing matches and we answer 409 instead of silently overwriting that change.
  const { data: updated, error } = await db
    .from('obligations')
    .update(patch)
    .eq('id', obligationId)
    .eq('status', existing.status)
    .select(OBLIGATION_COLUMNS)
    .maybeSingle();

  if (error) return fail(500, 'Failed to update obligation status');
  if (!updated) return fail(409, 'This obligation was changed by someone else. Refresh and try again.');
  return ok({ success: true, obligation: updated });
}
