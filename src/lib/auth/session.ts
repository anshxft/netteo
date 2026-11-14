import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Short-lived wallet session for the API.
 *
 * A wallet proves itself once by signing a message (see POST /api/session). The server then hands back
 * a token it can verify later without a database: base64url(payload) + "." + base64url(HMAC-SHA256).
 * Reads (groups, obligations, cycles) use this token so each response is limited to that wallet's data.
 * Writes that need explicit intent (propose, accept, dispute, withdraw, create group) still carry their own
 * signature on top.
 *
 * The secret is SESSION_SECRET (at least 32 characters). With no secret configured, nothing can be issued
 * or verified, so the API fails closed.
 */

export const SESSION_TTL_MS = 60 * 60 * 1000;

export interface SessionClaims {
  address: string; // lowercase 0x address
  expiresAt: number; // ms since epoch
}

function getSecret(override?: string): string | null {
  const secret = override ?? process.env.SESSION_SECRET;
  return secret && secret.length >= 32 ? secret : null;
}

export function isSessionConfigured(): boolean {
  return getSecret() !== null;
}

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

/** Constant-time string comparison that is safe for inputs of different length. */
export function safeEqual(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function createSessionToken(address: string, now = Date.now(), secretOverride?: string): { token: string; expiresAt: number } {
  const secret = getSecret(secretOverride);
  if (!secret) throw new Error('SESSION_SECRET is not configured.');
  const expiresAt = now + SESSION_TTL_MS;
  const payload = Buffer.from(JSON.stringify({ a: address.toLowerCase(), e: expiresAt })).toString('base64url');
  return { token: `${payload}.${sign(payload, secret)}`, expiresAt };
}

export function verifySessionToken(token: string | null | undefined, now = Date.now(), secretOverride?: string): SessionClaims | null {
  const secret = getSecret(secretOverride);
  if (!secret || !token || token.length > 1024) return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, mac] = parts;
  if (!safeEqual(mac, sign(payload, secret))) return null;

  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (typeof claims.a !== 'string' || !/^0x[0-9a-f]{40}$/.test(claims.a)) return null;
    if (typeof claims.e !== 'number' || claims.e <= now) return null;
    return { address: claims.a, expiresAt: claims.e };
  } catch {
    return null;
  }
}

/** Reads "Authorization: Bearer <token>" from a request and returns the verified wallet, or null. */
export function sessionFromRequest(req: Request): SessionClaims | null {
  const header = req.headers.get('authorization') || '';
  const match = /^Bearer (.+)$/.exec(header);
  return match ? verifySessionToken(match[1]) : null;
}
