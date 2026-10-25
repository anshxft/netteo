import assert from 'node:assert';
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

// Test 4: Verify Mezo & MUSD authentic details are present in registry
const liveProof = getSectionById('live-settlement-proof');
assert.ok(liveProof, 'live-settlement-proof section must exist');
assert.ok(liveProof.keywords.includes('mezo testnet'), 'live-settlement-proof must include mezo testnet keyword');

const musdToken = getSectionById('musd-token');
assert.ok(musdToken, 'musd-token section must exist');
assert.ok(musdToken.keywords.includes('canonical'), 'musd-token must include canonical keyword');

console.log('✔ Passed: Authentic Mezo & MUSD technical sections verified');
console.log('\nAll Documentation Data Integrity Tests Passed Successfully!');
