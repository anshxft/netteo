# Netteo — Product Requirements Document

**Project:** Netteo (formerly NetSettle)  
**Product category:** Multilateral obligation netting and stablecoin settlement  
**Target ecosystem:** Mezo  
**Settlement asset:** MUSD  
**Document status:** MVP specification  
**Version:** 1.0  
**Last updated:** 20 October 2026

---

## 1. Executive summary

Netteo helps a defined group of participants reconcile mutual payment obligations and settle only their resulting net balances in MUSD.

Instead of making every participant pay every invoice independently, Netteo records approved obligations, calculates each participant's net position for a settlement cycle, collects the required net debtor amounts, and distributes funds to net creditors. The original obligations remain visible in the audit trail.

Netteo is not an invoicing suite, a general-purpose wallet, a lending protocol, or a bridge. Its core product is a controlled workflow for **agreeing on obligations, calculating net positions, and completing a verifiable settlement**.

### Product promise

**Many obligations. One net settlement.**

### MVP outcome

A judge or test user can create a settlement group, add participants, register and approve obligations, preview mathematically correct net positions, fund a settlement in MUSD on Mezo testnet, execute distribution, and verify the resulting on-chain records.

---

## 2. Problem statement

Small Web3 service collectives, DAO working groups, and independent contributors can incur reciprocal obligations during a project or settlement period. For example, one contributor may pay for infrastructure, another may provide design services, and a third may reimburse shared costs.

Settling every obligation separately creates avoidable operational work and potentially avoidable transfers. Existing accounting tools can record what is owed, but they do not necessarily provide a shared, auditable, smart-contract-enforced net settlement workflow using MUSD.

Netteo targets this specific gap: a group needs a reliable way to agree which obligations are valid, compute the net position of each participant, and settle the result without losing the history of the underlying claims.

### Illustrative example

Approved obligations:

- A owes B 100 MUSD.
- B owes C 80 MUSD.
- C owes A 20 MUSD.

Net positions:

- A owes 80 MUSD net.
- B is owed 20 MUSD net.
- C is owed 60 MUSD net.

A valid settlement can transfer 20 MUSD from A to B and 60 MUSD from A to C. The gross obligation ledger remains available for audit; the net settlement does not rewrite the original obligations.

This example illustrates the algorithm, not a claim about guaranteed gas savings or commercial suitability for every group.

---

## 3. Target users and initial market

### Primary user: Web3 service collective coordinator

A coordinator manages a recurring group of contributors, small agencies, or DAO service providers. They need to gather payment claims, resolve disagreements, and close a settlement period with an auditable record.

### Secondary users

- **Participant / claimant:** Submits an obligation and responds to a claim against them.
- **Approver:** Confirms that an obligation is accurate and eligible for the cycle.
- **Net debtor:** Deposits the amount they owe after netting.
- **Net creditor:** Receives a distribution from the settlement.
- **Auditor / observer:** Reviews obligations, approvals, net calculations, and settlement outcomes.

A single wallet may hold more than one role in a group only where the group's policy permits it. The MVP must not assume that the coordinator is entitled to approve claims on behalf of other participants.

### MVP customer boundary

Focus on small Web3 service collectives and DAO working groups that already use MUSD or are willing to test it on Mezo testnet. Do not initially target regulated payment processors, large enterprises, consumer bill splitting, payroll, credit, or cross-chain settlement.

---

## 4. Goals and non-goals

### Product goals

1. Make every obligation explicit, attributable, and reviewable.
2. Require debtor acknowledgement before an obligation is eligible for netting.
3. Calculate net positions deterministically from the approved obligation set.
4. Settle the resulting balances in MUSD with on-chain evidence.
5. Preserve a traceable link between source obligations and the settlement cycle.
6. Make incomplete, disputed, expired, and completed cycles easy to distinguish.
7. Provide a polished, usable demo based on real contract state—not mock balances.

### Non-goals for the MVP

- Creating or issuing a token.
- Lending, yield generation, collateral management, or credit scoring.
- Arbitrating commercial disputes or deciding whether an invoice is legally valid.
- Automatically verifying off-chain work or invoice authenticity.
- Cross-chain transfers or bridge integrations.
- Fiat on/off ramps, tax reporting, full accounting, or payroll.
- Permissionless public settlement groups with arbitrary untrusted members.
- AI-generated approval or automated release decisions.
- Supporting multiple settlement assets in a single cycle.
- Claiming that a smart contract makes an obligation legally enforceable in every jurisdiction.

---

## 5. Product principles

### 5.1 Agreement before arithmetic

A claim must not affect a participant's net position until it is accepted by the debtor and meets the cycle's eligibility rules. A disputed claim is excluded, not silently netted.

### 5.2 Preserve gross obligations

Netting is a settlement calculation, not deletion or rewriting of the original claims. The application must retain the obligation amount, parties, approval state, cycle membership, and settlement linkage.

### 5.3 Preview and execution must agree

The frontend may preview net positions for usability, but the contract must validate the committed obligation set and enforce the settlement amounts. A frontend calculation is not the source of truth.

### 5.4 No partial payout state

The settlement must not pay some creditors and leave others unpaid because one debtor has not funded. The MVP uses a collect-then-distribute flow: all required net debtor funds must be available before distribution becomes executable.

### 5.5 Explain every state

Every obligation and settlement cycle must have a visible status, a timestamp where available, and an explanation of what action is required next.

### 5.6 Do not hide operational costs

Show the MUSD amounts separately from gas costs. Do not claim that netting always saves money; the result depends on the original transfer pattern, network fees, and how obligations would otherwise be settled.

---

## 6. Core user journeys

### Journey A — Create a group

1. A connected wallet creates a group with a name, description, participant limit, and settlement policy.
2. The creator adds participant wallet addresses.
3. Each participant joins or explicitly accepts membership.
4. The group becomes ready when the minimum participant and policy requirements are met.

**Acceptance criteria**
- Only the group creator or authorized administrator can change group configuration.
- Duplicate participant addresses are rejected.
- A wallet cannot be added twice using different address casing.
- The UI clearly distinguishes invited, joined, and removed participants.
- Membership cannot be changed in a way that rewrites an active or completed cycle's history.

### Journey B — Record and approve an obligation

1. A participant proposes an obligation with debtor, creditor, amount, short description/reference, due date (optional), and supporting-document reference (optional).
2. The debtor reviews and accepts or disputes it.
3. The claimant can withdraw a pending proposal before acceptance.
4. An accepted obligation becomes eligible for a settlement cycle only if it meets the cycle's cutoff and policy.

**Acceptance criteria**
- Amounts are stored in the token's smallest unit; floating-point arithmetic is prohibited.
- Debtor and creditor must be different eligible group members.
- Zero-value and negative obligations are rejected.
- A disputed obligation is excluded from netting.
- Editing a material field after acceptance is not allowed; the proposer must cancel or supersede it using an auditable process.
- Off-chain documents are private by default. Never put sensitive invoice details on-chain.

### Journey C — Create and preview a settlement cycle

1. An authorized coordinator opens a cycle and selects eligible accepted obligations.
2. The system freezes the obligation set for that cycle.
3. Netteo computes each participant's net position.
4. Participants review the gross ledger, net positions, proposed debtor deposits, creditor distributions, and the algorithm version.
5. Required participants confirm the cycle before funding begins.

**Acceptance criteria**
- The cycle has a unique identifier and an immutable snapshot of the selected obligation IDs and amounts.
- Any change to the selected set invalidates prior confirmations.
- The sum of all net positions must equal zero.
- Total net debtor amounts must equal total net creditor amounts.
- The UI shows both the gross obligation total and total net funding requirement, without implying they are equivalent.
- A cycle cannot enter funding while unresolved disputes or required approvals remain.

### Journey D — Fund and settle

1. Net debtors approve MUSD spending for the settlement contract.
2. Each debtor deposits the exact required net amount.
3. The contract records deposits against the cycle and debtor.
4. Once the cycle is fully funded, an authorized participant executes distribution.
5. The contract transfers MUSD to each net creditor and marks the cycle completed.
6. The UI shows transaction hashes, block explorer links, and the final settlement statement.

**Acceptance criteria**
- A cycle cannot distribute funds before it is fully funded.
- Each debtor can fund only their required amount, unless the contract explicitly supports and safely accounts for overpayment.
- Distribution cannot execute twice.
- Repeated calls or transaction retries cannot create duplicate payouts.
- If funding expires before completion, eligible deposits can be refunded according to the documented policy.
- Refunds and distributions are protected against reentrancy and unauthorized calls.
- The UI waits for transaction confirmation and reflects reverted transactions as failures, not successes.

### Journey E — Audit a completed cycle

1. A participant opens the cycle's history.
2. The participant can inspect the original obligations, approvals, net positions, deposits, distributions, and relevant transaction hashes.
3. The participant can export a CSV statement for reconciliation.

**Acceptance criteria**
- Completed cycles are read-only.
- Every distribution can be traced to the cycle and its frozen obligation set.
- Exported figures match contract events and stored cycle records.
- Missing or unavailable off-chain metadata does not prevent users from verifying the on-chain settlement.

---

## 7. Functional requirements

| ID | Requirement | Priority |
|---|---|---|
| FR-01 | Connect an EVM wallet and detect the configured Mezo network | Must |
| FR-02 | Create a group and manage membership within defined permissions | Must |
| FR-03 | Propose, accept, dispute, and withdraw eligible obligations | Must |
| FR-04 | Create a cycle with a frozen obligation snapshot | Must |
| FR-05 | Calculate and display deterministic net positions | Must |
| FR-06 | Enforce cycle invariants in the smart contract | Must |
| FR-07 | Deposit MUSD against a participant's net payable balance | Must |
| FR-08 | Distribute MUSD only when the cycle is fully funded | Must |
| FR-09 | Provide timeout and refund handling | Must |
| FR-10 | Show transaction hashes and explorer links | Must |
| FR-11 | Provide an auditable cycle detail view | Must |
| FR-12 | Export a settlement statement as CSV | Should |
| FR-13 | Store optional document references with access controls | Should |
| FR-14 | Support notifications for pending approvals and funding | Could |
| FR-15 | Support multiple tokens or cross-chain settlement | Out of scope |

---

## 8. Settlement rules and algorithm requirements

### Net position definition

For participant `p`:

`net[p] = total_owed_to_p - total_owed_by_p`

- If `net[p] > 0`, participant `p` is a net creditor.
- If `net[p] < 0`, participant `p` is a net debtor.
- If `net[p] = 0`, participant `p` has no net payment for the cycle.

All calculations use integer token units. The contract must reject invalid inputs and must not rely on floating-point values.

### Required invariants

1. The sum of all net positions equals zero.
2. Sum of positive net positions equals the absolute sum of negative net positions.
3. No participant is required to pay more than their net debit for the cycle.
4. No participant receives more than their net credit for the cycle.
5. Every included obligation is accepted, eligible, and included exactly once.
6. Every cycle's obligation set is frozen before confirmations and funding.
7. A completed cycle cannot be funded, distributed, or refunded again.
8. A refunded cycle cannot later distribute funds.
9. The contract's accounting for deposits, distributions, and refunds must reconcile to zero residual cycle funds after terminal completion, except for explicitly documented token behavior or recoverable accidental transfers.

### Deterministic distribution

The initial MVP does not need to solve the full minimum-transfer graph optimization problem. It may use a deterministic debtor-to-creditor allocation procedure, provided that:
- all net positions are respected exactly;
- the allocation is reproducible from the frozen cycle data;
- rounding is impossible because token amounts use integer units;
- every allocation is visible before confirmation; and
- the same input always yields the same output.

The algorithm and version used for a cycle must be recorded. Do not market the MVP as producing the mathematically minimal number of transfers unless that property has been implemented and tested.

---

## 9. UX and visual direction

### Product character

Netteo should feel like dependable financial infrastructure: calm, precise, transparent, and fast to understand. It should not look like a speculative trading terminal or a generic crypto dashboard.

### UX requirements

- Lead with **settlement cycles and their current state**, not token prices.
- Show gross obligations, net positions, and required deposits as separate figures.
- Use a clear status model: Draft, Awaiting Approval, Ready to Fund, Funding, Ready to Settle, Completed, Expired, Refunded, or Cancelled.
- Make the next required action visible for each participant.
- Require confirmation for irreversible on-chain actions.
- Display wallet address, chain, MUSD amount, estimated gas, and transaction status before submission.
- Never use color alone to communicate a state.
- Provide empty, loading, error, disconnected-wallet, wrong-network, and pending-transaction states.
- Use real contract data for the core demo. Seeded examples may be used only in a clearly labelled demo workspace and must never be confused with on-chain state.

### Visual direction

- Clean, high-contrast, professional fintech interface.
- Neutral surfaces, strong typography, restrained accent color, consistent spacing.
- A distinctive obligation-flow visualization: creditors and debtors connect through a cycle, then resolve into net positions.
- Tables optimized for exact amounts and auditability.
- Avoid excessive gradients, neon, decorative blockchain imagery, and animation that obscures financial state.

---

## 10. Data and privacy

### On-chain data

Keep only what is needed to enforce and verify settlement on-chain:
- group/cycle identifiers;
- participant addresses;
- accepted obligation identifiers and exact amounts, where required by the chosen contract design;
- frozen cycle commitment or equivalent integrity reference;
- deposits, distributions, refunds, and lifecycle events.

Because public-chain data is public, do not store invoice descriptions, names, email addresses, private document URLs, or confidential commercial terms in contract storage or event logs.

### Off-chain data

The application database may store:
- user-facing group names and descriptions;
- display metadata and non-sensitive invoice references;
- obligation metadata and approval UX state;
- document references protected by authorization;
- denormalized transaction status for fast UI queries.

Supabase is a query and presentation layer, not the source of truth for on-chain balances or terminal settlement state. Apply row-level security to every user-owned record. Never expose a service-role key to the browser. Validate chain events before marking an operation complete.

### Privacy requirements

- Do not upload sensitive invoice documents without clear user consent.
- Use signed, short-lived access links where supported.
- Never put secrets or private document contents in public transaction calldata.
- Make clear to users that addresses, amounts and contract events may be public.
- Provide a way to remove off-chain metadata where retention obligations permit, without implying on-chain history can be erased.

---

## 11. Security and failure requirements

- Use checks-effects-interactions and a vetted reentrancy guard for token transfers.
- Validate token address, decimals, network, caller permissions, cycle state and amounts.
- Use SafeERC20-compatible transfer handling; do not assume all ERC-20 implementations behave identically.
- Guard against duplicate obligation IDs, duplicate inclusion in a cycle, repeated deposits, repeated distribution and repeated refunds.
- Use explicit deadlines and documented state transitions.
- Never allow a coordinator to change cycle obligations after funding begins.
- Reject zero-value and self-referential obligations.
- Avoid unbounded loops over user-controlled arrays. Enforce a small MVP maximum for participants and obligations per cycle.
- Do not assume a token transfer succeeded solely because the frontend submitted a transaction.
- Test the exact deployed MUSD token behavior on the target network.
- Have a separate test suite for reverts, timeouts, malicious callers, repeated calls, and token transfer failures.
- Do not describe the MVP as audited unless a qualified independent audit has actually been completed.

### Explicit unresolved design decision

**Obligation storage model must be selected before contract implementation.** Storing all obligation details on-chain is simpler to verify but exposes metadata and increases gas. Storing a commitment to a canonical obligation set reduces on-chain data but requires careful canonical encoding, reproducible hashing, and an availability plan for the underlying records. For the MVP, use the simplest model that keeps the exact values needed for contract-enforced netting on-chain while keeping sensitive descriptions off-chain. Document the final choice in `architecture.md` and tests.

---

## 12. Success metrics

Measure product success with the following observable metrics, not vanity metrics:

- **Completion rate:** percentage of initiated cycles that reach Completed or a documented terminal refund state.
- **Settlement correctness:** all test cases preserve zero-sum net positions and exact token accounting.
- **Transfer reduction:** number of net settlement transfers compared with the number of original obligations; report the actual result per cycle.
- **Reconciliation accuracy:** exported statements match contract events and token movements.
- **Failure clarity:** every failed or expired cycle shows the reason and next available action.
- **Demo reliability:** the complete happy path succeeds repeatedly on the configured testnet with independent transaction verification.

For a hackathon demonstration, target at least one completed multi-party cycle with real testnet MUSD and a reproducible verification trail. Do not claim real-world adoption or savings without evidence.

---

## 13. MVP release checklist

### Product
- [ ] Group creation and participant membership work.
- [ ] Obligations can be proposed, accepted, disputed, and withdrawn.
- [ ] A cycle freezes a precise obligation set.
- [ ] Net position calculations are deterministic and independently tested.
- [ ] The UI explains gross versus net amounts.

### Contract
- [ ] MUSD address and network are configured explicitly.
- [ ] Only approved obligations can be included.
- [ ] Funding is recorded per debtor and cycle.
- [ ] Distribution is impossible before full funding.
- [ ] Distribution and refunds are mutually exclusive terminal paths.
- [ ] No duplicate payout or refund is possible.
- [ ] Events support reconstruction of the settlement history.
- [ ] Limits prevent impractical user-controlled loops.

### Application
- [ ] Wallet and wrong-network states are clear.
- [ ] Every write action has pending, success, and failure states.
- [ ] The UI does not display mock data as live chain data.
- [ ] Transaction hashes link to the correct explorer.
- [ ] Supabase policies are tested.
- [ ] CSV export matches the settlement record.

### Submission
- [ ] Deployed URL works from a fresh browser session.
- [ ] Contract address, chain ID and token address are documented.
- [ ] README explains the real MUSD settlement flow.
- [ ] Demo recording shows a real completed cycle.
- [ ] Known limitations are disclosed.
- [ ] No secrets, service keys, or private invoice data are committed.

---

## 14. Decisions to resolve before implementation

1. Final contract storage model: on-chain obligation records versus a committed snapshot with on-chain settlement totals.
2. Who must approve a cycle: every participant, every debtor, or a clearly defined group policy. The recommended MVP rule is debtor acceptance for each obligation plus explicit cycle confirmation by every participant with a non-zero net position.
3. Funding deadline and refund policy.
4. Maximum participant and obligation counts.
5. Confirmed MUSD contract address, decimals, explorer URL, and token transfer behavior on the chosen Mezo testnet.
6. Whether a coordinator can execute distribution or any participant can trigger it once fully funded. Recommended: any participant can call the permissionless distribution function after all funds are present.

These are product and security decisions, not details to leave to frontend implementation.
