# UI/UX Frontend Design & Engineering Rules

Before designing, implementing, restyling, or modifying any user interface, component, or frontend workflow in this workspace, you MUST read and apply the specifications from the design documents and attached PDF guides in this folder:

## Mandatory References
1. [design-addendum.md](file:///c:/netteo/design-addendum.md):
   - Design tokens (colors, typography, spacing, radius).
   - Icon stack: Lucide (primary), Iconoir (secondary), custom Netteo SVGs with `--icon-stroke: 1.75px`.
   - Motion tokens: 120ms (`--motion-fast`), 180ms (`--motion-base`), 240ms (`--motion-slow`), cubic-bezier easings; no decorative shimmer/glow.
   - Button variants and states (Primary, Secondary, Tertiary, Destructive; loading, disabled, focus rings).
   - Section 18 (Mandatory design knowledge base) and Section 19 (Review gate & report).
2. [UX (2).md](file:///c:/netteo/UX%20(2).md) / `UX.md`:
   - Truthful interfaces (§13), honest waiting states, safe errors, accessible forms, and UX review checklist (§15).
3. [UI (2).md](file:///c:/netteo/UI%20(2).md) / `UI.md`:
   - Visual hierarchy, Roundo typography, tabular numbers, component anatomy, and visual review checklist (§22).
4. [Design-Quality-Codex.pdf](file:///c:/netteo/Design-Quality-Codex.pdf):
   - Anti-slop definition (Part 0), feedback contract (Part 7), motion DNA (Part 8), state inventory (Part 9), verification ritual (Part 16), directing agents (Part 17), and slop audit (Appendix B).
5. [Prototype_vs_Production_Checklist (2).pdf](file:///c:/netteo/Prototype_vs_Production_Checklist%20(2).pdf):
   - **5 Screen States (§4):** Every screen must explicitly implement and handle **Loading**, **Empty**, **Error**, **Success**, and **Offline**.
   - **Double-Click Protection (§4):** Prevent accidental duplicate submits/transactions on buttons.
   - **Input Preservation (§4):** Do not lose user inputs on failed form submissions.
   - **Testing & QA (§7):** Test realistic data, edge cases, real mobile viewports (320, 390, 768, 1024, 1440), multi-browser, and slow network (3G) states.
   - **Performance (§8):** Sub-3-second load times, WebP optimized images with dimensions to prevent CLS, efficient asset and font loading.
6. [Secure_Vibe_Coding.pdf](file:///c:/netteo/Secure_Vibe_Coding.pdf):
   - **Validation Boundary:** Client-side validation is for UX only; backend validation is the security boundary.
   - **Safe Error Display:** Never expose stack traces, database schema, table names, query strings, or server paths in client UI or console.
   - **Session & Auth UX:** Handle token expiry, logout invalidation, and rate-limiting gracefully in the interface.
7. [Security_Prompt_Pack_Freebie (2).pdf](file:///c:/netteo/Security_Prompt_Pack_Freebie%20(2).pdf):
   - Frontend security review prompts: §1 (Form validation), §2 (Zero client secrets), §4 (URL parameter/IDOR tampering protection), §5 (Safe error messages & data leak prevention), and §14 (Master security review).

## Required Agent Protocol
1. **Declare Consulted Sources:** In your first message or task response, state which sections of `design-addendum.md`, `UI.md`, `UX.md`, and the attached PDFs (`Design-Quality-Codex.pdf`, `Prototype_vs_Production_Checklist`, `Secure_Vibe_Coding`, `Security_Prompt_Pack`) you read from disk.
2. **Pre-Build Declaration:** Specify token choices, the 5-state inventory for affected screens, and input protection mechanisms before modifying code.
3. **Review Gate Verification:** Before marking UI/UX work as complete, run the checklist verification in `design-addendum.md` §19 (5-state check, double-submit protection, error message security audit, and responsive check) and report findings.
