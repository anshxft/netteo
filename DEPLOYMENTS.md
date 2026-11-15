# Netteo — Mezo Mainnet Deployment Record

**Network:** Mezo Mainnet, chain ID `31612`
**Deployer / debtor wallet:** [`0xb31B137c24e5f020bF07D93BBa99DAf950908a9e`](https://explorer.mezo.org/address/0xb31B137c24e5f020bF07D93BBa99DAf950908a9e)

Every value below was read back from the chain after broadcasting, not taken from script output. Nothing here is audited. See "Known limitations" in the README.

There are two deployments. **v2 is current and is what the app uses.** v1 is kept for the record only: it holds no funds and nothing points to it.

---

# v2 (current), deployed 2026-11-13

v2 exists because three bugs found in an audit were inside the contract and a deployed contract cannot be edited:

| Fix | What changed |
|---|---|
| Funds could be locked | A fully funded cycle that cannot pay out (e.g. a token blocks one creditor) can be refunded after the funding deadline plus a 3 day grace period (`REFUND_GRACE`). Settlement is impossible once refunds start, so a cycle can never both pay out and refund, and cannot pay out of another cycle's deposits. |
| Fee-on-transfer tokens | Every deposit must raise the kernel's balance by exactly the amount booked, otherwise it reverts (`UnexpectedTransferAmount`). |
| Cycle id squatting | A cycle's id is `keccak256(abi.encode(creator, salt))`, so nobody can pre-create the id another wallet is about to use. |

## Contracts

| Contract | Address | Bound token |
|---|---|---|
| SettlementKernelFactory | [`0x95e35305d466dF41EF35E02AA53F1e90Db759a45`](https://explorer.mezo.org/address/0x95e35305d466dF41EF35E02AA53F1e90Db759a45) | registry of all three |
| SettlementKernel (MUSD) | [`0x427Ff00c792252cC364Cb3240Dc26E6e7872340e`](https://explorer.mezo.org/address/0x427Ff00c792252cC364Cb3240Dc26E6e7872340e) | MUSD `0xdD468A1DDc392dcdbEf6db6e34E89AA338F9F186` (18 decimals) |
| SettlementKernel (mUSDC) | [`0xE229B3a2020FC19331E8A3e9662a2508fFF78020`](https://explorer.mezo.org/address/0xE229B3a2020FC19331E8A3e9662a2508fFF78020) | mUSDC `0x04671C72Aab5AC02A03c1098314b1BB6B560c197` (6 decimals) |
| SettlementKernel (mUSDT) | [`0xFecBE8a962F5C2628E877AA4C0C90C399549f18f`](https://explorer.mezo.org/address/0xFecBE8a962F5C2628E877AA4C0C90C399549f18f) | mUSDT `0xeB5a5d39dE4Ea42C2Aa6A57EcA2894376683bB8E` (6 decimals) |

Checked on-chain after deployment: the factory registers 3 tokens; `getKernel(token)` returns the matching kernel; each kernel's `musdToken()` returns its own token; `REFUND_GRACE()` returns 259,200 seconds; `computeCycleId` returns the same value as the app's TypeScript for a known input.

## Deployment transactions (blocks 13193001 to 13193002)

| Step | Block | Gas used | Transaction |
|---|---|---|---|
| Deploy SettlementKernelFactory | 13193001 | 1,924,795 | [`0xfd4052f3…9225f9`](https://explorer.mezo.org/tx/0xfd4052f31292aab36f62166997034cef7cf6de9f973ef751997baacb439225f9) |
| createKernel(MUSD) | 13193002 | 1,508,298 | [`0xeb775d77…a0ffc8`](https://explorer.mezo.org/tx/0xeb775d77b07bca7cc5b8c69ffe646445594eb5b2513851f1aecfed7a35a0ffc8) |
| createKernel(mUSDC) | 13193002 | 1,491,198 | [`0xf38583d6…36ff23`](https://explorer.mezo.org/tx/0xf38583d65c7f913e892cbfe535cad50a610c883279f4028d3511138cfc36ff23) |
| createKernel(mUSDT) | 13193002 | 1,491,198 | [`0xdb199b7d…29d56a`](https://explorer.mezo.org/tx/0xdb199b7d193a10ab785ca1870fa19c8c97c191d66066676ad1699aa33029d56a) |

**Total fee paid: 0.0000093827 BTC.**

## Opcode check

The contracts are compiled for `cancun` (Mezo's docs recommend `london`, but OpenZeppelin 5.6 needs `MCOPY` in the test tokens, so one `evm_version` cannot be `london` for this build). The deployed runtime code was disassembled to confirm it only uses what is already proven to run on Mezo Mainnet:

| | PUSH0 | MCOPY | TLOAD / TSTORE | BLOBHASH / BLOBBASEFEE | Runtime size |
|---|---|---|---|---|---|
| SettlementKernel | 144 | 0 | 0 | 0 | 6,800 B |
| SettlementKernelFactory | 179 | 0 | 0 | 0 | 8,131 B |

`PUSH0` is the only opcode beyond `london`, and v1 used it too and ran on mainnet.

## Tests behind v2

- `forge test`: kernel invariants, 6-decimal tokens, deploy and acceptance script safety, and the v2 suite (`SettlementKernelV2.t.sol`). Each fix was mutation-checked: reverting it makes a test fail.
- The same kernel was run against the **real** MUSD, mUSDC and mUSDT contract code on a fork of mainnet (round trip, refund, permit). This also confirms none of the three tokens takes a transfer fee today.
- A full deploy-then-settle rehearsal on a local fork of mainnet with real MUSD: Completed, payouts exact, nothing left in the kernel.

## Real settlement cycle on v2

Run on 2026-11-14 with real MUSD on mainnet, at 80% of the PRD example (`ACCEPTANCE_PERCENT=80`): A owes B 0.40, B owes C 0.32, C owes A 0.08. Net: A pays 0.32, B receives 0.08, C receives 0.24. Gross 0.80, so three obligations settle as one deposit and two payouts.

- **Cycle ID:** `0x7ff4cbf39083469093a005be46bf698bd2d36b2d0c343374d4fecb224d32d420` (derived from creator and salt, as v2 requires)
- **Kernel:** MUSD kernel above
- **Debtor A (signer):** `0xb31B137c24e5f020bF07D93BBa99DAf950908a9e`
- **Creditors B and C:** the same two wallets as the v1 cycle

| Step | Block | Gas used | Transaction |
|---|---|---|---|
| approve(kernel, 0.32 MUSD) | 13219662 | 46,394 | [`0x0184bef5…6957b2b`](https://explorer.mezo.org/tx/0x0184bef588efe8871b9cb5a59c318cb08b65d7778e2a79d37e27bb0086957b2b) |
| createCycle | 13219663 | 371,984 | [`0xdaceb9e4…a122955e`](https://explorer.mezo.org/tx/0xdaceb9e491895ea5eb09caeb7c537f7d87b4318803c53cb1ee2ee47da122955e) |
| deposit(0.32 MUSD) | 13219664 | 120,765 | [`0x0340fd70…3b457ce`](https://explorer.mezo.org/tx/0x0340fd70a4e04fcf6d3b0787e5f8726cc99176b45e5f412610213bc8d3b457ce) |
| executeSettlement | 13219665 | 86,569 | [`0x9795326b…f3971f45`](https://explorer.mezo.org/tx/0x9795326bd5fb24acd1fbbb869027bbdad231be58e9be98ab85d89226f3971f45) |

**Total fee paid: 0.0000008134 BTC.**

Final state read back from the chain (not from the script's own checks): cycle state `3` (Completed); gross 0.8, net debt 0.32, funded 0.32, distributed 0.32, refunded 0 MUSD; creditor B's balance rose by 0.08 and C's by 0.24; MUSD left in the kernel: 0. The indexer then picked up all four events and the live database shows the cycle as `Completed` with matching per-wallet positions.

Cumulative fees for everything in this record (v1 deploy and cycle, v2 deploy and cycle): 0.0000189266 BTC.

### Verify the v2 cycle yourself

```bash
RPC=https://mezo-mainnet.boar.network
K=0x427Ff00c792252cC364Cb3240Dc26E6e7872340e

# cycle summary: snapshot commitment, algorithm, gross, net, funded, distributed, refunded, deadline, state (3 = Completed), creator
cast call $K "getCycle(bytes32)(bytes32,string,uint256,uint256,uint256,uint256,uint256,uint256,uint8,address)" \
  0x7ff4cbf39083469093a005be46bf698bd2d36b2d0c343374d4fecb224d32d420 --rpc-url $RPC

# the kernel retains nothing
cast call 0xdD468A1DDc392dcdbEf6db6e34E89AA338F9F186 "balanceOf(address)(uint256)" $K --rpc-url $RPC
```

## Real settlement cycle in mUSDC on v2 (2026-11-15)

The same three-party shape, in the 6-decimal token, scaled to 1% (`ACCEPTANCE_PERCENT=1`): A owes B and C, nets to one deposit, and the kernel pays both creditors. It proves the 6-decimal path with real funds, where amounts are exact in the token's own base units.

- **Cycle ID:** `0x1ba7aa0cd7725361f28167fd5f21a83a7e47678e07f2373d0358340052fb1674`
- **Kernel:** mUSDC kernel `0xE229B3a2020FC19331E8A3e9662a2508fFF78020` (bound to mUSDC `0x04671C72Aab5AC02A03c1098314b1BB6B560c197`)
- **Debtor A (signer):** `0xb31B137c24e5f020bF07D93BBa99DAf950908a9e`; **creditors B and C:** the same two wallets as the MUSD cycles

| Step | Block | Gas used | Transaction |
|---|---|---|---|
| approve(kernel, 0.004 mUSDC) | 13244499 | 51,364 | [`0x93cd5158…3a3969`](https://explorer.mezo.org/tx/0x93cd5158f1e4badce6b474ada6eefb5be6ca3219101a8963620ccdcf583a3969) |
| createCycle | 13244500 | 371,792 | [`0xa995a681…5cbcb8`](https://explorer.mezo.org/tx/0xa995a681dd58fde22b3bee90820c0611ed498a55d7ef1d833ef5641c4e5cbcb8) |
| deposit(0.004 mUSDC) | 13244501 | 126,670 | [`0xb64b8fce…3b019d`](https://explorer.mezo.org/tx/0xb64b8fce7afa90a3cbd31d196b452f09b31934afbfa5d7f3fd2d7434423b019d) |
| executeSettlement | 13244502 | 126,063 | [`0xc1b24776…c5547e`](https://explorer.mezo.org/tx/0xc1b2477636805830b8e661467f711f18f173e6527c42ffecd4b6bfd112c5547e) |

**Total fee paid: 0.0000008787 BTC.**

Read back from the chain: cycle state `3` (Completed); gross 0.01, net 0.004, funded 0.004, distributed 0.004, refunded 0 mUSDC; creditor B received 0.001 and C received 0.003; mUSDC left in the kernel: 0. mUSDT is deployed but has not run a real cycle.

## Mezo Savings Vault integration, verified on mainnet (2026-11-14)

Netteo lets a debtor withdraw from the MUSD Savings Vault to fund a deposit, and lets a creditor save a payout in it. The same code path was run for real on Mezo Mainnet with 0.01 MUSD from the deployer wallet. The vault is `0xb4D498029af77680cD1eF828b967f010d06C51CC` (a proxy; it reports `musdToken()` = canonical MUSD).

| Step | Block | Gas used | Transaction |
|---|---|---|---|
| approve(vault, 0.01 MUSD) | 13224433 | 46,382 | [`0x465b2b86…5cd4a4`](https://explorer.mezo.org/tx/0x465b2b8693049f1fd96eab277a7c5f57d9c00f1fe67967c4887ae0ee6b5cd4a4) |
| deposit(0.01 MUSD) | 13224435 | 211,184 | [`0x582f2266…506091`](https://explorer.mezo.org/tx/0x582f2266b8408fb3126ef58e7f08bbe7021d8a0b006ab697685ea1c30d506091) |
| withdraw(0.01 MUSD) | 13224437 | 106,577 | [`0x2006cdd6…9ba15c`](https://explorer.mezo.org/tx/0x2006cdd63fde64e2b0778522569431305dac09c1627a81d038e9bb4e9d9ba15c) |

Read back from the chain: after the deposit the wallet held exactly 0.01 sMUSD (minted 1:1) and 0.01 MUSD less; after the withdrawal the sMUSD was 0 and the MUSD balance was back to its starting value, to the wei. Gas for all three: 0.00000047 BTC. Cumulative fees for everything in this record: 0.0000194 BTC.

**Borrowing against Bitcoin is not executed on mainnet by the team.** A new Mezo loan needs at least 1,800 MUSD of debt plus a 200 MUSD deposit, far more than the test wallet holds. That path was instead run against real mainnet contract state on a local fork (`src/lib/mezo/fork.test.ts`): the actual BorrowerOperations, TroveManager, HintHelpers, SortedTroves and Savings Vault code, using Netteo's own hint builder and borrow plan, on a real trove. Only the price oracle (not plain EVM code) is replaced by the live price. Reads, by contrast, run against live mainnet in the app and in `protocol.test.ts`.

## App and API checked end to end

Against the live Supabase project and Mezo Mainnet RPC, using throwaway wallets (test rows deleted afterwards): 44 checks passed. Covered: wallet sign-in, replay and stale-signature refusal, signed group and obligation creation, tampered-signature refusal, accept / dispute / withdraw rules, per-wallet read scoping (a stranger sees nothing), indexer secret check, indexing of the real cycle above, and cycle registration. Cycle registration was run against a local fork of mainnet (so no extra gas): a cycle whose commitment differs from the group's accepted obligations is refused, and one that matches is registered. That run found a database column that was too narrow (`algorithm_version`); fixed by `migrations/004_widen_algorithm_version.sql`.

---

# v1 (superseded), deployed 2026-11-12

Holds no funds. The app does not use it. Kept so the earlier evidence stays checkable.

## Contracts (v1)

| Contract | Address | Bound token |
|---|---|---|
| SettlementKernelFactory | [`0xD4b9d48163352BB79b343D5AA516ddf67c8cE118`](https://explorer.mezo.org/address/0xD4b9d48163352BB79b343D5AA516ddf67c8cE118) | registry of all three |
| SettlementKernel (MUSD) | [`0x42A249Bc6850E25D70d3331647a98b8dDe0b80F7`](https://explorer.mezo.org/address/0x42A249Bc6850E25D70d3331647a98b8dDe0b80F7) | MUSD `0xdD468A1DDc392dcdbEf6db6e34E89AA338F9F186` (18 decimals) |
| SettlementKernel (mUSDC) | [`0x40778f813101baD25C772Fa3774D932f922d6C17`](https://explorer.mezo.org/address/0x40778f813101baD25C772Fa3774D932f922d6C17) | mUSDC `0x04671C72Aab5AC02A03c1098314b1BB6B560c197` (6 decimals) |
| SettlementKernel (mUSDT) | [`0x76De0938cd1a78f9f041Df7E215Bb4a429F0514E`](https://explorer.mezo.org/address/0x76De0938cd1a78f9f041Df7E215Bb4a429F0514E) | mUSDT `0xeB5a5d39dE4Ea42C2Aa6A57EcA2894376683bB8E` (6 decimals) |

On-chain checks performed after deployment: the factory registers 3 tokens; `getKernel(token)` returns the matching kernel for each; each kernel's `musdToken()` returns its own token; deployed runtime sizes (factory 7,604 B, each kernel 6,273 B) match the local build.

## Deployment transactions (v1, blocks 13175577 to 13175578)

| Step | Block | Gas used | Transaction |
|---|---|---|---|
| Deploy SettlementKernelFactory | 13175577 | 1,802,360 | [`0x1f372bf2…c762e6`](https://explorer.mezo.org/tx/0x1f372bf21d53c59799ee107a35e983e02045c60096a7b87bf02aa8fcf0c762e6) |
| createKernel(MUSD) | 13175578 | 1,402,639 | [`0x09d2c3a7…49237a`](https://explorer.mezo.org/tx/0x09d2c3a7c8be17eddb5d55d70625253bd3bc800084754996d8787e510749237a) |
| createKernel(mUSDC) | 13175578 | 1,385,539 | [`0x602ed8be…f8657`](https://explorer.mezo.org/tx/0x602ed8be56d010daf052907f7dd4874b7e97bc327cc01affeaf8cc9c2f2f8657) |
| createKernel(mUSDT) | 13175578 | 1,385,539 | [`0x2b0d33e1…582bc205`](https://explorer.mezo.org/tx/0x2b0d33e1a63ad759fdb2d5441cd50b70abdef54a0be27ceb0c7d43b4582bc205) |

**Total fee paid: 0.0000077689 BTC.**

## Real settlement cycle in MUSD (on v1)

The PRD example scaled to 1 MUSD: A owes B 0.50, B owes C 0.40, C owes A 0.10. Net: A pays 0.40, B receives 0.10, C receives 0.30. Three obligations (1.00 gross) settle as one deposit and two payouts.

- **Cycle ID:** `0x8bc95b8945354a78fbf6855e9cca2f6f06d215e7b11d62749057989e27b8ff5c`
- **Kernel:** MUSD kernel above
- **Debtor A (signer):** `0xb31B137c24e5f020bF07D93BBa99DAf950908a9e`
- **Creditor B:** [`0x508c1E9ec5Dd20B988585E6637C2ACF85C0fE7E2`](https://explorer.mezo.org/address/0x508c1E9ec5Dd20B988585E6637C2ACF85C0fE7E2)
- **Creditor C:** [`0x678A34EE5138803549c3ea1E9a946AE9176A6f31`](https://explorer.mezo.org/address/0x678A34EE5138803549c3ea1E9a946AE9176A6f31)

| Step | Block | Gas used | Transaction |
|---|---|---|---|
| approve(kernel, 0.40 MUSD) | 13175624 | 46,394 | [`0x7ad6088f…47b7ce`](https://explorer.mezo.org/tx/0x7ad6088f215343a1f862c4f8692bb4b298ad7aebbef5d10dfe8d87d6d847b7ce) |
| createCycle | 13175624 | 371,845 | [`0xe2f2fb78…7dce`](https://explorer.mezo.org/tx/0xe2f2fb78315deb75edb117e84a401a51a057ed0b6c6d990c7f20a8688e2f7dce) |
| deposit(0.40 MUSD) | 13175624 | 118,463 | [`0x902a4912…a35b1`](https://explorer.mezo.org/tx/0x902a4912efc9fd508886f7ff767b294468312ed99fcaadc49dc597cc1a4a35b1) |
| executeSettlement | 13175624 | 120,789 | [`0x4093d636…3c2f`](https://explorer.mezo.org/tx/0x4093d636a434ae210740be916a0c10e927b40e6de9b8f1b24bdc7b7f159c3c2f) |

**Total fee paid: 0.0000009616 BTC.**

Final state read back from the chain:

| Check | Value |
|---|---|
| Cycle state | `3` (Completed) |
| Gross obligations | 1.0 MUSD |
| Net debt / funded / distributed / refunded | 0.4 / 0.4 / 0.4 / 0 MUSD |
| Creditor B MUSD received | 0.1 |
| Creditor C MUSD received | 0.3 |
| MUSD left in the kernel | 0 |

## Verify it yourself

```bash
RPC=https://mezo-mainnet.boar.network
K=0x42A249Bc6850E25D70d3331647a98b8dDe0b80F7

# kernel is bound to canonical MUSD
cast call $K "musdToken()(address)" --rpc-url $RPC

# cycle summary: state, gross, net, funded, distributed
cast call $K "getCycle(bytes32)(bytes32,string,uint256,uint256,uint256,uint256,uint256,uint256,uint8,address)" \
  0x8bc95b8945354a78fbf6855e9cca2f6f06d215e7b11d62749057989e27b8ff5c --rpc-url $RPC

# the kernel retains nothing
cast call 0xdD468A1DDc392dcdbEf6db6e34E89AA338F9F186 "balanceOf(address)(uint256)" $K --rpc-url $RPC
```

## Not yet done

- No mUSDC or mUSDT cycle has been run on mainnet (v1 or v2). Those kernels are deployed and verified, and the same code was exercised against the real mUSDC/mUSDT contract code on a local fork, but no real funds have moved through them.
- The cycle was created and settled by a single signer. It demonstrates the settlement mechanics and token movement, not a multi-party funding flow.
