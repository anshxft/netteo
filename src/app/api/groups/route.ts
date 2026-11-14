import { NextRequest, NextResponse } from 'next/server';
import { createGroup, listGroups, updateGroupParticipants } from '@/lib/api/groups';
import { guarded, readJson, requireDb, requireWallet } from '@/lib/api/route';

export const dynamic = 'force-dynamic';

/** GET /api/groups: the groups the signed-in wallet created or belongs to. Nothing else is returned. */
export async function GET(req: NextRequest) {
  const auth = requireWallet(req);
  if ('response' in auth) return auth.response;
  const database = requireDb();
  if ('response' in database) return database.response;
  return guarded(() => listGroups(database.db, auth.wallet));
}

/**
 * POST /api/groups
 * - create_group: signed by the creator's wallet.
 * - update_participants: needs a session; only the group's creator or an admin may change members.
 */
export async function POST(req: NextRequest) {
  const database = requireDb();
  if ('response' in database) return database.response;

  const body = await readJson(req);
  if (!body) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

  if (body.action === 'update_participants') {
    const auth = requireWallet(req);
    if ('response' in auth) return auth.response;
    return guarded(() => updateGroupParticipants(database.db, auth.wallet, body));
  }
  return guarded(() => createGroup(database.db, body));
}
