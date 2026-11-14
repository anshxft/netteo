import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { buildSessionMessage, isChallengeFresh, validateAndConsumeNonce, verifyChallengeSignature } from '@/lib/auth/challenge';
import { createSessionToken, isSessionConfigured } from '@/lib/auth/session';
import { readJson, requireDb } from '@/lib/api/route';
import { rateLimited } from '@/lib/api/rateLimit';

export const dynamic = 'force-dynamic';

/**
 * POST /api/session
 * A wallet signs a short message once and gets back a token that lets it read its own groups, payments and
 * settlements for an hour. No funds move and no gas is spent.
 */
export async function POST(req: NextRequest) {
  const slow = rateLimited(req, 'session');
  if (slow) return slow;
  if (!isSessionConfigured()) {
    console.error('[API session] SESSION_SECRET is missing or shorter than 32 characters.');
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }
  const database = requireDb();
  if ('response' in database) return database.response;

  const body = await readJson(req);
  const { address, signature, nonce, timestamp } = body ?? {};
  if (typeof address !== 'string' || !isAddress(address) || typeof signature !== 'string' || !signature.startsWith('0x')) {
    return NextResponse.json({ error: 'Invalid sign-in request' }, { status: 400 });
  }

  const fresh = isChallengeFresh(nonce, timestamp);
  if (!fresh.valid) return NextResponse.json({ error: fresh.reason }, { status: 401 });

  if (!(await verifyChallengeSignature(buildSessionMessage({ nonce, timestamp }), signature as `0x${string}`, address))) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const consumed = await validateAndConsumeNonce(nonce, timestamp, database.db);
  if (!consumed.valid) return NextResponse.json({ error: consumed.reason }, { status: 401 });

  const { token, expiresAt } = createSessionToken(address);
  return NextResponse.json({ token, expiresAt });
}
