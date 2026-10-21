import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient, supabase as publicSupabase } from '@/lib/db/supabase';
import {
  buildObligationActionMessage,
  buildProposeObligationMessage,
  verifyChallengeSignature,
  validateAndConsumeNonce,
} from '@/lib/auth/challenge';

function getDbClient() {
  return getServiceRoleClient() || publicSupabase;
}

/**
 * GET /api/obligations
 * Returns active obligations (optionally filtered by groupId or participant wallet).
 */
export async function GET(req: NextRequest) {
  const db = getDbClient();
  if (!db) {
    return NextResponse.json({ error: 'Database service unavailable' }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get('groupId');
  const participant = searchParams.get('participant');

  try {
    let query = db.from('obligations').select('*').order('created_at', { ascending: false });

    if (groupId) {
      query = query.eq('group_id', groupId);
    }
    if (participant) {
      const lower = participant.toLowerCase();
      query = query.or(`debtor_address.eq.${lower},creditor_address.eq.${lower},proposer_address.eq.${lower}`);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: 'Failed to retrieve obligations' }, { status: 500 });
    }

    return NextResponse.json({ obligations: data || [] });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/obligations
 * Processes cryptographically authenticated obligation mutations:
 * - 'propose': proposer creates a new obligation
 * - 'accept': designated debtor accepts the obligation
 * - 'dispute': designated debtor disputes the obligation
 * - 'withdraw': proposer or creditor withdraws the obligation
 */
export async function POST(req: NextRequest) {
  const db = getDbClient();
  if (!db) {
    return NextResponse.json({ error: 'Database service unavailable' }, { status: 503 });
  }

  try {
    const body = await req.json();
    const { action, signerAddress, signature, nonce, timestamp } = body;

    if (!action || !signerAddress || !signature || !nonce || !timestamp) {
      return NextResponse.json({ error: 'Missing required challenge parameters' }, { status: 400 });
    }

    // 1. Replay & Timestamp Protection
    const nonceCheck = validateAndConsumeNonce(nonce, timestamp);
    if (!nonceCheck.valid) {
      return NextResponse.json({ error: nonceCheck.reason }, { status: 401 });
    }

    const normalizedSigner = signerAddress.toLowerCase();

    // 2. Action: PROPOSE
    if (action === 'propose') {
      const { groupId, debtorAddress, creditorAddress, amountUnits, referenceLabel, obligationId } = body;

      if (!groupId || !debtorAddress || !creditorAddress || !amountUnits || !referenceLabel) {
        return NextResponse.json({ error: 'Missing obligation proposal fields' }, { status: 400 });
      }

      const normDebtor = debtorAddress.toLowerCase();
      const normCreditor = creditorAddress.toLowerCase();

      if (normDebtor === normCreditor) {
        return NextResponse.json({ error: 'Debtor and creditor cannot be the same address' }, { status: 400 });
      }

      try {
        const units = BigInt(amountUnits);
        if (units <= 0n) {
          return NextResponse.json({ error: 'Obligation amount must be positive' }, { status: 400 });
        }
      } catch {
        return NextResponse.json({ error: 'Invalid integer base units amount' }, { status: 400 });
      }

      // Verify signature over propose message
      const challengeMsg = buildProposeObligationMessage({
        action: 'propose',
        groupId,
        debtorAddress: normDebtor,
        creditorAddress: normCreditor,
        amountUnits,
        referenceLabel,
        nonce,
        timestamp,
      });

      const isSigValid = await verifyChallengeSignature(challengeMsg, signature, normalizedSigner);
      if (!isSigValid) {
        return NextResponse.json({ error: 'Invalid cryptographic signature for proposed obligation' }, { status: 401 });
      }

      // Ensure proposer is part of the working group
      const { data: memberData } = await db
        .from('group_members')
        .select('wallet_address')
        .eq('group_id', groupId)
        .eq('wallet_address', normalizedSigner)
        .maybeSingle();

      if (!memberData) {
        // Also allow group creator to propose
        const { data: groupData } = await db
          .from('groups')
          .select('creator_address')
          .eq('id', groupId)
          .maybeSingle();

        if (!groupData || groupData.creator_address.toLowerCase() !== normalizedSigner) {
          return NextResponse.json({ error: 'Signer is not an authorized member of this working group' }, { status: 403 });
        }
      }

      const id = obligationId || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : undefined);

      const { data: inserted, error: insertErr } = await db
        .from('obligations')
        .insert({
          ...(id ? { id } : {}),
          group_id: groupId,
          proposer_address: normalizedSigner,
          debtor_address: normDebtor,
          creditor_address: normCreditor,
          amount_units: amountUnits,
          reference_label: referenceLabel.trim(),
          status: 'proposed',
        })
        .select()
        .single();

      if (insertErr) {
        return NextResponse.json({ error: 'Failed to persist obligation' }, { status: 500 });
      }

      return NextResponse.json({ success: true, obligation: inserted });
    }

    // 3. Actions: ACCEPT, DISPUTE, WITHDRAW
    if (action === 'accept' || action === 'dispute' || action === 'withdraw') {
      const { obligationId } = body;
      if (!obligationId) {
        return NextResponse.json({ error: 'Missing obligation ID' }, { status: 400 });
      }

      // Verify challenge signature
      const challengeMsg = buildObligationActionMessage({
        action,
        obligationId,
        nonce,
        timestamp,
      });

      const isSigValid = await verifyChallengeSignature(challengeMsg, signature, normalizedSigner);
      if (!isSigValid) {
        return NextResponse.json({ error: 'Invalid cryptographic signature' }, { status: 401 });
      }

      // Fetch existing obligation
      const { data: existing, error: fetchErr } = await db
        .from('obligations')
        .select('*')
        .eq('id', obligationId)
        .maybeSingle();

      if (fetchErr || !existing) {
        return NextResponse.json({ error: 'Obligation not found' }, { status: 404 });
      }

      if (existing.status === 'frozen' || existing.status === 'settled') {
        return NextResponse.json({ error: `Cannot modify obligation in ${existing.status} status` }, { status: 400 });
      }

      // Check role permissions:
      // ACCEPT / DISPUTE: Only designated debtor can accept or dispute
      if (action === 'accept' || action === 'dispute') {
        if (existing.debtor_address.toLowerCase() !== normalizedSigner) {
          return NextResponse.json(
            { error: 'Forbidden: Only the designated debtor can accept or dispute this obligation' },
            { status: 403 }
          );
        }
      }

      // WITHDRAW: Only proposer or creditor can withdraw
      if (action === 'withdraw') {
        const isProposer = existing.proposer_address.toLowerCase() === normalizedSigner;
        const isCreditor = existing.creditor_address.toLowerCase() === normalizedSigner;
        if (!isProposer && !isCreditor) {
          return NextResponse.json(
            { error: 'Forbidden: Only the proposer or creditor can withdraw this obligation' },
            { status: 403 }
          );
        }
      }

      const targetStatus = action === 'accept' ? 'accepted' : action === 'dispute' ? 'disputed' : 'withdrawn';

      const { data: updated, error: updateErr } = await db
        .from('obligations')
        .update({
          status: targetStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', obligationId)
        .select()
        .single();

      if (updateErr) {
        return NextResponse.json({ error: 'Failed to update obligation status' }, { status: 500 });
      }

      return NextResponse.json({ success: true, obligation: updated });
    }

    return NextResponse.json({ error: `Unsupported action: ${action}` }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
