# Netteo — Mezo Mainnet Plan (Wave 2)

**Goal:** pass gate G2 (real integration) with a working end-to-end prototype on Mezo Mainnet (chain 31612) that settles in real MUSD, mUSDC and mUSDT.

**Decisions locked:** launch tokens = MUSD + mUSDC + mUSDT. Real funds and 3 wallets available for the acceptance cycle.

---

## Status (2026-11-14)

| Phase | State |
|---|---|
| 1. Token registry made true | **Done.** Chain-verified addresses; `tokens.test.ts` re-checks them on-chain. |
| 2. App unbound from single-MUSD | **Done.** Per-token hooks, config, indexer, schema, API and views. |
| 3. Deploy to 31612 | **Done, twice.** v1 on 2026-11-12, v2 on 2026-11-13 (fixes locked funds, fee-on-transfer, cycle id squatting). v2 is current; see DEPLOYMENTS.md. Total fees 0.0000181132 BTC. |
| 4. Real mainnet cycle (G2 evidence) | **Done on v1 and v2 (MUSD).** v2 cycle run 2026-11-14 (0.32 MUSD net, Completed, kernel left at 0); tx hashes in DEPLOYMENTS.md. |
| 5. Remove simulated CDP drawer in live mode | **Done.** |
| 6. Audit fixes | **Done in code:** database lockdown and scoped reads, wallet sessions, obligation state machine, on-read indexing, kernel v2, cycle verification before deposits, RPC fallback, real per-debtor amounts, CI. **Database:** Supabase project restored and migrations 002 + 003 applied on 2026-11-14; anon key verified unable to read or write private tables. **Needs you:** set `SESSION_SECRET`, `SUPABASE_SERVICE_ROLE_KEY` and the v2 addresses on Vercel, then deploy the new app (the old one wrote to these tables directly and now gets denied). |

## 1. Why G2 failed, precisely

The feedback was "the live app only uses the team's own MockMUSD and a kernel bound to it". The repo confirms it:

- `NEXT_PUBLIC_SETTLEMENT_KERNEL_ADDRESS=0x0000…0000` in `.env.example` — **nothing is deployed on mainnet.**
- The only broadcast deployments are chain **31611** (testnet): `broadcast/Deploy.s.sol/31611/run-latest.json` creates `SettlementKernel 0x3c5efa1e…` bound to `0x118917a4…` (testnet MUSD), and an earlier dry-run created `MockMUSD 0xaee79f4b…` with a kernel bound to it.
- `validateChainConfiguration()` therefore always fails closed, so live mode can never transact.

So G2 is not a code-quality problem. It is a *deployment and token-registry* problem. Two things fix it: a kernel on 31612 bound to a canonical token, and one completed cycle with real funds and public tx hashes.

## 2. On-chain facts I verified (chain 31612, block 0xc8a854)

Probed via `eth_call` against `https://mezo-mainnet.boar.network`. `eth_chainId` returned `0x7b7c` = 31612.

| Token | Address | Decimals | `symbol()` | Notes |
|---|---|---|---|---|
| MUSD | `0xdD468A1DDc392dcdbEf6db6e34E89AA338F9F186` | **18** | `MUSD` | `DOMAIN_SEPARATOR` + `nonces` respond → **EIP-2612 permit works** |
| mUSDC | `0x04671C72Aab5AC02A03c1098314b1BB6B560c197` | **6** | `mUSDC` | plain ERC-20, permit present |
| mUSDT | `0xeB5a5d39dE4Ea42C2Aa6A57EcA2894376683bB8E` | **6** | `mUSDT` | plain ERC-20 |
| BTC | `0x7b7C000000000000000000000000000000000000` | 18 | **`BTC`** | precompile-backed; `allowance(0,0)` reverts `owner address cannot be empty` — **not** launching with this |
| MEZO | `0x7B7c000000000000000000000000000000000001` | 18 | `MEZO` | out of scope this wave |
| mSolvBTC | `0xa10aD2570ea7b93d19fDae6Bd7189fF4929Bc747` | 18 | `mSolvBTC` | out of scope this wave |

**`src/lib/chain/tokens.ts` currently ships fabricated addresses** — `mUSDC` as `0x…0002` and `mUSDT` as `0x…0003`. Those are not contracts. The tBTC entry has the right address but the wrong symbol (`tBTC`; the chain says `BTC`). This is the single most damaging file in the repo for a "real tokens" claim and it is fixed first.

## 3. Architecture decision: use the factory, do not write a multi-asset kernel

`contracts/SettlementKernelFactory.sol` already implements exactly the right shape — a 1:1 `token → kernel` map with asset isolation. `SettlementKernel` keeps its `immutable musdToken`, so a kernel can never be tricked into moving a different asset.

**One token per cycle, one kernel per token.** This matches PRD §4 non-goals ("Supporting multiple settlement assets in a single cycle") and ADR-04, and it avoids exchange-rate and mixed-decimal netting entirely. "Multi-token" means *the group chooses which asset this cycle settles in*, not mixed baskets.

No new contract is needed. `netting.ts` is already pure bigint and decimals-agnostic, so the netting core needs no change.

## 4. Work plan

### Phase 1 — Make the token registry true (small, do first)

1. `src/lib/chain/tokens.ts`: replace with the six verified addresses above and their real decimals; fix `tBTC` → `BTC`; set `SUPPORTED_SETTLEMENT_TOKENS = [MUSD, mUSDC, mUSDT]`. Drop `getTokenByAddress`'s silent MUSD fallback — an unknown address must return `undefined`, not masquerade as MUSD.
2. Add one test to `src/lib/chain/config.test.ts` asserting each registry entry's `decimals` matches an on-chain `decimals()` read, so a fabricated address can never ship again.

### Phase 2 — Unbind the app from single-MUSD (the real work)

3. `config.ts`: add the factory address and a `resolveKernel(token)` read. Replace every `=== MEZO_MAINNET_MUSD` guard with two checks: *token is in the verified registry* **and** *`kernel.musdToken() === token`*. Keep failing closed.
4. `useMusdToken.ts` → `useSettlementToken(tokenAddress)`. Same reads, but the token is a parameter and `decimals` comes from the chain with no `?? 18` default. Delete the three hardcoded MUSD assertions in `approve()` (lines 118–126) and re-express them against the registry.
5. `useSettlementKernel.ts` → take a token address, resolve its kernel through the factory, and verify the binding before any write. `sanitizeWeb3Error` messages that say "MUSD" become token-symbol aware.
6. **Decimals bug:** `parseMusdToBaseUnits()` in `src/features/obligations/store.ts:9` hardcodes 18 decimals (`BASE_DECIMALS = 18n`) and its regex allows 18 fraction digits. On mUSDC/mUSDT that silently inflates every amount by 10^12. It needs a `decimals` parameter, and the regex must bound fraction digits to that value. Thread the selected token's decimals through `ProposeObligationModal`, `CycleAssemblyView`, `CycleExecutionView` and `formatBaseUnitsToDisplay`.
7. `CycleAssemblyView.tsx:275` currently collapses the picker to `[MUSD]` whenever `mode === 'live'`. Show the registered tokens in live mode too — this is the line that makes the multi-token story real rather than decorative.
8. Indexer and read model: `src/lib/indexer/worker.ts` and `src/lib/db/schema.sql` assume one kernel address. Add `kernel_address` and `token_address` to the cycle projection and cursor so three kernels can be indexed independently. One cursor per kernel.

### Phase 3 — Deploy to 31612 (needs your funds)

9. `script/Deploy.s.sol`: deploy `SettlementKernelFactory`, then `createKernel` for MUSD, mUSDC and mUSDT. Keep the non-canonical-token refusal. **Remove the `decimals() == 18` require at line 39** — it would reject mUSDC and mUSDT.
10. Verify each deployed kernel on `explorer.mezo.org`: bytecode verified, and `musdToken()` returns the intended token. Record the factory deploy block for `NEXT_PUBLIC_SETTLEMENT_KERNEL_DEPLOY_BLOCK`.

### Phase 4 — G2 evidence

11. Run the PRD §2 three-party cycle on mainnet with small real amounts (~1 MUSD total: A owes B 0.50, B owes C 0.40, C owes A 0.10 → A pays 0.40, net 2 transfers instead of 3). Then repeat once in mUSDC to prove the 6-decimal path end to end.
12. Record contract addresses, chain ID, token addresses and every tx hash in `README.md`, and state plainly what is and is not audited.

### Phase 5 — Remove the remaining fake

13. `CdpAutoBorrowDrawer.tsx` is entirely simulated — a `setTimeout` and `Number(x) / 1e18`, no contract call anywhere. Shipping a simulated "borrow MUSD against BTC" panel inside a live app is the same class of finding that cost you G2. Either wire it to real Mezo `BorrowerOperations` or hide it in live mode. Hiding it is the lazy correct call this wave.

## 5. Risks you must know

- **Real funds, irreversible.** Every Phase 4 transaction moves real MUSD on mainnet and costs real BTC gas. Amounts stay under ~1 MUSD until a full cycle has completed once.
- **BTC token excluded on purpose.** `0x7b7C…0000` is precompile-backed and already returned a non-standard revert for `allowance()`. It is also the native gas asset, so `transferFrom` semantics may not match a normal ERC-20. Adding it needs a dust-value approve/deposit/settle test of its own.
- **6-decimal path is the top bug risk.** Item 6 is where money gets mis-sized. It needs a test asserting that `1.5 mUSDC` parses to `1500000` and not `1500000000000000000`.
- **Permit is MUSD-only in practice.** `SettlementKernel.depositWithPermit` wraps `permit()` in `try/catch {}` and swallows failures, so on a token without permit it falls through to the allowance path and reverts later with a confusing error. The UI must not offer one-click permit unless the selected token supports it.
- **Cosmetic contract wart:** `_deposit` sets `cycle.state = Expired` and emits `CycleExpired` immediately before `revert FundingDeadlineExpired` — the revert discards both. Harmless, but the dead write reads as if expiry is recorded. A separate `expireCycle()` call is the honest fix if you want expiry to persist.
- **Not audited.** Nothing here constitutes an audit, and the README must keep saying so.

## 6. Suggested order of execution

Phase 1 → Phase 2 → tests green → Phase 3 deploy → Phase 4 evidence → Phase 5. Phases 1, 2 and 5 need no funds and no deployment, so they can all land before you spend anything.
