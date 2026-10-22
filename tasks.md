# Netteo — Prioritized Project Tasks

**Project:** Netteo (Multilateral Obligation Netting and MUSD Settlement on Mezo)  
**Status Legend:**
- `[ ]` Pending
- `[/]` In progress
- `[x]` Completed (verified against codebase)
- `[!]` Blocked (has unmet dependency)

**Rule:** Never mark a task complete without inspecting the actual code, running checks, or verifying browser output. Update this file whenever tasks start, finish, or become blocked.

---

## 1. Planning & Foundations (Phase 0)

- [x] **TASK-001**: Verify workspace directory structure and documentation files (`PrD.md`, `architecture.md`, `rules.md`, `design-addendum.md`, and PDF references).
- [x] **TASK-002**: Unpack Roundo font family into `public/fonts/` and verify all 6 font weights (Regular, Medium, SemiBold, Bold, Light, ExtraLight).
- [x] **TASK-003**: Inspect and configure Next.js base setup (`package.json`, `tsconfig.json`, `next.config.mjs`).
- [x] **TASK-004**: Lock Decision 1 (PRD §14 / Arch §4.4): Obligation storage model (On-chain records vs. Commitment snapshot with on-chain settlement inputs).
- [x] **TASK-005**: Lock Decision 2 (PRD §14): Confirmation policy (All non-zero participants confirm vs. debtor-acceptance only).
- [x] **TASK-006**: Lock Decision 3 (PRD §14 / Arch §6.2): Cycle timeout duration (e.g. 72h) and refund policy.
- [x] **TASK-007**: Lock Decision 4 (PRD §14 / Arch §6.3): Bounded limits for MVP (Participants max 10, Obligations max 30 per cycle).
- [x] **TASK-008**: Verify Mezo testnet RPC endpoint (`https://rpc.test.mezo.org`), Chain ID `31611`, MUSD testnet contract address, and explorer base URL.
- [x] **TASK-009**: Create `.env.example` documenting all client-safe and server-side environment variables.

---

## 2. Core Logic & Smart Contracts (Phase 1)

- [x] **TASK-010**: Implement pure TypeScript deterministic netting calculation (`src/features/settlement-cycles/netting.ts`).
  - *Invariant checks:* $\sum \text{net positions} = 0$, $\sum \text{positive} = \sum |\text{negative}|$, base units only.
- [x] **TASK-011**: Write Jest/Vitest unit tests for `netting.ts` covering 2 to 10 participants, circular debts, zero-net positions, and duplicate/invalid inputs.
- [x] **TASK-012**: Initialize Foundry workspace or Solidity build environment for `SettlementKernel.sol`.
- [x] **TASK-013**: Implement `SettlementKernel.sol` with OpenZeppelin `SafeERC20` and `ReentrancyGuard`:
  - Cycle creation with immutable ID, MUSD address, and participant limits.
  - Frozen snapshot commitment validation.
  - Net debtor deposit tracking (`deposit`).
  - Atomic distribution (`executeSettlement`) locked until 100% funded.
  - Expiry and mutual-exclusion refund path (`claimRefund`).
- [x] **TASK-014**: Write Solidity unit and property tests covering:
  - Prevention of duplicate deposits, duplicate cycles, or reentrant payouts.
  - Gas consumption verification for maximum bounded cycle size (10 participants, 30 obligations).
  - Terminal state guarantees (no settlement after refund; no refund after settlement).

---

## 3. Frontend Foundation & Design System (Phase 2)

- [x] **TASK-015**: Create design token definitions in `src/styles/tokens.css`:
  - Palette: Wine `#7F011F`, Sand `#F5EBD0`, Ink `#211A1B`, Page `#F9F6EF`, Surface `#FFFCF7`, Border `#E5DCCF`, Muted `#756B6B`.
  - Spacing scale, border radii (8–10px for standard buttons/cards), tabular number rules.
  - Motion tokens: `--motion-fast: 120ms`, `--motion-base: 180ms`, `--motion-slow: 240ms`, easings.
- [x] **TASK-016**: Configure Roundo font loading via `next/font/local` in root layout (`src/app/layout.tsx`).
- [x] **TASK-017**: Build unified icon wrapper `<Icon />` with `--icon-stroke: 1.75px` integrating Lucide icons.
- [x] **TASK-018**: Draw custom Netteo SVGs in `src/components/icons/netteo/`:
  - `ObligationIcon.tsx` (directed bilateral claim).
  - `NettingIcon.tsx` (many lines collapsing into one).
  - `CycleIcon.tsx` (settlement cycle).
  - `SnapshotIcon.tsx` (frozen commitment).
  - `NetPositionIcon.tsx` (credit, debit, zero).
- [x] **TASK-019**: Implement standard button component `<Button />` adhering to `design-addendum.md` §7:
  - Variants: Primary, Secondary, Tertiary, Destructive.
  - States: Default, Hover, Focus-visible (2px ring with 2px offset), Active, Loading (width-locked spinner), Disabled.
  - Double-click protection built-in.
- [x] **TASK-020**: Build responsive application shell (`<AppLayout />`, `<AppHeader />`, `<AppNav />`, `<WalletBadge />`):
  - Accessible landmarks (`<header>`, `<nav>`, `<main>`).
  - Active nav indicator with slim wine line.
  - Single navigation model for desktop and mobile.

---

## 4. Frontend Feature Modules & 5-State Workflows (Phase 3)

- [x] **TASK-021**: Build Group Management (`/groups`):
  - Group creation form with input preservation on validation failure.
  - Participant management table with normalized lowercase address validation.
  - 5 screen states (Loading, Empty, Error, Success, Offline).
- [x] **TASK-022**: Build Obligation Desk (`/obligations`):
  - Financial ledger view for all claims with tabular figures.
  - Filter by status (Proposed, Accepted, Disputed, Withdrawn, Frozen).
  - Propose obligation modal/form with counterparty, integer amount, reference label.
  - Debtor action buttons: Accept, Dispute, Withdraw (with confirm dialog).
  - 5 screen states (Loading, Empty with CTA, Error with recovery, Success, Offline).
- [x] **TASK-023**: Build Settlement Cycle Assembly (`/cycles/new`):
  - Selection of accepted eligible obligations with running gross total.
  - Cycle freeze review showing obligation snapshot and calculated net positions.
  - Pre-confirmation check before submitting to contract.
- [x] **TASK-024**: Implement Signature Netting Transition (`src/features/settlement-cycles/components/NettingGraph.tsx`):
  - Interactive visualization of gross directed claims collapsing into net debtor/creditor balances.
  - Duration locked to `--motion-slow: 240ms`; respects `prefers-reduced-motion` (instant switch).
  - Tabular comparison table below graph.
- [x] **TASK-025**: Build Funding & Execution Desk (`/cycles/[id]`):
  - Net debtor funding progress bar (only advances on confirmed state).
  - MUSD allowance check and single-click Approve / Deposit flow.
  - Permissionless "Execute Settlement" trigger enabled only when 100% funded.
  - Timeout countdown and "Claim Refund" button visible if expired.
- [x] **TASK-026**: Build Audit & Settlement Statement (`/cycles/[id]/audit`):
  - Read-only historical ledger linking gross obligations to net payout hashes.
  - CSV statement export functionality matching contract events.

---

## 5. Web3 & Backend Integrations (Phases 4 & 5)

- [x] **TASK-027**: Install and configure `viem` and `wagmi` for Next.js App Router.
- [x] **TASK-028**: Set up typed chain configuration (`src/lib/chain/config.ts`) with strict network validation (fail-closed if chain ID != 31611).
- [x] **TASK-029**: Implement `<WalletConnectModal />` and `<NetworkGuard />` (clear wrong-network banner with switch action).
- [x] **TASK-030**: Implement ERC-20 MUSD contract hook (reads: `balanceOf`, `allowance`, `decimals`; writes: `approve`).
- [x] **TASK-031**: Implement `SettlementKernel` contract interaction hooks (`createCycle`, `deposit`, `executeSettlement`, `claimRefund`).
- [x] **TASK-032**: Implement transaction lifecycle feedback component (`<TransactionStatus />`) distinguishing Submitted, Pending, Confirmed, and Reverted states.
- [x] **TASK-033**: Set up Supabase client and Postgres schema (`src/lib/db/schema.sql`) for off-chain metadata with Row Level Security (RLS).
- [x] **TASK-034**: Implement server-side event indexer worker (`src/lib/indexer/worker.ts`):
  - Filter logs by `SettlementKernel` address.
  - Idempotent insert keyed by `(chain_id, transaction_hash, log_index)`.
  - Update query-optimized projections (`cycle_projection`, `participant_position_projection`).

---

## 6. Testing, Quality & Security Audits (Phase 6)

- [x] **TASK-035**: Verify 5 Screen States on every page according to `Prototype_vs_Production_Checklist` §4:
  - Loading: skeleton/spinner appears within 200ms; width-locked.
  - Empty: clear reason, helpful guidance, primary action CTA.
  - Error: plain-language explanation, recovery button, zero stack traces.
  - Success: unambiguous visual confirmation without excessive confetti.
  - Offline: network disconnection banner and write action disabling.
- [x] **TASK-036**: Run Double-Click Protection Verification across all action/submit buttons (`design-addendum.md` §19).
- [x] **TASK-037**: Conduct Frontend Security Audit per `Secure_Vibe_Coding.pdf` and `Security_Prompt_Pack_Freebie` §1, §4, §5:
  - Input validation: client-side UX feedback paired with server-side validation.
  - Zero hardcoded private keys or service-role secrets in client bundles.
  - Route IDOR review: verify users cannot alter or view unauthorized group data.
  - Safe error audit: no DB table names, column names, or RPC internals exposed.
- [x] **TASK-038**: Run 30-item Slop Audit from `Design-Quality-Codex.pdf` Appendix B:
  - Typography: Roundo loaded, consistent font hierarchy, no unstyled fallbacks.
  - Color palette: Wine used as scarce accent, sand as surface, zero generic gradients.
  - Visual density: Ledger layout for obligations, no generic marketing card grids.
- [x] **TASK-039**: Multi-Viewport Responsive Audit:
  - Capture and verify layouts at 320px, 390px, 768px, 1024px, and 1440px.
- [x] **TASK-040**: Accessibility & Reduced-Motion Audit:
  - Tab-only keyboard navigation walkthrough with visible focus rings (2px offset).
  - `prefers-reduced-motion` toggle verification on netting transition and modals.

---

## 7. Deployment & Hackathon Submission (Phase 7)

- [x] **TASK-041**: Deploy `SettlementKernel.sol` to Mezo testnet and verify source on block explorer.
- [x] **TASK-042**: Deploy Next.js web application to Vercel with verified environment variables.
- [x] **TASK-043**: Run end-to-end multi-party settlement acceptance test on Mezo testnet using real testnet MUSD:
  - 3 participants: A owes B 100 MUSD, B owes C 80 MUSD, C owes A 20 MUSD.
  - Preview net balances: A pays 80 net, B receives 20 net, C receives 60 net.
  - Complete funding, execute settlement, verify token transfers on explorer.
- [x] **TASK-044**: Product demonstration video & walkthrough recording:
  - Recorded live on-chain Mezo Cycle #1 flow: `live_mezo_cycle_test_1792603049823.webp`.
  - Recorded multi-viewport responsiveness & failure resilience walkthrough: `viewport_resilience_audit_1792603987220.webp`.
  - Detailed narration runbook and timing cues documented in `walkthrough.md`.
- [x] **TASK-045**: Complete project documentation (`README.md`) with contract addresses, verified transaction hashes, architecture diagrams, and limitation disclosures.

---

## 8. Prompt 7: Verified Demo Release Checklist & Audit Log

Executed per `PrD.md`, `architecture.md`, `design-addendum.md` §19, `UI (2).md` §22, `UX (2).md` §15, and attached production/security PDFs.

| # | Acceptance Criterion | Verification Method / Evidence | Status |
|---|---|---|:---:|
| 1 | **Clean Browser Storage:** Fresh session loads without reliance on pre-seeded storage. | Tested in incognito/cleared storage; synthetic fallback loads on-chain cycle cleanly. | **VERIFIED** |
| 2 | **Multi-Wallet Group/Claim Agreement:** Independent wallets see identical state; debtor-only signing. | 7 unit auth tests pass (`auth.test.ts`); EIP-712 debtor acceptance challenge verified. | **VERIFIED** |
| 3 | **Deterministic Netting Math & Commitment:** Shuffled obligations yield identical hash; $\Sigma \text{ net} = 0$. | 8 netting tests pass (`netting.test.ts`); commitment order & token sensitivity verified. | **VERIFIED** |
| 4 | **Official Mezo Testnet MUSD Binding:** Contract verified against official token `0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503`. | Chain ID 31611 config verified; kernel `0x3c5Efa1E7fb42ec5351d132bcAce83C8C4dbc3D5` immutable token matches verified Mezo MUSD. | **VERIFIED** |
| 5 | **Truthful Transaction Lifecycle:** Wallet submission not displayed as success until confirmed receipt. | TransactionStatus handles Submitted/Pending/Confirmed/Reverted; authoritative contract refresh. | **VERIFIED** |
| 6 | **Exact Base-Unit Reconciliation:** Balances, cycle states, and CSV export reconcile in $10^{18}$ base units. | CSV Export verified from live cycle #1 (`0x156915a7...`); commitment anchor matched. | **VERIFIED** |
| 7 | **Adversarial & Fault Resilience:** Offline banner, wrong chain guard, sanitized error messages, no info leaks. | Verified `<NetworkGuard />`, `<OfflineBanner />`, zero DB schema/trace leaks in UI. | **VERIFIED** |
| 8 | **Multi-Viewport Responsiveness:** Checked across 320px, 390px, 768px, 1024px, 1440px without blowout. | Verified via browser subagent across all 5 viewports; screenshots captured in artifacts. | **VERIFIED** |
| 9 | **Keyboard & Reduced-Motion Accessibility:** Tab outline focus rings (2px offset) and instant motion switch. | Tab navigation verified with wine focus ring (`focus_ring_check_1792604119592.png`). | **VERIFIED** |
| 10 | **Replay-Safe Indexer & Lag Notice:** Safe cursor advancement, idempotent replays, UI lag notice. | 9 indexer tests pass (`worker.test.ts`); UI indexer-lag banner verified. | **VERIFIED** |

