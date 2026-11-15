# Netteo: Mezo Buildathon submission (Wave 2)

Everything below is written to be pasted into the AKINDO form. Every claim is backed by something you can open: the live app, a transaction, a test or the code. Items marked **[YOU]** need information only the team has.

## Links

| What | Link |
|---|---|
| Live app (Mezo Mainnet) | https://netteo-six.vercel.app |
| Funding Check (read-only, no wallet needed) | https://netteo-six.vercel.app/funding |
| Public repository | https://github.com/syther069/netteo (**[YOU]** GitHub says the repo moved to `anshxft/netteo`; submit whichever URL is public and current) |
| On-chain evidence, every transaction | [DEPLOYMENTS.md](../DEPLOYMENTS.md) |
| Mezo integration code | [`src/lib/mezo/`](../src/lib/mezo) |

## Form answers

**Project name:** Netteo

**Project category (3 to 5 words):** Group payment settlement

**TL;DR:** Netteo cancels out what a group owes each other, settles only the net amount in MUSD on Mezo, and lets each debtor fund their share from the MUSD Savings Vault or a loan against Bitcoin, so people settle with their Bitcoin instead of selling it.

**How it works:**

*The problem.* A DAO working group, agency or contributor collective owes each other money in loops: A owes B, B owes C, C owes A. Paying every claim separately means every debtor must find the full amount first. People who hold their wealth in Bitcoin end up selling it, or borrowing more than they need, just to move money that mostly cancels out.

*What Netteo does.* People record claims, the debtor approves each with a wallet signature, and Netteo nets the group's approved claims into one position per person. In the three-party example, $200 of claims needs only $80 deposited, paid to the creditors atomically in one transaction. The contract holds funds only until the cycle is fully funded, has no owner, admin or pause function, and lets depositors take their money back if a cycle is not completed.

*How MUSD and Mezo are used.* MUSD is the settlement asset and unit of account. Three real three-party cycles have settled on Mezo Mainnet (two in MUSD, one in mUSDC) (links in DEPLOYMENTS.md). On top of that, Netteo plugs into Mezo's own products so a debtor can cover a deposit without selling Bitcoin:

- **MUSD Savings Vault:** withdraw from it to fund a deposit, and deposit a payout into it after a settlement. Verified on mainnet with a real approve, deposit and withdraw.
- **Loan against Bitcoin (BorrowerOperations, TroveManager, HintHelpers, SortedTroves, PriceFeed):** borrow only the missing amount against the Bitcoin already locked in the wallet's Mezo loan. Netteo shows the issuance fee, the interest, the collateral ratio before and after, and the Bitcoin price at which the loan could be liquidated. It refuses to build a borrow that would leave a loan under 150% (Mezo liquidates at 110%).
- **Net before you borrow:** the cycle page shows how much less had to be funded because claims cancelled, and what borrowing that on Mezo would have cost in fees and interest, using Mezo's current on-chain rates.

**Target group:** DAO working groups, contributor collectives and small teams in the Mezo ecosystem who owe each other recurring payments and hold their treasury in Bitcoin. Desktop and mobile web, mid-level to senior crypto users who already use Mezo. Tracks: the workflow is Track 2 (access and distribution: a settlement tool that makes MUSD easier to use); the borrowing and savings integrations are Track 1 (DeFi: MUSD as composable, productive capital).

**Tech stack:** Solidity 0.8.24 and Foundry (SettlementKernel and a factory, one kernel per token); Next.js 16, React 19, TypeScript, wagmi and viem; Supabase (Postgres with row-level security) for the private claim ledger; an event indexer; Vercel.

**Track:** Both (Track 2 primary).

**Chain deployed on:** Mezo (Mainnet, chain ID 31612).

**Project status:** An existing project with major new work added since Wave 1 (see "What changed since Wave 1"). Earlier version: https://netteo-six.vercel.app (same URL, now updated).

**Project readiness:** Mainnet deployment.

**Future milestones (plan, not a promise):**
1. **Within 2 weeks:** signed typed-data (EIP-712) approvals with a signature bundle in each receipt, so anyone can re-verify who agreed to what.
2. **Within 6 weeks:** Mezo Passport so Bitcoin-native wallets can sign, and MEZO as a supported settlement token once it has been verified with real MEZO on mainnet.
3. **Within 10 weeks:** an independent smart-contract audit, recurring settlement cycles and notifications.

**Team info:** **[YOU]** names, roles and X or LinkedIn links. This was not in the repo, so it is left blank rather than invented.

## What changed since Wave 1

The Wave 1 feedback was that the live app used only a team-made mock token and a kernel bound to it. Since then:

- **Real mainnet, real tokens.** Contracts deployed to Mezo Mainnet and bound to canonical MUSD, mUSDC and mUSDT. Three real cycles settled (two MUSD, one mUSDC). The mock token is gone from the live path.
- **Contract v2.** Fixes found in an audit: locked-funds recovery, fee-on-transfer protection, and cycle-id squatting.
- **Locked-down backend.** The browser can no longer read or write private tables. Every request needs a signed wallet session, every action its own signature, and replays are refused. A live end-to-end test passed 44 checks.
- **Honest product.** Fabricated testimonials and false technical claims were removed, and a test now fails if they return.
- **New in the last 24 hours:** the Mezo funding integration above, the read-only Funding Check, claim share links, role-aware approvals, API rate limiting and mobile fixes across every screen.

## Mezo integration, in detail

| Mezo component | What Netteo does with it | How it was verified |
|---|---|---|
| MUSD (canonical token) | Settlement asset for cycles | Two real cycles on mainnet |
| mUSDC | Settlement in a 6-decimal token | One real cycle on mainnet |
| mUSDC, mUSDT | Additional settlement tokens, one kernel each | Kernels deployed for both. **mUSDC ran a real cycle on mainnet** (6-decimal path); mUSDT is deployed only. Token behaviour tested against real contract code on a fork |
| MUSD Savings Vault (sMUSD) | Withdraw to fund a deposit; deposit a payout; claim yield | **Real mainnet round trip**, 3 transactions (see DEPLOYMENTS.md) |
| BorrowerOperations `withdrawMUSD` | Borrow the missing amount against the wallet's existing loan | Real contracts on a mainnet fork, using Netteo's hint builder; refusal of an over-borrow confirmed |
| TroveManager, HintHelpers, SortedTroves | Read the loan, compute the ratio, build placement hints | Ratio matches `getCurrentICR` to the last wei on a real trove; live read test in CI |
| PriceFeed | BTC price for ratios and the liquidation price | Live read |
| Protocol parameters | 0.1% issuance fee, 1% interest, 110% minimum ratio, 1,800 MUSD minimum debt | Read from chain, never hard-coded |

## Honest limitations

- **Not independently audited.** Stated on the site and in the README.
- **Borrowing is verified on a fork, not executed on mainnet by the team.** A new Mezo loan needs at least 1,800 MUSD of debt plus a 200 MUSD deposit, far more than the test wallet holds. The reads are live on mainnet.
- **MEZO is not integrated.** MUSD satisfies the rule ("MUSD and/or MEZO"). MEZO is precompile-backed, so it cannot be tested on a fork and needs real MEZO on mainnet first.
- **Mezo Passport is not integrated.** The published package pins React 18 and wagmi 2; this app is on React 19 and wagmi 3.
- **No user interviews yet.** The target group is a hypothesis, not validated demand.
- **The API rate limiter is per server instance.** An upgrade path to a shared store is documented in the code.

## Deck outline (10 slides)

1. **Title.** Netteo: settle with your Bitcoin, not by selling it. One line and the live URL.
2. **The problem.** A circular-debt diagram: A to B to C to A. "Everyone must find the full amount first."
3. **What Netteo does.** $200 of claims becomes $80 deposited, paid out in one transaction. Show the netting screen.
4. **Proof it is real.** The Evidence section: two mainnet cycles, plus the Savings Vault round trip, with explorer links.
5. **Mezo is the engine.** The integration table above, in one picture: MUSD, Savings Vault, loan against Bitcoin.
6. **Fund it without selling Bitcoin.** The Funding Check for a real loan: fee, interest, ratio before and after, liquidation price.
7. **Safety by design.** The 150% floor against Mezo's 110%, no admin keys, refunds, signed approvals, rate limits.
8. **Who it is for and why now.** DAO collectives and Mezo teams; only four Bitcoin-backed loans exist on Mezo Mainnet today, so MUSD needs more everyday uses.
9. **What we verified, and what we did not.** The honesty slide (limitations above). It builds trust with judges.
10. **Roadmap and ask.** Three milestones, the team **[YOU]**, and the links.

## 2-minute pitch video: script and shot list

| Time | Say | Show on screen |
|---|---|---|
| 0:00 to 0:15 | "If you hold Bitcoin on Mezo, paying your group means selling it, or borrowing more than you need. Most of what a group owes each other cancels out." | Landing hero |
| 0:15 to 0:35 | "Netteo cancels the loop. Three people, two hundred dollars of claims, eighty dollars actually deposited, paid out in one transaction." | The netting simulator, then the cycle page |
| 0:35 to 0:55 | "This is not a mock. Three real cycles settled on Mezo Mainnet, in MUSD and in mUSDC. Here is the transaction on the explorer." | Evidence section, click an explorer link |
| 0:55 to 1:25 | "Short on MUSD? Netteo reads your Mezo loan live. It shows the fee, the interest, your collateral ratio, and the price where you would be liquidated. It will not build a borrow under one hundred fifty percent." | `/funding`, pick the "Healthy loan", then "Close to liquidation" |
| 1:25 to 1:40 | "Or withdraw from the MUSD Savings Vault. We ran this on mainnet: deposit, withdraw, every wei returned." | Savings round trip links |
| 1:40 to 1:55 | "When you get paid, one click puts it into Savings. Net first, fund without selling Bitcoin, save what you receive." | Completed cycle with the save panel |
| 1:55 to 2:00 | "Netteo. Live on Mezo Mainnet." | URL on screen |

**Recording tips:** use a real wallet for the cycle page if you can; use the read-only Funding Check for the rest, since it needs no wallet. Keep the honesty slide in the deck, not the video.

## Before you submit **[YOU]**

- [ ] Join the Mezo Discord and ask for the Developer role.
- [ ] Register every team member on AKINDO and accept the Terms.
- [ ] Record the 2-minute video and attach the deck.
- [ ] Confirm which GitHub URL is public and current, and that the repo is public.
- [ ] Fill in team info, and (for Wave 2) say plainly what changed since Wave 1 using the section above.
- [ ] Be ready for KYB if selected (prizes are paid in MEZO).
- [ ] Submit before **15 Nov, 20:30** (the page shows this in your local time zone).
