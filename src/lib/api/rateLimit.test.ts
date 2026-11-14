import assert from 'node:assert/strict';
import { callerKey, consume, rateLimited, resetRateLimits } from './rateLimit';

const T0 = 1_000_000;

// Within the limit: allowed. Over it: refused with a retry time. A new window: allowed again.
for (let i = 0; i < 3; i++) assert.equal(consume('k', 3, 60_000, T0).allowed, true, `call ${i + 1} of 3`);
const over = consume('k', 3, 60_000, T0 + 1_000);
assert.equal(over.allowed, false);
assert.equal(over.retryAfter, 59, 'retry-after counts down to the window reset');
assert.equal(consume('k', 3, 60_000, T0 + 60_001).allowed, true, 'a new window resets the count');

// Callers do not share a budget.
for (let i = 0; i < 5; i++) consume('a', 1, 60_000, T0);
assert.equal(consume('a', 1, 60_000, T0).allowed, false);
assert.equal(consume('b', 1, 60_000, T0).allowed, true);

// Memory stays bounded under a flood of distinct callers.
resetRateLimits();
for (let i = 0; i < 12_000; i++) consume(`flood-${i}`, 1, 60_000, T0);
assert.equal(consume('after-flood', 1, 60_000, T0).allowed, true, 'still serving after a flood');

// Caller identity: first forwarded address wins, then x-real-ip, else a shared bucket.
const req = (h: Record<string, string>) => new Request('http://x.test', { headers: h });
assert.equal(callerKey(req({ 'x-forwarded-for': '1.2.3.4, 10.0.0.1' })), '1.2.3.4');
assert.equal(callerKey(req({ 'x-real-ip': '5.6.7.8' })), '5.6.7.8');
assert.equal(callerKey(req({})), 'unknown');

// The helper returns a 429 with Retry-After once a caller exceeds the session budget (10 a minute).
resetRateLimits();
const r = req({ 'x-forwarded-for': '9.9.9.9' });
for (let i = 0; i < 10; i++) assert.equal(rateLimited(r, 'session'), null);
const blocked = rateLimited(r, 'session');
assert.equal(blocked?.status, 429);
assert.ok(Number(blocked?.headers.get('Retry-After')) >= 1);
assert.equal(rateLimited(req({ 'x-forwarded-for': '8.8.8.8' }), 'session'), null, 'another caller is unaffected');

console.log('Rate limiter checks passed.');
