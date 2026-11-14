import { buildSessionMessage } from './challenge';

/**
 * Browser side of the API session (see session.ts). The wallet signs one short message, the server returns a
 * token valid for an hour, and every private read sends it as "Authorization: Bearer ...".
 *
 * The signer is registered by <SessionBridge/> from the connected wallet. With no signer, or if the user
 * declines the signature prompt, reads return null and the app keeps working from its local copy; the prompt is
 * not repeated until the wallet changes or the page reloads.
 */

export interface SessionSigner {
  address: string;
  sign: (message: string) => Promise<string>;
}

const STORAGE_KEY = 'netteo_session_v1';
const EARLY_EXPIRY_MS = 60_000; // refresh a minute before the server would reject it

let signer: SessionSigner | null = null;
let pending: Promise<string | null> | null = null;
let declinedFor: string | null = null;

function readCached(address: string): string | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (cached.address === address.toLowerCase() && typeof cached.token === 'string' && cached.expiresAt - EARLY_EXPIRY_MS > Date.now()) {
      return cached.token;
    }
  } catch {
    // Storage can be unavailable or corrupt; fall through to a fresh sign-in.
  }
  return null;
}

function writeCached(address: string, token: string, expiresAt: number) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ address: address.toLowerCase(), token, expiresAt }));
  } catch {
    // Non-fatal: the next read just signs in again.
  }
}

function clearCached() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function setSessionSigner(next: SessionSigner | null) {
  if (next?.address.toLowerCase() !== signer?.address.toLowerCase()) {
    pending = null;
    declinedFor = null;
  }
  signer = next;
  if (!next) clearCached();
}

/** The current wallet's token, signing in first if needed. Null when there is no wallet or it was declined. */
export function getSessionToken(): Promise<string | null> {
  const current = signer;
  if (!current) return Promise.resolve(null);

  const cached = readCached(current.address);
  if (cached) return Promise.resolve(cached);
  if (declinedFor === current.address.toLowerCase()) return Promise.resolve(null);
  if (pending) return pending;

  pending = (async () => {
    try {
      const nonce = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `nonce-${Date.now()}`;
      const timestamp = Date.now();
      const signature = await current.sign(buildSessionMessage({ nonce, timestamp }));

      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: current.address, signature, nonce, timestamp }),
      });
      if (!res.ok) return null;

      const { token, expiresAt } = await res.json();
      writeCached(current.address, token, expiresAt);
      return token as string;
    } catch {
      // The user closed or rejected the wallet prompt, or the network failed: do not nag again this session.
      declinedFor = current.address.toLowerCase();
      return null;
    } finally {
      pending = null;
    }
  })();
  return pending;
}

/** Signs with the connected wallet, but only if it is the expected address. Null if unavailable or declined. */
export async function signWithWallet(address: string, message: string): Promise<string | null> {
  if (!signer || signer.address.toLowerCase() !== address.toLowerCase()) return null;
  try {
    return await signer.sign(message);
  } catch {
    return null;
  }
}

/** fetch() with the session token attached. Returns null when there is no session to send. */
export async function authedFetch(input: string, init: RequestInit = {}): Promise<Response | null> {
  const token = await getSessionToken();
  if (!token) return null;

  const res = await fetch(input, { ...init, headers: { ...(init.headers || {}), Authorization: `Bearer ${token}` } });
  if (res.status === 401) clearCached(); // expired or revoked: sign in again next time
  return res;
}
