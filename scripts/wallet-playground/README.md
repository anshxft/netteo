# Wallet playground

Drive Netteo's wallet flows (connect, withdraw from the Savings Vault, borrow against Bitcoin, save a payout) **without real funds and without installing a wallet**. Everything runs against a free local fork of Mezo Mainnet, so the contracts are Mezo's real ones.

It exists because wallet flows are the hardest part to check: they need a funded wallet, a Mezo loan and Savings. This kit builds all three in seconds.

> **Local only.** The test wallet is anvil's first dev account. Its key is public, so never send real funds to it. The test wallet can only talk to your local fork; if the fork is not running, every request fails.

## Run it

You need [Foundry](https://book.getfoundry.sh/getting-started/installation) and the project's dependencies (`npm install`).

**1. Start a fork of Mezo Mainnet** (leave it running):

```bash
anvil --fork-url https://mezo-mainnet.boar.network --port 8547
```

**2. Fund the test wallet.** This gives it BTC, a Bitcoin-backed loan (1 BTC collateral, 2,000 MUSD borrowed) and 700 MUSD in the Savings Vault:

```bash
npx tsx scripts/wallet-playground/setup.ts
```

**3. Start the app pointed at the fork** (so every read in the UI comes from it):

```bash
# macOS / Linux / Git Bash
NEXT_PUBLIC_MEZO_MAINNET_RPC_URL=http://127.0.0.1:8547 npm run dev

# Windows PowerShell
$env:NEXT_PUBLIC_MEZO_MAINNET_RPC_URL="http://127.0.0.1:8547"; npm run dev
```

**4. Add the test wallet to the page.** Open http://localhost:3000/funding, open the browser console, and paste the contents of [`test-wallet.js`](test-wallet.js).

**5. Connect.** Press **Connect Wallet** and choose **Netteo Test Wallet**. The header now shows `0xf39F...2266`.

## What to try

| Where | Do this | You should see |
|---|---|---|
| `/funding` | **Use my wallet**, amount `500` | "You hold 700.00 MUSD" in Savings and an enabled **Withdraw 500.00 MUSD** button |
| `/funding` | Click **Withdraw**, then approve | "Withdraw from Savings: confirmed" with a hash, and the panel refreshes to 200 MUSD |
| `/funding` | **Review borrow**, then **Confirm and borrow** | The fee, interest, collateral ratio before and after, and the BTC price at which the loan could be liquidated. Then the borrow confirms |
| `/funding` | Set the amount to `60000` | Netteo offers only the safe maximum, which lands the loan at exactly 150% |
| a completed cycle that pays the test wallet | **Approve**, then **Save** | The payout moves into the Savings Vault |

## What was verified this way

All of the rows above were driven through the real UI with this kit, and each result was read back from the fork:

- Withdraw 500 MUSD from Savings: wallet +500 MUSD, Savings -500 MUSD.
- Borrow the remaining 300 MUSD: wallet +300.0000 MUSD, loan principal +300.30 (the 0.1% fee is added to the debt).
- Save a 5 MUSD payout (approve, then deposit): Savings +5, wallet -5.
- A rejected wallet request: the app shows "Cancelled in your wallet. Nothing was sent." and the button recovers.
- An unsafe borrow: refused, with the safe maximum offered.

## Files

| File | What it does |
|---|---|
| `setup.ts` | Prepares the fork: puts the live BTC price at Mezo's oracle address, funds the test wallet, opens the loan, deposits into Savings |
| `test-wallet.js` | A scripted browser wallet. It announces itself with EIP-6963, so the app's wagmi `injected()` connector discovers it like a real wallet. It forwards requests to the local fork, whose dev account signs |

## Notes

- The first transactions on a fresh fork can take a while, because anvil pulls state from the remote RPC on first use. `setup.ts` waits for them.
- Mezo's price oracle is not plain EVM code, so it cannot run on a fork. `setup.ts` reads the real price from the live chain and etches it at the oracle address. Every other contract runs its genuine mainnet code.
- To create a settled cycle that pays the test wallet, use anvil's second dev account (`0x7099...79C8`) as the debtor and the test wallet as the creditor, calling `createCycle`, `deposit` and `executeSettlement` on the MUSD kernel with `cast send --unlocked`.
