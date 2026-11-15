import React from 'react';
import styles from './DocsContentRenderer.module.css';
import { MEZO_MAINNET_EXPLORER_URL } from '@/lib/chain/config';
import { CANONICAL_MEZO_TOKENS } from '@/lib/chain/tokens';
import { MEZO_PROTOCOL } from '@/lib/mezo/protocol';
import { SAVINGS_ROUND_TRIP, SETTLED_CYCLES, V1_DEPLOYMENT, V2_DEPLOYMENT } from '@/lib/chain/deployments';

export interface SectionContentProps {
  sectionId: string;
}

/* ---------------------------------------------------------------------------------------------- */
/* Small building blocks. Every section is made of these, so the markup stays uniform.            */
/* ---------------------------------------------------------------------------------------------- */

function Block({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <div id={id} className={styles.subBlock}>
      <h2 className={styles.subHeading}>{title}</h2>
      {children}
    </div>
  );
}

const P = ({ children }: { children: React.ReactNode }) => <p className={styles.paragraph}>{children}</p>;

function Bullets({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className={styles.bulletList}>
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

function Callout({ pill, title, children }: { pill: string; title: string; children: React.ReactNode }) {
  return (
    <div className={styles.calloutCard}>
      <div className={styles.calloutTitle}>
        <span className={styles.calloutPill}>{pill}</span>
        <span>{title}</span>
      </div>
      <p className={styles.calloutText}>{children}</p>
    </div>
  );
}

function Code({ title, lang, children }: { title: string; lang: string; children: string }) {
  return (
    <div className={styles.codeBlockWrapper}>
      <div className={styles.codeHeader}>
        <span>{title}</span>
        <span className={styles.codeLang}>{lang}</span>
      </div>
      <pre className={styles.codeContent}>{children}</pre>
    </div>
  );
}

function Table({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className={styles.tableWrapper}>
      <table className={styles.specTable}>
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Ext({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className={styles.link}>
      {children}
    </a>
  );
}

const addr = (a: string) => <code>{a}</code>;
const addressLink = (a: string, label?: string) => <Ext href={`${MEZO_MAINNET_EXPLORER_URL}/address/${a}`}>{label ?? `${a.slice(0, 8)}…${a.slice(-6)}`} ↗</Ext>;
const txLink = (hash: string) => <Ext href={`${MEZO_MAINNET_EXPLORER_URL}/tx/${hash}`}>{`${hash.slice(0, 10)}…${hash.slice(-6)}`} ↗</Ext>;

/* ---------------------------------------------------------------------------------------------- */
/* Getting started                                                                                */
/* ---------------------------------------------------------------------------------------------- */

export function SectionOverview() {
  return (
    <div className={styles.sectionBody}>
      <Block id="what-is-netteo" title="What is Netteo?">
        <P>
          <strong>Netteo</strong> helps a group settle what its members owe each other. People record payment claims, each debtor approves
          the claims against them with a wallet signature, and Netteo cancels the circular parts. Only the <em>net</em> amounts are
          deposited, and the contract pays the creditors in one transaction. It runs on <strong>Mezo Mainnet (chain ID 31612)</strong> and
          settles in <strong>MUSD</strong> (and mUSDC or mUSDT).
        </P>
        <P>
          It is built for people who live off Bitcoin on Mezo. A debtor who is short on MUSD can cover their deposit from the MUSD Savings Vault
          or by borrowing against Bitcoin they have already locked in a Mezo loan, instead of selling it. Someone who is paid out can put the MUSD
          straight into the Savings Vault.
        </P>
        <Callout pill="Core idea" title="Net first, then fund the rest">
          Cancelling debts before anyone pays means less MUSD has to be found, so less has to be sold or borrowed.
        </Callout>
      </Block>

      <Block id="the-problem" title="The problem: circular debts">
        <P>A working group often owes itself money in loops. Paying every claim on its own means every debtor must find the full amount first.</P>
        <div className={styles.comparisonGrid}>
          <div className={styles.comparisonCard}>
            <div className={styles.comparisonHeader}>Paying each claim separately</div>
            <ul className={styles.cardList}>
              <li>A pays B: <strong>100 MUSD</strong></li>
              <li>B pays C: <strong>80 MUSD</strong></li>
              <li>C pays A: <strong>20 MUSD</strong></li>
              <li className={styles.highlightRow}>Money to find up front: <strong>200 MUSD</strong></li>
              <li className={styles.highlightRow}>Transfers: <strong>3</strong></li>
            </ul>
          </div>
          <div className={`${styles.comparisonCard} ${styles.comparisonCardActive}`}>
            <div className={styles.comparisonHeader}>Netted by Netteo</div>
            <ul className={styles.cardList}>
              <li>A deposits: <strong>80 MUSD</strong></li>
              <li>B receives: <strong>20 MUSD</strong></li>
              <li>C receives: <strong>60 MUSD</strong></li>
              <li className={styles.highlightSuccess}>Money to find up front: <strong>80 MUSD</strong></li>
              <li className={styles.highlightSuccess}>One deposit, one payout transaction</li>
            </ul>
          </div>
        </div>
      </Block>

      <Block id="how-it-works" title="How it works">
        <Table
          head={['Step', 'What happens', 'Where it lives']}
          rows={[
            ['1. Claim', 'Someone records that a member owes another member an amount.', 'Private database'],
            ['2. Approve', 'The debtor approves or disputes it by signing with their wallet. Disputed claims are never netted.', 'Private database'],
            ['3. Net', 'The group picks approved claims in one token. Netteo previews each person’s net position.', 'Browser, deterministic'],
            ['4. Create', 'The cycle is created on-chain with the net amounts. The server checks it matches the approved claims before deposits are allowed.', 'SettlementKernel'],
            ['5. Fund', 'Each debtor deposits their net amount from their wallet, the Savings Vault, or a loan against Bitcoin.', 'SettlementKernel'],
            ['6. Pay out', 'Once fully funded, anyone can trigger the payout. Creditors can then save their MUSD in the Savings Vault.', 'SettlementKernel'],
          ]}
        />
      </Block>

      <Block id="target-users" title="Who it is for">
        <div className={styles.userGrid}>
          <div className={styles.userCard}>
            <div className={styles.userRole}>DAO working groups</div>
            <p className={styles.userDesc}>Workstreams that reimburse each other for tools, audits and contributors.</p>
          </div>
          <div className={styles.userCard}>
            <div className={styles.userRole}>Small teams and agencies</div>
            <p className={styles.userDesc}>Collaborators who share costs on client work and settle in MUSD.</p>
          </div>
          <div className={styles.userCard}>
            <div className={styles.userRole}>Mezo ecosystem builders</div>
            <p className={styles.userDesc}>Teams who hold Bitcoin on Mezo and want to pay each other without selling it.</p>
          </div>
        </div>
        <P>These are the intended users. Netteo has not yet been tested with real groups, so treat them as a hypothesis.</P>
      </Block>

      <Block id="honest-status" title="What is real, and what is not">
        <Table
          head={['Area', 'Status']}
          rows={[
            ['Settlement on Mezo Mainnet', <>Live. Three real cycles have completed, two in MUSD and one in mUSDC (see <em>Mainnet Evidence</em>).</>],
            ['MUSD Savings Vault', 'Live. A real approve, deposit and withdraw were run on mainnet.'],
            ['Borrowing against Bitcoin', 'Built and tested against real mainnet contract state on a fork. Not executed on mainnet by the team, because a new Mezo loan needs at least 1,800 MUSD of debt.'],
            ['Smart-contract audit', 'Not independently audited.'],
            ['MEZO token and Mezo Passport', 'Not integrated.'],
            ['Demo mode', 'Sample data stored in your browser only. Nothing in it is on-chain.'],
          ]}
        />
      </Block>
    </div>
  );
}

export function SectionTheMath() {
  return (
    <div className={styles.sectionBody}>
      <Block id="net-position" title="Net position">
        <P>For each person, the net position is what they are owed minus what they owe, across the approved claims in the cycle. All amounts are whole numbers in the token&apos;s smallest unit, never floating point.</P>
        <Code title="NET POSITION" lang="MATH">
{`net[p] = (sum of claims owed to p) - (sum of claims p owes)

net[p] < 0   p is a net debtor and deposits |net[p]|
net[p] > 0   p is a net creditor and receives net[p]
net[p] = 0   p neither deposits nor receives

The net positions always sum to zero.`}
        </Code>
      </Block>

      <Block id="canonical-example" title="Worked example: $200 becomes $80">
        <Code title="THREE-PARTY CYCLE" lang="EXAMPLE">
{`Approved claims
  A owes B  100
  B owes C   80
  C owes A   20            gross = 200

Net positions
  A:  +20 - 100 = -80      deposits 80
  B: +100 -  80 = +20      receives 20
  C:  +80 -  20 = +60      receives 60
                    sum = 0

Result: 80 is deposited (not 200). The kernel pays B 20 and C 60.`}
        </Code>
        <P>The real MUSD cycles in <em>Mainnet Evidence</em> use this same shape at a smaller scale.</P>
      </Block>

      <Block id="what-it-does-not-claim" title="What netting does not promise">
        <Bullets
          items={[
            <>The saving depends on how circular the group&apos;s debts are. A group with no loops saves nothing.</>,
            <>It reduces how much must be <em>deposited</em>. It is not a guaranteed saving in fees.</>,
            <>Netteo uses a deterministic way to allocate debtors to creditors. It does not claim the smallest possible number of transfers.</>,
          ]}
        />
      </Block>
    </div>
  );
}

export function SectionQuickstart() {
  return (
    <div className={styles.sectionBody}>
      <Block id="prerequisites" title="Prerequisites">
        <Bullets
          items={[
            <>Node.js 22 and npm</>,
            <>Foundry (<code>forge</code>, <code>cast</code>, <code>anvil</code>) for the contracts and the fork tests</>,
            <>A Supabase project for the private claim ledger (the free plan works)</>,
          ]}
        />
      </Block>

      <Block id="clone-install" title="Clone and install">
        <Code title="TERMINAL" lang="SHELL">
{`git clone https://github.com/syther069/netteo.git
cd netteo
npm install
cp .env.example .env.local`}
        </Code>
        <P>For a fresh Supabase project, run <code>src/lib/db/schema.sql</code> in the SQL editor. The files in <code>src/lib/db/migrations</code> are only for upgrading an older database.</P>
      </Block>

      <Block id="env-vars" title="Environment variables">
        <Table
          head={['Variable', 'Purpose']}
          rows={[
            [<code key="a">NEXT_PUBLIC_SETTLEMENT_KERNEL_FACTORY_ADDRESS</code>, 'The factory. See Deployed Contracts for the current address.'],
            [<code key="b">NEXT_PUBLIC_SETTLEMENT_KERNEL_MUSD / _MUSDC / _MUSDT</code>, 'One kernel per token. A token is selectable in Live mode only once its kernel is set.'],
            [<code key="c">NEXT_PUBLIC_SETTLEMENT_KERNEL_DEPLOY_BLOCK</code>, 'Where the indexer starts reading.'],
            [<code key="d">NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, 'Public. The anon key can only read the chain-derived projection tables.'],
            [<code key="e">SUPABASE_SERVICE_ROLE_KEY</code>, 'Server only. The API cannot reach the private tables without it and fails closed.'],
            [<code key="f">SESSION_SECRET</code>, 'At least 32 random characters. Signs wallet session tokens. Sign-in fails closed without it.'],
            [<code key="g">INDEXER_CRON_SECRET</code>, 'Optional. Protects /api/indexer for an external scheduler.'],
            [<code key="h">NEXT_PUBLIC_MEZO_MAINNET_RPC_URL</code>, 'Optional. A dedicated RPC. Other providers are used automatically as fallbacks.'],
          ]}
        />
        <P>The deploy key is never an environment variable here. Contract deployment uses Foundry&apos;s encrypted keystore (see the repository README).</P>
      </Block>

      <Block id="local-dev" title="Run the app">
        <Code title="TERMINAL" lang="SHELL">
{`npm run dev        # http://localhost:3000
npm run build      # production build`}
        </Code>
      </Block>

      <Block id="running-tests" title="Run the tests">
        <Code title="TERMINAL" lang="SHELL">
{`npx tsc --noEmit   # typecheck
npm test           # TypeScript tests (some read live from Mezo Mainnet)
forge test         # Solidity tests

# Skip the live-chain reads, for example offline:
SKIP_CHAIN_PROBE=1 npm test

# Run the Mezo borrowing and savings test on a free local fork of mainnet:
anvil --fork-url https://mezo-mainnet.boar.network --port 8547
MEZO_MAINNET_FORK_URL=http://127.0.0.1:8547 npx tsx src/lib/mezo/fork.test.ts`}
        </Code>
        <P>
          To try the wallet flows without real funds or a wallet extension, the repository includes a wallet playground (<code>scripts/wallet-playground</code>): a local fork of
          Mezo Mainnet with a funded test wallet that holds a Bitcoin-backed loan and Savings. Its README has the five steps.
        </P>
        <P>
          Two tests read the live chain and fail if the documentation drifts from reality: <code>deployments.test.ts</code> checks every address, token binding,
          cycle amount and transaction listed in these docs, and <code>protocol.test.ts</code> checks the Mezo contracts Netteo depends on.
        </P>
      </Block>
    </div>
  );
}

/* ---------------------------------------------------------------------------------------------- */
/* Architecture & security                                                                        */
/* ---------------------------------------------------------------------------------------------- */

export function SectionSystemArchitecture() {
  return (
    <div className={styles.sectionBody}>
      <Block id="boundary" title="One boundary: who owns what">
        <Callout pill="Principle" title="The contract owns money. The app owns the workflow.">
          Only the SettlementKernel can move funds. The database and indexer explain and index what the chain did, and can never authorise a transfer.
        </Callout>
        <Table
          head={['Kind of truth', 'Owner', 'Examples']}
          rows={[
            ['Claims', 'Private database, behind the API', 'Who owes whom, approval signatures, group membership'],
            ['Settlement', 'SettlementKernel (on-chain)', 'Net amounts, deposits, payouts, refunds, cycle state'],
            ['Presentation', 'Indexed projections', 'Cycle lists, funding progress, receipts'],
          ]}
        />
      </Block>

      <Block id="components" title="Components">
        <Table
          head={['Component', 'What it does']}
          rows={[
            [<strong key="1">Browser app</strong>, 'Next.js with wagmi and viem. Signs messages and sends transactions from the user’s own wallet. Reads Mezo directly for loans and savings.'],
            [<strong key="2">API routes</strong>, 'Every private read and write goes through /api. Requires a signed wallet session; each action carries its own signature; rate limited.'],
            [<strong key="3">Supabase</strong>, 'Postgres. The private tables have row-level security on and no public policy, so only the API (service role) can touch them.'],
            [<strong key="4">Indexer</strong>, 'Reads kernel events into projection tables, one cursor per kernel. It runs when cycles are loaded and via a protected /api/indexer endpoint.'],
            [<strong key="5">SettlementKernelFactory</strong>, 'Creates one kernel per token and keeps a registry, so a cycle in one token can never touch another token’s funds.'],
            [<strong key="6">SettlementKernel</strong>, 'The settlement contract. No owner, no admin, no pause.'],
            [<strong key="7">RPC fallback</strong>, 'Three Mezo providers are tried in turn, so one provider outage does not take the app down.'],
          ]}
        />
      </Block>

      <Block id="data-flow" title="A settlement end to end">
        <Code title="SEQUENCE" lang="FLOW">
{`Debtor wallet  --sign claim approval-->  API  -->  Supabase (private)
Creator wallet --createCycle(net amounts)-->  SettlementKernel
Creator wallet --register cycle-->  API   (recomputes the netting from the approved claims,
                                           compares it with the on-chain cycle, and only then
                                           marks it "registered")
Debtor wallets --approve + deposit-->  SettlementKernel   (blocked in the app until registered)
Anyone         --executeSettlement-->  SettlementKernel  --MUSD-->  creditors
Indexer        <--events--  SettlementKernel  -->  projection tables  -->  receipts`}
        </Code>
      </Block>
    </div>
  );
}

export function SectionStateMachine() {
  return (
    <div className={styles.sectionBody}>
      <Block id="lifecycle-states" title="States">
        <Table
          head={['State', 'Meaning']}
          rows={[
            [<code key="1">Funding</code>, 'Created and waiting for every net debtor to deposit.'],
            [<code key="2">ReadyToSettle</code>, 'Fully funded. Anyone may execute the payout.'],
            [<code key="3">Completed</code>, 'Paid out. Terminal.'],
            [<code key="4">Expired</code>, 'Not completed in time. Depositors can reclaim their deposits.'],
            [<code key="5">Refunded</code>, 'Every deposit has been reclaimed. Terminal.'],
            [<code key="6">Cancelled</code>, 'Cancelled by the creator before full funding. Depositors can reclaim.'],
          ]}
        />
      </Block>

      <Block id="state-transitions" title="Transitions">
        <Code title="CYCLE LIFECYCLE" lang="FLOW">
{`createCycle        -> Funding
Funding            -> ReadyToSettle   when the last debtor deposits
ReadyToSettle      -> Completed       executeSettlement (anyone)
Funding            -> Cancelled       cancelCycle (creator only, before full funding)
Funding            -> Expired         first claimRefund after the funding deadline
ReadyToSettle      -> Expired         first claimRefund after deadline + 3 days
Expired/Cancelled  -> Refunded        when the last deposit is reclaimed`}
        </Code>
        <P>Once a cycle starts refunding it can never pay out, and a completed cycle can never refund.</P>
      </Block>

      <Block id="deadlines-and-timeouts" title="Deadlines, grace period and refunds">
        <Bullets
          items={[
            <>The funding window is chosen at creation, from 1 hour to 30 days. The app uses <strong>72 hours</strong>.</>,
            <>Refunds are not automatic. After the deadline, each depositor calls <code>claimRefund</code> and gets back exactly what they deposited.</>,
            <>A fully funded cycle that cannot pay out (for example, a token blocks one creditor) is not locked forever: after the deadline plus a <strong>3 day grace period</strong>, deposits can be reclaimed.</>,
          ]}
        />
      </Block>

      <Block id="app-state-machines" title="State machines in the app">
        <P>
          Each lifecycle is one small pure module with no UI or network code, so the API, the screens and the tests all ask the same function and
          cannot drift apart. An event that is not legal in the current state is ignored or refused; it never half-applies.
        </P>
        <Table
          head={['Lifecycle', 'States', 'Module']}
          rows={[
            [
              'Payment claim',
              <><code key="o">proposed</code> to <code key="a">accepted</code>, <code key="d">disputed</code> or <code key="w">withdrawn</code>; then <code key="f">frozen</code> and <code key="s">settled</code> by a cycle</>,
              <code key="m1">src/lib/obligations/machine.ts</code>,
            ],
            [
              'Settlement cycle',
              <>The six on-chain states above, plus which actions each allows (deposit, execute, cancel, refund)</>,
              <code key="m2">src/features/settlement-cycles/machine.ts</code>,
            ],
            [
              'Wallet transaction',
              <><code key="t1">idle</code>, <code key="t2">wallet</code>, <code key="t3">confirming</code>, <code key="t4">success</code> or <code key="t5">error</code></>,
              <code key="m3">src/lib/mezo/txMachine.ts</code>,
            ],
            [
              'List screen',
              <><code key="l1">loading</code>, <code key="l2">error</code>, <code key="l3">ready</code>, <code key="l4">needs-wallet</code>, <code key="l5">empty</code></>,
              <code key="m4">src/lib/screenState.ts</code>,
            ],
          ]}
        />
        <Bullets
          items={[
            <>Only the debtor can accept or dispute a proposed claim; the proposer or creditor can withdraw it. The API enforces this with a stored status check, so two requests cannot both succeed. The claims screen reads the same rules to decide which buttons to show.</>,
            <>A second wallet transaction cannot start while one is waiting for a signature or confirmation, and a late failure cannot overwrite a confirmed one.</>,
            <>Executing a settlement is only offered for a fully funded cycle that is still live, never for a cancelled, expired or refunded one.</>,
            <>Failures carry a machine-readable code (for example <code>wrong_state</code>, <code>not_debtor</code>, <code>not_party</code>) next to the plain-language message, so a script or agent can branch without parsing prose.</>,
          ]}
        />
      </Block>
    </div>
  );
}

export function SectionProtocolInvariants() {
  return (
    <div className={styles.sectionBody}>
      <Block id="guarantees" title="Guarantees and how they are tested">
        <Table
          head={['Guarantee', 'How it is enforced and tested']}
          rows={[
            ['Net debits equal net credits', 'createCycle reverts with ImbalancedNetPositions otherwise.'],
            ['Collect, then distribute', 'executeSettlement requires the cycle to be exactly ReadyToSettle.'],
            ['Pay out or refund, never both', 'Once refunds start the state leaves ReadyToSettle, so a payout reverts. A dedicated test covers it.'],
            ['No payout from another cycle’s deposits', 'The strict ReadyToSettle guard replaced an older check that allowed it. A test with a second funded cycle fails if the old guard returns.'],
            ['Exact deposits only', 'A deposit must raise the kernel’s balance by exactly the amount booked, so fee-on-transfer tokens revert (UnexpectedTransferAmount).'],
            ['No cycle-id squatting', 'The stored id is keccak256(creator, salt), so nobody can pre-create an id another wallet will use.'],
            ['Bounded gas', 'At most 10 participants per cycle.'],
            ['No admin powers', 'The contract has no owner, admin or pause function. There is no way for anyone to take deposited funds except through settlement or refund.'],
            ['Reentrancy safety', 'ReentrancyGuard plus state changes before token transfers.'],
          ]}
        />
        <P>The Solidity suite includes mutation checks: reverting a fix makes a test fail. The same kernel was also run against the real MUSD, mUSDC and mUSDT contracts on a fork of mainnet.</P>
      </Block>

      <Block id="not-guaranteed" title="What the contract does not guarantee">
        <Bullets
          items={[
            <>It does not know the underlying claims. <code>createCycle</code> is open to anyone, so a cycle on-chain proves nothing about who agreed to it. That is why the app verifies a cycle against the approved claims before it allows deposits (see Snapshot Commitments).</>,
            <>It does not verify the snapshot commitment against the claims; it stores it.</>,
            <>It has not been independently audited.</>,
          ]}
        />
      </Block>
    </div>
  );
}

export function SectionSnapshotCommitments() {
  return (
    <div className={styles.sectionBody}>
      <Block id="snapshot-hash" title="What the hash covers">
        <P>Each cycle stores a keccak256 hash of its claim set on-chain. It is built from three sorted lists, so the order claims were added in cannot change it.</P>
        <Code title="COMMITMENT" lang="KECCAK256">
{`obligationsHash = keccak256( sorted "id:debtor:creditor:amount" entries )
positionsHash   = keccak256( "address:grossPayable:grossReceivable:net" per participant, sorted )
allocationsHash = keccak256( sorted "from:to:amount" entries )

commitment = keccak256( abi.encode(
  chainId, tokenAddress, algorithmVersion,
  obligationsHash, positionsHash, allocationsHash ) )

algorithmVersion = "netteo-v1.0-deterministic"`}
        </Code>
        <P>Because the chain ID and token are inside the hash, the same claims in a different token, or on a different chain, produce a different commitment. The tests check order independence and sensitivity to amounts, token and chain.</P>
      </Block>

      <Block id="who-checks" title="Who checks it">
        <Bullets
          items={[
            <>The <strong>contract</strong> stores the hash but does not check it.</>,
            <>The <strong>API</strong> checks it. When the creator registers a cycle, the server recomputes the netting from the group&apos;s approved claims and requires the commitment, totals, participants and every per-wallet amount on-chain to match. The creator&apos;s wallet must also be the on-chain creator.</>,
            <>The <strong>app</strong> keeps Deposit and Approve disabled for any cycle that is not registered, and says why.</>,
            <>The <strong>receipt export</strong> lists every original claim next to the hash.</>,
          ]}
        />
      </Block>
    </div>
  );
}

export function SectionSecurityModel() {
  return (
    <div className={styles.sectionBody}>
      <Block id="sign-in" title="Sign-in and sessions">
        <P>
          A wallet signs a short message once (it costs no gas and moves no funds). The API verifies it and returns a session token signed with
          <code> SESSION_SECRET</code>, valid for one hour. Reads of private data need a valid token and return only what that wallet may see.
        </P>
      </Block>

      <Block id="signed-actions" title="Signed actions and replay protection">
        <Bullets
          items={[
            <>Creating a group, proposing a claim, and approving, disputing or withdrawing one each need a fresh signature from the right wallet. The signed text includes the exact amount, token and ids, so a request cannot be altered after signing.</>,
            <>A signature is only valid for five minutes, and each nonce can be used once. Used nonces are stored in the database, so a replay is refused even across serverless instances.</>,
            <>Signatures are standard wallet message signatures (EIP-191, <code>personal_sign</code>), not typed-data signatures.</>,
            <>Claim status changes follow a fixed state machine, applied atomically, so two requests cannot both succeed.</>,
          ]}
        />
      </Block>

      <Block id="database-access" title="Database access">
        <Table
          head={['Tables', 'Who can access them']}
          rows={[
            ['groups, group_members, obligations, cycles, cycle_obligations, consumed_nonces', 'Row-level security on and no policy for the public key. Only the API, using the service role, can read or write them.'],
            ['cycle_projection, participant_position_projection', 'Public read (they only mirror public chain data). Written by the indexer only.'],
            ['indexed_events, indexer_cursor', 'Service role only.'],
          ]}
        />
        <P>The service-role key is never sent to the browser. If the database is unreachable the API returns an error; it never answers with an empty list that looks like real data.</P>
      </Block>

      <Block id="abuse-protection" title="Rate limiting and safe errors">
        <Table
          head={['Endpoint kind', 'Limit per caller']}
          rows={[
            ['Sign-in', '10 per minute'],
            ['Signed writes', '30 per minute'],
            ['Reads', '120 per minute'],
          ]}
        />
        <P>Over the limit, the API answers 429 with a Retry-After header. Error messages shown to users are plain language and never include stack traces, SQL or internal paths.</P>
      </Block>

      <Block id="known-limits" title="Known limits">
        <Bullets
          items={[
            <>The contracts have not been independently audited.</>,
            <>The rate limiter keeps its counters in each server instance&apos;s memory, so the real limit is per instance. A shared store would tighten it.</>,
            <>Approvals live in the private database and are not anchored on-chain. The server verifies a cycle against them before deposits open, but the contract itself cannot.</>,
          ]}
        />
      </Block>
    </div>
  );
}

/* ---------------------------------------------------------------------------------------------- */
/* Mezo & MUSD                                                                                    */
/* ---------------------------------------------------------------------------------------------- */

export function SectionMezoOverview() {
  return (
    <div className={styles.sectionBody}>
      <Block id="network-parameters" title="Network parameters">
        <Table
          head={['Parameter', 'Value']}
          rows={[
            ['Network', 'Mezo Mainnet'],
            ['Chain ID', <code key="1">31612</code>],
            ['Gas token', 'BTC (18 decimals). Gas is paid in Bitcoin, so every wallet needs a little BTC as well as MUSD.'],
            ['Explorer', <Ext key="2" href={MEZO_MAINNET_EXPLORER_URL}>{MEZO_MAINNET_EXPLORER_URL} ↗</Ext>],
          ]}
        />
      </Block>

      <Block id="rpc-and-explorer" title="RPC providers and explorer">
        <P>The app tries these providers in order and moves to the next if one fails:</P>
        <Bullets
          items={[
            <code key="1">https://mezo-mainnet.boar.network</code>,
            <code key="2">https://rpc_evm-mezo.imperator.co</code>,
            <code key="3">https://mainnet.mezo.public.validationcloud.io</code>,
          ]}
        />
        <P>Set <code>NEXT_PUBLIC_MEZO_MAINNET_RPC_URL</code> to put your own provider first.</P>
      </Block>

      <Block id="costs" title="What a settlement costs">
        <P>
          The real v2 cycle (approve, create, deposit, execute) cost <strong>0.0000008134 BTC</strong> in total gas, about five US cents at roughly $66,500 per BTC.
          The three-transaction Savings Vault round trip cost 0.00000047 BTC. Amounts depend on the BTC price and network conditions.
        </P>
      </Block>
    </div>
  );
}

export function SectionMusdToken() {
  const tokens = Object.values(CANONICAL_MEZO_TOKENS).filter((t) => ['MUSD', 'mUSDC', 'mUSDT'].includes(t.symbol));
  const v2 = V2_DEPLOYMENT.kernels as Record<string, string>;
  return (
    <div className={styles.sectionBody}>
      <Block id="canonical-tokens" title="Supported tokens">
        <Table
          head={['Token', 'Address', 'Decimals', 'Settlement kernel']}
          rows={tokens.map((t) => [
            <strong key={t.symbol}>{t.symbol}</strong>,
            <span key="a">{addr(t.address)} {addressLink(t.address, 'explorer')}</span>,
            t.decimals,
            addressLink(v2[t.symbol]),
          ])}
        />
        <P>The registry in <code>src/lib/chain/tokens.ts</code> is the only place tokens are defined. A test re-reads every address and its decimals from Mezo Mainnet, so a wrong or made-up token cannot be added. An unknown address never falls back to MUSD.</P>
      </Block>

      <Block id="one-token-per-cycle" title="One token per cycle">
        <P>
          Each token has its own kernel, bound to that token permanently, and a cycle settles in exactly one token. MUSD uses 18 decimals and mUSDC and mUSDT use 6, so
          amounts in different tokens are never comparable and Netteo never nets them together. Amount parsing takes the selected token&apos;s decimals, so 1.5 mUSDC is exactly 1,500,000 units.
        </P>
      </Block>

      <Block id="excluded-tokens" title="Not supported">
        <Bullets
          items={[
            <><strong>The native BTC token and MEZO:</strong> both are implemented by Mezo-native code rather than a standard ERC-20 contract, so they cannot be tested on a fork. They are excluded until each has been tested with real funds on mainnet.</>,
            <>Other bridged tokens, until their behaviour has been verified in the same way.</>,
          ]}
        />
      </Block>
    </div>
  );
}

export function SectionDeployedContracts() {
  const rows = (d: typeof V2_DEPLOYMENT | typeof V1_DEPLOYMENT) => [
    ['SettlementKernelFactory', addr(d.factory), addressLink(d.factory)],
    ['SettlementKernel (MUSD)', addr(d.kernels.MUSD), addressLink(d.kernels.MUSD)],
    ['SettlementKernel (mUSDC)', addr(d.kernels.mUSDC), addressLink(d.kernels.mUSDC)],
    ['SettlementKernel (mUSDT)', addr(d.kernels.mUSDT), addressLink(d.kernels.mUSDT)],
  ];
  return (
    <div className={styles.sectionBody}>
      <Block id="contract-registry" title="Contract registry (v2)">
        <P>Deployed {V2_DEPLOYMENT.deployedOn}, blocks {V2_DEPLOYMENT.deployBlock} to {V2_DEPLOYMENT.deployBlock + 1}. This is the version the app uses.</P>
        <Table head={['Contract', 'Address', 'Explorer']} rows={rows(V2_DEPLOYMENT)} />
        <Table
          head={['Deployment step', 'Block', 'Transaction']}
          rows={V2_DEPLOYMENT.txs.map((t) => [t.name, t.block, txLink(t.hash)])}
        />
        <P>Checked on-chain: the factory lists three tokens, <code>getKernel(token)</code> returns the matching kernel, each kernel&apos;s <code>musdToken()</code> returns its own token, and <code>REFUND_GRACE</code> is 259,200 seconds. A test repeats these checks against mainnet.</P>
      </Block>

      <Block id="superseded" title="Superseded v1">
        <P>
          v1 was deployed {V1_DEPLOYMENT.deployedOn} and settled a real cycle, but an audit found three bugs that cannot be patched in a deployed contract (locked funds in a stuck cycle, fee-on-transfer tokens, and cycle-id squatting).
          v2 fixes them. v1 holds no funds and the app does not use it.
        </P>
        <Table head={['Contract', 'Address', 'Explorer']} rows={rows(V1_DEPLOYMENT)} />
      </Block>

      <Block id="compiler-settings" title="Compiler settings">
        <Table
          head={['Setting', 'Value']}
          rows={[
            ['Solidity', '0.8.24'],
            ['EVM version', <code key="1">cancun</code>],
            ['Optimizer', 'enabled, 200 runs, via_ir'],
            ['Libraries', 'OpenZeppelin 5.x (SafeERC20, ReentrancyGuard)'],
          ]}
        />
        <P>The deployed runtime code was disassembled to confirm it uses only PUSH0 beyond the older london instruction set, which is already proven to run on Mezo.</P>
      </Block>
    </div>
  );
}

export function SectionMainnetEvidence() {
  return (
    <div className={styles.sectionBody}>
      <Block id="settled-cycles" title="Settled cycles">
        <P>Every cycle uses the three-party shape: one debtor deposits, two creditors are paid, and the kernel finishes with a zero balance. The mUSDC cycle proves the 6-decimal path: amounts are exact in the token's own base units.</P>
        {SETTLED_CYCLES.map((c) => (
          <div key={c.id} style={{ marginBottom: 'var(--space-lg)' }}>
            <Table
              head={[c.label, 'Value']}
              rows={[
                ['Cycle ID', <code key="1">{c.id}</code>],
                ['Gross claims', `${c.gross} ${c.symbol}`],
                ['Net deposited', `${c.netFunded} ${c.symbol}`],
                ['Paid out', `${c.payouts[0]} and ${c.payouts[1]} ${c.symbol}`],
                ['Final state', `Completed, 0 ${c.symbol} left in the kernel`],
              ]}
            />
            <Table head={['Step', 'Block', 'Transaction']} rows={c.txs.map((t) => [t.name, t.block, txLink(t.hash)])} />
          </div>
        ))}
      </Block>

      <Block id="savings-round-trip" title="Savings Vault round trip">
        <P>
          The same code path Netteo uses to fund a deposit from savings, or to save a payout, was run for real: {SAVINGS_ROUND_TRIP.amount} approved, deposited (minting exactly 0.01 sMUSD)
          and withdrawn (every wei returned).
        </P>
        <Table head={['Step', 'Block', 'Transaction']} rows={SAVINGS_ROUND_TRIP.txs.map((t) => [t.name, t.block, txLink(t.hash)])} />
      </Block>

      <Block id="verify-yourself" title="Verify it yourself">
        <Code title="TERMINAL" lang="SHELL">
{`RPC=https://mezo-mainnet.boar.network
K=${V2_DEPLOYMENT.kernels.MUSD}

# state 3 = Completed; also prints gross, net, funded and distributed totals
cast call $K "getCycle(bytes32)(bytes32,string,uint256,uint256,uint256,uint256,uint256,uint256,uint8,address)" \\
  ${SETTLED_CYCLES[0].id} --rpc-url $RPC

# the kernel retains nothing
cast call ${CANONICAL_MEZO_TOKENS.MUSD.address} "balanceOf(address)(uint256)" $K --rpc-url $RPC`}
        </Code>
      </Block>

      <Block id="verification-scope" title="What was verified where">
        <Table
          head={['Feature', 'Verified on mainnet', 'Verified on a mainnet fork']}
          rows={[
            ['Settlement in MUSD', 'Yes, two cycles', 'Yes'],
            ['Settlement in mUSDC', 'Yes, one cycle (6 decimals)', 'Yes, against the real token code'],
            ['mUSDT kernel', 'Deployed; no cycle run', 'Yes, against the real token code'],
            ['Savings Vault deposit and withdraw', 'Yes, real round trip', 'Yes'],
            ['Borrow against Bitcoin', 'Read-only (live loans and parameters)', 'Yes, with the real Mezo contracts and a real trove'],
            ['Wallet flows in the real UI (connect, withdraw from Savings, borrow, save a payout, rejected request)', 'No', 'Yes, driven through the app with a scripted test wallet (see the wallet playground)'],
          ]}
        />
        <P>The borrow transaction itself was not executed on mainnet, because opening a new Mezo loan needs at least 1,800 MUSD of debt.</P>
      </Block>
    </div>
  );
}

export function SectionFundingSources() {
  return (
    <div className={styles.sectionBody}>
      <Block id="why" title="Why it exists">
        <P>
          Mezo&apos;s promise is that you can live off your Bitcoin without selling it. Netteo applies that to group payments: net first so less MUSD is needed, then cover what is left from the
          Savings Vault or a loan against Bitcoin you already hold, and put payouts to work. When a connected debtor&apos;s wallet holds less than their deposit, the settlement screen shows these options
          instead of a dead end.
        </P>
      </Block>

      <Block id="savings-vault" title="MUSD Savings Vault">
        <Bullets
          items={[
            <>Withdraw from the vault to fund a deposit. Mezo describes no lock-up on withdrawals.</>,
            <>After a settlement pays you out, deposit the MUSD in one step, and claim any yield.</>,
            <>The vault mints sMUSD 1:1. Yield is variable and is claimed separately; Netteo shows no yield figure it cannot read from chain.</>,
          ]}
        />
      </Block>

      <Block id="borrow-against-btc" title="Borrow against your Bitcoin">
        <P>If the wallet already has an active Mezo loan, Netteo can borrow exactly the missing MUSD against the Bitcoin locked in it.</P>
        <Bullets
          items={[
            <>It reads your live loan: collateral, debt (principal plus interest), and collateral ratio.</>,
            <>Before you sign, a review step shows the issuance fee (added to your debt), about 30 days of interest, your ratio before and after, and the BTC price at which the loan could be liquidated.</>,
            <>The wallet receives exactly the amount requested. The fee is added to the debt, not deducted.</>,
            <>A wallet with no loan is pointed to the Mezo app. A new loan needs at least 1,800 MUSD of debt plus a 200 MUSD gas deposit, so it suits larger positions.</>,
          ]}
        />
      </Block>

      <Block id="safety-rules" title="Safety rules">
        <Table
          head={['Rule', 'Why']}
          rows={[
            ['Never build a borrow that leaves the loan under 150% collateral', 'Mezo can liquidate a loan below 110%. A settlement is not worth a liquidation.'],
            ['Offer a smaller, safe amount when the full amount would breach the floor', 'The user can still make progress without taking on risk.'],
            ['Block borrowing in Mezo Recovery Mode', 'Mezo restricts new borrowing then.'],
            ['Re-read, re-plan and simulate at click time', 'Prices and debt change; a plan from a minute ago may be unsafe.'],
            ['Use the same debt figure Mezo uses', 'Netteo’s ratio matches TroveManager.getCurrentICR exactly on a real loan.'],
            ['Never move funds without an explicit confirmation', 'Every borrow, withdrawal and deposit is its own wallet transaction behind a review step.'],
          ]}
        />
      </Block>

      <Block id="funding-check" title="Funding Check page">
        <P>
          <code>/funding</code> is a read-only tool. Paste any address, or pick one of the real Bitcoin-backed loans that exist on Mezo Mainnet, enter an amount, and see what that wallet could do. Borrowing and
          withdrawing are enabled only when you connect the wallet being checked.
        </P>
      </Block>

      <Block id="limits" title="Limits">
        <Bullets
          items={[
            <>MUSD cycles only. The Savings Vault and Mezo loans are MUSD products.</>,
            <>Netteo does not open new loans. It borrows more against an existing one.</>,
            <>Nothing here is financial advice. Borrowing adds debt and carries liquidation risk.</>,
          ]}
        />
      </Block>
    </div>
  );
}

export function SectionMezoContracts() {
  const names: Record<string, string> = {
    borrowerOperations: 'BorrowerOperations',
    troveManager: 'TroveManager',
    hintHelpers: 'HintHelpers',
    sortedTroves: 'SortedTroves',
    priceFeed: 'PriceFeed',
    interestRateManager: 'InterestRateManager',
    savingsVault: 'MUSD Savings Vault (sMUSD, proxy)',
  };
  return (
    <div className={styles.sectionBody}>
      <Block id="protocol-addresses" title="Addresses">
        <P>From the official deployment files in the Mezo MUSD repository. A test checks that each has code on Mezo Mainnet.</P>
        <Table
          head={['Contract', 'Address', 'Explorer']}
          rows={Object.entries(MEZO_PROTOCOL).map(([key, a]) => [<strong key={key}>{names[key] ?? key}</strong>, addr(a), addressLink(a)])}
        />
      </Block>

      <Block id="functions-used" title="Functions used">
        <Table
          head={['Contract', 'Functions']}
          rows={[
            ['BorrowerOperations', <code key="1">withdrawMUSD, borrowingRate, getBorrowingFee, minNetDebt</code>],
            ['TroveManager', <code key="2">getTroveStatus, getEntireDebtAndColl, getTroveInterestRate, getTroveOwnersCount, checkRecoveryMode, MCR, MUSD_GAS_COMPENSATION</code>],
            ['HintHelpers', <code key="3">computeNominalCR, getApproxHint</code>],
            ['SortedTroves', <code key="4">findInsertPosition</code>],
            ['PriceFeed', <code key="5">fetchPrice</code>],
            ['InterestRateManager', <code key="6">interestRate</code>],
            ['MUSD Savings Vault', <code key="7">deposit, withdraw, claimYield, claimableYield, balanceOf, musdToken</code>],
          ]}
        />
        <P>The Savings Vault is a custom contract, not ERC-4626: <code>asset()</code> and <code>previewDeposit()</code> do not exist. Netteo uses its real ABI.</P>
      </Block>

      <Block id="live-parameters" title="Live parameters">
        <P>Netteo reads these from chain and never hard-codes them. Values at the time of writing (14 November 2026):</P>
        <Table
          head={['Parameter', 'Value']}
          rows={[
            ['Issuance (borrowing) fee', '0.1% of the amount borrowed, added to debt'],
            ['Interest', '1% a year, fixed, on principal'],
            ['Minimum collateral ratio (MCR)', '110%'],
            ['Minimum net debt for a loan', '1,800 MUSD'],
            ['Gas deposit', '200 MUSD'],
          ]}
        />
      </Block>

      <Block id="oracle-note" title="A note on the price oracle">
        <P>
          PriceFeed is not plain EVM code, so <code>fetchPrice()</code> reverts on a local fork. It works on the live RPC, which is what the app uses. The fork test reads the real price from
          mainnet and etches a one-line stub at the oracle address. Every other contract in that test runs its genuine mainnet code.
        </P>
      </Block>
    </div>
  );
}

/* ---------------------------------------------------------------------------------------------- */
/* Using Netteo                                                                                   */
/* ---------------------------------------------------------------------------------------------- */

export function SectionWorkspaceModes() {
  return (
    <div className={styles.sectionBody}>
      <Block id="live-mezo-mode" title="Live mode">
        <P>
          Live is the default. It runs on Mezo Mainnet with real tokens and real BTC for gas. Your groups and claims are private to your wallet, so you connect a wallet to see them. Transactions cannot be undone.
        </P>
      </Block>
      <Block id="demo-sandbox-mode" title="Demo mode">
        <P>
          Demo lets you try the flow without a wallet. It uses sample data stored in your browser and is labelled as a sandbox everywhere. Nothing in Demo is on-chain, no tokens move, and its funding helpers are simulations.
        </P>
      </Block>
      <Block id="mode-switching" title="Switching">
        <P>
          Use the Demo / Live toggle in the header (or in the menu on a phone). Moving to Live asks for confirmation. Demo data stays in your browser and can be reset.
        </P>
      </Block>
    </div>
  );
}

export function SectionPartnerGroups() {
  return (
    <div className={styles.sectionBody}>
      <Block id="group-creation" title="Creating a group">
        <P>A group is a named set of wallets that settle together, up to 10 members. Creating one needs a wallet signature, and the creator becomes its admin.</P>
      </Block>
      <Block id="member-management" title="Managing members">
        <P>Only the creator or an admin can change who is in a group. The creator can never be removed, and nobody with an open claim (proposed, approved or in a settlement) can be removed, so history is not rewritten. Addresses are normalised, so the same wallet cannot be added twice with different capitalisation.</P>
      </Block>
      <Block id="group-privacy" title="Privacy">
        <P>Group names and claims are visible only to the wallets in the group. A wallet outside the group sees nothing and cannot guess its way in by changing an id.</P>
      </Block>
    </div>
  );
}

export function SectionObligationsLifecycle() {
  return (
    <div className={styles.sectionBody}>
      <Block id="recording-claims" title="Recording a claim">
        <P>
          A member records who owes whom, the amount, the token and a short reference. Debtor and creditor must be different members of the same group. Amounts are whole numbers in the token&apos;s smallest unit, and the claim is signed by the person recording it.
          Do not put sensitive details in the reference.
        </P>
      </Block>

      <Block id="approval-flow" title="Approval, dispute and withdrawal">
        <Bullets
          items={[
            <>Only the <strong>debtor</strong> can approve or dispute a proposed claim, each with a wallet signature.</>,
            <>Only the <strong>proposer or creditor</strong> can withdraw a claim that is still proposed.</>,
            <>A disputed claim is excluded from netting. Netteo never nets a claim silently.</>,
            <>In Live mode the screen shows each person only the buttons they are allowed to use, and who a claim is waiting for.</>,
          ]}
        />
      </Block>

      <Block id="share-links" title="Share links">
        <P>On a proposed claim, <strong>Copy link</strong> creates a link such as <code>/obligations?claim=&lt;id&gt;</code>. Opening it takes the debtor to that claim, highlighted, so they find what they were asked to approve. They still need to connect their wallet, and the link reveals nothing to anyone outside the group.</P>
      </Block>

      <Block id="status-tags" title="Statuses">
        <Table
          head={['Status', 'Meaning']}
          rows={[
            ['Needs approval', 'Proposed and waiting for the debtor.'],
            ['Ready to settle', 'Approved and eligible for a cycle.'],
            ['In settlement', 'Frozen into a registered cycle. It can no longer change.'],
            ['Settled', 'The cycle completed.'],
            ['Disputed', 'Flagged by the debtor and excluded from netting.'],
            ['Withdrawn', 'Cancelled before approval.'],
          ]}
        />
      </Block>
    </div>
  );
}

export function SectionSettlementExecution() {
  return (
    <div className={styles.sectionBody}>
      <Block id="cycle-creation-flow" title="1. Group approved claims">
        <P>A group member selects approved claims. They must all be in one group and one token, because a cycle settles in exactly one token. Whoever creates the cycle on-chain is its creator, and must be the wallet that registers it.</P>
      </Block>
      <Block id="net-preview" title="2. Review the net positions">
        <P>Netteo shows gross claims, each person&apos;s net position, who deposits and who is paid, and the snapshot hash. The calculation is deterministic and runs in the browser; the contract and server re-check it.</P>
      </Block>
      <Block id="register-verify" title="3. Create and verify the cycle">
        <P>
          The creator sends <code>createCycle</code>, then the server verifies it against the approved claims and marks it registered. Until then the screen shows an &quot;unverified&quot; notice and disables Deposit and Approve, because anyone can create a cycle that names you as a debtor.
          The creator can retry verification from the same screen.
        </P>
      </Block>
      <Block id="deposit-locking" title="4. Fund the net amounts">
        <Bullets
          items={[
            <>Each debtor approves the kernel to spend their token and deposits their exact net amount. The funding window is 72 hours.</>,
            <>If a connected debtor&apos;s wallet holds less than the deposit, the <strong>Funding sources</strong> panel offers the MUSD Savings Vault and a loan against Bitcoin (MUSD cycles).</>,
            <>The cycle page also shows how much less had to be funded because claims cancelled, and an estimate of what borrowing that on Mezo would have cost.</>,
          ]}
        />
      </Block>
      <Block id="permissionless-execution" title="5. Execute the payout">
        <P>
          Once every debtor has funded, anyone can call <code>executeSettlement</code>. The kernel pays every creditor in one transaction and marks the cycle Completed. A creditor then sees a <strong>Save your payout</strong> panel for the Savings Vault.
        </P>
      </Block>
      <Block id="claim-refund" title="If something goes wrong: refunds">
        <Bullets
          items={[
            <>If the cycle is not fully funded by the deadline, each depositor calls <code>claimRefund</code> to take back their deposit.</>,
            <>The creator can cancel a cycle before it is fully funded, which also opens refunds.</>,
            <>A fully funded cycle that cannot be paid out opens refunds after the deadline plus 3 days.</>,
          ]}
        />
      </Block>
    </div>
  );
}

export function SectionAuditReceipts() {
  return (
    <div className={styles.sectionBody}>
      <Block id="receipt-cards" title="Receipts">
        <P>Each settlement has a receipt with its status, token, gross and net totals, the snapshot hash, the transactions, and the included claims and net positions.</P>
      </Block>
      <Block id="csv-exports" title="CSV export">
        <P>The export lists the cycle ID, status, token and contract, totals in base units and formatted, transaction links, every included claim (id, parties, amount, reference, status), each participant&apos;s positions, and the net transfers.</P>
      </Block>
      <Block id="explorer-reconciliation" title="Reconciling with the explorer">
        <P>Figures come from the contract and its events. To check a receipt, open its transaction links on the Mezo explorer, or run the commands in <em>Mainnet Evidence</em> and compare the totals.</P>
      </Block>
    </div>
  );
}

/* ---------------------------------------------------------------------------------------------- */
/* Smart contract API                                                                             */
/* ---------------------------------------------------------------------------------------------- */

export function SectionContractMethods() {
  return (
    <div className={styles.sectionBody}>
      <Block id="fn-createcycle" title="createCycle">
        <Code title="SOLIDITY" lang="SOLIDITY">
{`struct CycleInput {
    bytes32 cycleId;              // a salt; the stored id is computeCycleId(msg.sender, cycleId)
    bytes32 snapshotCommitment;
    string  algorithmVersion;
    uint256 grossObligationTotal;
    address[] debtors;      uint256[] debitAmounts;
    address[] creditors;    uint256[] creditAmounts;
    uint256 fundingDuration;      // 1 hour to 30 days
}

function computeCycleId(address creator, bytes32 salt) public pure returns (bytes32);
function createCycle(CycleInput calldata input) external returns (bytes32);`}
        </Code>
        <P>Open to anyone. Reverts if there are no debtors or creditors, more than 10 participants, mismatched arrays, a zero amount or address, a duplicate, an address that is both debtor and creditor, unbalanced totals, or gross below net.</P>
      </Block>

      <Block id="fn-deposit" title="deposit and depositWithPermit">
        <Code title="SOLIDITY" lang="SOLIDITY">
{`function deposit(bytes32 cycleId, uint256 amount) external;
function depositWithPermit(bytes32 cycleId, uint256 amount, uint256 deadline,
                           uint8 v, bytes32 r, bytes32 s) external;`}
        </Code>
        <P>Only a listed debtor can deposit, only while the cycle is Funding, never more than the amount still due, and the kernel&apos;s balance must rise by exactly the amount. <code>depositWithPermit</code> uses an EIP-2612 signature to skip the separate approval; if the permit fails the deposit falls back to the existing allowance.</P>
      </Block>

      <Block id="fn-executesettlement" title="executeSettlement">
        <Code title="SOLIDITY" lang="SOLIDITY">{`function executeSettlement(bytes32 cycleId) external;`}</Code>
        <P>Permissionless. Requires the cycle to be exactly ReadyToSettle. Marks it Completed before paying every creditor.</P>
      </Block>

      <Block id="fn-claimrefund" title="cancelCycle and claimRefund">
        <Code title="SOLIDITY" lang="SOLIDITY">
{`function cancelCycle(bytes32 cycleId) external;   // creator only, only while Funding and not fully funded
function claimRefund(bytes32 cycleId) external;   // a depositor reclaims their own deposit`}
        </Code>
        <P>See the state machine for when refunds open.</P>
      </Block>

      <Block id="fn-views" title="View functions">
        <Code title="SOLIDITY" lang="SOLIDITY">
{`function getCycle(bytes32) view returns (
    bytes32 snapshotCommitment, string algorithmVersion,
    uint256 grossObligationTotal, uint256 netDebtTotal, uint256 totalFunded,
    uint256 totalDistributed, uint256 totalRefunded, uint256 fundingDeadline,
    CycleState state, address creator);
function getCycleParticipants(bytes32) view returns (address[] debtors, address[] creditors);
function getDebtorStatus(bytes32, address) view returns (uint256 required, uint256 funded, bool isFullyFunded);
function getCreditorPayout(bytes32, address) view returns (uint256);
function isCycleFullyFunded(bytes32) view returns (bool);
function musdToken() view returns (IERC20);   // the one token this kernel is bound to
uint256 constant MAX_PARTICIPANTS = 10;  REFUND_GRACE = 3 days;  DEFAULT_FUNDING_DURATION = 72 hours;`}
        </Code>
      </Block>
    </div>
  );
}

export function SectionEventsErrors() {
  return (
    <div className={styles.sectionBody}>
      <Block id="contract-events" title="Events">
        <Code title="SOLIDITY" lang="SOLIDITY">
{`event CycleCreated(bytes32 indexed cycleId, bytes32 indexed snapshotCommitment, uint256 netDebtTotal,
                   uint256 grossObligationTotal, uint256 fundingDeadline, address indexed creator);
event DepositReceived(bytes32 indexed cycleId, address indexed debtor, uint256 amount,
                      uint256 totalDebtorFunded, uint256 totalCycleFunded);
event CycleReadyToSettle(bytes32 indexed cycleId, uint256 totalFunded);
event CycleSettled(bytes32 indexed cycleId, uint256 totalDistributed, uint256 creditorCount, uint256 timestamp);
event CycleExpired(bytes32 indexed cycleId, uint256 totalFunded, uint256 timestamp);
event CycleCancelled(bytes32 indexed cycleId, address indexed creator, uint256 timestamp);
event RefundClaimed(bytes32 indexed cycleId, address indexed participant, uint256 amount, uint256 timestamp);`}
        </Code>
      </Block>

      <Block id="custom-revert-errors" title="Custom errors">
        <Table
          head={['Error', 'When']}
          rows={[
            [<code key="1">CycleAlreadyExists, CycleNotFound</code>, 'The cycle id is already used, or does not exist.'],
            [<code key="2">InvalidParticipantBounds, ArrayLengthMismatch</code>, 'Zero or more than 10 participants, or mismatched arrays.'],
            [<code key="3">ZeroAddressParticipant, DuplicateParticipant, DebtorCannotBeCreditor</code>, 'Invalid participant list.'],
            [<code key="4">InvalidAmount, ImbalancedNetPositions, InvalidGrossTotal</code>, 'A zero amount, debits not equal to credits, or gross below net.'],
            [<code key="5">InvalidFundingDuration</code>, 'Outside 1 hour to 30 days.'],
            [<code key="6">CycleNotInFundingState, FundingDeadlineExpired, FundingDeadlineNotReached</code>, 'A deposit or refund at the wrong time.'],
            [<code key="7">UnauthorizedDebtor, UnauthorizedCaller</code>, 'The caller may not do this.'],
            [<code key="8">ExcessiveDeposit, UnexpectedTransferAmount</code>, 'Deposit above what is due, or the kernel balance did not rise by the amount.'],
            [<code key="9">CycleNotReadyToSettle, CycleAlreadyFullyFunded</code>, 'Payout before full funding, or cancelling a funded cycle.'],
            [<code key="10">CycleNotInRefundableState, RefundNotYetOpen, NoRefundAvailable</code>, 'A refund that is not open yet, or nothing to reclaim.'],
            [<code key="11">TerminalStateReached</code>, 'The cycle is already Completed or Refunded.'],
          ]}
        />
      </Block>
    </div>
  );
}

export function SectionIntegrationGuide() {
  const kernel = V2_DEPLOYMENT.kernels.MUSD;
  return (
    <div className={styles.sectionBody}>
      <Block id="viem-setup" title="Client setup">
        <Code title="TYPESCRIPT" lang="TS">
{`import { createPublicClient } from 'viem';
import { mezoMainnet } from '@/lib/chain/config';
import { mezoTransport } from '@/lib/chain/transport'; // tries three Mezo RPC providers in turn

export const client = createPublicClient({ chain: mezoMainnet, transport: mezoTransport() });`}
        </Code>
      </Block>

      <Block id="reading-cycle" title="Read a cycle">
        <Code title="TYPESCRIPT" lang="TS">
{`import { settlementKernelAbi } from '@/lib/chain/abi';

const KERNEL = '${kernel}'; // MUSD kernel (v2)

const [, , gross, net, funded, distributed, , , state] = await client.readContract({
  address: KERNEL,
  abi: settlementKernelAbi,
  functionName: 'getCycle',
  args: ['${SETTLED_CYCLES[0].id}'],
});
// state 3 = Completed`}
        </Code>
      </Block>

      <Block id="reading-mezo" title="Read a Mezo loan and plan a borrow">
        <Code title="TYPESCRIPT" lang="TS">
{`import { readProtocolParams, readTrove } from '@/lib/mezo/chain';
import { planBorrow } from '@/lib/mezo/borrow';

const [params, trove] = await Promise.all([readProtocolParams(client), readTrove(client, wallet)]);
const plan = planBorrow(shortfall, trove, params); // pure function, 150% safety floor

if (plan.kind === 'ok') {
  // plan.fee, plan.newDebt, plan.currentIcr, plan.resultingIcr, plan.monthlyInterest
}
// other kinds: 'no-trove' | 'recovery-mode' | 'unsafe' (with the safe maximum)`}
        </Code>
        <P><code>planBorrow</code> never touches the network and is covered by unit tests against a real mainnet vector. <code>buildWithdrawHints</code> in the same module builds the hints for <code>withdrawMUSD</code>.</P>
      </Block>

      <Block id="submitting-txs" title="Approve and deposit">
        <Code title="TYPESCRIPT" lang="TS">
{`import { erc20Abi } from 'viem';

const MUSD = '${CANONICAL_MEZO_TOKENS.MUSD.address}';

await wallet.writeContract({ address: MUSD, abi: erc20Abi, functionName: 'approve', args: [KERNEL, amount] });
await wallet.writeContract({ address: KERNEL, abi: settlementKernelAbi, functionName: 'deposit', args: [cycleId, amount] });`}
        </Code>
        <P>In the app, a deposit is blocked until the cycle is registered, and every transaction is simulated before the wallet is asked to sign.</P>
      </Block>
    </div>
  );
}

export function SectionCastCommands() {
  const kernel = V2_DEPLOYMENT.kernels.MUSD;
  return (
    <div className={styles.sectionBody}>
      <Block id="cast-read-kernel" title="Inspect a kernel">
        <Code title="TERMINAL" lang="SHELL">
{`RPC=https://mezo-mainnet.boar.network
K=${kernel}

cast call $K "musdToken()(address)" --rpc-url $RPC      # the token this kernel is bound to
cast call $K "REFUND_GRACE()(uint256)" --rpc-url $RPC   # 259200 (3 days)
cast call ${V2_DEPLOYMENT.factory} "getSupportedTokenCount()(uint256)" --rpc-url $RPC   # 3`}
        </Code>
      </Block>

      <Block id="cast-verify-cycle" title="Check the real v2 cycle">
        <Code title="TERMINAL" lang="SHELL">
{`cast call $K "getCycle(bytes32)(bytes32,string,uint256,uint256,uint256,uint256,uint256,uint256,uint8,address)" \\
  ${SETTLED_CYCLES[0].id} --rpc-url $RPC

cast call ${CANONICAL_MEZO_TOKENS.MUSD.address} "balanceOf(address)(uint256)" $K --rpc-url $RPC   # 0`}
        </Code>
      </Block>

      <Block id="cast-mezo" title="Read Mezo parameters and a loan">
        <Code title="TERMINAL" lang="SHELL">
{`BO=${MEZO_PROTOCOL.borrowerOperations}
TM=${MEZO_PROTOCOL.troveManager}

cast call $BO "borrowingRate()(uint256)" --rpc-url $RPC      # 1e15 = 0.1%
cast call $BO "minNetDebt()(uint256)" --rpc-url $RPC         # 1.8e21 = 1,800 MUSD
cast call ${MEZO_PROTOCOL.priceFeed} "fetchPrice()(uint256)" --rpc-url $RPC   # BTC price, 18 decimals

# a wallet's loan: status (1 = active) and collateral, principal, interest
cast call $TM "getTroveStatus(address)(uint8)" <wallet> --rpc-url $RPC
cast call $TM "getEntireDebtAndColl(address)(uint256,uint256,uint256,uint256,uint256,uint256)" <wallet> --rpc-url $RPC

# Savings Vault position
cast call ${MEZO_PROTOCOL.savingsVault} "balanceOf(address)(uint256)" <wallet> --rpc-url $RPC`}
        </Code>
      </Block>
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
    case 'snapshot-commitments':
      return <SectionSnapshotCommitments />;
    case 'security-model':
      return <SectionSecurityModel />;
    case 'mezo-overview':
      return <SectionMezoOverview />;
    case 'musd-token':
      return <SectionMusdToken />;
    case 'deployed-contracts':
      return <SectionDeployedContracts />;
    case 'mainnet-evidence':
      return <SectionMainnetEvidence />;
    case 'funding-sources':
      return <SectionFundingSources />;
    case 'mezo-contracts':
      return <SectionMezoContracts />;
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
