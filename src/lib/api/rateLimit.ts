import { NextResponse } from 'next/server';

/**
 * Fixed-window rate limiter keyed by caller. It slows down guessing and flooding; it does not replace signature
 * checks (which are the real boundary) or a platform firewall.
 *
 * shortcut: counters live in this serverless instance's memory, so the effective limit is per instance. Upgrade to a
 * shared store (Redis / Upstash) or Vercel's firewall rate limiting if abuse appears.
 */
interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
const MAX_TRACKED = 5_000;

export interface RateDecision {
  allowed: boolean;
  /** Seconds until the caller may try again; 0 when allowed. */
  retryAfter: number;
}

export function consume(key: string, limit: number, windowMs: number, now = Date.now()): RateDecision {
  if (buckets.size > MAX_TRACKED) {
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
    // Still full of live entries: drop the oldest so memory stays bounded.
    if (buckets.size > MAX_TRACKED) buckets.delete(buckets.keys().next().value as string);
  }

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }
  bucket.count += 1;
  if (bucket.count > limit) return { allowed: false, retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
  return { allowed: true, retryAfter: 0 };
}

export function resetRateLimits(): void {
  buckets.clear();
}

/** Best-effort caller id. Behind Vercel the first x-forwarded-for entry is the client. */
export function callerKey(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || req.headers.get('x-real-ip') || 'unknown';
}

export const LIMITS = {
  /** Sign-in and any request that carries a signature: cheap to forge-attempt, so keep it tight. */
  write: { limit: 30, windowMs: 60_000 },
  session: { limit: 10, windowMs: 60_000 },
  read: { limit: 120, windowMs: 60_000 },
} as const;

/** Returns a 429 response when the caller is over the limit for this bucket, otherwise null. */
export function rateLimited(req: Request, bucket: keyof typeof LIMITS): NextResponse | null {
  const { limit, windowMs } = LIMITS[bucket];
  const decision = consume(`${bucket}:${callerKey(req)}`, limit, windowMs);
  if (decision.allowed) return null;
  return NextResponse.json(
    { error: 'Too many requests. Please wait a moment and try again.' },
    { status: 429, headers: { 'Retry-After': String(decision.retryAfter) } }
  );
}
