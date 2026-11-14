import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { DOC_GROUPS, ALL_SECTIONS, getSectionById } from './docsData';

console.log('Running Documentation Data Integrity Tests...');

// Test 1: Groups exist and have valid structure
assert.ok(DOC_GROUPS.length >= 5, 'Should have at least 5 documentation groups');
console.log(`✔ Passed: Found ${DOC_GROUPS.length} documentation groups`);

// Test 2: Uniqueness of section IDs
const seenIds = new Set<string>();
for (const section of ALL_SECTIONS) {
  assert.ok(!seenIds.has(section.id), `Duplicate section ID found: ${section.id}`);
  seenIds.add(section.id);
  assert.ok(section.title.length > 0, `Section ${section.id} has empty title`);
  assert.ok(section.description.length > 0, `Section ${section.id} has empty description`);
  assert.ok(section.subsections.length > 0, `Section ${section.id} should have subsections`);
}
console.log(`✔ Passed: All ${ALL_SECTIONS.length} section IDs are unique and well-formed`);

// Test 3: Lookup helper test
for (const section of ALL_SECTIONS) {
  const found = getSectionById(section.id);
  assert.strictEqual(found?.id, section.id, `Lookup failed for section ${section.id}`);
}
assert.strictEqual(getSectionById('non-existent-id'), undefined);
console.log('✔ Passed: Section lookup helper behaves correctly');

// Test 4: The Mezo and mainnet sections the docs promise are present
for (const id of ['musd-token', 'deployed-contracts', 'mainnet-evidence', 'funding-sources', 'mezo-contracts', 'security-model']) {
  assert.ok(getSectionById(id), `section ${id} must exist`);
}
assert.ok(getSectionById('musd-token')!.keywords.includes('canonical'), 'musd-token must include canonical keyword');
console.log('✔ Passed: Mezo, mainnet and security sections are present');

// Test 5: Every subsection listed in the sidebar has a matching anchor in the rendered content, so the table of
// contents never links to nothing. The content file declares each anchor as <Block id="...">.
const content = readFileSync(new URL('./docsContent.tsx', import.meta.url), 'utf8');
const anchors = new Set([...content.matchAll(/<Block id="([^"]+)"/g)].map((m) => m[1]));
for (const section of ALL_SECTIONS) {
  for (const sub of section.subsections) {
    assert.ok(anchors.has(sub.id), `${section.id}: subsection "${sub.id}" has no <Block id> in docsContent.tsx`);
  }
}
for (const section of ALL_SECTIONS) {
  assert.ok(content.includes(`case '${section.id}':`), `${section.id} is not routed in DocsContentRenderer`);
}
console.log('✔ Passed: Every sidebar subsection has an anchor and every section is routed');

// Test 6: The docs describe mainnet only. These stayed in the old docs after they stopped being true.
const banned = [
  { pattern: /explorer\.test\.mezo|faucet\.test\.mezo|testnet\.mezo/i, why: 'testnet links' },
  { pattern: /Legacy Testnet|Historical Testnet/i, why: 'testnet deployment sections' },
  { pattern: /Pending deployment/i, why: 'the kernel is deployed' },
  { pattern: /tBTC|Mezo CDP|CDP/i, why: 'a simulated borrow flow is not a Mezo integration' },
  { pattern: /Supabase Realtime|WebSocket/i, why: 'not used' },
  { pattern: /EIP-712 (Intent|signed)/i, why: 'approvals are EIP-191 wallet signatures' },
  { pattern: /merkle/i, why: 'the commitment is a keccak256 hash, not a Merkle tree' },
  { pattern: /audited (smart|solidity)/i, why: 'the contracts are not independently audited' },
];
const dataFile = readFileSync(new URL('./docsData.ts', import.meta.url), 'utf8');
for (const { pattern, why } of banned) {
  assert.ok(!pattern.test(content), `docsContent.tsx must not mention ${pattern} (${why})`);
  assert.ok(!pattern.test(dataFile), `docsData.ts must not mention ${pattern} (${why})`);
}
console.log('✔ Passed: No testnet, simulated or unbacked claims remain in the docs');

console.log('\nAll Documentation Data Integrity Tests Passed Successfully!');
