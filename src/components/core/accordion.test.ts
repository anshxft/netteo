import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('Running Motion Primitives Accordion Verification Tests...\n');

// Test 1: Verify component and CSS module files exist
const cssPath = path.resolve(process.cwd(), 'src/components/core/Accordion.module.css');
const tsxPath = path.resolve(process.cwd(), 'src/components/core/accordion.tsx');

assert.ok(fs.existsSync(cssPath), 'Accordion.module.css must exist');
assert.ok(fs.existsSync(tsxPath), 'accordion.tsx must exist');
console.log('✔ Passed: Accordion component and CSS module exist');

// Test 2: Verify CSS module implements CSS Grid height transition and reduced motion
const cssContent = fs.readFileSync(cssPath, 'utf8');
assert.ok(cssContent.includes('grid-template-rows: 0fr'), 'CSS must define closed state grid-template-rows: 0fr');
assert.ok(cssContent.includes('grid-template-rows: 1fr'), 'CSS must define open state grid-template-rows: 1fr');
assert.ok(cssContent.includes('prefers-reduced-motion: reduce'), 'CSS must support prefers-reduced-motion');
console.log('✔ Passed: Smooth height expansion mechanics & reduced-motion safety verified');

// Test 3: Verify exported members in accordion.tsx
const tsxContent = fs.readFileSync(tsxPath, 'utf8');
assert.ok(tsxContent.includes('export function Accordion('), 'accordion.tsx must export Accordion');
assert.ok(tsxContent.includes('export function AccordionItem('), 'accordion.tsx must export AccordionItem');
assert.ok(tsxContent.includes('export function AccordionTrigger('), 'accordion.tsx must export AccordionTrigger');
assert.ok(tsxContent.includes('export function AccordionContent('), 'accordion.tsx must export AccordionContent');
assert.ok(tsxContent.includes('export function AccordionBasic('), 'accordion.tsx must export AccordionBasic');
console.log('✔ Passed: Accordion, AccordionItem, AccordionTrigger, AccordionContent, and AccordionBasic exported');

// Test 4: Verify FaqAccordion uses core accordion
const faqPath = path.resolve(process.cwd(), 'src/components/landing/FaqAccordion.tsx');
const faqContent = fs.readFileSync(faqPath, 'utf8');
assert.ok(faqContent.includes("@/components/core/accordion"), 'FaqAccordion must import from @/components/core/accordion');
assert.ok(faqContent.includes('<Accordion'), 'FaqAccordion must render <Accordion');
assert.ok(faqContent.includes('<AccordionItem'), 'FaqAccordion must render <AccordionItem');
assert.ok(faqContent.includes('<AccordionTrigger'), 'FaqAccordion must render <AccordionTrigger');
assert.ok(faqContent.includes('<AccordionContent'), 'FaqAccordion must render <AccordionContent');
console.log('✔ Passed: FaqAccordion on landing page successfully powered by Motion Primitives Accordion');

console.log('\nAll Motion Primitives Accordion Tests Passed Successfully!\n');
