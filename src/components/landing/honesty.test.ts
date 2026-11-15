import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

// Claims the product cannot back up. Each was on the site once; none may come back unless the code makes it true.
const BANNED: { pattern: RegExp; why: string }[] = [
  { pattern: /EIP-712/i, why: 'claims are signed as plain wallet messages, not EIP-712 typed data' },
  { pattern: /merkle/i, why: 'the snapshot commitment is a keccak256 hash; there is no Merkle tree' },
  { pattern: /audited (smart|solidity)/i, why: 'the contracts have not been independently audited' },
  { pattern: /\b75%\+/, why: 'unsubstantiated savings figure' },
  { pattern: /uniswap grantee|euler security|genesis infra pod|devdao guild|corelabs studio|station3/i, why: 'invented customers / implied affiliations' },
  { pattern: /verified testimonials|trusted by leading/i, why: 'fabricated social proof' },
  { pattern: /WCAG AA Accessible/i, why: 'accessibility conformance has not been audited' },
  { pattern: /Open Mezo Passport|via Mezo Passport|Bitcoin Wallets \(Mezo Native\)/i, why: 'Mezo Passport is not integrated, so the wallet dialog cannot offer it' },
];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return /\.(tsx?|css)$/.test(name) && !/\.test\.ts$/.test(name) ? [path] : [];
  });
}

const offenders: string[] = [];
for (const file of files('src')) {
  const text = readFileSync(file, 'utf8');
  for (const { pattern, why } of BANNED) {
    if (pattern.test(text)) offenders.push(`${file}: ${pattern} (${why})`);
  }
}

assert.deepEqual(offenders, [], `Unbacked claims found:\n${offenders.join('\n')}`);
console.log('Landing and docs honesty checks passed.');
