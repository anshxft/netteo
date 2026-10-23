# Netteo — Persistent Project Memory & Context (`MEMORY.md`)

**Project:** Netteo (Multilateral Obligation Netting and MUSD Settlement on Mezo)  
**System Target:** Mezo Testnet (Chain ID `31611`)  
**Settlement Asset:** MUSD (ERC-20, 18 decimals)  
**Status:** In Active Development (Phase 0 Foundations / Phase 1 Core Logic Verification)  
**Last Verified / Updated:** 21 October 2026  

---

## 1. Project Overview & Core Domain

Netteo is a decentralized settlement protocol and financial application designed for Web3 service collectives, DAO working groups, and recurring project contributors. It solves the friction, transaction overhead, and liquidity lockup of reciprocal bilateral debts by calculating deterministic net positions across groups and executing settlement atomically in MUSD.

### Core Value Proposition
- **"Many obligations. One net settlement."**
- **Permanent Auditable Gross Ledger:** Individual bilateral obligations and their receipts are preserved for full accounting history. Netting does not erase history; it calculates terminal settlement transfers from it.
- **Atomic Collect-Then-Distribute:** Governed by the Solidity `SettlementKernel`. Net debtors must fund 100% of required deposits in MUSD before any net creditor can be paid. If the cycle expires unfunded, a mutual-exclusion refund path lets depositors reclaim their tokens.

---

## 2. Tech Stack, Integrations & Deployment Setup

### Frontend & Application Layer
- **Framework:** Next.js 16.4.2 (App Router, Turbopack) + React 19.3.1 + TypeScript (strict mode).
- **Styling:** Vanilla CSS & CSS Variables (`src/styles/tokens.css`, `src/styles/globals.css`). No Tailwind unless explicitly mandated.
  - *Palette:* Wine `#7F011F`, Sand `#F5EBD0`, Ink `#211A1B`, Page `#F9F6EF`, Surface `#FFFCF7`, Border `#E5DCCF`, Muted `#756B6B`.
  - *Typography:* Local Roundo font family (`public/fonts/Roundo-*.otf`) loaded via `next/font/local` in `src/app/layout.tsx`. Tabular figures for aligned amounts.
  - *Icons:* Lucide React (primary) with unified `--icon-stroke: 1.75px` wrapper, plus custom Netteo SVGs (`ObligationIcon`, `NettingIcon`, `CycleIcon`, `SnapshotIcon`, `NetPositionIcon`).
  - *Motion:* Tokenized (120ms fast, 180ms base, 240ms slow, cubic-bezier easings). No generic shimmer, glow, or particle slop.

### Web3, Blockchain & Smart Contracts
- **Target Network:** Mezo Testnet (EVM-compatible, Chain ID `31611`).
  - RPC: `https://rpc.test.mezo.org` | WSS: `wss://rpc-ws.test.mezo.org`
  - Explorer: `https://explorer.test.mezo.org`
  - Gas currency: BTC (18 decimals)
- **Settlement Token:** MUSD ERC-20 (`NEXT_PUBLIC_MUSD_ADDRESS`).
- **Smart Contract:** `SettlementKernel.sol` (OpenZeppelin `SafeERC20`, `ReentrancyGuard`).
- **Client Libraries:** Viem + Wagmi for EVM contract interactions and wallet state (Phase 4).

### Backend, Database & Projections
- **Database:** Supabase / PostgreSQL with Row-Level Security (RLS) for off-chain presentation metadata (group titles, descriptions, document links).
- **Chain Indexer:** Server-side worker ingesting `SettlementKernel` events into idempotent read-model projections (`(chain_id, transaction_hash, log_index)`).
- **Deployment:** Vercel (Next.js web application) + Mezo Testnet (Solidity kernel). Configuration via `.env.example`.

---

## 3. Important Files, Directories & Responsibilities

```
c:/netteo/
├── .agents/rules/ui-ux-design-rules.md  # Workspace rules for UI/UX & mandatory PDF references
├── .env.example                        # Template for client-safe and server-only env vars
├── contracts/                          # Solidity contracts (SettlementKernel.sol - Phase 1)
├── public/fonts/                       # Roundo OTF font files (Regular, Medium, SemiBold, Bold, Light, ExtraLight)
├── src/
│   ├── app/
│   │   ├── layout.tsx                  # Root layout, Roundo font definition, HTML metadata
│   │   └── page.tsx                    # Landing / protocol overview page
│   ├── features/
│   │   └── settlement-cycles/
│   │       ├── netting.ts              # Pure deterministic netting algorithm (v1.0)
│   │       └── netting.test.ts         # Unit test suite verifying netting invariants
│   └── styles/
│       ├── tokens.css                  # Design token definitions (palette, spacing, radius, motion)
│       └── globals.css                 # Base resets and typography styles
├── package.json                        # Dependencies and scripts (Next 16, React 19)
├── tsconfig.json                       # TypeScript compiler options
├── PrD.md                              # Product Requirements Document (domain model, invariants, journeys)
├── architecture.md                     # System architecture, ADRs, sequence diagrams, trust boundaries
├── rules.md                            # Implementation rules, guardrails, and token specs
├── design-addendum.md                  # Icon rules, motion tokens, button specs, review gates (§18 & §19)
├── phases.md                           # Sequential project roadmap (Phases 0 through 7)
├── tasks.md                            # Actionable task tracking checklist with verified statuses
└── MEMORY.md                           # This file: authoritative persistent context
```

### Route Map & Responsibilities (Planned in Phases 2–4)
- `/` — Protocol landing, value proposition, and network status badge.
- `/groups` — Service collective / working group directory and member management.
- `/obligations` — Financial obligation desk (propose, accept, dispute, filter claims).
- `/cycles/new` — Assembly desk for freezing accepted obligations into a settlement cycle.
- `/cycles/[id]` — Settlement cycle execution desk (funding progress, MUSD deposit, atomic execution, refund).
- `/cycles/[id]/audit` — Read-only auditable ledger linking gross claims to final settlement transactions.

---

## 4. Key Architectural & Design Decisions (ADRs)

| Decision | Choice | Rationale |
|---|---|---|
| **ADR-01: Modular Monolith** | Next.js App Router + 1 Indexer Worker | Avoids microservice sprawl for hackathon/MVP; keeps domain modules clean without distributed orchestration complexity. |
| **ADR-02: Contract Authority** | Smart contract owns money; database owns explanation | Database and UI state never authorize token transfers. Projections are completely rebuildable from chain logs. |
| **ADR-03: Collect-Then-Distribute** | 100% funding threshold before any distribution | Guarantees solvency. Creditors are never partially paid from a pool where other debtors defaulted. |
| **ADR-04: Single Settlement Asset** | MUSD only for MVP | Prevents mixed-token exchange rate volatility and multi-asset escrow risks. |
| **ADR-05: Bounded Cycle Size** | Max 10 participants, max 30 obligations per cycle | Bounded gas consumption on loops in Solidity `SettlementKernel`; eliminates unbounded block gas limit vulnerabilities. |
| **ADR-06: Obligation Storage Model** | Canonical commitment snapshot on-chain; gross metadata off-chain | Storing full string metadata on-chain is gas-prohibitive. Snapshot hash ensures integrity; on-chain inputs verify net balances. |
| **ADR-07: Confirmation Policy** | Debtor-acceptance required per obligation; non-zero net participants confirm cycle freeze | Prevents unauthorized debt claims from entering the netting pool. |
| **ADR-08: Deterministic Netting Algorithm** | Greedy sorted debtor-to-creditor allocation using BigInt base units | Completely reproducible, deterministic, zero-sum ($\sum \text{net} = 0$). Floating-point math is strictly prohibited. |
| **ADR-09: Truthful Interfaces & 5 Screen States** | Explicit Loading, Empty, Error, Success, Offline states for every screen | Mandated by `Prototype_vs_Production_Checklist.pdf` and `design-addendum.md`. Never show blank screens, fake progress, or raw technical error codes. |

---

## 5. Existing Constraints, Security Requirements & Functionality Preservation

1. **Security Boundaries (`Secure_Vibe_Coding.pdf` & `Security_Prompt_Pack_Freebie.pdf`):**
   - Client-side validation is purely for immediate UX feedback; server actions and smart contracts are the sole security boundaries.
   - Never expose database schemas, internal table/column names, RPC endpoints, or raw stack traces in user-facing error messages or console logs.
   - Zero hardcoded secrets, deployer private keys, or Supabase service-role keys in client code or Git.
2. **Double-Click Protection:** All action and transaction submit buttons must be protected against duplicate clicks/submissions.
3. **Input Preservation:** User input in forms must never be wiped out upon validation failure.
4. **Accessibility & Reduced Motion:** Tab navigation with visible 2px focus rings (`--color-wine` with 2px offset). All animations must respect `prefers-reduced-motion` (instant visual state switch).
5. **Integer Math Only:** All financial amounts must remain in base units (`bigint`). Never use standard JavaScript `number` for currency calculation.

---

## 6. Implementation Status & Phase Roadmap

### Completed & Verified
- [x] **Workspace Setup:** Next.js 16 + React 19 + TypeScript base configuration.
- [x] **TypeScript & ESM Fixes:** `"type": "module"` in `package.json`, `"target": "ES2022"` in `tsconfig.json`, BigInt literals and JSX syntax verified.
- [x] **Typography Assets:** Roundo font family unpacked and verified in `public/fonts/` (6 weights).
- [x] **Design Tokens:** `src/styles/tokens.css` created with palette, spacing, border radii, and motion tokens.
- [x] **Deterministic Netting Core:** `src/features/settlement-cycles/netting.ts` implemented (zero-sum invariant, address normalization, deterministic greedy matching).
- [x] **Netting Unit Tests:** `src/features/settlement-cycles/netting.test.ts` implemented and 100% passing (6/6 tests passing via `npm test`).
- [x] **Smart Contract Kernel:** `contracts/SettlementKernel.sol` implemented with OpenZeppelin `SafeERC20`, `ReentrancyGuard`, collect-then-distribute invariant, and mutual-exclusion refund path.
- [x] **Solidity Contract Tests:** `test/contracts/SettlementKernel.t.sol` implemented and 100% passing (6/6 tests passing via `forge test`).
- [x] **Icon System:** Unified `<Icon />` wrapper (`--icon-stroke: 1.75px`) and custom Netteo SVGs in `src/components/icons/netteo/` (`ObligationIcon`, `NettingIcon`, `CycleIcon`, `SnapshotIcon`, `NetPositionIcon`).
- [x] **Standard Button Component:** `<Button />` in `src/components/common/Button.tsx` adhering to `design-addendum.md` §7 with built-in double-click protection and width-locked spinner.
- [x] **Responsive Shell:** `<AppLayout />`, `<AppHeader />`, `<AppNav />`, and `<WalletBadge />` with offline detection banner and accessible landmarks.
- [x] **Group Management Feature (`/groups`):** Implemented in `src/features/groups/` with 5 screen states (Loading, Empty, Error, Success, Offline), input preservation on error, address validation, and bounded 10-participant limit.
- [x] **Obligation Desk Feature (`/obligations`):** Implemented in `src/features/obligations/` with financial ledger view, tabular figures, status tabs (`All`, `Accepted`, `Proposed`, `Disputed`, `Frozen`, `Withdrawn`), propose claim modal, and debtor acceptance actions.
- [x] **Signature Netting Transition:** Implemented in `NettingGraph.tsx` with user-triggered view toggle, `--motion-slow: 240ms` transition, legible transfer amounts, reduced-motion compliance, and position reconciliation table.
- [x] **Settlement Cycle Assembly (`/cycles/new`):** Interactive eligible obligation selection, live netting calculation preview, and canonical commitment hash review.
- [x] **Funding & Execution Desk (`/cycles/[id]`):** Verified-state progress bar, debtor deposit simulation, atomic settlement distribution trigger, and timeout refund path.
- [x] **Audit Statement & CSV Export (`/cycles/[id]/audit` & `/audit`):** Cryptographic proof statement linking gross obligations to net payouts, with RFC 4180 CSV statement export.
- [x] **Web3 Provider & Typed Configuration (`src/lib/chain/`):** Wagmi + Viem configured for Mezo Testnet (Chain ID 31611) with fail-closed network validation and typed contract ABIs.
- [x] **Wallet & Network Guard Components:** `<WalletConnectModal />`, `<NetworkGuard />`, and `<WalletBadge />` integrated directly into `<AppLayout />` and `<AppHeader />`.
- [x] **Contract Interaction Hooks:** `useMusdToken()` (reads: `balanceOf`, `allowance`, `decimals`; writes: `approve`) and `useSettlementKernel()` (`createCycle`, `deposit`, `executeSettlement`, `claimRefund`) with single-flight locks and sanitized error reporting.
- [x] **Transaction Status Feedback:** `<TransactionStatus />` component distinguishing Submitted, Pending, Confirmed, and Reverted states with explorer links and copy button.
- [x] **Supabase Metadata & Event Indexer:** Database schema (`src/lib/db/schema.sql`) with RLS and idempotent server-side event worker (`src/lib/indexer/worker.ts` & `/api/indexer`) ingesting logs into `indexed_events` and read projections.
- [x] **Testing & Security Audits (Phase 6):** 5-state audit, double-click protection verification, frontend security review (zero hardcoded secrets, safe error reporting), and 30-item slop audit passed.
- [x] **Documentation & Roadmap:** `PrD.md`, `architecture.md`, `rules.md`, `design-addendum.md`, `phases.md`, and `tasks.md` fully synchronized.

- [x] **Smart Contract Live Deployment (Mezo Testnet):** Live `SettlementKernel.sol` deployed at `0x3c5Efa1E7fb42ec5351d132bcAce83C8C4dbc3D5` bound to canonical Mezo Testnet MUSD `0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503` (Transaction: `0x0a1291923d40d4915810a4ce80059464a3cd5ba9b1b8b071bf5c9882a0407dbb`, block `16281871`). Legacy contract `0x50bb6B07138414fE509B2E2936cF31C9de3e1BbA` (MockMUSD) marked deprecated.
- [x] **End-to-End Live Settlement Acceptance Test:** Broadcast 4-step canonical settlement cycle on Mezo Testnet (Approve, Create, Deposit, Execute) with 100% verified state transitions and token transfers to Creditor B (20 MUSD) and Creditor C (60 MUSD).
- [x] **Project Documentation (`README.md`):** Complete production README with contracts table, verified Mezo Explorer transaction hashes, sequence diagrams, and disclosures.
- [x] **High-Taste Landing Page Redesign (`/`):** Full neo-brutalist financial ledger redesign inspired by Clario Monad and Glider.fi following `Leonxlnx/taste-skill`. Features blueprint grid, monospace metadata tags, split hero with interactive Clearinghouse Terminal Simulator (Developer Pod, Cross-DAO Guilds, OTC Liquidity Desks), 5 Manifesto Answer cards, Bilateral vs Netteo Comparative Ledger, 4-Phase Protocol Invariants, Verified Contract Registry with copy buttons, and Interactive FAQ accordion.
- [x] **Landing Page & Demo Sandbox Isolation:** Strict scoping applied to `AppLayout.tsx` and `AppHeader.tsx` to suppress the demo sandbox toggle and demo explainer banner from the public landing page while preserving full sandbox utility on authenticated routes.

### In Progress / Pending
- [ ] **Vercel Web Deployment & Demo Recording:** Deploy Next.js frontend to Vercel and record demonstration video.

---

## 7. Latest Verified Build, Test, Lint & Type-Check Status

*Last run timestamp: 22 October 2026 20:45 UTC+5:30*

| Check | Status | Exact Output / Root Cause |
|---|---|---|
| **Unit Tests (`netting.test.ts`)** | **PASSED** (Exit code `0`) | Ran `npm test`. All 6 test suites passed cleanly: PRD canonical 3-participant example, 4-participant circular debt, self-obligation rejection, zero-value rejection, duplicate ID rejection, max participant cap enforcement. |
| **Solidity Tests (`forge test`)** | **PASSED** (Exit code `0`) | Ran `forge test`. All 6 contract tests passed cleanly: `test_CanonicalThreeParticipantSettlement` (gas: 531833), `test_RefundLifecycleOnExpiry` (gas: 467914), `test_RevertIf_DebtorIsCreditor`, `test_RevertIf_DepositExceedsRequired`, `test_RevertIf_ImbalancedNetPositions`, `test_RevertIf_ParticipantCapExceeded`. |
| **Live Mezo Testnet Broadcast** | **PASSED** (Exit code `0`) | Live on-chain execution complete. Cycle `0x156915a716581f2b7358b4561e75c90ae14f7404ed9aca9a30c5c4872a82ef4f` completed and verified on canonical kernel. |
| **Type Check (`npm run typecheck`)** | **PASSED** (Exit code `0`) | Ran `tsc --noEmit`. Zero TypeScript errors across all `.ts` and `.tsx` source and test files. |
| **Production Build (`npm run build`)** | **PASSED** (Exit code `0`) | Next.js 16.4.2 Turbopack compiled successfully in 6.7s; TypeScript passed in 12.4s; all 10 routes prerendered / dynamic with 0 errors. |
| **Browser Subagent Test** | **PASSED** | Automated browser verification on `http://localhost:3000/`. Tested simulator tabs, gross/net mode switch, FAQ accordion, contract copy button, and landing isolation. Video: `netteo_landing_review_1792682132411.webp`. |

---

## 8. Theme Redesign & Production Frontend Accomplishments (23 October 2026)

- **Authentic Warm Minimal Fintech Theme:** Completely replaced Clario Monad blueprint imitation styles with Netteo's genuine Roundo typography, Wine (`#7F011F`), and Sand (`#F5EBD0`) palette across `src/app/page.tsx` and `src/app/page.module.css`.
- **Signature Netting Simulator:** Interactive clearinghouse terminal demonstrating multilateral debt collapse across 3 real-world personas (Developer Pod, Cross-DAO Guilds, OTC Desks) with live capital conservation percentages (up to 91.4% saved) and Gross/Net toggles.
- **Tactile Interactive Buttons:** Updated `Button.tsx` and `Button.module.css` with Emil Kowalski & Watermelon/Skiper active press scale (`0.97`, 120ms transition), double-click debounce locks, and width-locking loading states.
- **Global Toast Notification System:** Created `ToastContext`, `ToastContainer`, and `Toast` components with accessible `aria-live="polite"` feedback for clipboard copying, obligation proposals, and live Mezo settlement events.
- **Architectural Custom Footer:** Implemented `AppFooter.tsx` with live pulsing Mezo Testnet status (`Chain ID 31611`), verified contract registry, desk navigation, and solvency invariants.
- **Custom Error Pages:** Implemented `not-found.tsx` (404) and `error.tsx` (500) with sanitized error messaging per `Secure_Vibe_Coding.pdf` (zero leaked stack traces or DB schema).
- **Plain English Page Hierarchy & Internal Desk Redesign:** Redesigned `/obligations` (Payments), `/cycles` (Settlements), and `/audit` (Settlement Receipts) into intuitive, plain-English interfaces with Roundo typography, 4-card KPI summary strips, clear status filters, savings metrics, and one-click receipt exports.
- **21st.dev MCP Integration:** Configured in `mcp_config.json` with user-supplied API key.
- **Verification:** `npm run typecheck`, `npm test` (all 25 tests), and `npm run build` (10/10 routes) passed with code 0. Verified live in browser subagent across all pages.

---

## 9. Known Issues, Current Blockers & Recommended Next Steps

### Known Issues & Config Blockers
*None.* Smart contracts and Supabase database are live and verified. 21st.dev MCP configured and operational.

### Recommended Next Steps
1. Deploy web application to Vercel with environment variables.
2. Record final walkthrough video highlighting reciprocal obligations, signature netting animation, and on-chain atomic settlement.

---

## 9. Session Handoff Notes

- **Current Working Directory:** `c:\netteo`
- **Active State:** Foundations verified, pure netting logic verified and tested. Application code is ready for build/typecheck fixes followed by contract and UI development.
- **Critical Don'ts for Upcoming Sessions:**
  - Do NOT introduce Tailwind or external CSS utility frameworks; use `src/styles/tokens.css`.
  - Do NOT use floating point numbers for token math; stick to `bigint` base units.
  - Do NOT mock blockchain state as if it were confirmed on Mezo.
  - Do NOT modify contracts without running invariant tests.

---

## 10. Rules for Following & Maintaining `MEMORY.md`

All agents and contributors working in this repository MUST adhere to the following protocol:
1. **Read `MEMORY.md` First:** Inspect this file before starting any task or writing any code.
2. **Verify Against Codebase:** Verify documented facts against real files; never trust stale notes blindly.
3. **Honor Decisions & Constraints:** Abide by established ADRs, token palettes, security rules, and architectural boundaries.
4. **Update at Session Completion:** After completing any meaningful task, update `MEMORY.md` with verified statuses, new decisions, resolved issues, and next steps.
5. **No Speculative Completion:** Never mark a test or feature as complete without running and verifying it.
6. **Distinguish Facts from Assumptions:** Keep verified facts, working assumptions, and future plans clearly separated.
7. **Avoid File Bloat:** Do not copy whole documents here. Cross-reference `PrD.md`, `architecture.md`, `tasks.md`, `phases.md`, `UI (2).md`, and `UX (2).md`.
8. **Strictly Zero Secrets:** Never commit API keys, private keys, seed phrases, or sensitive credentials to this file or any file in the workspace.
9. **Concise and High-Signal:** Maintain clear, concise, and structured documentation optimized for future engineering sessions.
