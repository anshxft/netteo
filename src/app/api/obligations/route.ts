import { NextRequest, NextResponse } from 'next/server';
import { changeObligationStatus, listObligations, proposeObligation } from '@/lib/api/obligations';
import { guarded, readJson, requireDb, requireWallet } from '@/lib/api/route';

export const dynamic = 'force-dynamic';

/** GET /api/obligations: only obligations in the signed-in wallet's own groups (or naming it). */
export async function GET(req: NextRequest) {
  const auth = requireWallet(req);
  if ('response' in auth) return auth.response;
  const database = requireDb();
  if ('response' in database) return database.response;
  return guarded(() => listObligations(database.db, auth.wallet));
}

/**
 * POST /api/obligations
 * Cryptographically authenticated mutations; each request carries its own wallet signature:
 * - propose: a group member records a claim
 * - accept / dispute: the designated debtor, on a proposed claim
 * - withdraw: the proposer or creditor, on a proposed claim
 */
export async function POST(req: NextRequest) {
  const database = requireDb();
  if ('response' in database) return database.response;

  const body = await readJson(req);
  if (!body) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

  return guarded(() =>
    body.action === 'propose' ? proposeObligation(database.db, body) : changeObligationStatus(database.db, body)
  );
}
