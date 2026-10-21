# Netteo — Agent Rules & Frontend Implementation Guardrails

**Purpose:** Rules for any coding/design agent working on Netteo.  
**Priority:** These rules supplement `prd.md`, `architecture.md`, and `design.md`. If documents conflict, stop and explain the conflict rather than silently choosing a behavior.

---

## 1. Mission and scope

Build a production-quality, responsive frontend for Netteo, a multilateral obligation-netting and MUSD settlement application for Mezo.

The frontend must communicate:
- Gross obligations and their approval state.
- Deterministic net positions.
- Required deposits and proposed allocations.
- Real transaction lifecycle and verified on-chain evidence.
- Clear auditability from source obligations to final settlement.

The visual target is **warm minimal fintech**: wine red `#7F011F`, light sand `#F5EBD0`, warm surfaces, dark readable text, Roundo typography, consistent spacing, restrained borders, and purposeful motion.

Do not turn Netteo into a generic token dashboard, trading terminal, or decorative Web3 landing page.

## 2. Read before editing

Before modifying or designing any code:
1. Inspect the repository structure and current implementation.
2. Read `prd.md`, `architecture.md`, `design.md`, `design-addendum.md`, `UI (2).md`, `UX (2).md`, and this `rules.md`.
3. **Mandatory attached PDF guides:** Read the attached PDFs in the folder:
   - `Design-Quality-Codex.pdf`: Canonical universal execution standard (anti-slop definition, signature netting moment, feedback contract, motion DNA, 5-state inventory, verification ritual, directing agents, and slop audit).
   - `Prototype_vs_Production_Checklist (2).pdf`: Production-readiness checklist for UI/UX frontend (the 5 mandatory screen states: loading within 200ms, empty, error, success, offline; double-click protection on action buttons; resilient form handling; responsive viewports; slow network testing; performance & layout shift prevention).
   - `Secure_Vibe_Coding.pdf`: Security architecture for frontend and full-stack vibe coding (client-side validation = UX only; never leak stack traces, database schema, or internal paths in UI error states; generic safe error messages; rate limiting feedback).
   - `Security_Prompt_Pack_Freebie (2).pdf`: Security review prompts for frontend forms, input sanitization, auth/session states, permission checks (IDOR in UI/URLs), sensitive error suppression, and master security review.
4. Identify existing framework, package manager, Next.js/React versions, styling setup, component library, wallet/chain integration, and available tests.
5. Inspect existing components before replacing them. Preserve working business logic and deployed contract integration.
6. Produce a concise implementation plan, list affected files, risks, and verification steps before large refactors.
7. Do not change smart contracts, deployed addresses, chain configuration, environment variable names, or settlement logic unless explicitly asked.

Do not claim to have inspected a file, package, website source, or design component unless it was actually accessible.

## 3. Design source of truth

`design.md` is the source of truth for frontend visual decisions.

### Required tokens
- Wine: `#7F011F`
- Sand: `#F5EBD0` (the originally supplied `#f5ebdo` contains an invalid `o`; this is the assumed correction)
- Ink: `#211A1B`
- Page: `#F9F6EF`
- Surface: `#FFFCF7`
- Border: `#E5DCCF`
- Muted text: `#756B6B`

Tokenize colors, spacing, typography, radii, and semantic status colors. Do not scatter unexplained hex codes across components.

### Typography
- Use the supplied Roundo font if its font files are available.
- Check the actual font assets and weights before wiring the font.
- Do not fabricate font paths or claim the font is installed if `roundo.zip` is unavailable.
- If the font file is missing from the repository/attachments, stop font-specific implementation and ask the user to provide it. Continue unrelated work only if that does not create a fake font setup.
- Use tabular numerals for aligned financial amounts where supported.

### Layout and UI
- Use minimal professional spacing with a repeatable scale.
- Maintain consistent content edges and readable financial tables.
- Keep wine red restrained; sand is a supporting surface, not a low-contrast text color.
- Prefer borders and layout hierarchy over heavy shadows and nested cards.
- Do not add decorative UI just to fill empty space.
- Use one clear primary navigation model.
- Design desktop and mobile intentionally; do not simply shrink desktop layouts.

## 4. Product truth, data integrity, and financial safety

These rules are mandatory:
- Never invent balances, obligations, participants, transaction hashes, confirmations, contract events, RPC results, or network metrics.
- Never present illustrative/demo data as real on-chain state. Clearly label any demo or fixture environment.
- The contract is authoritative for funds and terminal settlement state; the database is a query/read model, not financial truth.
- A submitted wallet request is not a confirmed transaction.
- Do not show success until the relevant application state or chain receipt verifies success.
- Distinguish submitted, pending, confirmed, reverted/failed, stale, and unavailable states.
- Preserve gross obligations and their history after net settlement.
- Do not silently include disputed or unapproved obligations in netting.
- Use integer token units in domain calculations; do not use floating-point arithmetic for on-chain amounts.
- Do not claim that netting guarantees fewer transfers, lower gas, or savings unless that property is implemented, measured, and substantiated.
- Do not expose private keys, seed phrases, RPC secrets, service-role keys, or other secrets to client-side code.
- Do not weaken authorization, row-level security, wallet checks, or contract guards to make a UI flow appear functional.

## 5. Functional implementation rules

- Every visible button, menu, tab, filter, form, and toggle must perform the action its label implies.
- Avoid placeholder buttons that do nothing. If an action is not implemented, mark it disabled with a clear reason or report it as a gap.
- Loading, empty, error, partial, stale, disconnected-wallet, wrong-network, approval-required, pending-transaction, success, and failed states must be handled where relevant.
- Preserve user input after recoverable errors.
- Prevent duplicate submissions when appropriate.
- Validate inputs at the UI boundary and again at the trusted domain/contract boundary.
- Keep the UI calculation consistent with the canonical netting/domain logic. Do not create a second conflicting implementation inside a component.
- Use explicit labels for amount, asset, debtor, creditor, network, and action consequences.
- Make irreversible actions reviewable before the wallet prompt.
- Use semantic HTML, accessible labels, keyboard navigation, visible focus, and reduced-motion support.

## 6. Technical constraints

- Respect the existing framework and versions. Do not upgrade core dependencies without a clear need and a compatibility plan.
- Prefer existing components and utilities before adding dependencies.
- Avoid unnecessary state libraries, graph libraries, animation libraries, or component kits.
- Keep components cohesive; extract shared UI only when reuse or complexity justifies it.
- Avoid giant components, duplicated business logic, excessive client components, and unnecessary client-side fetching.
- Do not use `any` to bypass TypeScript issues unless an explicit, narrowly documented boundary requires it.
- Keep secrets server-side and validate all user-controlled inputs.
- Follow existing formatting, linting, and project conventions.
- Do not remove tests just to make a check pass.
- Run relevant lint, typecheck, tests, and production build after meaningful changes; report exactly which checks ran and their outcomes.
- Do not claim commands passed unless you actually ran them.

## 7. Required skill installation and use

Use the following skills as relevant to the task. Install missing skills using the exact supported commands below, checking the current CLI's confirmation prompts and repository conventions. Do not reinstall skills already available. If installation fails, report the exact failure and continue with the closest available guidance without pretending the skill was installed.

```bash
npx skills add nextlevelbuilder/ui-ux-pro-max-skill
npx skills add Leonxlnx/taste-skill
npx skills add anthropics/skills --skill frontend-design
npx skills add wshobson/agents --skill react-state-management
npx skills add wshobson/agents --skill nextjs-app-router-patterns
npx skills add vercel-labs/agent-browser
npx skills add wshobson/agents --skill design-system-patterns
npx skills add wshobson/agents --skill responsive-design
npx skills add wshobson/agents --skill tailwind-design-system
npx skills add vercel-labs/agent-skills --skill react-best-practices
npx skills add https://github.com/larksuite/cli --skill lark-doc
npx skills add wshobson/agents --skill accessibility-compliance
npx skills add wshobson/agents --skill modern-javascript-patterns
npx skills add https://github.com/Leonxlnx/taste-skill --skill design-taste-frontend
npx skills add vercel-labs/agent-skills --skill web-design-guidelines
npx skills add nutlope/hallmark
npx skills add op7418/logo-generator-skill
npx skills add bergside/awesome-design-skills
npx skills add Appllama/appllama-skills
npx skills add https://github.com/emilkowalski/skills --skill find-animation-opportunities
```

Also consult:
- https://skill-issue.in/?domain=frontend

Do not assume every listed skill applies to every task. Read relevant skill instructions and use the guidance to improve implementation quality; avoid blindly following contradictory presets.

## 8. Component, motion, and design references

Use these sources to discover patterns, then adapt them to the Netteo design system:

- GenLayer Portal: https://portal.genlayer.foundation/
- Watermelon UI components: https://ui.watermelon.sh/components
- Motion Primitives: https://motion-primitives.com/docs
- Skiper UI components/motion: https://skiper-ui.com/components
- Feraui gradients: https://feralui.dev/gradients
- Pryzm Design Studio: https://pryzm.design/studio

Rules for reference use:
1. Inspect the actual source/API and dependencies where accessible.
2. Check compatibility with the project's installed versions.
3. Keep only components and effects that serve a real user task.
4. Adapt all colors, typography, spacing, borders, states, and motion to `design.md`.
5. Do not copy a reference product's complete identity, logos, copy, or page layout wholesale.
6. Do not invent code for an animation/component that you could not inspect.
7. **If you cannot extract the component code, motion implementation, or design source, tell the user the exact component/effect name and link. Ask the user to paste its code or relevant snippet, then continue from that source. Do not silently replace it with a fake approximation.**
8. Gradients are optional and rare. The base product is not a gradient-led UI.
9. A 21st.dev MCP key may be needed for some component discovery or retrieval. **Ask the user for the key only when a specific task genuinely requires that MCP.** Do not block unrelated work waiting for it, and never fabricate a key.

## 9. Reference use: GenLayer Portal

Use https://portal.genlayer.foundation/ as a design and information-architecture reference only.

Patterns worth studying:
- Clear role-based entry points and navigation.
- Compact, scannable metrics.
- Contribution/activity and announcement hierarchies.
- Strong separation between summary information and deeper detail.
- Clear next-step calls to action.

Translate these principles into Netteo's settlement domain. Use settlement cycles, obligations, approvals, funding progress, and verified activity instead of GenLayer-specific points, validators, or contribution metrics. Do not reuse GenLayer's identity or imply an affiliation.

## 10. Animation and interaction quality

- Motion must clarify cause-and-effect or state changes.
- Prefer short transitions for menus, dialogs, disclosure, and graph-mode switching.
- Respect `prefers-reduced-motion`.
- Avoid scroll-jacking, excessive reveal animations, infinite decorative motion, parallax, fake live updates, and effects that make financial state harder to compare.
- Never animate a transaction to success before it is confirmed.
- Ensure hover-only affordances also work with keyboard and touch.

## 11. Data and error handling

- Every async action needs explicit pending, success, and failure behavior.
- Keep errors near the affected action; use toasts only for concise secondary feedback.
- Do not discard usable content because one independent request failed.
- Mark stale/indexed data honestly and display timestamps or indexed-block context where useful.
- Never treat an indexer/database result as confirmed chain state when a direct critical-state read is required.
- A retry must not silently duplicate an on-chain action.
- External links, explorer links, and contract addresses must come from verified configuration or real returned data.

## 12. Working protocol

For each significant task:
1. State the goal and inspect the relevant implementation.
2. List the plan and files to change.
3. Implement the smallest coherent change.
4. Verify behavior at relevant viewport sizes.
5. Run applicable checks.
6. Summarize files changed, user-visible behavior, verification results, and known limitations.
7. Ask the user for missing assets or source snippets when needed.

Do not start broad refactors when the user asked for a plan only. Do not modify unrelated areas as collateral.

## 13. Definition of done

- `design.md` is followed and tokens are centralized.
- Roundo is genuinely loaded, or its missing asset is reported.
- All visible controls behave correctly.
- No fake financial/on-chain data is shown as real.
- Settlement state and transaction status are honest.
- Responsive and accessible behavior is tested.
- Relevant lint, typecheck, tests, and build have been run or explicitly reported as not run.
- Any inaccessible reference component is named and linked for the user to provide.
