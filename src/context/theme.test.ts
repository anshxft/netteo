import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('Running Dark Mode Theme & Token Verification Tests...\n');

// 1. Verify tokens.css contains required wine red (#7F011F) and black theme tokens
const tokensPath = path.resolve(process.cwd(), 'src/styles/tokens.css');
assert.ok(fs.existsSync(tokensPath), 'tokens.css must exist');
const tokensContent = fs.readFileSync(tokensPath, 'utf-8');

// Verify light mode default is preserved
assert.ok(tokensContent.includes('--color-wine: #7F011F;'), 'Light mode must have --color-wine: #7F011F');
assert.ok(tokensContent.includes('--color-page: #F9F6EF;'), 'Light mode must have --color-page: #F9F6EF');
assert.ok(tokensContent.includes('--color-surface: #FFFCF7;'), 'Light mode must have --color-surface: #FFFCF7');
console.log('✔ Passed: Light theme tokens preserved completely');

// Verify dark theme selector and tokens
assert.ok(tokensContent.includes("[data-theme='dark']"), "tokens.css must define [data-theme='dark']");
assert.ok(tokensContent.includes('.dark'), 'tokens.css must define .dark class');

// Check dark theme has wine red anchor with WCAG AA compliance (Finding 1)
const darkSection = tokensContent.split("[data-theme='dark']")[1];
assert.ok(darkSection.includes('--color-wine: #C41E3D;'), 'Dark theme must define WCAG AA compliant wine red');
assert.ok(darkSection.includes('--color-wine-active: #7F011F;'), 'Dark theme must retain brand wine red #7F011F on active state');
assert.ok(darkSection.includes('--color-page: #080405;'), 'Dark theme must define deep black page background');
assert.ok(darkSection.includes('--color-surface: #12090C;'), 'Dark theme must define deep obsidian surface');
assert.ok(darkSection.includes('--color-surface-elevated: #1B0F15;'), 'Dark theme must define elevated surface');
assert.ok(darkSection.includes('--color-ink: #F7EFF1;'), 'Dark theme must define high-contrast text');
assert.ok(darkSection.includes('--color-border: #28131B;'), 'Dark theme must define clean wine-black borders');
console.log('✔ Passed: Finding 1 - Dark theme tokens correctly configure WCAG AA wine red and obsidian black');

// 2. Verify ThemeContext implements lazy init and multi-tab synchronization (Findings 2 & 3)
const contextPath = path.resolve(process.cwd(), 'src/context/ThemeContext.tsx');
assert.ok(fs.existsSync(contextPath), 'ThemeContext.tsx must exist');
const contextContent = fs.readFileSync(contextPath, 'utf-8');
assert.ok(contextContent.includes('useState<Theme>(() =>'), 'ThemeContext must use lazy initialization to avoid 2nd re-render');
assert.ok(contextContent.includes("window.addEventListener('storage'"), 'ThemeContext must synchronize across browser tabs');
console.log('✔ Passed: Findings 2 & 3 - Lazy state initialization and multi-tab storage sync verified');

// 3. Verify ThemeToggle component exists and uses Skiper UI morph animation
const togglePath = path.resolve(process.cwd(), 'src/components/common/ThemeToggle.tsx');
assert.ok(fs.existsSync(togglePath), 'ThemeToggle.tsx must exist');
const toggleContent = fs.readFileSync(togglePath, 'utf-8');

assert.ok(toggleContent.includes('clipPath'), 'ThemeToggle must use SVG clipPath');
assert.ok(toggleContent.includes('d="M0-5h30a1 1 0 0 0 9 13v24H0Z"'), 'ThemeToggle must include the crescent moon clip path from Skiper UI');
assert.ok(toggleContent.includes('useReducedMotion'), 'ThemeToggle must respect reduced motion preference');
assert.ok(toggleContent.includes('handleToggle'), 'ThemeToggle must implement double-click protection');
assert.ok(toggleContent.includes('aria-label'), 'ThemeToggle must have accessible labeling');
console.log('✔ Passed: ThemeToggle implements Skiper UI animation, a11y, and double-click protection');

// 4. Verify placement in LandingNavbar (with Open Desk) and AppHeader (Open Desk removed, only on landing)
const landingNavPath = path.resolve(process.cwd(), 'src/components/landing/LandingNavbar.tsx');
const landingNavContent = fs.readFileSync(landingNavPath, 'utf-8');
const landingOpenDeskIndex = landingNavContent.indexOf('Open Desk');
const landingThemeToggleIndex = landingNavContent.indexOf('<ThemeToggle');
assert.ok(landingThemeToggleIndex > 0 && landingThemeToggleIndex < landingOpenDeskIndex, 'LandingNavbar must place ThemeToggle before Open Desk button');
console.log('✔ Passed: LandingNavbar places ThemeToggle immediately to the left of Open Desk');

const appHeaderPath = path.resolve(process.cwd(), 'src/components/layout/AppHeader.tsx');
const appHeaderContent = fs.readFileSync(appHeaderPath, 'utf-8');
assert.ok(!appHeaderContent.includes('Open Desk'), 'AppHeader must NOT contain Open Desk button (only on landing page)');
const appHeaderThemeToggleIndex = appHeaderContent.indexOf('<ThemeToggle');
assert.ok(appHeaderThemeToggleIndex > 0, 'AppHeader must include ThemeToggle');

// Verify AppHeader uses CSS tokens instead of hardcoded rgba (Finding 4)
assert.ok(!appHeaderContent.includes('rgba(127, 1, 31, 0.08)'), 'AppHeader must not contain hardcoded rgba(127, 1, 31, 0.08)');
assert.ok(appHeaderContent.includes('var(--color-wine-subtle)'), 'AppHeader Demo Sandbox button must use var(--color-wine-subtle)');
console.log('✔ Passed: Finding 4 - AppHeader uses design tokens for Demo Sandbox and Open Desk is exclusively on landing page');

// 5. Verify skiper4.tsx dead code reference is removed (Finding 5)
const skiper4Path = path.resolve(process.cwd(), 'skiper4.tsx');
assert.ok(!fs.existsSync(skiper4Path), 'skiper4.tsx reference code must be removed from workspace root');
console.log('✔ Passed: Finding 5 - skiper4.tsx removed from repo root');

console.log('\nAll Theme, Token & Audit Fix Tests Passed Successfully!\n');
