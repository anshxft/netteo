import { NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/db/supabase';
import { sessionFromRequest } from '@/lib/auth/session';
import { ChainUnavailableError, DatabaseUnavailableError } from './access';
import type { ApiResult, Db } from './types';

export const toResponse = (result: ApiResult) => NextResponse.json(result.body, { status: result.status });

/**
 * The service client is the only database access the API has. If it is not configured the API fails closed:
 * there is deliberately no fallback to the public client, which has no rights on these tables.
 */
export function requireDb(): { db: Db } | { response: NextResponse } {
  const db = getServiceRoleClient();
  return db ? { db } : { response: NextResponse.json({ error: 'Service unavailable' }, { status: 503 }) };
}

/** The wallet behind a valid session token, or a 401 response. */
export function requireWallet(req: Request): { wallet: string } | { response: NextResponse } {
  const session = sessionFromRequest(req);
  return session
    ? { wallet: session.address }
    : { response: NextResponse.json({ error: 'Sign in with your wallet to continue' }, { status: 401 }) };
}

/** Runs a handler and maps a database outage to 503 (retry later) instead of an empty or misleading answer. */
export async function guarded(run: () => Promise<ApiResult>): Promise<NextResponse> {
  try {
    return toResponse(await run());
  } catch (err) {
    if (err instanceof ChainUnavailableError) {
      return NextResponse.json({ error: 'Could not verify the cycle on-chain right now. Try again shortly.' }, { status: 502 });
    }
    if (err instanceof DatabaseUnavailableError) {
      return NextResponse.json({ error: 'Service temporarily unavailable. Try again shortly.' }, { status: 503 });
    }
    console.error('[API] Unexpected error:', err instanceof Error ? err.message : 'unknown');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function readJson(req: Request): Promise<any | null> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}
