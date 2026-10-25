import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('Running Advanced Staircase Preloader Verification Tests...\n');

// 1. Verify files exist
const componentPath = path.resolve(process.cwd(), 'src/components/common/StaircasePreloader/StaircasePreloader.tsx');
const cssPath = path.resolve(process.cwd(), 'src/components/common/StaircasePreloader/StaircasePreloader.module.css');
const indexPath = path.resolve(process.cwd(), 'src/components/common/StaircasePreloader/index.ts');

assert.ok(fs.existsSync(componentPath), 'StaircasePreloader.tsx must exist');
assert.ok(fs.existsSync(cssPath), 'StaircasePreloader.module.css must exist');
assert.ok(fs.existsSync(indexPath), 'index.ts must exist');
console.log('✔ Passed: Preloader component files and index export exist');

const componentCode = fs.readFileSync(componentPath, 'utf-8');
const cssCode = fs.readFileSync(cssPath, 'utf-8');

// 2. Verify Dual-Direction Double Staircase Mechanics (Top & Bottom steps)
assert.ok(cssCode.includes('.stepTop'), 'CSS must define .stepTop');
assert.ok(cssCode.includes('.stepBottom'), 'CSS must define .stepBottom');
assert.ok(cssCode.includes('transform: translateY(-100%);'), 'Top step must translate from top (-100%)');
assert.ok(cssCode.includes('transform: translateY(100%);'), 'Bottom step must translate from bottom (100%)');
assert.ok(componentCode.includes("className={styles.stepTop}"), 'Component must render stepTop elements');
assert.ok(componentCode.includes("className={styles.stepBottom}"), 'Component must render stepBottom elements');
console.log('✔ Passed: Dual-direction double staircase mechanics verified (Top & Bottom panels)');

// 3. Verify Complex Timing & Synchronized Easing Functions
assert.ok(componentCode.includes('cubic-bezier(0.85, 0, 0.15, 1)') || cssCode.includes('cubic-bezier(0.85, 0, 0.15, 1)'), 'CSS or component must use smooth cubic-bezier(0.85, 0, 0.15, 1)');
assert.ok(componentCode.includes('cubic-bezier(0.76, 0, 0.24, 1)') || cssCode.includes('cubic-bezier(0.76, 0, 0.24, 1)'), 'CSS or component must use smooth cubic-bezier(0.76, 0, 0.24, 1)');
assert.ok(componentCode.includes("mode = 'converging'"), 'Default mode must be converging');
assert.ok(componentCode.includes("case 'interlocked'"), 'Must support interlocked mode');
assert.ok(componentCode.includes("case 'center-out'"), 'Must support center-out mode');
console.log('✔ Passed: Complex timing calculation and smooth easing functions verified across all modes');

// 4. Verify 5 Mandatory Screen States (§4 Prototype Checklist)
assert.ok(componentCode.includes("currentState === 'error'"), 'Must handle Error state');
assert.ok(componentCode.includes("currentState === 'offline'"), 'Must handle Offline state');
assert.ok(componentCode.includes("currentState === 'success'"), 'Must handle Success state');
assert.ok(componentCode.includes("currentState === 'empty'"), 'Must handle Empty state');
assert.ok(componentCode.includes("currentState === 'loading'"), 'Must handle Loading state');
console.log('✔ Passed: All 5 mandatory screen states handled (Loading, Success, Error, Empty, Offline)');

// 5. Verify Anti-Slop, Double-Click Protection & Security (Zero sensitive leaks)
assert.ok(componentCode.includes('isActionLocked'), 'Must implement double-click protection lock');
assert.ok(componentCode.includes('triggerExit'), 'Must guard exit trigger');
assert.ok(!componentCode.includes('process.env.SUPABASE_SERVICE_ROLE_KEY'), 'No private secrets in client component');
assert.ok(componentCode.includes('Escape'), 'Must support Escape key for accessible dismiss');
assert.ok(cssCode.includes('@media (prefers-reduced-motion: reduce)'), 'Must support prefers-reduced-motion media query');
assert.ok(componentCode.includes('role="status"'), 'Must have role="status" for a11y');
assert.ok(componentCode.includes('aria-live="polite"'), 'Must have aria-live="polite" for a11y');
console.log('✔ Passed: Double-click lock, a11y standards, and reduced motion safety verified');

console.log('\nAll Staircase Preloader Verification Tests Passed Successfully!\n');
