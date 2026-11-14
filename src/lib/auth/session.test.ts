import assert from 'node:assert/strict';
import { SESSION_TTL_MS, createSessionToken, safeEqual, sessionFromRequest, verifySessionToken } from './session';

const SECRET = 'test-secret-that-is-at-least-32-characters-long';
const OTHER_SECRET = 'a-completely-different-secret-of-32-chars-plus';
const ADDRESS = '0xAbCdEf0123456789aBcDeF0123456789AbCdEf01';
const NOW = 1_800_000_000_000;

// --- Round trip: the address comes back lowercase and the expiry is one TTL away ---
const { token, expiresAt } = createSessionToken(ADDRESS, NOW, SECRET);
assert.equal(expiresAt, NOW + SESSION_TTL_MS);
const claims = verifySessionToken(token, NOW + 1000, SECRET);
assert.deepEqual(claims, { address: ADDRESS.toLowerCase(), expiresAt });

// --- Expired tokens are refused, even though the signature is valid ---
assert.equal(verifySessionToken(token, expiresAt, SECRET), null, 'expiry is exclusive');
assert.equal(verifySessionToken(token, expiresAt + 1, SECRET), null);

// --- A token signed with another secret is refused ---
assert.equal(verifySessionToken(token, NOW, OTHER_SECRET), null);

// --- Tampering with the payload (swap in another wallet) breaks the signature ---
const [payload, mac] = token.split('.');
const forgedPayload = Buffer.from(JSON.stringify({ a: '0x' + '11'.repeat(20), e: expiresAt })).toString('base64url');
assert.equal(verifySessionToken(`${forgedPayload}.${mac}`, NOW, SECRET), null, 'forged wallet must not verify');
assert.equal(verifySessionToken(`${payload}.${mac.slice(0, -2)}AA`, NOW, SECRET), null, 'altered mac must not verify');

// --- Garbage never verifies, and never throws ---
for (const bad of [undefined, null, '', 'abc', 'a.b.c', '.', 'x'.repeat(2000), `${payload}.`, `.${mac}`]) {
  assert.equal(verifySessionToken(bad as any, NOW, SECRET), null, `rejects ${String(bad).slice(0, 20)}`);
}

// --- A short or missing secret fails closed: nothing is issued or accepted ---
assert.throws(() => createSessionToken(ADDRESS, NOW, 'too-short'), /SESSION_SECRET/);
assert.equal(verifySessionToken(token, NOW, 'too-short'), null);

// --- A signed payload whose address is not a real address is refused ---
const badAddress = Buffer.from(JSON.stringify({ a: 'not-an-address', e: NOW + 1000 })).toString('base64url');
const crypto = await import('node:crypto');
const badMac = crypto.createHmac('sha256', SECRET).update(badAddress).digest('base64url');
assert.equal(verifySessionToken(`${badAddress}.${badMac}`, NOW, SECRET), null);

// --- Reading the Authorization header ---
process.env.SESSION_SECRET = SECRET;
const live = createSessionToken(ADDRESS, Date.now()).token;
const ok = sessionFromRequest(new Request('http://x', { headers: { authorization: `Bearer ${live}` } }));
assert.equal(ok?.address, ADDRESS.toLowerCase());
assert.equal(sessionFromRequest(new Request('http://x')), null, 'no header');
assert.equal(sessionFromRequest(new Request('http://x', { headers: { authorization: live } })), null, 'missing Bearer prefix');
assert.equal(sessionFromRequest(new Request('http://x', { headers: { authorization: 'Bearer nope' } })), null);

// --- Constant-time compare handles different lengths without throwing ---
assert.equal(safeEqual('abc', 'abc'), true);
assert.equal(safeEqual('abc', 'abd'), false);
assert.equal(safeEqual('abc', 'abcd'), false);
assert.equal(safeEqual('', ''), true);

console.log('Session token checks passed.');
