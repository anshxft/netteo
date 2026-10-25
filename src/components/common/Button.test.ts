import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('Running Standard Button Specification Verification Tests...\n');

// Test 1: Verify component and CSS module exist
const cssPath = path.resolve(process.cwd(), 'src/components/common/Button.module.css');
const tsxPath = path.resolve(process.cwd(), 'src/components/common/Button.tsx');

assert.ok(fs.existsSync(cssPath), 'Button.module.css must exist');
assert.ok(fs.existsSync(tsxPath), 'Button.tsx must exist');
console.log('✔ Passed: Button component and CSS module exist');

// Test 2: Verify CSS tokens per design-addendum §7 (wine fill, surface fill, 120ms motion)
const cssContent = fs.readFileSync(cssPath, 'utf8');
assert.ok(cssContent.includes('background-color: var(--color-wine);'), 'Primary button must use var(--color-wine)');
assert.ok(cssContent.includes('background-color: var(--color-wine-hover);'), 'Primary button hover must use var(--color-wine-hover)');
assert.ok(cssContent.includes('background-color: var(--color-surface);'), 'Secondary button must use var(--color-surface)');
assert.ok(cssContent.includes('background-color: var(--color-sand-light);'), 'Secondary button hover must use var(--color-sand-light)');
assert.ok(cssContent.includes('var(--motion-fast)'), 'Button transitions must use --motion-fast (120ms)');
assert.ok(cssContent.includes('prefers-reduced-motion: reduce'), 'CSS must support prefers-reduced-motion: reduce');
console.log('✔ Passed: Button design tokens and motion adhere to design-addendum §7');

// Test 3: Anti-slop verification: ZERO difference blend mode or curtain animations
assert.ok(!cssContent.includes('mix-blend-mode: difference'), 'Button.module.css must NOT contain mix-blend-mode: difference');
assert.ok(!cssContent.includes('.skiperCurtain'), 'Button.module.css must NOT contain .skiperCurtain');
assert.ok(!cssContent.includes('.skiperUnderline'), 'Button.module.css must NOT contain .skiperUnderline');
console.log('✔ Passed: Anti-slop audit verified — zero color-inverting difference blend or curtain animations');

// Test 4: Verify TSX has double-click protection and width-locked spinner
const tsxContent = fs.readFileSync(tsxPath, 'utf8');
assert.ok(tsxContent.includes('doubleClickLockMs'), 'Button.tsx must have doubleClickLockMs protection per Checklist §4');
assert.ok(tsxContent.includes('lockedWidth'), 'Button.tsx must lock width on loading to prevent CLS');
assert.ok(!tsxContent.includes('skiperEffect'), 'Button.tsx must NOT contain skiperEffect prop');
console.log('✔ Passed: Button component UX contracts and input preservation verified');
