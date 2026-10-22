# Netteo implementation review and upgrade prompts

**Review date:** 21 October 2026  
**Scope:** Read-only inspection of the app, contracts, tests, project documents, environment-variable names/values needed to classify chain configuration, and linked reference sources. No application code or configuration was changed. This file is the only deliverable added.

## Executive assessment

[Certain] Netteo has a coherent hackathon concept: preserve accepted gross claims, calculate zero-sum net positions, fund only net debtors, and distribute atomically in MUSD on Mezo. The project already contains a useful UI shell, deterministic netting flow, Solidity kernel, wallet hooks, and a first pass at audit views.

[Certain] It is not yet an end-to-end shared testnet prototype. The visible group/obligation/cycle workflow is mostly backed by browser `localStorage` and seeded fictional records; a disconnected or unconfigured user can take a local simulation path that creates cycle state without an on-chain transaction. The Supabase sync functions are not called by the feature workflows I traced.

[Certain] The configured MUSD in `.env` and `.env.local` is the repository's `MockMUSD` deployment address (`0xAEE79F4B1909E10dD2B7Fd3B3170B6087020FB38`). Mezo's current testnet documentation lists canonical MUSD at `0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503`, with 18 decimals. The deployed `SettlementKernel` stores its token as immutable, so using canonical MUSD requires deploying a new kernel against that token. The README's “real MUSD” acceptance claim therefore needs to be reverified against the canonical token before being repeated. [Mezo token reference](https://testnet.mezo.org/docs/users/resources/contracts-reference) · [Mezo network parameters](https://testnet.mezo.org/docs/users/getting-started/connect)

[Certain] Cycle integrity is not ready to rely on: the field named `canonicalCommitmentHash` is produced by a custom 32-bit rolling polynomial padded to 32 bytes, not SHA-256 or Keccak; the contract accepts the supplied commitment without checking it against the obligations or net arrays. The hash is not a cryptographic commitment to the frozen claims.

[Certain] The indexer currently reads `DepositReceived` argument names that do not exist in the Solidity event (`participant`, `cycleTotalFunded`, `totalFundedByParticipant` versus `debtor`, `totalCycleFunded`, `totalDebtorFunded`). As a result, deposit projections can be wrong or fail at runtime. The worker also advances the cursor after projection write failures, risking permanently skipped projection updates.

[Likely] The most effective next step is a narrow, truth-first demo slice: canonical MUSD + a newly deployed kernel, explicit test/demo separation, shared persistence/authorization for obligation data, and a verified chain-to-audit read path. UI polish should follow those foundations.

## Findings ranked by demo impact

### P0 — Fix before presenting this as a real-MUSD live demo

1. **Canonical token and kernel configuration**
   - [Certain] `NEXT_PUBLIC_MUSD_ADDRESS` is set to the repository MockMUSD address in both local environment files. `script/Deploy.s.sol` can create `MockMUSD` when the variable is absent, and `script/AcceptanceTest.s.sol` casts the configured token to `MockMUSD`.
   - [Certain] Mezo's official testnet MUSD address is different. Verify its bytecode, `decimals()`, and transfer/allowance behavior, deploy a fresh `SettlementKernel` with that address, then verify both addresses and constructor configuration on the explorer.
   - [Certain] The README lists deployment and transaction claims, but I could not independently verify those transactions through the explorer page in this review. Keep them marked “documented, not independently reverified” until checked against the live explorer.

2. **Remove accidental simulation from the live product path**
   - [Certain] `src/features/groups/store.ts`, `src/features/obligations/store.ts`, and `src/features/settlement-cycles/store.ts` seed canonical sample data and use `localStorage`. `CycleAssemblyView` and `CycleExecutionView` have local simulation branches when live contract conditions are not met.
   - [Certain] The sample group/obligations use repeated `0x111…`, `0x222…`, `0x333…` addresses. Keep those only in a clearly labeled demo workspace; never mix them into a live wallet's records or claim they came from chain state.
   - [Likely] For a hackathon prototype, keep one-click sample data as an optional “Load sample workspace” action, but make live mode fail closed when wallet, chain, token, kernel, or persistence is unavailable.

3. **Make the cycle snapshot commitment real and reviewable**
   - [Certain] Replace the custom rolling hash with an explicitly versioned canonical encoding and `keccak256`, binding at minimum chain ID, token address, algorithm version, sorted obligation IDs/parties/amounts, debtor/creditor allocations, and relevant cycle parameters.
   - [Certain] Preserve an independently reproducible snapshot so a reviewer can recompute the commitment from the audit screen/export. The current contract does not validate this commitment; avoid presenting it as a contract-enforced proof until the contract or a verifiable signature flow checks the same canonical payload.
   - [Likely] Since accepted obligations are currently off-chain, require explicit wallet confirmation of the exact frozen snapshot before funding; document what is authenticated on-chain and what remains a shared off-chain claim record.

### P1 — Needed for a reliable multi-user demo

4. **Shared persistence and authorization**
   - [Certain] `src/lib/db/syncService.ts` contains Supabase functions, but feature-store callsites use local stores; `rg` found no feature caller of the sync functions.
   - [Certain] The provided schema has public `SELECT` policies for groups/obligations/cycles and service-role write policies for indexer tables, but no user write policies for groups, memberships, or obligations. The shown feature flow has no corresponding authorization boundary.
   - [Likely] Choose one simple model suitable for the demo: wallet-signature identity/session plus server-side validation and group/participant authorization, or explicit public demo data with no sensitive fields. Then add least-privilege RLS and tests for owner/member, outsider, and modified-ID access. Do not put private document references in globally readable rows.

5. **Repair event ingestion before using it for history**
   - [Certain] Align event projection code with the actual ABI and Solidity field names. Populate required/funded debtor values from authoritative contract reads or emitted fields; the current deposit event does not emit the required deposit amount.
   - [Certain] Treat an event plus its projection update as one replayable operation. Do not advance the cursor when any required write fails. Add a deployment-block start, confirmation/reorg policy, and a freshness indicator.
   - [Certain] The indexer route permits unauthenticated execution when `INDEXER_CRON_SECRET` is unset, and `GET` invokes the same worker as `POST`. Require the secret in deployed environments and make the trigger method explicit.

6. **Make cycle/audit screens chain-first**
   - [Certain] Cycle lists and audit views read local cycle/obligation stores; direct contract reads are used in parts of the detail flow. Use chain reads/verified receipts for cycle state, funding totals, payouts, refunds, and terminal status; use the database only as an explicitly stale/read-optimized index.
   - [Likely] Show transaction hash, confirmed block, token, chain, and a direct explorer link for create, approve, deposit, settlement, and refund. Keep “submitted”, “pending”, “confirmed”, “reverted”, and “not indexed yet” distinct.

7. **Align the contract/user consent story**
   - [Certain] The contract enforces balanced net arrays and atomic collect-then-distribute, but it does not know the underlying obligations, debtor acceptance, or per-participant approval of a frozen snapshot. `createCycle` is permissionless.
   - [Likely] Keep the contract small for the hackathon, but bind the proposal to explicit participant review: show the frozen obligations and exact net amount before each debtor's deposit, and make the snapshot/consent limitation visible. If the product requires stronger guarantees, design signed snapshot approvals or on-chain approvals as a separate contract change with targeted review.

### P2 — Submission quality after the happy path is trustworthy

8. **Prove responsive and failure behavior rather than trusting checkboxes**
   - [Certain] `tasks.md` marks frontend security, five-state, accessibility, viewport, and on-chain work complete, while `tasks.md` also leaves Vercel deployment and demo-video tasks open. These checkboxes are not evidence of current behavior; this inspection did not run a browser, viewport audit, or test suite.
   - [Likely] Recheck 320, 390, 768, 1024, and 1440 px plus keyboard-only, reduced motion, offline, slow RPC, rejected wallet request, insufficient MUSD/allowance, reverted transaction, expired cycle, and indexer lag. Record screenshots and exact test outcomes.
   - [Likely] Configure hosted environment variables, a repeatable deploy/rollback path, a health check, and a clear demo reset/sample-data path. Do not claim production readiness; target a robust testnet demo.

## Suggested implementation order

1. [Certain] Verify official testnet MUSD and Mezo configuration; deploy/verify a kernel whose immutable token is canonical MUSD.
2. [Certain] Fix snapshot canonicalization and the event field/projection/cursor bugs; verify through independent `eth_call`, receipt, and explorer reads.
3. [Likely] Separate sample workspace from live mode; remove live fallback simulation; make every displayed live record come from a verified source.
4. [Likely] Implement the minimum shared persistence and authorization required for two or three independent wallets to see the same group and accepted obligations.
5. [Likely] Run the canonical end-to-end flow repeatedly with fresh browser storage and separate participant wallets; reconcile exact balances, events, and exported audit statement.
6. [Likely] Finish deployment, responsive/accessibility/failure checks, and a short demo recording only after steps 1–5 pass.

## Copy-paste implementation prompts

Run these one at a time. Each prompt asks the coding agent to inspect callers and project conventions first, make the smallest complete change, and report evidence. The prompts do not authorize changing unrelated product scope.

### Prompt 1 — Verify and switch the testnet token deployment

> Audit Netteo's current Mezo Testnet deployment configuration against current official Mezo documentation and the live explorer. The repository's local MUSD configuration appears to point at its MockMUSD deployment, while official docs list testnet MUSD as `0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503` (18 decimals). Verify the token code and behavior read-only first. Do not use a deployer key or broadcast a transaction until I explicitly approve the concrete deployment plan. Then prepare the minimum code/config/README/script changes for a new SettlementKernel deployment whose immutable token is canonical MUSD; fail closed if configured token/kernel addresses or chain do not match. Keep MockMUSD for local tests only. Show all exact files and the verification evidence needed before any broadcast.

### Prompt 2 — Repair commitment encoding and audit reproducibility

> Inspect every caller of `calculateNetting` and every consumer of `canonicalCommitmentHash`. Replace the current custom rolling hash with one canonical, versioned encoding using installed `viem` primitives and `keccak256`; bind chain ID, token, algorithm version, sorted obligation IDs/parties/amounts, sorted net positions, and allocation inputs. Add a small assert-based self-check for order independence, amount sensitivity, and chain/token sensitivity. Do not claim the contract validates a commitment unless you implement and test that validation. Update the cycle review/audit copy to accurately explain the off-chain vs on-chain trust boundary, while preserving the current product flow.

### Prompt 3 — Separate sample mode from live mode

> Trace all store callers and screen state paths for groups, obligations, cycles, and audit. Remove implicit seeded data and local simulation from live mode. Keep a clearly labeled optional sample workspace for the hackathon demo, isolated from wallet-backed records and resettable by the user. In live mode, if wallet/chain/kernel/token/persistence is missing, show a recoverable unavailable/error state and do not create fake success or a fake chain cycle. Preserve existing netting logic and the visual system. Provide a screen-by-screen source-of-truth table and confirm no sample transaction, balance, participant, or cycle can appear as live data.

### Prompt 4 — Minimal shared data and permission boundary

> Trace group and obligation create/accept/dispute/withdraw flows and all database callers. Implement the smallest shared persistence path that allows two independent participant wallets to see the same group and claims across browsers. Authenticate wallet ownership with a signed challenge and nonce protection; validate every mutation server-side; enforce participant/role access in RLS or an equally strong server boundary. Preserve exact amounts as integer base units and keep private document data private. Do not weaken existing RLS or expose the service-role key. Include tests/assertions for authorized member, outsider, replayed signature, and altered group/obligation IDs.

### Prompt 5 — Make the indexer replay-safe and match the contract ABI

> Compare `SettlementKernel.sol`, `src/lib/chain/abi.ts`, `src/lib/indexer/worker.ts`, and `src/lib/db/schema.sql` field by field. Fix the `DepositReceived` field-name mismatch and derive required/funded amounts correctly from emitted events plus authoritative contract reads. Do not advance the cursor if event insertion or any required projection update fails; make replays idempotently repair partial work. Add a confirmation/reorg strategy and deployment block. Require a cron secret in deployed configuration and remove the GET-trigger path. Add small tests for each event shape and a replay after a simulated projection failure. Never log user secrets or return internal errors to clients.

### Prompt 6 — Chain-first funding and audit

> Inspect the cycle list, detail, execution, and audit callers. For live cycles, read state, participant arrays, debtor requirements/funding, creditor payouts, token balances/decimals, and terminal totals from the configured contract and confirmed receipts. Treat Supabase projections as indexed/stale read models, never final financial truth. Show submitted/pending/confirmed/reverted and indexer-lag states accurately, with explorer links from verified config. Remove local simulation from live routes and make exports reconcile to the frozen snapshot and chain events. Do not change contract addresses or broadcast transactions in this task.

### Prompt 7 — Produce a verified demo release checklist

> Using `PrD.md`, `architecture.md`, `design-addendum.md` §19, `UI (2).md` §22, `UX (2).md` §15, and the attached production/security PDFs, prepare and execute a testnet demo readiness audit. Use separate wallets and fresh browser storage. Verify group/obligation agreement, exact preview math, canonical MUSD approval, cycle creation, funding, settlement/refund, on-chain balances/events, audit export, and explorer links. Check 320/390/768/1024/1440 px, keyboard, reduced motion, offline, slow RPC, wrong chain, rejected wallet, insufficient funds/allowance, failed receipt, and indexer lag. Report only checks actually performed; leave failures as blockers, with screenshots or transaction references for evidence.

## Acceptance criteria for “working end to end”

- [Certain] A clean browser can complete the intended demo without relying on pre-seeded browser storage.
- [Certain] Two or more independent wallets see the same group/claim state and only authorized participants can change it.
- [Certain] The frozen claim set, algorithm version, calculated positions, and cycle commitment are reproducible from the review/audit screen.
- [Certain] The configured token is the official Mezo Testnet MUSD contract; the kernel's immutable token is verified against that address.
- [Certain] Wallet submission is not presented as success until a successful receipt and authoritative chain reads confirm the transition.
- [Certain] Final balances, cycle state, event projections, and CSV export reconcile exactly in base units.
- [Certain] A failed RPC/indexer/database call never creates fake financial state, silently loses a user input, or prevents safe on-chain verification.
- [Certain] Deployment variables are configured on the hosting platform, the deployed URL is tested in a fresh session, and a rollback path is known.
- [Certain] Responsive, keyboard, reduced-motion, offline, and error-state checks have recorded evidence; unchecked roadmap boxes are not used as proof.

## Sources consulted

- [Certain] Project files: `PrD.md`, `architecture.md`, `README.md`, `phases.md`, `tasks.md`, `rules.md`, `design-addendum.md`, `.env.example`, contract, frontend stores/screens, chain hooks/ABI, Supabase schema/sync service, indexer and API route, Solidity and netting tests. Secret values were not printed or copied into this report.
- [Certain] UI/UX guidance read from disk: `design-addendum.md` §§18–19; `UI (2).md` §§1, 13–14, 16, 18–19, 22; `UX (2).md` §13. The five-state, review, and security checklists below informed findings; no UI implementation was performed, so the UI review gate was not run.
- [Certain] `Design-Quality-Codex.pdf`: execution quality, feedback ladder, motion/reduced-motion, state inventory, worst-day design, and verification checklist pages inspected. `Prototype_vs_Production_Checklist (2).pdf`: screen states, deployment, RLS, testing, input, and readiness checklists inspected. `Secure_Vibe_Coding.pdf`: server validation, error safety, authentication/session and rate-limit guidance inspected. `Security_Prompt_Pack_Freebie (2).pdf`: validation, IDOR, error/data-leak, and master pre-launch prompts inspected.
- [Certain] External, official Mezo docs consulted for Testnet chain ID/RPC/currency and canonical MUSD address: [Connect your wallet](https://testnet.mezo.org/docs/users/getting-started/connect), [Contracts and token addresses](https://testnet.mezo.org/docs/users/resources/contracts-reference).
- [Certain] UI reference links were treated as inspiration, not adopted code: [Watermelon UI](https://ui.watermelon.sh/components) was readable; [Skiper UI](https://skiper-ui.com/components) and [Pryzm Studio](https://pryzm.design/studio) loaded limited page text. GenLayer Portal returned no readable text; Motion Primitives returned 403; Feraui and Skill Issue were inaccessible in this browsing session. These are not blockers for the implementation plan.

## Not verified in this review

- [Certain] I did not run `npm test`, `npm run typecheck`, `npm run build`, `forge test`, or a browser/viewport pass; this request was for inspection and prompts, and no implementation was made.
- [Certain] I did not independently verify the README's contract deployment or transaction hashes on the live explorer.
- [Certain] I did not verify Vercel hosting, deployed environment variables, actual Supabase policies on a live project, wallet behavior with multiple accounts, or a fresh-browser testnet cycle.
- [Certain] A hackathon prototype can be made robust and demonstrably complete against an acceptance suite; “100% working” cannot be established without executing those checks in the target hosting and testnet environments.

## Score 4 → 8+ upgrade blueprint

[Likely] Treat “8–10” as a target for evidence quality, not a promised judge score. A stronger pitch or more screens cannot compensate for a demo that uses a mock token, keeps the group state in one browser, or implies a transaction happened when it did not.

### What an 8+ submission should prove

| Judge dimension | Upgrade target | Evidence the demo should show |
|---|---|---|
| Mezo integration | [Likely] Move from “deployed on Mezo” to “Mezo is necessary to the user flow.” | Canonical testnet MUSD, kernel immutable-token match, successful approval/funding/settlement receipts, and explorer-verifiable state. Mezo Testnet is chain ID 31611; canonical MUSD is `0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503` with 18 decimals. [Official network guide](https://testnet.mezo.org/docs/users/getting-started/connect), [official contract reference](https://testnet.mezo.org/docs/users/resources/contracts-reference). |
| Technical execution | [Likely] Make the product’s shared agreement and settlement state reproducible and trustworthy. | Two or more separate participants see the same persisted claims; frozen inputs produce the same net positions; contract reads and confirmed events match the UI/export; failures remain visible and retryable. |
| Business case | [Likely] Narrow the user and show a measured workflow improvement rather than broad DeFi claims. | A realistic group-payout scenario, before/after transfer count and gross/net amounts, time-to-reconcile measure, and a clear note that reduced transfer volume is not guaranteed economic savings. |
| Demo quality | [Likely] Give judges a clean, short, repeatable path with visible proof at each step. | Fresh-browser setup, testnet wallet connection, shared claims, agreement preview, real token approval, cycle creation, funding, settlement, and explorer links—without seeded history posing as live activity. |

[Certain] The April 2026 Mezo Hackathon announcement says projects must integrate MUSD and MEZO and demonstrate a working testnet demo. The published recap also emphasizes working demo quality, code, testnet deployment, and protocol integration. Check the exact rules for this event/track before submission because a historical rubric is not a substitute for current judging criteria. [Hackathon announcement](https://mezo.org/blog/the-mezo-hackathon-is-back/), [hackathon recap](https://mezo.org/blog/announcing-mezo-hackathon-2-winners/).

[Likely] Do not bolt MEZO onto Netteo through a meaningless token badge or speculative staking feature. First confirm whether this submission is judged against a rule requiring MEZO, then identify a real user action or protocol touchpoint that the official testnet supports. If there is no supported, explainable utility, disclose that limitation and ask organizers how they interpret the requirement. The older 2025 scoring weights can be used only as a planning proxy, not as the current scorecard. [Historical rubric](https://mezo.org/blog/the-mezo-hackathon-build-bitcoin-finance-in-4-weeks/).

### Recommended product story

[Likely] Position Netteo as “shared invoice and reimbursement netting for small Web3 service collectives,” initially targeting a 3–10-person DAO contributor pod or project team that repeatedly pays each other. The core promise is fewer settlement transfers and a shared audit trail; it is not lending, credit, yield, or guaranteed fee savings.

[Guessing] A credible first demo scenario is three contributors with accepted claims A→B 100 MUSD, B→C 80 MUSD, and C→A 20 MUSD. The frozen net result is A pays 80, B receives 20, and C receives 60. Show the gross claim volume (200), net amount funded (80), number of original claims (3), and actual settlement transfers separately. This illustrates reduced settlement volume without claiming the group “saved 120 MUSD.”

[Likely] Make the product workflow explicit: submit claim → counterparty accepts or disputes → all participants approve a frozen snapshot → preview net positions → fund required debits → settle → export a receipt. The judge should see who agreed to which snapshot, who funded, what the contract paid, and what remains outstanding.

### Implementation sequence

1. **[Certain] Gate 0 — lock the rules and demo truth.** Confirm current hackathon requirements, supported MUSD/MEZO addresses, the intended user, and the one demo scenario. Mark any non-live sample data as sample. Do not start feature expansion before resolving canonical token and contract deployment requirements.
2. **[Certain] Gate 1 — make Mezo testnet real.** Configure chain-specific addresses from verified official references; verify the token address and decimals at runtime; deploy a new settlement kernel using canonical MUSD because the existing kernel’s token is immutable; record deployment and transaction hashes; verify the deployed bytecode/config and contract reads. Never put a deployer secret in the browser bundle.
3. **[Likely] Gate 2 — make agreements and reads honest.** Persist shared group/claim state with server-side authorization and validation; freeze a versioned, sorted claim snapshot; use a cryptographic hash over canonical fields rather than the current weak rolling hash; distinguish off-chain claim evidence from on-chain settlement facts. Participant confirmations should bind the exact snapshot and net terms, with replay protection. Label indexed data as delayed until confirmed chain reads/events reconcile.
4. **[Likely] Gate 3 — make settlement observable.** Correct the event projection to match the contract ABI; make indexing replay-safe and prevent cursor advancement past failed required projections; show pending/confirmed/failed states accurately; reconcile base-unit amounts and export against contract state and receipts. Keep a clearly marked demo/sample mode separate from live testnet cycles.
5. **[Likely] Gate 4 — prove the business case and rehearse.** Run the scenario from a fresh browser with separate participant wallets; record actual transaction links and balances; validate the workflow with a few target users and report what they actually said. Capture one short demo video as a fallback, not as a substitute for the live testnet flow.

### Ready-to-use implementation prompts

#### Prompt A — Mezo integration audit and canonical MUSD migration

> Work only in the existing Netteo architecture and keep the change set focused on Mezo testnet correctness. Inspect every configured chain/token address, ABI, wallet chain check, balance/allowance read, approval path, settlement-kernel deployment reference, and explorer URL. Compare the configured network and MUSD address against the current official Mezo testnet documentation. Verify decimals from the token contract instead of assuming them in calculations. The existing kernel has an immutable token: explain the need for a fresh deployment if its token is not canonical MUSD, and prepare the smallest migration/deployment checklist and environment-variable changes. Do not broadcast transactions, expose keys, invent a MEZO utility, or call mock tokens “MUSD.” Update UI labels so mock/demo mode is unmistakable. Deliver a file-by-file plan, risks, and evidence required to close the migration.

#### Prompt B — shared claims, consent, and integrity boundary

> Trace the full group and obligation lifecycle from UI to persistence, APIs, and database policies. Replace browser-local state as the source of truth for a multi-user live demo with shared persisted state and server-side authorization/validation, using existing dependencies and project conventions. Freeze an immutable, versioned claim snapshot before netting. Replace the 32-bit rolling commitment with a standard cryptographic hash of a canonical sorted encoding; specify exactly which fields are covered and test deterministic output. Bind participant approvals to the snapshot hash and exact net positions with replay protection. Keep the boundary explicit: accepted claim data is an off-chain agreement unless the contract verifies it; a deposit proves funding, not the original invoice. Preserve entered data on errors and return safe user-facing messages. Do not add new product features.

#### Prompt C — contract and indexer settlement proof

> Compare the deployed Solidity events and ABI to every indexer decoder and UI projection. Fix argument mapping, make event processing idempotent, and ensure a required projection failure cannot silently advance the durable cursor. For every live cycle, derive financial truth from confirmed receipts and authoritative contract reads; treat database/indexer data as a read model and expose its freshness. Add focused tests for event argument mapping, replay, cursor failure, rounding/base-unit accounting, deposit limits, settlement/refund states, and reconciliation. Keep local simulation available only in an unmistakably labeled demo fixture. Include an end-to-end trace with transaction hashes and expected state transitions, but do not deploy or broadcast.

#### Prompt D — business validation and judge narrative

> Refine Netteo around one user: a small Web3 contributor group that periodically owes reimbursements or service payments to one another. Document the current manual workflow, the exact moment Netteo helps, and the constraints that remain. Use one realistic 3-person claim set and show gross claims, net debits, actual transfer count, and reconciliation time as separate metrics. Do not claim guaranteed savings or describe the product as credit, lending, or yield. Identify a simple interview script for 3–5 target users, record only observed feedback, and revise the pitch to distinguish validated facts from assumptions. Keep the product scope to claims, agreement, netting, settlement, and audit export.

#### Prompt E — judge-ready demo acceptance run

> Prepare a reproducible, fresh-browser Mezo testnet demo using canonical MUSD and independent participant wallets. Start with no seeded activity. Demonstrate shared claim entry, acceptance/dispute, frozen snapshot and approvals, deterministic net preview, wallet approval, cycle creation, funding, settlement, final balances, event/indexer reconciliation, and audit export. Capture the chain ID, verified token and kernel addresses, transaction hashes, explorer links, and before/after balances. Exercise wrong network, rejected signature, insufficient balance/allowance, RPC failure, delayed indexer, refresh/new browser, and small-screen layouts; report pass/fail with evidence and leave unresolved items visible. Do not call the demo complete when any financial state is simulated or unreconciled.

### Score ambition and stop line

[Guessing] If the current version is genuinely around 4/10 under the intended rubric, completing Gates 0–4 could credibly move the prototype toward an 8/10 demo because the central claims—Mezo usage, shared agreement, netting, and settlement—would be evidenced rather than narrated. A 9–10 is not a reasonable promise until judges can independently reproduce the flow and the business need has real user evidence.

[Likely] Keep out of scope until the core path is proven: lending/credit, yield, cross-chain bridges, governance, generalized DAO treasury dashboards, and token incentives. They add security and demo risk without improving proof of the core netting job.

[Certain] No code was changed as part of this upgrade brief; the report now contains the focused roadmap and prompts requested. The earlier implementation prompts remain available above for the broader codebase findings.
