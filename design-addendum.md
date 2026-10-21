# Netteo design.md — Addendum (Icons, Motion, Buttons, Navigation, Agent Skills, Design Knowledge Base)

Last updated: 20 October 2026
Status: Paste into design.md. Sections 14–19 are new. The "Replaces" blocks supersede the named parts of sections 7, 8, and 9. Where this addendum and the rest of design.md conflict, the palette, typography, honesty rules, and accessibility gates in design.md win.

---

## Replaces §7 "Icons" and adds icon tokens

### Icon sources and intent
Netteo icons must feel authored for this product, not dropped in from a kit. That is achieved by constraint and by drawing, not by avoiding libraries:

1. **Primary library: Lucide** (https://lucide.dev/icons/). Use for all generic UI: navigation, chevrons, copy, external link, filters, status glyphs, wallet, clock.
2. **Secondary library: Iconoir** (https://iconoir.com/#icons). Use only where Lucide has no suitable glyph. Do not use both for the same concept.
3. **Custom Netteo icons.** Draw bespoke SVGs for concepts specific to the product, because no generic library has them:
   - Obligation (directed claim between two parties)
   - Netting / net settlement (many lines collapsing to one)
   - Settlement cycle
   - Frozen snapshot
   - Net debit / net credit / zero position
   - Funding progress
   Custom icons are hand-drawn on the 24px grid with the same stroke, cap, and join as the library icons so they are indistinguishable in weight. Store in `components/icons/netteo/` with one file per icon and an accessible `title`.
4. Do not generate icons with an image or AI generator, and do not trace or copy a library icon as a "custom" one. Original means drawn by a person for this product.

### Icon tokens
| Token | Value | Notes |
|---|---|---|
| `--icon-size-sm` | 16px | Inline with 12–14px text |
| `--icon-size-md` | 20px | Default in buttons, nav, tables |
| `--icon-size-lg` | 24px | Empty states, dialog headers |
| `--icon-stroke` | 1.75px | Single value for all icons from both libraries and custom drawings |
| `--icon-color` | `currentColor` | Inherits ink/muted; wine only for active state |
| Linecap / linejoin | round / round | Match across all sources |

Rules:
- Lucide defaults to 2px stroke and Iconoir to 1.5px. Override both to `--icon-stroke` through one wrapper component (`<Icon />`) so mixed sources look like one family. Verify the Iconoir package exposes stroke width before depending on it.
- Check each library's license and attribution terms before shipping, and record them in the reference log (§17).
- Import icons individually (tree-shaken). Never import a full icon set into the bundle.
- Icons reinforce a label. Status icons are always paired with text (carried over from §7 and §11).
- No filled/duotone mixing, no emoji as icons, no decorative icon grids.

### Note on "design tokens" from Lucide and Iconoir
Neither library is a color or spacing token source. They provide glyphs only. The color, type, spacing, radius, and border tokens remain the Netteo tokens in §2 and §3. The only tokens that come from this addendum are the icon tokens above and the motion tokens below.

---

## Replaces §8 "Motion and animation" sources

Motion should feel specific to Netteo: calm, precise, and tied to financial state. It must not look like a stock animation pack.

### Sources (adapt, do not copy wholesale)
- **Motion Primitives** (https://motion-primitives.com/docs): primary source for transitions, disclosure/expand, text and number transitions, and dialog/menu entrances.
- **Skiper UI** (https://skiper-ui.com/components): reference for button and interaction patterns only where they serve a function.
- **Watermelon UI** (https://ui.watermelon.sh/components): reference for component structure and button states.

Adoption checklist (applies to each component taken):
1. Read the source and its dependencies. Motion Primitives is built on the `motion` library, so check that package's bundle cost and the project's React/Next/Tailwind versions first.
2. Confirm the license and whether any component is paid or restricted.
3. Copy the smallest useful part. Re-skin it with Netteo tokens. Rename it to a Netteo name.
4. Delete anything decorative (shimmer, glow, particle, spotlight, gradient border, marquee).
5. If source cannot be accessed or extracted, ask for the code. Do not recreate it from memory.

### Motion tokens (Netteo-owned)
| Token | Value | Use |
|---|---|---|
| `--motion-fast` | 120ms | Hover, focus, press |
| `--motion-base` | 180ms | Menus, tooltips, tab/underline moves |
| `--motion-slow` | 240ms | Dialogs, expand/collapse, gross↔net view transition |
| `--ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | Default |
| `--ease-exit` | `cubic-bezier(0.4, 0, 1, 1)` | Leaving elements |

Signature motions (the few that make Netteo feel distinct):
1. **Netting transition.** User-triggered. Gross edges converge toward the net allocation over `--motion-slow`, with amounts staying readable throughout. The final frame is the same as the static net view. Skippable, and instant under reduced motion.
2. **Verified-state progress.** Funding progress advances only after a confirmed state change, never optimistically.
3. **Status change.** A badge cross-fades on transition; no bounce, no confetti.
4. **Active nav indicator.** A slim wine indicator slides between items.

Everything in §8 "Motion rules" still applies, including `prefers-reduced-motion`. Animate `transform` and `opacity` only. Never animate layout on large tables.

---

## Replaces §7 "Buttons" with a Netteo button spec

Reference Skiper UI, Watermelon UI, and Motion Primitives for interaction craft, but the result is one Netteo button set:

| Variant | Look | Motion |
|---|---|---|
| Primary | Wine fill, sand/white text, 8–10px radius | Hover to `--color-wine-hover` in `--motion-fast`; 1px press translate; no glow |
| Secondary | Surface fill, ink text, strong border | Border/ink shift on hover |
| Tertiary | Text only, underline on hover/focus | Underline fades in |
| Destructive | Outline with danger text and icon, explicit label | Fills only on hover/confirm; never the same fill as Primary |

States required for every variant: default, hover, focus-visible (2px ring with 2px offset, 3:1 contrast), active, loading (spinner, width locked, duplicate submit blocked), disabled (with an explanation where the reason is not obvious).

Rules:
- Radius follows §3 (8–10px). No pill buttons except compact status labels.
- Labels are verb-led and specific ("Fund settlement", "Approve MUSD spending").
- Hover effects (shine sweeps, magnetic cursors, gradient borders, bounce) are excluded. If a reference button depends on one, strip it.
- Touch target at least 44px on mobile.

---

## 14. Navigation reference

Inspiration source: **Navbar Gallery** (https://www.navbar.gallery/).

- Use it for pattern ideas only: active-state treatment, grouping, collapse behavior, mobile menu behavior, account/wallet placement.
- Netteo is an authenticated app, and many gallery entries are marketing-site navbars. Pick patterns that suit an app shell (compact sidebar or a slim top bar, per §4). Choose one model and do not mix.
- Record 2–3 specific entries chosen and what was borrowed in the reference log (§17). Do not copy an entry's layout, brand elements, or copy.
- Requirements from §4 stay: four primary destinations, wallet and network status visually secondary, restrained wine active state with a slim indicator, no duplicate desktop sidebar and bottom nav on mobile.
- Accessibility: `<nav>` landmark with an accessible name, `aria-current="page"` on the active item, full keyboard operation, visible focus, menus that close on Escape and return focus.

---

## 15. Agent skills and anti-slop workflow

The implementing agent should load these skills, and follow them where they do not conflict with design.md.

### Anti-slop skills (from skills.sh)
- **anti-ui-slop** (UIZZE), install: `npx skills add https://uizze.com --skill anti-ui-slop`. It requires the agent to read the product and existing design system first, avoid generic defaults, implement real loading/empty/error/success/disabled states, and pass a finish gate.
- **ui-slop-score** (UIZZE), install: `npx skills add https://uizze.com --skill ui-slop-score`. Use it for a pre-merge visual review of each major screen.
- Other skills with the same name exist on skills.sh from other publishers (for example github/awesome-copilot and davepoon/buildwithclaude). Pick one source deliberately. Record the exact source and version in the reference log.
- **Safety:** skills are instructions that an agent follows. Read each SKILL.md and any script it asks the agent to run before installing. Some versions run a context script (`node .../scripts/context.mjs`); allow that only after reading it.

### Vercel skills
- Use the Vercel agent skills listed on skills.sh (for example the React best-practices, web design guidelines, and composition-pattern skills from the vercel-labs repository). Confirm exact skill names and install commands on skills.sh before adding them, since listings change.
- Scope: performance (bundle size, rendering), React/Next.js composition, and web interface guidelines such as accessibility and forms.

### Conflict rules
1. design.md wins on palette, typography, spacing, radius, honesty rules, and the signature graph.
2. A skill's checks win only where design.md is silent. The full precedence order across all sources is in §18.
3. Skill suggestions to add fashionable effects are ignored if they violate §12 (anti-patterns).
4. Skills may not authorize invented data. The no-fabrication rules in §5 and §12 stay absolute.

### Anti-slop checklist (added to the Definition of Done)
- [ ] No more than one gradient, and only where documented with a purpose (default: none).
- [ ] No generic card-grid layout on Obligations; it is a ledger.
- [ ] Copy uses Netteo nouns (obligation, cycle, net position, snapshot), not generic SaaS phrases.
- [ ] Icons come from the §7 stack with `--icon-stroke`, and product concepts use custom Netteo icons.
- [ ] Every motion maps to a signature motion or a documented state change.
- [ ] Loading, empty, error, stale, disconnected, pending, and failed states exist for each screen.
- [ ] `ui-slop-score` (or equivalent) run on Overview, Obligations, Cycle detail, Activity, and wallet/network states, with findings addressed or explained.

---

## 16. Updated §9 reference list

Replace the six-source list with:
| Purpose | Source |
|---|---|
| Icons | Lucide (primary), Iconoir (secondary) |
| Motion and transitions | Motion Primitives |
| Button and interaction craft | Skiper UI, Watermelon UI |
| Navigation patterns | Navbar Gallery |
| Information hierarchy | GenLayer Portal (layout ideas only; no branding) |

Feralui gradients and Pryzm Design Studio are removed from the active list: gradients are not part of the visual language, and the Pryzm studio adds composition ideas that risk diverging from the palette. Re-add either only with a documented need.

---

## 17. Reference log (required deliverable)

Maintain `docs/design-references.md` with one row per adopted item:

| Item | Source URL | What was adopted | What was changed | License checked | Dependencies added |
|---|---|---|---|---|---|

An item with no row is considered not approved. This keeps provenance clear and prevents wholesale copying.

---

## Added to §13 Definition of Done
- Icon wrapper applies one stroke token across Lucide, Iconoir, and custom icons.
- Custom Netteo icons exist for obligation, netting, cycle, snapshot, and net debit/credit/zero.
- Motion uses Netteo motion tokens; the netting transition is skippable and reduced-motion safe.
- Reference log is complete with licenses checked.
- Anti-slop checklist (§15) passes.


---

## 18. Mandatory design knowledge base & reference documents (read every time)

### Files
The design knowledge base and production engineering reference documents live in the project (either in the project root or at `docs/design-knowledge/`):

| File | Type | Role for UI/UX Frontend Design |
|---|---|---|
| `UX.md` | Markdown | Behavior, feedback, states, errors, forms, trust, accessibility, speed, truthful interfaces. Section 15 is the UX review checklist. |
| `UI.md` | Markdown | Visual hierarchy, grid and spacing, typography, color, numbers and locale, components, motion, performance, tokens. Section 22 is the visual review checklist. Sections 23–25 cover references, libraries, and component sourcing. |
| `Design-Quality-Codex.pdf` (and `.md`) | PDF / Markdown | Canonical universal execution standard: anti-slop definition (Part 0), signature moments (Part 1), state inventory (Part 9), feedback contract (Part 7), motion DNA (Part 8), verification ritual (Part 16), directing agents (Part 17), and slop audit (Appendix B). |
| `Prototype_vs_Production_Checklist (2).pdf` | PDF | Production-readiness checklist for UI/UX frontend: the 5 mandatory screen states (Loading, Empty, Error, Success, Offline); double-click protection on submit/action buttons; form resilience and validation UX; responsive testing across viewports and devices; slow network/3G handling; image/font performance and layout-shift (CLS) prevention. |
| `Secure_Vibe_Coding.pdf` | PDF | Secure UI & frontend coding fundamentals: client-side validation as UX feedback (never as the sole security boundary); never leaking system details, stack traces, or database schema through error screens; safe generic error messaging; rate limiting & brute-force feedback; secure authentication state and session handling. |
| `Security_Prompt_Pack_Freebie (2).pdf` | PDF | Frontend security audits and review prompts: Section 1 (Frontend vs backend validation & input sanitization), Section 2 (No hardcoded secrets or API keys in client code), Section 3 (Session expiration, logout states, cookie security), Section 4 (Missing permission checks & IDOR in UI routes/IDs), Section 5 (Sanitizing user-facing error messages & console logs), Section 7 (Secure file upload UX), Section 8 (Rate-limiting UI feedback), and Section 14 (Master security review). |

`UI.md` and `UX.md` link to each other by those exact filenames. In the workspace root, the source files are named `UI (2).md` and `UX (2).md` (or copied as `UI.md` and `UX.md` in `docs/design-knowledge/`). The attached PDF files (`Design-Quality-Codex.pdf`, `Prototype_vs_Production_Checklist (2).pdf`, `Secure_Vibe_Coding.pdf`, `Security_Prompt_Pack_Freebie (2).pdf`) are canonical and must be consulted directly.

### The rule (agents must follow this literally)
**Every time** an agent builds, designs, restyles, or changes any UI or UX frontend in this project, it must, in that same task and before editing any code:

1. **Read the attached PDFs and design documents from disk.** Do not rely on memory, a summary, or an earlier session. "Relevant parts" at minimum:
   - **Foundational standards (Always):**
     - `UX.md` §1 (Design tenets), §7 (Forms & inputs), §13 (Truthful interfaces), §15 (Review checklist).
     - `UI.md` §1 (Visual tenets), §16 (System tokens), §19 (Component inventory), §22 (Visual review checklist).
     - `Design-Quality-Codex.pdf` Parts 0, 7, 9, 13, 16, and Appendix B.
     - `Prototype_vs_Production_Checklist (2).pdf` §4 (Error Handling & Screen States — the 5 states), §7 (Testing & QA), §8 (Performance & Optimization).
     - `Secure_Vibe_Coding.pdf` (5 security layers: validation as UX, safe error handling, auth & session flow).
     - `Security_Prompt_Pack_Freebie (2).pdf` §1 (Frontend-only validation), §4 (Permission checks & IDOR), §5 (Sensitive error messages & data leaks), §14 (Master security review).
   - **Topic sections touched:**
     - Forms & input handling → `UX.md` §7, `Design-Quality-Codex` Part 12, `Prototype_vs_Production_Checklist` §4, `Security_Prompt_Pack` §1.
     - Screen states & error recovery → `Design-Quality-Codex` Part 9, `Prototype_vs_Production_Checklist` §4 (all 5 states: loading, empty, error, success, offline), `Secure_Vibe_Coding` §04.
     - Tables, ledger & financial numbers → `UI.md` §6, §8; `design.md` §5.
     - Buttons, clicks & action triggers → `design-addendum.md` §7, `Prototype_vs_Production_Checklist` §4 (double-click protection, width locking during loading).
     - Navigation & routing → `UI.md` §11, `UX.md` §3, `design-addendum.md` §14, `Security_Prompt_Pack` §4 (URL tampering, non-guessable IDs, RBAC).
     - Responsive & multi-device → `UI.md` §14, `Design-Quality-Codex` Part 10, `Prototype_vs_Production_Checklist` §7.
     - Motion & transitions → `UI.md` §17, `Design-Quality-Codex` Part 8, `design-addendum.md` §8.
     - Component sourcing & dependencies → `UI.md` §23–25, `Prototype_vs_Production_Checklist` §6, `Security_Prompt_Pack` §12.
2. **State which sections and PDFs were read** in the first message of the task (a one-line list is enough).
3. **Declare design decisions before building (Codex Part 17 & Checklists):**
   - Token choices touched (colors, typography, spacing, radius, motion).
   - Complete 5-state inventory for each affected screen (loading, empty, error, success, offline).
   - Client-side validation rules paired with server boundary expectations.
   - Any framework default that is kept, with a one-line reason.
4. **Build with production and security discipline:**
   - Double-click protection on all mutation/settlement buttons.
   - Loading state appears within 200ms; width locked, spinner/skeleton active.
   - User-friendly, safe error messaging (no stack traces, no internal database schema, no leaked API keys/paths).
   - Preserved input on submission failure (users never lose form input on error).
5. **Run the review (see §19) and report findings before presenting the work.**

This applies to small changes too. A one-line tweak to a button still reads the button, feedback, security, and state sections. If the reference files or PDFs are missing, stop and ask the user to add them. Do not proceed from memory.

### Precedence when sources disagree
1. **Product truth and safety:** `design.md` honesty rules (no fabricated data, no optimistic financial state, wallet and chain states), `UX.md` §13 (truthful interfaces), and `Secure_Vibe_Coding` / `Security_Prompt_Pack` security boundaries.
2. **Netteo identity and tokens:** `design.md` palette, Roundo typography, spacing, radius, signature graph, and this addendum's icon, motion, and button tokens.
3. **Execution quality & production standards:** `Design-Quality-Codex.pdf` (states, feedback, verification) and `Prototype_vs_Production_Checklist (2).pdf` (5 states, error resilience, performance).
4. **Detail guidance:** `UX.md` and `UI.md`.
5. **Agent skills & security packs:** anti-ui-slop, Vercel skills (§15), and `Security_Prompt_Pack_Freebie (2).pdf`.
6. **Reference sites:** inspiration only.

The knowledge base says of itself that it is taste-neutral and that its numbers are context, not targets. Netteo's own tokens decide taste questions, while the knowledge base and attached PDFs decide whether the execution is complete, robust, and production-safe.

### Known conflicts, resolved in advance
| Knowledge-base / PDF guidance | Netteo decision |
|---|---|
| Codex 7.3–7.4: optimistic UI, and undo preferred over confirmation | **Not for settlement.** The Codex itself excludes payments and financial actions from optimistic UI. Wallet actions use the review panel, explicit confirmation, and verified-state progress (design.md §5.3). Undo patterns apply only to reversible, off-chain actions such as filters or drafts. |
| Codex 6.3: live counters ticking up to values; ceremonies of 400–1000ms; Codex 8.2 duration up to ~1000ms | **No counting animations on financial figures**, no ceremonies, no confetti for routine financial actions. Show the exact value immediately. Netteo motion tokens (120–240ms) apply. |
| Codex 2.2: display type up to 48–100px+ | Authenticated screens follow design.md §2 (page title 28–36px). Large display type is allowed only on a public landing page, if one exists. |
| Codex 6.2: optional 1–2% overshoot | None. Netteo is sober; no overshoot or bounce. |
| Codex 8.3 / UI.md easing suggestions | Use `--ease-standard` and `--ease-exit` from this addendum, recorded as chosen tokens. |
| Codex 0.2 / UI.md §2: bold identity moves and novelty budget | Spend novelty on the gross-to-net graph and the netting transition only (the signature moment, Codex Part 1 rule 5). Everything else stays conventional (Jakob's Law, Codex 5.2). |
| Codex Part 3.1: accent budget (60/30/10) | Agrees with design.md: wine is a scarce accent. |
| Codex 7.5: toast duration 4–6s | Allowed only for non-critical outcomes. Transaction status stays persistent on the page (design.md §7). |
| Prototype vs Production §1 / Security Pack: generic email/password auth | Netteo is a Web3/settlement dApp. Primary authentication is wallet signature/connection (EIP-712/session), with strict chain validation and address ownership checks. |

If a new conflict appears, apply the precedence order, record it in `docs/design-references.md` under a "Decisions" heading, and mention it in the review report. Do not silently pick one.

---

## 19. Review gate and report (required before presenting work)

### Gate
Before any UI/UX frontend work is presented as done, the agent runs:
1. **UX review checklist:** `UX.md` §15, applied to every affected screen.
2. **Visual review checklist:** `UI.md` §22.
3. **Slop audit:** Codex Appendix B (30 checks) plus the anti-slop checklist in §15 of this document.
4. **Hostile critic, two rounds:** Codex 16.1. Round 1 structure, Round 2 craft. Fix findings, then run both rounds again.
5. **State inventory & production checklist verification:**
   - Codex Part 9 and `Prototype_vs_Production_Checklist (2).pdf` §4: verify all 5 core states (Loading, Empty, Error, Success, Offline) plus Netteo-specific states (wallet disconnected, wrong network, pending transaction, reverted, stale RPC, insufficient allowance/balance, partial, overflow).
   - Double-click protection verified on all action buttons.
   - Form inputs preserved on error (no lost user inputs).
6. **Frontend security & error safety audit:**
   - `Secure_Vibe_Coding.pdf` and `Security_Prompt_Pack_Freebie (2).pdf` §1, §4, §5:
   - Safe error messages: zero stack traces, database schema, or internal file paths shown to users or output to production console.
   - Client-side validation has proper UX messaging and does not rely on browser-only security.
   - Protected routes and sensitive views enforce access control and handle unauthorized/forbidden states gracefully.
7. **Viewports & device testing:**
   - Full-page captures at 320, 390, 768, 1024, 1440 (design.md §10, Codex 16.2, and Prototype vs Production §7), inspected at 100% zoom. Include a half-screen width (~900px).
8. **Keyboard, accessibility, and reduced motion:**
   - One Tab-only walkthrough and one `prefers-reduced-motion` pass.
9. **Build, lint, tests, axe checks** (design.md §13, §11, and Prototype vs Production §6 & §7).

### Report format
The agent's closing message for UI/UX work must contain:

1. **Sections & PDFs read:** list of knowledge-base sections and attached PDFs consulted (and confirmation they were read from disk this task).
2. **Declared decisions:** tokens touched, kept defaults with reasons, conflicts resolved with the precedence rule.
3. **State inventory:** table of 5 states (Loading, Empty, Error, Success, Offline) + web3 states per screen showing designed / not applicable (with reason).
4. **Security & production checks:** verification of double-submit guards, safe error handling, and form resilience.
5. **Review findings:** each finding cites its source (e.g. "Codex 7.1: button missing focus state", "Prototype Checklist §4: missing offline state", "Security Pack §5: error message exposed query detail"), with status fixed or open.
6. **Evidence:** viewports checked, tests run, and anything not verified, stated honestly.
7. **Open items:** anything skipped, with the reason.

A report that omits these items means the work is not done.

### Additions to §13 Definition of Done
- Knowledge base (`UX.md`, `UI.md`) and attached PDFs (`Design-Quality-Codex.pdf`, `Prototype_vs_Production_Checklist (2).pdf`, `Secure_Vibe_Coding.pdf`, `Security_Prompt_Pack_Freebie (2).pdf`) read from disk at the start of every UI/UX task.
- All 5 screen states (Loading, Empty, Error, Success, Offline) and web3-specific states designed and tested.
- Double-click protection active on all action/submit buttons.
- Error messages are safe, plain-language, and actionable (no internal leaks).
- Review gate run, with the structured report attached to the PR or final message.
- Known conflicts handled per §18, with new decisions logged.

### Suggested one-sentence product brief (Codex 0.5, to confirm with the product owner)
"Netteo makes finance and treasury participants feel certain and unhurried while settling many mutual obligations as one net transfer, and the one thing they should remember is the moment gross obligations collapse into a single net position." Edit this to match the real audience before using it as the audit reference.

