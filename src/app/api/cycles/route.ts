import { NextRequest, NextResponse, after } from 'next/server';
import { listCycles, registerCycle } from '@/lib/api/cycles';
import { viemChainReader } from '@/lib/api/chainReader';
import { guarded, readJson, requireDb, requireWallet } from '@/lib/api/route';
import { rateLimited } from '@/lib/api/rateLimit';
import { maybeRunIndexer } from '@/lib/indexer/trigger';

export const dynamic = 'force-dynamic';

/** GET /api/cycles: registered cycles for the signed-in wallet's groups. Also queues a throttled index run. */
export async function GET(req: NextRequest) {
  const slow = rateLimited(req, 'read');
  if (slow) return slow;
  const auth = requireWallet(req);
  if ('response' in auth) return auth.response;
  const database = requireDb();
  if ('response' in database) return database.response;

  after(() => maybeRunIndexer());
  return guarded(() => listCycles(database.db, auth.wallet));
}

/**
 * POST /api/cycles
 * Registers an on-chain cycle against a group. The server checks that the contract's commitment, totals and
 * per-wallet amounts match the group's accepted obligations, and that the signed-in wallet created it.
 */
export async function POST(req: NextRequest) {
  const slow = rateLimited(req, 'write');
  if (slow) return slow;
  const auth = requireWallet(req);
  if ('response' in auth) return auth.response;
  const database = requireDb();
  if ('response' in database) return database.response;

  const body = await readJson(req);
  if (!body) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

  try {
    return await guarded(() => registerCycle(database.db, auth.wallet, body, { chain: viemChainReader() }));
  } catch {
    // Not reachable in practice (guarded never throws); kept so a chain-read failure can never leak details.
    return NextResponse.json({ error: 'Could not verify the cycle on-chain right now. Try again shortly.' }, { status: 502 });
  }
}
