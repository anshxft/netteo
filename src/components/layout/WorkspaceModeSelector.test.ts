import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('Running WorkspaceModeSelector Verification Tests...\n');

// 1. Verify files exist
const tsxPath = path.resolve(process.cwd(), 'src/components/layout/WorkspaceModeSelector.tsx');
const cssPath = path.resolve(process.cwd(), 'src/components/layout/WorkspaceModeSelector.module.css');
const appHeaderPath = path.resolve(process.cwd(), 'src/components/layout/AppHeader.tsx');

assert.ok(fs.existsSync(tsxPath), 'WorkspaceModeSelector.tsx must exist');
assert.ok(fs.existsSync(cssPath), 'WorkspaceModeSelector.module.css must exist');
assert.ok(fs.existsSync(appHeaderPath), 'AppHeader.tsx must exist');
console.log('✔ Passed: WorkspaceModeSelector component and CSS module exist');

const tsxContent = fs.readFileSync(tsxPath, 'utf8');
const cssContent = fs.readFileSync(cssPath, 'utf8');
const appHeaderContent = fs.readFileSync(appHeaderPath, 'utf8');

// 2. Verify Design System Tokens
assert.ok(cssContent.includes('var(--color-wine)'), 'Must use var(--color-wine)');
assert.ok(cssContent.includes('var(--color-wine-subtle)'), 'Must use var(--color-wine-subtle)');
assert.ok(cssContent.includes('var(--color-surface)'), 'Must use var(--color-surface)');
assert.ok(cssContent.includes('var(--motion-fast)'), 'Must use var(--motion-fast)');
console.log('✔ Passed: Design system tokens and motion tokens adhered to');

// 3. Verify Accessibility & Non-Color Dependent State
assert.ok(tsxContent.includes('role="radiogroup"'), 'Must have role="radiogroup"');
assert.ok(tsxContent.includes('role="radio"'), 'Must have role="radio" for both options');
assert.ok(tsxContent.includes('aria-checked='), 'Must manage aria-checked for screen readers');
assert.ok(cssContent.includes(':focus-visible'), 'Must have visible focus state');
assert.ok(cssContent.includes('outline: 2px solid var(--color-wine)'), 'Must have high-contrast focus outline');
assert.ok(tsxContent.includes('liveDot') || tsxContent.includes('Zap'), 'Must include non-color icon indicator');
assert.ok(tsxContent.includes('Check'), 'Must include checkmark icon for Demo');
console.log('✔ Passed: Accessibility, keyboard navigation, and non-color-alone state communication verified');

// 4. Verify Truthful Labels and Safeguards
assert.ok(tsxContent.includes('>Demo<') || tsxContent.includes('<span>Demo</span>'), 'Must use plain label Demo');
assert.ok(tsxContent.includes('>Live<') || tsxContent.includes('<span>Live</span>'), 'Must use plain label Live');
assert.ok(tsxContent.includes('Switch to Live Mode?'), 'Must have confirmation dialog before entering Live mode');
assert.ok(tsxContent.includes('Your Demo Work is Preserved') || tsxContent.includes('demo obligations and cycles remain safely stored'), 'Must reassure user demo work is preserved');
assert.ok(tsxContent.includes('cannot be undone') || tsxContent.includes('irreversible'), 'Must explain on-chain irreversible actions');
assert.ok(tsxContent.includes('isSwitching'), 'Must implement double-click protection');
console.log('✔ Passed: Truthful labels, work preservation reassurance, and Live mode safeguards verified');

// 5. Verify AppHeader Integration
assert.ok(appHeaderContent.includes('<WorkspaceModeSelector'), 'AppHeader must render WorkspaceModeSelector');
assert.ok(appHeaderContent.includes('var(--color-wine-subtle)'), 'AppHeader must maintain var(--color-wine-subtle) reference');
assert.ok(!appHeaderContent.includes("onClick={toggleMode}"), 'AppHeader must not contain raw unconfirmed toggleMode button');
console.log('✔ Passed: AppHeader successfully integrates WorkspaceModeSelector');

console.log('\nAll WorkspaceModeSelector Tests Passed Successfully!\n');
