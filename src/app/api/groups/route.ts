import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { getServiceRoleClient, supabase as publicSupabase } from '@/lib/db/supabase';
import {
  buildCreateGroupMessage,
  verifyChallengeSignature,
  validateAndConsumeNonce,
} from '@/lib/auth/challenge';

function getDbClient() {
  return getServiceRoleClient() || publicSupabase;
}

/**
 * GET /api/groups
 * Retrieves working groups and their participant lists.
 */
export async function GET(req: NextRequest) {
  const db = getDbClient();
  if (!db) {
    return NextResponse.json({ error: 'Database service unavailable' }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const participant = searchParams.get('participant');

  if (participant && !isAddress(participant)) {
    return NextResponse.json({ error: 'Invalid participant address format' }, { status: 400 });
  }

  try {
    let groupsQuery = db
      .from('groups')
      .select('id, name, description, creator_address, created_at')
      .order('created_at', { ascending: true });

    if (participant) {
      const lower = participant.toLowerCase();
      const { data: memberships } = await db
        .from('group_members')
        .select('group_id')
        .eq('wallet_address', lower);

      const userGroupIds = (memberships || []).map((m: any) => m.group_id);
      if (userGroupIds.length > 0) {
        groupsQuery = groupsQuery.or(`creator_address.eq.${lower},id.in.(${userGroupIds.join(',')})`);
      } else {
        groupsQuery = groupsQuery.eq('creator_address', lower);
      }
    }

    const { data: groupsData, error: groupsError } = await groupsQuery;

    if (groupsError) {
      return NextResponse.json({ error: 'Failed to retrieve working groups' }, { status: 500 });
    }

    if (!groupsData || groupsData.length === 0) {
      return NextResponse.json({ groups: [] });
    }

    const groupIds = groupsData.map((g: any) => g.id);
    const { data: membersData, error: membersError } = await db
      .from('group_members')
      .select('group_id, wallet_address, role')
      .in('group_id', groupIds);

    if (membersError) {
      return NextResponse.json({ error: 'Failed to retrieve group memberships' }, { status: 500 });
    }

    const membersByGroup: Record<string, string[]> = {};
    if (membersData) {
      for (const m of membersData) {
        if (!membersByGroup[m.group_id]) membersByGroup[m.group_id] = [];
        membersByGroup[m.group_id].push(m.wallet_address);
      }
    }

    let groups = groupsData.map((g: any) => ({
      id: g.id,
      name: g.name,
      description: g.description || '',
      creatorAddress: g.creator_address,
      participantLimit: 10,
      participants: membersByGroup[g.id] || [g.creator_address],
      createdAt: g.created_at,
      status: 'active',
    }));

    if (participant) {
      const lower = participant.toLowerCase();
      groups = groups.filter((g: any) => g.participants.some((p: string) => p.toLowerCase() === lower));
    }

    return NextResponse.json({ groups });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/groups
 * Creates a new working group with cryptographic authorization.
 */
export async function POST(req: NextRequest) {
  const db = getDbClient();
  if (!db) {
    return NextResponse.json({ error: 'Database service unavailable' }, { status: 503 });
  }

  try {
    const body = await req.json();
    const { action, name, description, participants, signerAddress, signature, nonce, timestamp, groupId } = body;

    if (action !== 'create_group') {
      return NextResponse.json({ error: `Unsupported action: ${action}` }, { status: 400 });
    }

    if (!name || !signerAddress || !signature || !nonce || !timestamp) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // 1. Replay & Timestamp Protection
    const nonceCheck = await validateAndConsumeNonce(nonce, timestamp);
    if (!nonceCheck.valid) {
      return NextResponse.json({ error: nonceCheck.reason }, { status: 401 });
    }

    const normalizedSigner = signerAddress.toLowerCase();
    const participantList: string[] = Array.isArray(participants) ? participants : [];

    // Ensure signer is included in participants
    if (!participantList.some((p) => p.toLowerCase() === normalizedSigner)) {
      participantList.push(normalizedSigner);
    }

    if (participantList.length > 10) {
      return NextResponse.json({ error: 'Participant limit exceeded (maximum 10 members allowed)' }, { status: 400 });
    }

    // 2. Verify signature
    const challengeMsg = buildCreateGroupMessage({
      action: 'create_group',
      name: name.trim(),
      description: (description || '').trim(),
      participants: participantList,
      nonce,
      timestamp,
    });

    const isSigValid = await verifyChallengeSignature(challengeMsg, signature, normalizedSigner);
    if (!isSigValid) {
      return NextResponse.json({ error: 'Invalid cryptographic signature for group creation' }, { status: 401 });
    }

    const id = groupId || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : undefined);

    // 3. Persist group
    const { data: insertedGroup, error: groupErr } = await db
      .from('groups')
      .insert({
        ...(id ? { id } : {}),
        name: name.trim(),
        description: (description || '').trim(),
        creator_address: normalizedSigner,
      })
      .select()
      .single();

    if (groupErr || !insertedGroup) {
      console.error('[API groups] Group insert error:', groupErr);
      const detail = groupErr?.code === '42501'
        ? 'Database permission denied (RLS policy). Configure SUPABASE_SERVICE_ROLE_KEY or run enable_writes.sql.'
        : (groupErr?.message || 'Failed to create working group');
      return NextResponse.json({ error: detail }, { status: 500 });
    }

    // 4. Persist group members
    const memberRows = participantList.map((addr) => ({
      group_id: insertedGroup.id,
      wallet_address: addr.toLowerCase(),
      role: addr.toLowerCase() === normalizedSigner ? 'admin' : 'member',
    }));

    const { error: membersErr } = await db
      .from('group_members')
      .upsert(memberRows, { onConflict: 'group_id,wallet_address' });

    if (membersErr) {
      console.error('[API groups] Members insert error:', membersErr);
      return NextResponse.json({ error: 'Failed to register group participants' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      group: {
        id: insertedGroup.id,
        name: insertedGroup.name,
        description: insertedGroup.description || '',
        creatorAddress: insertedGroup.creator_address,
        participantLimit: 10,
        participants: participantList,
        createdAt: insertedGroup.created_at,
        status: 'active',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
