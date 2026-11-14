import assert from 'node:assert/strict';
import { parseAmountToBaseUnits, formatBaseUnitsToDisplay } from './store';
import { CANONICAL_MEZO_TOKENS } from '@/lib/chain/tokens';

const MUSD = CANONICAL_MEZO_TOKENS.MUSD; // 18 decimals
const MUSDC = CANONICAL_MEZO_TOKENS.mUSDC; // 6 decimals

// --- 18-decimal path (MUSD) ---

assert.equal(parseAmountToBaseUnits('1', 18), 10n ** 18n);
assert.equal(parseAmountToBaseUnits('100', 18), 100n * 10n ** 18n);
assert.equal(parseAmountToBaseUnits('80.50', 18), 80_500_000_000_000_000_000n);
assert.equal(parseAmountToBaseUnits('0.000000000000000001', 18), 1n);

// --- 6-decimal path (mUSDC / mUSDT) ---
// This is the regression the whole file exists for: a hardcoded 18 would have
// returned 1500000000000000000 here, inflating the amount by 10^12.

assert.equal(parseAmountToBaseUnits('1.5', 6), 1_500_000n);
assert.equal(parseAmountToBaseUnits('1', 6), 1_000_000n);
assert.equal(parseAmountToBaseUnits('0.000001', 6), 1n);
assert.equal(parseAmountToBaseUnits('250.25', 6), 250_250_000n);
assert.notEqual(parseAmountToBaseUnits('1.5', 6), parseAmountToBaseUnits('1.5', 18));

// Parsing with each registry token's real decimals agrees with the token metadata.
assert.equal(parseAmountToBaseUnits('1', MUSD.decimals), 10n ** 18n);
assert.equal(parseAmountToBaseUnits('1', MUSDC.decimals), 10n ** 6n);

// --- Excess precision is rejected, never truncated ---
// Silently dropping a digit would change what the debtor agreed to owe.

assert.throws(() => parseAmountToBaseUnits('1.1234567', 6), /at most 6 decimal places/);
assert.throws(() => parseAmountToBaseUnits('0.0000001', 6), /at most 6 decimal places/);
assert.throws(() => parseAmountToBaseUnits('1.1234567890123456789', 18), /at most 18 decimal places/);

// --- Rejected inputs ---

for (const bad of ['', '   ', '0', '0.0', '-1', '1.', '.5', 'abc', '1e18', '1,000', 'Infinity', 'NaN', '+1']) {
  assert.throws(() => parseAmountToBaseUnits(bad, 18), `expected ${JSON.stringify(bad)} to be rejected`);
}

// Zero in any form must fail: the kernel reverts InvalidAmount on a zero leg.
assert.throws(() => parseAmountToBaseUnits('0.000000', 6), /strictly greater than zero/);

// Nonsense decimals are a programming error, not user input.
assert.throws(() => parseAmountToBaseUnits('1', 19), /Invalid token decimals/);
assert.throws(() => parseAmountToBaseUnits('1', -1), /Invalid token decimals/);
assert.throws(() => parseAmountToBaseUnits('1', 1.5), /Invalid token decimals/);

// --- Formatting resolves decimals from the registry by symbol ---

assert.equal(formatBaseUnitsToDisplay(10n ** 18n, 'MUSD'), '1.00 MUSD');
assert.equal(formatBaseUnitsToDisplay(1_000_000n, 'mUSDC'), '1.00 mUSDC');
assert.equal(formatBaseUnitsToDisplay(1_500_000n, 'mUSDC'), '1.50 mUSDC');
assert.equal(formatBaseUnitsToDisplay(1_000_000n, 'mUSDT'), '1.00 mUSDT');
// Same base-unit integer, different asset, different real value.
assert.notEqual(
  formatBaseUnitsToDisplay(1_000_000n, 'mUSDC'),
  formatBaseUnitsToDisplay(1_000_000n, 'MUSD')
);
assert.equal(formatBaseUnitsToDisplay(0n, 'mUSDC'), '0.00 mUSDC');
assert.equal(formatBaseUnitsToDisplay(250_250_000n, 'mUSDC'), '250.25 mUSDC');

// An explicit decimals argument still wins, for callers holding TokenMetadata.
assert.equal(formatBaseUnitsToDisplay(1_000_000n, 'mUSDC', 6), '1.00 mUSDC');

// Negative net positions render with a sign rather than a bogus large number.
assert.equal(formatBaseUnitsToDisplay(-1_500_000n, 'mUSDC'), '-1.50 mUSDC');

// --- Round trip for every supported token ---

for (const token of [MUSD, MUSDC, CANONICAL_MEZO_TOKENS.mUSDT]) {
  const units = parseAmountToBaseUnits('12.34', token.decimals);
  assert.equal(
    formatBaseUnitsToDisplay(units, token.symbol),
    `12.34 ${token.symbol}`,
    `round trip failed for ${token.symbol}`
  );
}

console.log('Obligation amount parsing and formatting checks passed.');
