import React from 'react';
import styles from './DocsContentRenderer.module.css';

export interface SectionContentProps {
  sectionId: string;
}

export function SectionOverview() {
  return (
    <div className={styles.sectionBody}>
      <div id="what-is-netteo" className={styles.subBlock}>
        <h2 className={styles.subHeading}>What is Netteo?</h2>
        <p className={styles.paragraph}>
          <strong>Netteo</strong> is an autonomous debt clearing protocol and multilateral obligation netting engine
          engineered specifically for the <strong>Mezo Network (Bitcoin Layer 2 Economic Substrate, Chain ID 31611)</strong>.
          It solves circular and reciprocal payment debts among decentralized collectives, agency pods, and DAO working groups
          by calculating mathematically deterministic zero-sum net settlement positions and executing them atomically in{' '}
          <strong>MUSD</strong>.
        </p>
        <p className={styles.paragraph}>
          Instead of requiring every contributor, vendor, or project partner to fund, sign, and execute dozens of independent
          invoices back-and-forth, Netteo records approved bilateral claims, simplifies the debt graph into a single net debtor
          and net creditor vector, locks net debtor funds in a non-custodial smart contract, and distributes funds atomically in one click.
        </p>

        <div className={styles.calloutCard}>
          <div className={styles.calloutTitle}>
            <span className={styles.calloutPill}>Core Tenet</span>
            <span>Agreement Before Arithmetic</span>
          </div>
          <p className={styles.calloutText}>
            Netting is a settlement optimization, not a unilateral deduction. A payment claim in Netteo cannot enter a settlement
            cycle or modify a debtor&apos;s net position until the debtor has explicitly reviewed and accepted it. Disputed or unacknowledged
            claims are excluded from the cycle, never silently netted.
          </p>
        </div>
      </div>

      <div id="product-promise" className={styles.subBlock}>
        <h2 className={styles.subHeading}>Product Promise: Many Obligations, One Net Settlement</h2>
        <p className={styles.paragraph}>
          Web3 service collectives incur high operational friction: shared infrastructure hosting, designer milestones, developer reimbursements,
          and grant distributions. Settling each invoice independently creates:
        </p>
        <ul className={styles.bulletList}>
          <li>
            <strong>Severe Capital Lockup:</strong> Capital must be deposited and transferred multiple times even when mutual debts offset.
          </li>
          <li>
            <strong>Avoidable Transaction Overhead:</strong> Excessive network gas fees and repetitive wallet signature requests.
          </li>
          <li>
            <strong>Reconciliation Chaos:</strong> Fragmented transaction records spread across separate wallets and off-chain spreadsheets.
          </li>
        </ul>
        <p className={styles.paragraph}>
          Netteo collapses this complexity into a single verifiable on-chain settlement, slashing required transfer volume by up to 60–80%
          while preserving complete cryptographic provenance of every underlying gross obligation.
        </p>
      </div>

      <div id="the-problem" className={styles.subBlock}>
        <h2 className={styles.subHeading}>The Reciprocal Debt Problem in Web3</h2>
        <p className={styles.paragraph}>
          Consider a typical three-way working group scenario:
        </p>
        <div className={styles.comparisonGrid}>
          <div className={styles.comparisonCard}>
            <div className={styles.comparisonHeader}>Traditional Gross Settlement</div>
            <ul className={styles.cardList}>
              <li>Contributor A pays Contributor B: <strong>100 MUSD</strong></li>
              <li>Contributor B pays Contributor C: <strong>80 MUSD</strong></li>
              <li>Contributor C pays Contributor A: <strong>20 MUSD</strong></li>
              <li className={styles.highlightRow}>Total Capital Required: <strong>200 MUSD</strong></li>
              <li className={styles.highlightRow}>Total Transfers Required: <strong>3 Transactions</strong></li>
            </ul>
          </div>
          <div className={`${styles.comparisonCard} ${styles.comparisonCardActive}`}>
            <div className={styles.comparisonHeader}>Netteo Multilateral Netting</div>
            <ul className={styles.cardList}>
              <li>Contributor A pays: <strong>80 MUSD net</strong></li>
              <li>Contributor B receives: <strong>20 MUSD net</strong></li>
              <li>Contributor C receives: <strong>60 MUSD net</strong></li>
              <li className={styles.highlightSuccess}>Total Capital Required: <strong>80 MUSD (60% Savings)</strong></li>
              <li className={styles.highlightSuccess}>Total Transfers Required: <strong>1 Atomic Settlement</strong></li>
            </ul>
          </div>
        </div>
      </div>

      <div id="target-users" className={styles.subBlock}>
        <h2 className={styles.subHeading}>Who is Netteo For?</h2>
        <div className={styles.userGrid}>
          <div className={styles.userCard}>
            <div className={styles.userRole}>DAO Working Groups & Collectives</div>
            <p className={styles.userDesc}>
              SubDAOs and workstreams with continuous reciprocal reimbursements for tools, audits, bounties, and contributors.
            </p>
          </div>
          <div className={styles.userCard}>
            <div className={styles.userRole}>Web3 Agency & Freelance Pods</div>
            <p className={styles.userDesc}>
              Ad-hoc teams collaborating on client deliverables where developers, copywriters, and designers share infrastructure costs.
            </p>
          </div>
          <div className={styles.userCard}>
            <div className={styles.userRole}>Cross-Project Venture Syndicates</div>
            <p className={styles.userDesc}>
              Co-investors and ecosystem builders sharing legal expenses, event costs, and co-sponsorship pools on Mezo.
            </p>
          </div>
        </div>
      </div>

      <div id="core-pillars" className={styles.subBlock}>
        <h2 className={styles.subHeading}>The Four Pillars of Autonomous Netting</h2>
        <div className={styles.pillarsGrid}>
          <div className={styles.pillarItem}>
            <div className={styles.pillarNumber}>01</div>
            <div className={styles.pillarTitle}>Mathematical Solvency</div>
            <div className={styles.pillarText}>Strict zero-sum check: total net debits must precisely equal total net credits ($\sum b_i = 0$).</div>
          </div>
          <div className={styles.pillarItem}>
            <div className={styles.pillarNumber}>02</div>
            <div className={styles.pillarTitle}>Non-Custodial Escrow</div>
            <div className={styles.pillarText}>Funds are held directly in the verified SettlementKernel smart contract, never by any relayer or admin.</div>
          </div>
          <div className={styles.pillarItem}>
            <div className={styles.pillarNumber}>03</div>
            <div className={styles.pillarTitle}>Immutable Gross Audit Trail</div>
            <div className={styles.pillarText}>Original obligations are permanently preserved and cryptographically committed in on-chain cycle records.</div>
          </div>
          <div className={styles.pillarItem}>
            <div className={styles.pillarNumber}>04</div>
            <div className={styles.pillarTitle}>Mezo Native Settlement</div>
            <div className={styles.pillarText}>Settlement executes in canonical Mezo MUSD with Bitcoin-secured finality and deterministic gas bounds.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SectionTheMath() {
  return (
    <div className={styles.sectionBody}>
      <div id="canonical-example" className={styles.subBlock}>
        <h2 className={styles.subHeading}>Canonical 3-Party Example (60% Volume Reduction)</h2>
        <p className={styles.paragraph}>
          The foundation of multilateral netting is matrix simplification of reciprocal debts.
          Given three parties $A$, $B$, and $C$, their gross obligations form a directed graph $G = (V, E)$:
        </p>
        <div className={styles.codeBlockWrapper}>
          <div className={styles.codeHeader}>
            <span>GRAPH DEBT REDUCTION EQUATION</span>
            <span className={styles.codeLang}>MATH</span>
          </div>
          <pre className={styles.codeContent}>
{`Gross Obligations:
  A → B : 100 MUSD
  B → C :  80 MUSD
  C → A :  20 MUSD
  Gross Volume = 100 + 80 + 20 = 200 MUSD

Net Balance Calculation (Credits Received - Debits Owed):
  Net(A) = (+20) - 100 = -80 MUSD (Net Debtor owes 80)
  Net(B) = (+100) - 80 = +20 MUSD (Net Creditor receives 20)
  Net(C) = (+80) - 20  = +60 MUSD (Net Creditor receives 60)

Zero-Sum Invariant Check:
  Σ Net = (-80) + (+20) + (+60) = 0 MUSD [STRICT BALANCE VALIDATED]

Settlement Execution:
  A deposits 80 MUSD into SettlementKernel
  Kernel distributes 20 MUSD to B and 60 MUSD to C
  Net Settlement Volume = 80 MUSD (60.0% reduction in capital lockup)`}
          </pre>
        </div>
      </div>

      <div id="graph-reduction" className={styles.subBlock}>
        <h2 className={styles.subHeading}>Graph Reduction & Circular Debt Resolution</h2>
        <p className={styles.paragraph}>
          When obligations form a closed circle (e.g. $A \to B \to C \to D \to A$ with equal amounts of 50 MUSD),
          the netting solver calculates net positions of exactly <strong>0 MUSD for all participants</strong>.
          The debt is reconciled and closed on-chain without moving a single wei of token balance.
        </p>
      </div>

      <div id="capital-efficiency" className={styles.subBlock}>
        <h2 className={styles.subHeading}>Capital Efficiency & Gas Conservation</h2>
        <p className={styles.paragraph}>
          In groups with dense interaction, the net-to-gross ratio routinely drops below 25%, meaning participants need
          only 1/4th of the capital they would otherwise need to maintain in active wallets.
        </p>
      </div>
    </div>
  );
}

export function SectionQuickstart() {
  return (
    <div className={styles.sectionBody}>
      <div id="prerequisites" className={styles.subBlock}>
        <h2 className={styles.subHeading}>System Prerequisites</h2>
        <p className={styles.paragraph}>Ensure your workstation has the following toolchains installed:</p>
        <ul className={styles.bulletList}>
          <li><strong>Node.js:</strong> Version &gt;= 20.x LTS</li>
          <li><strong>Foundry:</strong> <code>forge</code> and <code>cast</code> installed for contract compilation</li>
          <li><strong>Web3 Wallet:</strong> MetaMask or Rabby configured with Mezo Testnet (Chain ID 31611)</li>
        </ul>
      </div>

      <div id="clone-install" className={styles.subBlock}>
        <h2 className={styles.subHeading}>Clone & Dependency Installation</h2>
        <div className={styles.codeBlockWrapper}>
          <div className={styles.codeHeader}>
            <span>BASH TERMINAL</span>
            <span className={styles.codeLang}>SHELL</span>
          </div>
          <pre className={styles.codeContent}>
{`# 1. Clone the repository
git clone https://github.com/syther069/netteo.git
cd netteo

# 2. Install workspace dependencies
npm install`}
          </pre>
        </div>
      </div>

      <div id="env-vars" className={styles.subBlock}>
        <h2 className={styles.subHeading}>Environment Configuration</h2>
        <p className={styles.paragraph}>
          Copy the example environment configuration into <code>.env.local</code>:
        </p>
        <div className={styles.codeBlockWrapper}>
          <div className={styles.codeHeader}>
            <span>.env.local</span>
            <span className={styles.codeLang}>ENV</span>
          </div>
          <pre className={styles.codeContent}>
{`# Mezo Testnet Chain Parameters
NEXT_PUBLIC_MEZO_CHAIN_ID=31611
NEXT_PUBLIC_MEZO_RPC_URL="https://rpc.test.mezo.org"
NEXT_PUBLIC_MEZO_EXPLORER_URL="https://explorer.test.mezo.org"

# Live Deployed Contract Addresses on Mezo Testnet
NEXT_PUBLIC_SETTLEMENT_KERNEL_ADDRESS="0x3c5Efa1E7fb42ec5351d132bcAce83C8C4dbc3D5"
NEXT_PUBLIC_MUSD_ADDRESS="0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503"

# Supabase Realtime & Persistence
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"`}
          </pre>
        </div>
      </div>

      <div id="local-dev" className={styles.subBlock}>
        <h2 className={styles.subHeading}>Running Locally (App Router)</h2>
        <div className={styles.codeBlockWrapper}>
          <div className={styles.codeHeader}>
            <span>START DEV SERVER</span>
            <span className={styles.codeLang}>SHELL</span>
          </div>
          <pre className={styles.codeContent}>
{`npm run dev

# Open http://localhost:3000 to access the workspace desk.`}
          </pre>
        </div>
      </div>

      <div id="running-tests" className={styles.subBlock}>
        <h2 className={styles.subHeading}>Running Automated Test Suites</h2>
        <p className={styles.paragraph}>Netteo includes comprehensive mathematical and invariant test suites:</p>
        <div className={styles.codeBlockWrapper}>
          <div className={styles.codeHeader}>
            <span>EXECUTE TESTS</span>
            <span className={styles.codeLang}>SHELL</span>
          </div>
          <pre className={styles.codeContent}>
{`# Run full netting and unit test suite
npm test

# Run TypeScript compilation and strict type check
npm run typecheck`}
          </pre>
        </div>
      </div>
    </div>
  );
}

export function SectionSystemArchitecture() {
  return (
    <div className={styles.sectionBody}>
      <div id="three-layer-model" className={styles.subBlock}>
        <h2 className={styles.subHeading}>The 3-Layer System Model</h2>
        <p className={styles.paragraph}>
          Netteo is architected into three distinct layers to ensure separation of concerns, high throughput, and strict security:
        </p>

        <div className={styles.architectureFlow}>
          <div className={styles.archBox}>
            <div className={styles.archHeader}>1. Client Web3 Desk Layer</div>
            <div className={styles.archDesc}>
              Next.js 16 App Router, React 19, Viem 2.x, Wagmi 3.x, TanStack Query, Roundo typography, and the signature Warm Minimal fintech design tokens.
            </div>
          </div>
          <div className={styles.archArrow}>↓ Cryptographic Commitments & EIP-712 Intent Signatures</div>
          <div className={styles.archBox}>
            <div className={styles.archHeader}>2. State & Audit Projection Layer</div>
            <div className={styles.archDesc}>
              Supabase PostgreSQL with Row Level Security (RLS) policies, idempotent real-time event projection indexer, and Merkle snapshot commitment calculator.
            </div>
          </div>
          <div className={styles.archArrow}>↓ Atomic On-Chain Settlement Payouts</div>
          <div className={styles.archBox}>
            <div className={styles.archHeader}>3. Smart Contract Settlement Layer</div>
            <div className={styles.archDesc}>
              Solidity 0.8.24 (via_ir = true), OpenZeppelin Contracts v5 (SafeERC20, ReentrancyGuard), deployed on Mezo Testnet (Chain ID 31611).
            </div>
          </div>
        </div>
      </div>

      <div id="client-layer" className={styles.subBlock}>
        <h2 className={styles.subHeading}>Client Web3 Workspace (Viem & Wagmi)</h2>
        <p className={styles.paragraph}>
          The client provides zero-friction dual modes: a <strong>Live Mezo Testnet Mode</strong> for executing real transactions
          and a <strong>Demo Sandbox Mode</strong> for instant exploration without requiring a wallet connection.
        </p>
      </div>

      <div id="indexer-layer" className={styles.subBlock}>
        <h2 className={styles.subHeading}>State & Event Projection Indexer</h2>
        <p className={styles.paragraph}>
          A deterministic indexer listens to Mezo Testnet block events (<code>CycleCreated</code>, <code>DepositReceived</code>, <code>SettlementExecuted</code>),
          maintaining clean materialized query tables with complete historical auditability.
        </p>
      </div>

      <div id="settlement-kernel" className={styles.subBlock}>
        <h2 className={styles.subHeading}>SettlementKernel Smart Contract</h2>
        <p className={styles.paragraph}>
          The settlement core is an audited Solidity smart contract that enforces the collect-then-distribute invariant:
          funds are locked until 100% of required net deposits arrive, after which payouts become permissionless and atomic.
        </p>
      </div>
    </div>
  );
}

export function SectionStateMachine() {
  return (
    <div className={styles.sectionBody}>
      <div id="lifecycle-states" className={styles.subBlock}>
        <h2 className={styles.subHeading}>CycleState Enumeration</h2>
        <p className={styles.paragraph}>
          Every settlement cycle exists in exactly one authoritative on-chain state:
        </p>
        <div className={styles.tableWrapper}>
          <table className={styles.specTable}>
            <thead>
              <tr>
                <th>State</th>
                <th>Enum Value</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>NonExistent</code></td>
                <td>0</td>
                <td>Cycle has not been registered on-chain.</td>
              </tr>
              <tr>
                <td><code>Funding</code></td>
                <td>1</td>
                <td>Cycle created; net debtors can deposit their required MUSD allocations.</td>
              </tr>
              <tr>
                <td><code>ReadyToSettle</code></td>
                <td>2</td>
                <td>100% of required net debtor funds have been deposited into escrow.</td>
              </tr>
              <tr>
                <td><code>Completed</code></td>
                <td>3</td>
                <td>Settlement executed; all net creditors have received their payouts. Terminal state.</td>
              </tr>
              <tr>
                <td><code>Expired</code></td>
                <td>4</td>
                <td>Funding deadline elapsed before 100% funding was achieved.</td>
              </tr>
              <tr>
                <td><code>Refunded</code></td>
                <td>5</td>
                <td>Depositors have claimed their 100% principal refunds. Terminal state.</td>
              </tr>
              <tr>
                <td><code>Cancelled</code></td>
                <td>6</td>
                <td>Cycle cancelled before any funds were deposited.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div id="state-transitions" className={styles.subBlock}>
        <h2 className={styles.subHeading}>Deterministic State Transitions</h2>
        <p className={styles.paragraph}>
          Transitions are strictly enforced by SettlementKernel methods:
        </p>
        <ul className={styles.bulletList}>
          <li><code>createCycle()</code>: transitions from <code>NonExistent</code> to <code>Funding</code>.</li>
          <li><code>deposit()</code>: updates funded totals; triggers transition to <code>ReadyToSettle</code> when 100% funded.</li>
          <li><code>executeSettlement()</code>: distributes tokens to all creditors; transitions to <code>Completed</code>.</li>
          <li><code>claimRefund()</code>: callable if <code>block.timestamp &gt; fundingDeadline</code> without full funding.</li>
        </ul>
      </div>

      <div id="deadlines-and-timeouts" className={styles.subBlock}>
        <h2 className={styles.subHeading}>Funding Deadlines & Expiry Enforcements</h2>
        <p className={styles.paragraph}>
          Cycles configure a funding window between <strong>1 hour</strong> and <strong>30 days</strong> (default: 72 hours).
          If a single net debtor fails to deposit before the deadline, no creditor funds are locked indefinitely: every depositor
          can immediately reclaim their funds in full.
        </p>
      </div>
    </div>
  );
}

export function SectionProtocolInvariants() {
  return (
    <div className={styles.sectionBody}>
      <div id="invariant-1-zero-sum" className={styles.subBlock}>
        <h2 className={styles.subHeading}>1. Zero-Sum Balance (Σ net = 0)</h2>
        <p className={styles.paragraph}>
          The contract verifies that total net debits equal total net credits down to the single wei before storing the cycle.
          If total debits do not equal total credits (Σ debits ≠ Σ credits), the transaction reverts with <code>DebitCreditMismatch</code>.
        </p>
      </div>

      <div id="invariant-2-agreement" className={styles.subBlock}>
        <h2 className={styles.subHeading}>2. Agreement Before Arithmetic</h2>
        <p className={styles.paragraph}>
          An obligation must have debtor acknowledgment before becoming eligible for netting. Disputed claims are excluded
          from calculation, preventing malicious unilateral deductions.
        </p>
      </div>

      <div id="invariant-3-gross-preservation" className={styles.subBlock}>
        <h2 className={styles.subHeading}>3. Preservation of Gross Obligations</h2>
        <p className={styles.paragraph}>
          Netting is a settlement mechanism, not an eraser of historical records. The gross obligations remain preserved in the audit
          ledger, cryptographically linked to the on-chain cycle via the <code>snapshotCommitment</code> hash.
        </p>
      </div>

      <div id="invariant-4-collect-distribute" className={styles.subBlock}>
        <h2 className={styles.subHeading}>4. Collect-Then-Distribute Enforcement</h2>
        <p className={styles.paragraph}>
          No payouts can occur until 100% of required net deposits have been collected. There is no partial payout state where
          some creditors are paid while others are left stranded.
        </p>
      </div>

      <div id="invariant-5-mutual-refund" className={styles.subBlock}>
        <h2 className={styles.subHeading}>5. Mutual-Exclusion Refund Guarantee</h2>
        <p className={styles.paragraph}>
          If the cycle deadline passes without 100% funding, depositors call <code>claimRefund(cycleId)</code> to withdraw their exact
          deposited amount. No admin intervention is required.
        </p>
      </div>

      <div id="invariant-6-bounded-gas" className={styles.subBlock}>
        <h2 className={styles.subHeading}>6. Bounded Gas Execution (Max 10 Participants)</h2>
        <p className={styles.paragraph}>
          Cycles enforce a maximum of 10 participants (<code>MAX_PARTICIPANTS = 10</code>) to guarantee that the distribution loop
          executes within standard EVM block gas limits on Mezo without risk of running out of gas.
        </p>
      </div>

      <div id="invariant-7-reentrancy-safety" className={styles.subBlock}>
        <h2 className={styles.subHeading}>7. Checks-Effects-Interactions & Non-Custodial Safety</h2>
        <p className={styles.paragraph}>
          SettlementKernel uses OpenZeppelin&apos;s <code>ReentrancyGuard</code> and strictly mutates internal state prior to executing external
          ERC-20 token transfers, ensuring non-custodial and secure execution.
        </p>
      </div>
    </div>
  );
}

export function SectionMerkleCommitments() {
  return (
    <div className={styles.sectionBody}>
      <div id="snapshot-hash" className={styles.subBlock}>
        <h2 className={styles.subHeading}>Canonical Snapshot Commitment Hash</h2>
        <p className={styles.paragraph}>
          Every cycle calculates an immutable cryptographic fingerprint of the underlying obligation set.
          This commitment is stored directly on Mezo in <code>CycleStorage.snapshotCommitment</code>.
        </p>
        <div className={styles.codeBlockWrapper}>
          <div className={styles.codeHeader}>
            <span>TYPESCRIPT / VIEM COMMITMENT HASH</span>
            <span className={styles.codeLang}>TS</span>
          </div>
          <pre className={styles.codeContent}>
{`import { encodeAbiParameters, keccak256 } from 'viem';

export function calculateSnapshotCommitment(
  chainId: number,
  tokenAddress: string,
  obligations: { id: string; debtor: string; creditor: string; amount: bigint }[]
): \`0x\${string}\` {
  // Sort canonically by obligation ID
  const sorted = [...obligations].sort((a, b) => a.id.localeCompare(b.id));

  // Encode with chain ID and settlement token address sensitivity
  const encoded = encodeAbiParameters(
    [
      { type: 'uint256' },
      { type: 'address' },
      {
        type: 'tuple[]',
        components: [
          { name: 'id', type: 'bytes32' },
          { name: 'debtor', type: 'address' },
          { name: 'creditor', type: 'address' },
          { name: 'amount', type: 'uint256' },
        ],
      },
    ],
    [BigInt(chainId), tokenAddress as \`0x\${string}\`, sorted]
  );

  return keccak256(encoded);
}`}
          </pre>
        </div>
      </div>

      <div id="order-independence" className={styles.subBlock}>
        <h2 className={styles.subHeading}>Canonical Sorting & Order Independence</h2>
        <p className={styles.paragraph}>
          The commitment algorithm sorts obligations by their canonical ID before hashing, guaranteeing that shuffled inputs produce the
          identical deterministic hash.
        </p>
      </div>

      <div id="parameter-sensitivity" className={styles.subBlock}>
        <h2 className={styles.subHeading}>Chain ID & Token Address Sensitivity</h2>
        <p className={styles.paragraph}>
          Cross-chain replay attacks are prevented by including the Mezo Chain ID (<code>31611</code>) and the settlement token address
          inside the commitment domain.
        </p>
      </div>
    </div>
  );
}

export function SectionMezoOverview() {
  return (
    <div className={styles.sectionBody}>
      <div id="mezo-vision" className={styles.subBlock}>
        <h2 className={styles.subHeading}>Why Mezo for Autonomous Settlement</h2>
        <p className={styles.paragraph}>
          Mezo is the <strong>Bitcoin Layer 2 Economic Substrate</strong> designed specifically to expand the productive utility of Bitcoin.
          By combining Bitcoin-anchored security with an EVM-compatible execution layer and native MUSD stablecoin settlement,
          Mezo offers the ideal foundation for high-trust financial debt clearing.
        </p>
      </div>

      <div id="network-parameters" className={styles.subBlock}>
        <h2 className={styles.subHeading}>Network Parameters (Chain ID 31611)</h2>
        <div className={styles.tableWrapper}>
          <table className={styles.specTable}>
            <tbody>
              <tr>
                <td><strong>Network Name</strong></td>
                <td>Mezo Testnet</td>
              </tr>
              <tr>
                <td><strong>Chain ID</strong></td>
                <td><code>31611</code> (Hex: <code>0x7B7B</code>)</td>
              </tr>
              <tr>
                <td><strong>Currency Symbol</strong></td>
                <td><code>BTC</code> / <code>tBTC</code> (18 decimals)</td>
              </tr>
              <tr>
                <td><strong>Settlement Asset</strong></td>
                <td>Canonical Mezo MUSD (18 decimals)</td>
              </tr>
              <tr>
                <td><strong>RPC Endpoint</strong></td>
                <td><code>https://rpc.test.mezo.org</code></td>
              </tr>
              <tr>
                <td><strong>Block Explorer</strong></td>
                <td><a href="https://explorer.test.mezo.org" target="_blank" rel="noreferrer" className={styles.link}>https://explorer.test.mezo.org</a></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div id="rpc-and-explorer" className={styles.subBlock}>
        <h2 className={styles.subHeading}>Official RPC & Block Explorer</h2>
        <p className={styles.paragraph}>
          Transactions and state can be monitored live on the official Mezo Testnet Block Explorer.
        </p>
      </div>
    </div>
  );
}

export function SectionMusdToken() {
  return (
    <div className={styles.sectionBody}>
      <div id="canonical-address" className={styles.subBlock}>
        <h2 className={styles.subHeading}>Official Mezo MUSD Token Address</h2>
        <p className={styles.paragraph}>
          Netteo settles exclusively in the official canonical Mezo MUSD token deployed on Mezo Testnet:
        </p>
        <div className={styles.contractCard}>
          <div className={styles.contractLabel}>CANONICAL MEZO MUSD ADDRESS</div>
          <div className={styles.contractValue}>0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503</div>
          <a
            href="https://explorer.test.mezo.org/token/0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503"
            target="_blank"
            rel="noreferrer"
            className={styles.explorerButton}
          >
            View Token on Mezo Explorer ↗
          </a>
        </div>
      </div>

      <div id="token-parameters" className={styles.subBlock}>
        <h2 className={styles.subHeading}>ERC-20 Token Parameters (18 Decimals)</h2>
        <p className={styles.paragraph}>
          MUSD behaves as a standard ERC-20 token with 18 decimals of precision. 1 MUSD equals <code>1,000,000,000,000,000,000 wei</code>.
        </p>
      </div>

      <div id="approval-contract" className={styles.subBlock}>
        <h2 className={styles.subHeading}>Spender Allowance Contract Safety</h2>
        <p className={styles.paragraph}>
          Prior to funding a settlement cycle, net debtors grant an allowance to the SettlementKernel contract (<code>0x3c5Efa1E7fb42ec5351d132bcAce83C8C4dbc3D5</code>).
          The contract transfers only the exact required net debit amount via <code>transferFrom</code> during <code>deposit()</code>.
        </p>
      </div>
    </div>
  );
}

export function SectionDeployedContracts() {
  return (
    <div className={styles.sectionBody}>
      <div id="contract-registry" className={styles.subBlock}>
        <h2 className={styles.subHeading}>Live Contract Deployment Registry</h2>
        <div className={styles.tableWrapper}>
          <table className={styles.specTable}>
            <thead>
              <tr>
                <th>Contract</th>
                <th>Address</th>
                <th>Status</th>
                <th>Explorer</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>SettlementKernel (Live)</strong></td>
                <td><code>0x3c5Efa1E7fb42ec5351d132bcAce83C8C4dbc3D5</code></td>
                <td><span className={styles.activePill}>Verified Active</span></td>
                <td><a href="https://explorer.test.mezo.org/address/0x3c5Efa1E7fb42ec5351d132bcAce83C8C4dbc3D5" target="_blank" rel="noreferrer" className={styles.link}>Explorer ↗</a></td>
              </tr>
              <tr>
                <td><strong>Canonical Mezo MUSD</strong></td>
                <td><code>0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503</code></td>
                <td><span className={styles.activePill}>Official Token</span></td>
                <td><a href="https://explorer.test.mezo.org/token/0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503" target="_blank" rel="noreferrer" className={styles.link}>Explorer ↗</a></td>
              </tr>
              <tr>
                <td><strong>Legacy SettlementKernel</strong></td>
                <td><code>0x50bb6B07138414fE509B2E2936cF31C9de3e1BbA</code></td>
                <td><span className={styles.deprecatedPill}>Deprecated</span></td>
                <td><a href="https://explorer.test.mezo.org/address/0x50bb6B07138414fE509B2E2936cF31C9de3e1BbA" target="_blank" rel="noreferrer" className={styles.link}>Explorer ↗</a></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div id="compiler-settings" className={styles.subBlock}>
        <h2 className={styles.subHeading}>Foundry Compiler Settings (via_ir = true)</h2>
        <p className={styles.paragraph}>
          Contracts are compiled with Foundry using Solidity <code>0.8.24</code>, optimizer enabled with 200 runs, and <code>via_ir = true</code>.
        </p>
      </div>

      <div id="block-explorer-links" className={styles.subBlock}>
        <h2 className={styles.subHeading}>Mezo Explorer Direct Links</h2>
        <p className={styles.paragraph}>
          All contracts can be audited directly on the Mezo Testnet Block Explorer.
        </p>
      </div>
    </div>
  );
}

export function SectionLiveSettlementProof() {
  return (
    <div className={styles.sectionBody}>
      <div id="settlement-scenario" className={styles.subBlock}>
        <h2 className={styles.subHeading}>Verified 3-Party Cycle Scenario</h2>
        <p className={styles.paragraph}>
          A live multi-party settlement cycle was executed and completed directly on Mezo Testnet:
        </p>
        <ul className={styles.bulletList}>
          <li>Gross Volume: <strong>200 MUSD</strong></li>
          <li>Net Volume: <strong>80 MUSD</strong> (60% volume reduction)</li>
          <li>Net Debtor: Participant A deposited <strong>80 MUSD</strong></li>
          <li>Net Creditor B received: <strong>20 MUSD</strong></li>
          <li>Net Creditor C received: <strong>60 MUSD</strong></li>
        </ul>
      </div>

      <div id="cycle-identifier" className={styles.subBlock}>
        <h2 className={styles.subHeading}>Cycle ID: 0x156915a7...</h2>
        <div className={styles.hashCard}>
          <code>0x156915a716581f2b7358b4561e75c90ae14f7404ed9aca9a30c5c4872a82ef4f</code>
        </div>
      </div>

      <div id="transaction-hashes" className={styles.subBlock}>
        <h2 className={styles.subHeading}>4-Step Verified Transaction Hashes</h2>
        <div className={styles.txList}>
          <div className={styles.txRow}>
            <div className={styles.txStep}>1. MUSD Allowance Approval</div>
            <a href="https://explorer.test.mezo.org/tx/0xb64b38c26b6014ef704d380805ccca2de64a1667fff439f07062f5e66f512291" target="_blank" rel="noreferrer" className={styles.txHashLink}>
              0xb64b38c26b6014ef704d380805ccca2de64a1667fff439f07062f5e66f512291 ↗
            </a>
          </div>
          <div className={styles.txRow}>
            <div className={styles.txStep}>2. Cycle Creation (createCycle)</div>
            <a href="https://explorer.test.mezo.org/tx/0x313721ea293d6511735a44cfa30d4d60890f3879397d6bf6c4f6ca8e7eb97341" target="_blank" rel="noreferrer" className={styles.txHashLink}>
              0x313721ea293d6511735a44cfa30d4d60890f3879397d6bf6c4f6ca8e7eb97341 ↗
            </a>
          </div>
          <div className={styles.txRow}>
            <div className={styles.txStep}>3. Net Debtor Funding (deposit)</div>
            <a href="https://explorer.test.mezo.org/tx/0x6c99d70ef12fef7b87405cd09ea828068cbcf61f745b91055b1374fcd05c382f" target="_blank" rel="noreferrer" className={styles.txHashLink}>
              0x6c99d70ef12fef7b87405cd09ea828068cbcf61f745b91055b1374fcd05c382f ↗
            </a>
          </div>
          <div className={styles.txRow}>
            <div className={styles.txStep}>4. Atomic Settlement Payout (executeSettlement)</div>
            <a href="https://explorer.test.mezo.org/tx/0x87b397ec8053f1d4c58dd23bdcc633d7f480cc137f18d496fb2fcec59f7dc491" target="_blank" rel="noreferrer" className={styles.txHashLink}>
              0x87b397ec8053f1d4c58dd23bdcc633d7f480cc137f18d496fb2fcec59f7dc491 ↗
            </a>
          </div>
        </div>
      </div>

      <div id="terminal-state-proof" className={styles.subBlock}>
        <h2 className={styles.subHeading}>On-Chain Terminal State Verification</h2>
        <p className={styles.paragraph}>
          The cycle reached the terminal <code>Completed</code> state on-chain with zero stranded balances,
          proving the collect-then-distribute invariant holds under real Mezo network conditions.
        </p>
      </div>
    </div>
  );
}

export function SectionWorkspaceModes() {
  return (
    <div className={styles.sectionBody}>
      <div id="live-mezo-mode" className={styles.subBlock}>
        <h2 className={styles.subHeading}>Live Mezo Testnet Mode</h2>
        <p className={styles.paragraph}>
          Interacts directly with Mezo Testnet (Chain ID 31611). Requires connecting a Web3 wallet holding testnet BTC for gas
          and MUSD for settlement deposits.
        </p>
      </div>
      <div id="demo-sandbox-mode" className={styles.subBlock}>
        <h2 className={styles.subHeading}>Demo Sandbox Mode (Zero-Wallet Instant Preview)</h2>
        <p className={styles.paragraph}>
          Allows anyone (e.g. new contributors, developers, or external reviewers) to explore all features, submit simulated claims,
          and execute netting settlements instantly without requiring an external wallet.
        </p>
      </div>
      <div id="mode-switching" className={styles.subBlock}>
        <h2 className={styles.subHeading}>Toggle Mechanism & State Isolation</h2>
        <p className={styles.paragraph}>
          The mode switch pill in the top navigation bar toggles between environments cleanly with isolated local state.
        </p>
      </div>
    </div>
  );
}

export function SectionPartnerGroups() {
  return (
    <div className={styles.sectionBody}>
      <div id="group-creation" className={styles.subBlock}>
        <h2 className={styles.subHeading}>Creating a Settlement Collective</h2>
        <p className={styles.paragraph}>
          A user creates a named group representing their collective, agency, or DAO working group.
        </p>
      </div>
      <div id="member-management" className={styles.subBlock}>
        <h2 className={styles.subHeading}>Managing Counterparty Wallets</h2>
        <p className={styles.paragraph}>
          Add verified EVM wallet addresses for each collective participant. Up to 10 members can participate in a settlement cycle.
        </p>
      </div>
      <div id="group-policies" className={styles.subBlock}>
        <h2 className={styles.subHeading}>Group Settlement Policies & Limits</h2>
        <p className={styles.paragraph}>
          Define funding deadlines, dispute rules, and approval policies for the group.
        </p>
      </div>
    </div>
  );
}

export function SectionObligationsLifecycle() {
  return (
    <div className={styles.sectionBody}>
      <div id="recording-claims" className={styles.subBlock}>
        <h2 className={styles.subHeading}>Recording a Payment Claim</h2>
        <p className={styles.paragraph}>
          Any participant records an obligation owed to them by specifying the debtor, title, invoice/work reference, and amount in MUSD.
        </p>
      </div>
      <div id="approval-flow" className={styles.subBlock}>
        <h2 className={styles.subHeading}>Debtor Acceptance & Acknowledgment</h2>
        <p className={styles.paragraph}>
          Claims appear in the debtor&apos;s Obligations Desk in <strong>Pending Approval</strong> state. The debtor clicks &quot;Accept Claim&quot;
          to approve it into the eligible pool for the next settlement cycle.
        </p>
      </div>
      <div id="dispute-exclusion" className={styles.subBlock}>
        <h2 className={styles.subHeading}>Dispute Handling & Silent Exclusion</h2>
        <p className={styles.paragraph}>
          If a claim is contested, the debtor rejects it with a reason. Disputed claims are excluded from netting cycles,
          preventing unauthorized deductions.
        </p>
      </div>
      <div id="status-tags" className={styles.subBlock}>
        <h2 className={styles.subHeading}>Obligation Status Tag Matrix</h2>
        <div className={styles.tableWrapper}>
          <table className={styles.specTable}>
            <thead>
              <tr>
                <th>Status</th>
                <th>Definition</th>
                <th>Eligible for Netting?</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>Pending</code></td>
                <td>Claim recorded; awaiting debtor acceptance</td>
                <td>No</td>
              </tr>
              <tr>
                <td><code>Approved</code></td>
                <td>Debtor acknowledged; eligible for next cycle</td>
                <td><strong>Yes</strong></td>
              </tr>
              <tr>
                <td><code>In Cycle</code></td>
                <td>Committed to an active on-chain settlement cycle</td>
                <td>Locked</td>
              </tr>
              <tr>
                <td><code>Settled</code></td>
                <td>Cycle completed; debt fully discharged</td>
                <td>Closed</td>
              </tr>
              <tr>
                <td><code>Rejected</code></td>
                <td>Disputed or declined by debtor</td>
                <td>No</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function SectionSettlementExecution() {
  return (
    <div className={styles.sectionBody}>
      <div id="cycle-creation-flow" className={styles.subBlock}>
        <h2 className={styles.subHeading}>1. Grouping Approved Claims into a Cycle</h2>
        <p className={styles.paragraph}>
          Select approved obligations and click &quot;Calculate Net Settlements&quot;. The client generates the graph matrix and previews
          each participant&apos;s net position.
        </p>
      </div>
      <div id="net-preview" className={styles.subBlock}>
        <h2 className={styles.subHeading}>2. Deterministic Net Position Preview</h2>
        <p className={styles.paragraph}>
          Preview reveals gross obligation total, net debt total, participant net breakdown, and verified gross volume reduction percentage.
        </p>
      </div>
      <div id="deposit-locking" className={styles.subBlock}>
        <h2 className={styles.subHeading}>3. Net Debtor Deposit Locking</h2>
        <p className={styles.paragraph}>
          Each net debtor signs an ERC-20 approval and calls <code>deposit()</code> to lock their net debit in the SettlementKernel.
        </p>
      </div>
      <div id="permissionless-execution" className={styles.subBlock}>
        <h2 className={styles.subHeading}>4. Permissionless Atomic Execution</h2>
        <p className={styles.paragraph}>
          Once 100% of required funds are deposited, anyone (the coordinator, debtor, or creditor) calls <code>executeSettlement()</code>,
          which atomically disperses funds to all creditors in the same transaction.
        </p>
      </div>
      <div id="claim-refund" className={styles.subBlock}>
        <h2 className={styles.subHeading}>5. Emergency Depositor Refund Flow</h2>
        <p className={styles.paragraph}>
          If the funding deadline passes before full funding is achieved, depositors call <code>claimRefund()</code> to reclaim their funds.
        </p>
      </div>
    </div>
  );
}

export function SectionAuditReceipts() {
  return (
    <div className={styles.sectionBody}>
      <div id="receipt-cards" className={styles.subBlock}>
        <h2 className={styles.subHeading}>Verifiable Payment Receipts</h2>
        <p className={styles.paragraph}>
          Each completed cycle produces a cryptographic receipt card displaying cycle ID, snapshot commitment hash, gross and net totals,
          and links to the verified Mezo transaction.
        </p>
      </div>
      <div id="csv-exports" className={styles.subBlock}>
        <h2 className={styles.subHeading}>Accounting CSV Export Generator</h2>
        <p className={styles.paragraph}>
          Export reconciled history to standard CSV format suitable for QuickBooks, Xero, or internal DAO treasury audits.
        </p>
      </div>
      <div id="explorer-reconciliation" className={styles.subBlock}>
        <h2 className={styles.subHeading}>Block Explorer Proof Verification</h2>
        <p className={styles.paragraph}>
          Every receipt links directly to the immutable event log on the Mezo Testnet Block Explorer.
        </p>
      </div>
    </div>
  );
}

export function SectionContractMethods() {
  return (
    <div className={styles.sectionBody}>
      <div id="fn-createcycle" className={styles.subBlock}>
        <h2 className={styles.subHeading}>createCycle(CycleInput struct)</h2>
        <div className={styles.codeBlockWrapper}>
          <div className={styles.codeHeader}>
            <span>SOLIDITY METHOD SIGNATURE</span>
            <span className={styles.codeLang}>SOL</span>
          </div>
          <pre className={styles.codeContent}>
{`function createCycle(CycleInput calldata input) external returns (bytes32 cycleId)`}
          </pre>
        </div>
        <p className={styles.paragraph}>
          Registers a new settlement cycle on-chain. Validates zero-sum invariant (Σ debits == Σ credits),
          participant limits (≤ 10), and sets the funding deadline.
        </p>
      </div>

      <div id="fn-deposit" className={styles.subBlock}>
        <h2 className={styles.subHeading}>deposit(bytes32 cycleId, uint256 amount)</h2>
        <div className={styles.codeBlockWrapper}>
          <div className={styles.codeHeader}>
            <span>SOLIDITY METHOD SIGNATURE</span>
            <span className={styles.codeLang}>SOL</span>
          </div>
          <pre className={styles.codeContent}>
{`function deposit(bytes32 cycleId, uint256 amount) external nonReentrant`}
          </pre>
        </div>
        <p className={styles.paragraph}>
          Net debtors deposit their required MUSD portion. Transfers tokens into escrow using <code>safeTransferFrom</code>.
        </p>
      </div>

      <div id="fn-executesettlement" className={styles.subBlock}>
        <h2 className={styles.subHeading}>executeSettlement(bytes32 cycleId)</h2>
        <div className={styles.codeBlockWrapper}>
          <div className={styles.codeHeader}>
            <span>SOLIDITY METHOD SIGNATURE</span>
            <span className={styles.codeLang}>SOL</span>
          </div>
          <pre className={styles.codeContent}>
{`function executeSettlement(bytes32 cycleId) external nonReentrant`}
          </pre>
        </div>
        <p className={styles.paragraph}>
          Permissionless trigger: when 100% funded, atomically distributes MUSD to all creditors and transitions cycle to <code>Completed</code>.
        </p>
      </div>

      <div id="fn-claimrefund" className={styles.subBlock}>
        <h2 className={styles.subHeading}>claimRefund(bytes32 cycleId)</h2>
        <div className={styles.codeBlockWrapper}>
          <div className={styles.codeHeader}>
            <span>SOLIDITY METHOD SIGNATURE</span>
            <span className={styles.codeLang}>SOL</span>
          </div>
          <pre className={styles.codeContent}>
{`function claimRefund(bytes32 cycleId) external nonReentrant`}
          </pre>
        </div>
        <p className={styles.paragraph}>
          Allows depositors to claim a 100% refund if the cycle funding window expires without reaching full funding.
        </p>
      </div>

      <div id="fn-views" className={styles.subBlock}>
        <h2 className={styles.subHeading}>View & Getter Functions</h2>
        <ul className={styles.bulletList}>
          <li><code>getCycleDetails(bytes32 cycleId)</code>: Returns core cycle storage metadata and state.</li>
          <li><code>isCycleFunded(bytes32 cycleId)</code>: Returns boolean indicating whether 100% of net deposits are locked.</li>
          <li><code>getDebtorStatus(bytes32 cycleId, address debtor)</code>: Returns <code>[required, funded, isFullyFunded]</code>.</li>
          <li><code>getCreditorPayout(bytes32 cycleId, address creditor)</code>: Returns creditor payout amount.</li>
        </ul>
      </div>
    </div>
  );
}

export function SectionEventsErrors() {
  return (
    <div className={styles.sectionBody}>
      <div id="contract-events" className={styles.subBlock}>
        <h2 className={styles.subHeading}>Indexed Solidity Events</h2>
        <div className={styles.codeBlockWrapper}>
          <div className={styles.codeHeader}>
            <span>SOLIDITY EVENTS</span>
            <span className={styles.codeLang}>SOL</span>
          </div>
          <pre className={styles.codeContent}>
{`event CycleCreated(
    bytes32 indexed cycleId,
    address indexed creator,
    bytes32 snapshotCommitment,
    uint256 grossObligationTotal,
    uint256 netDebtTotal,
    uint256 fundingDeadline
);

event DepositReceived(
    bytes32 indexed cycleId,
    address indexed debtor,
    uint256 amount,
    uint256 totalDebtorFunded,
    uint256 totalCycleFunded
);

event SettlementExecuted(
    bytes32 indexed cycleId,
    address indexed executor,
    uint256 totalDistributed,
    uint256 timestamp
);

event CycleExpired(bytes32 indexed cycleId, uint256 totalFunded, uint256 timestamp);

event RefundClaimed(
    bytes32 indexed cycleId,
    address indexed participant,
    uint256 amount,
    uint256 timestamp
);`}
          </pre>
        </div>
      </div>

      <div id="custom-revert-errors" className={styles.subBlock}>
        <h2 className={styles.subHeading}>Custom Revert Errors Reference</h2>
        <ul className={styles.bulletList}>
          <li><code>ZeroAddressToken()</code>: Token address cannot be address(0).</li>
          <li><code>CycleAlreadyExists(bytes32 cycleId)</code>: Duplicate cycle ID.</li>
          <li><code>DebitCreditMismatch(uint256 totalDebits, uint256 totalCredits)</code>: Zero-sum invariant violated.</li>
          <li><code>TooManyParticipants(uint256 count, uint256 max)</code>: Participant count exceeds 10.</li>
          <li><code>InvalidDuration(uint256 duration)</code>: Funding duration outside [1 hour, 30 days].</li>
          <li><code>CycleNotFunding(bytes32 cycleId, CycleState state)</code>: Action requires Funding state.</li>
          <li><code>FundingDeadlinePassed(bytes32 cycleId, uint256 deadline)</code>: Deposit rejected after deadline.</li>
          <li><code>DepositExceedsRequired(bytes32 cycleId, address debtor, uint256 attempted, uint256 remaining)</code>: Overfunding rejected.</li>
          <li><code>CycleNotFullyFunded(bytes32 cycleId, uint256 funded, uint256 required)</code>: Cannot settle without 100% funding.</li>
          <li><code>CycleNotExpired(bytes32 cycleId, uint256 deadline, uint256 current)</code>: Refund rejected before deadline.</li>
        </ul>
      </div>
    </div>
  );
}

export function SectionIntegrationGuide() {
  return (
    <div className={styles.sectionBody}>
      <div id="viem-setup" className={styles.subBlock}>
        <h2 className={styles.subHeading}>Mezo Testnet Viem Client Setup</h2>
        <div className={styles.codeBlockWrapper}>
          <div className={styles.codeHeader}>
            <span>TYPESCRIPT / VIEM CLIENT SETUP</span>
            <span className={styles.codeLang}>TS</span>
          </div>
          <pre className={styles.codeContent}>
{`import { createPublicClient, http, defineChain } from 'viem';

export const mezoTestnet = defineChain({
  id: 31611,
  name: 'Mezo Testnet',
  nativeCurrency: { name: 'Bitcoin', symbol: 'BTC', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.test.mezo.org'] },
  },
  blockExplorers: {
    default: { name: 'Mezo Explorer', url: 'https://explorer.test.mezo.org' },
  },
});

export const publicClient = createPublicClient({
  chain: mezoTestnet,
  transport: http(),
});`}
          </pre>
        </div>
      </div>

      <div id="reading-cycle" className={styles.subBlock}>
        <h2 className={styles.subHeading}>Reading Cycle State & Debtor Status</h2>
        <div className={styles.codeBlockWrapper}>
          <div className={styles.codeHeader}>
            <span>READ CONTRACT STATE</span>
            <span className={styles.codeLang}>TS</span>
          </div>
          <pre className={styles.codeContent}>
{`const SETTLEMENT_KERNEL_ADDRESS = '0x3c5Efa1E7fb42ec5351d132bcAce83C8C4dbc3D5';

// Check if cycle is 100% funded
const isFunded = await publicClient.readContract({
  address: SETTLEMENT_KERNEL_ADDRESS,
  abi: settlementKernelAbi,
  functionName: 'isCycleFunded',
  args: [cycleId],
});`}
          </pre>
        </div>
      </div>

      <div id="submitting-txs" className={styles.subBlock}>
        <h2 className={styles.subHeading}>Submitting Approvals & Deposits</h2>
        <p className={styles.paragraph}>
          Use standard Wagmi hooks (<code>useWriteContract</code>) to approve MUSD tokens and execute <code>deposit</code>.
        </p>
      </div>
    </div>
  );
}

export function SectionCastCommands() {
  return (
    <div className={styles.sectionBody}>
      <div id="cast-read-kernel" className={styles.subBlock}>
        <h2 className={styles.subHeading}>Inspect SettlementKernel Details</h2>
        <div className={styles.codeBlockWrapper}>
          <div className={styles.codeHeader}>
            <span>CAST CLI COMMAND</span>
            <span className={styles.codeLang}>BASH</span>
          </div>
          <pre className={styles.codeContent}>
{`cast call 0x3c5Efa1E7fb42ec5351d132bcAce83C8C4dbc3D5 \\
  "musdToken()(address)" \\
  --rpc-url https://rpc.test.mezo.org

# Returns: 0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503 (Canonical Mezo MUSD)`}
          </pre>
        </div>
      </div>

      <div id="cast-check-musd" className={styles.subBlock}>
        <h2 className={styles.subHeading}>Check MUSD Balances & Decimals</h2>
        <div className={styles.codeBlockWrapper}>
          <div className={styles.codeHeader}>
            <span>CAST CLI COMMAND</span>
            <span className={styles.codeLang}>BASH</span>
          </div>
          <pre className={styles.codeContent}>
{`cast call 0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503 \\
  "decimals()(uint8)" \\
  --rpc-url https://rpc.test.mezo.org

# Returns: 18`}
          </pre>
        </div>
      </div>

      <div id="cast-verify-cycle" className={styles.subBlock}>
        <h2 className={styles.subHeading}>Query Live Cycle 0x156915a7... Status</h2>
        <div className={styles.codeBlockWrapper}>
          <div className={styles.codeHeader}>
            <span>QUERY COMPLETED CYCLE</span>
            <span className={styles.codeLang}>BASH</span>
          </div>
          <pre className={styles.codeContent}>
{`cast call 0x3c5Efa1E7fb42ec5351d132bcAce83C8C4dbc3D5 \\
  "isCycleFunded(bytes32)(bool)" \\
  0x156915a716581f2b7358b4561e75c90ae14f7404ed9aca9a30c5c4872a82ef4f \\
  --rpc-url https://rpc.test.mezo.org

# Returns: true`}
          </pre>
        </div>
      </div>
    </div>
  );
}

export function DocsContentRenderer({ sectionId }: SectionContentProps) {
  switch (sectionId) {
    case 'overview':
      return <SectionOverview />;
    case 'the-math':
      return <SectionTheMath />;
    case 'quickstart':
      return <SectionQuickstart />;
    case 'system-architecture':
      return <SectionSystemArchitecture />;
    case 'state-machine':
      return <SectionStateMachine />;
    case 'protocol-invariants':
      return <SectionProtocolInvariants />;
    case 'merkle-commitments':
      return <SectionMerkleCommitments />;
    case 'mezo-overview':
      return <SectionMezoOverview />;
    case 'musd-token':
      return <SectionMusdToken />;
    case 'deployed-contracts':
      return <SectionDeployedContracts />;
    case 'live-settlement-proof':
      return <SectionLiveSettlementProof />;
    case 'workspace-modes':
      return <SectionWorkspaceModes />;
    case 'partner-groups':
      return <SectionPartnerGroups />;
    case 'obligations-lifecycle':
      return <SectionObligationsLifecycle />;
    case 'settlement-execution':
      return <SectionSettlementExecution />;
    case 'audit-receipts':
      return <SectionAuditReceipts />;
    case 'contract-methods':
      return <SectionContractMethods />;
    case 'events-errors':
      return <SectionEventsErrors />;
    case 'integration-guide':
      return <SectionIntegrationGuide />;
    case 'cast-commands':
      return <SectionCastCommands />;
    default:
      return <SectionOverview />;
  }
}
