export interface DocSubsection {
  id: string;
  title: string;
}

export interface DocSection {
  id: string;
  slug: string;
  title: string;
  badge?: string;
  group: string;
  description: string;
  subsections: DocSubsection[];
  keywords: string[];
}

export interface DocGroup {
  id: string;
  title: string;
  sections: DocSection[];
}

export const DOC_GROUPS: DocGroup[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    sections: [
      {
        id: 'overview',
        slug: 'overview',
        title: 'Overview & Vision',
        badge: 'Core',
        group: 'Getting Started',
        description: 'What Netteo is, why multilateral netting matters on Mezo, and the core protocol philosophy.',
        subsections: [
          { id: 'what-is-netteo', title: 'What is Netteo?' },
          { id: 'product-promise', title: 'Product Promise: Many Obligations, One Net Settlement' },
          { id: 'the-problem', title: 'The Reciprocal Debt Problem in Web3' },
          { id: 'target-users', title: 'Who is Netteo For?' },
          { id: 'core-pillars', title: 'The Four Pillars of Autonomous Netting' },
        ],
        keywords: ['overview', 'vision', 'musd', 'mezo', 'settlement', 'netting', 'zero-sum', 'dao', 'multilateral'],
      },
      {
        id: 'the-math',
        slug: 'the-math',
        title: 'The Netting Advantage',
        badge: 'Math',
        group: 'Getting Started',
        description: 'Mathematical proof and efficiency gains of multilateral gross-to-net debt simplification.',
        subsections: [
          { id: 'canonical-example', title: 'Canonical 3-Party Example (60% Volume Reduction)' },
          { id: 'graph-reduction', title: 'Graph Reduction & Circular Debt Resolution' },
          { id: 'capital-efficiency', title: 'Capital Efficiency & Gas Conservation' },
        ],
        keywords: ['math', 'algorithm', 'graph', 'reduction', 'efficiency', 'volume', 'circular debt', 'proof'],
      },
      {
        id: 'quickstart',
        slug: 'quickstart',
        title: 'Developer Quickstart',
        badge: 'Setup',
        group: 'Getting Started',
        description: 'How to clone, configure, build, and test Netteo locally using Next.js 16 and Foundry.',
        subsections: [
          { id: 'prerequisites', title: 'System Prerequisites' },
          { id: 'clone-install', title: 'Clone & Dependency Installation' },
          { id: 'env-vars', title: 'Environment Configuration' },
          { id: 'local-dev', title: 'Running Locally (App Router)' },
          { id: 'running-tests', title: 'Running Automated Test Suites' },
        ],
        keywords: ['quickstart', 'setup', 'installation', 'foundry', 'nextjs', 'typescript', 'testnet'],
      },
    ],
  },
  {
    id: 'architecture',
    title: 'Architecture & Invariants',
    sections: [
      {
        id: 'system-architecture',
        slug: 'system-architecture',
        title: 'System Architecture',
        badge: 'Design',
        group: 'Architecture & Invariants',
        description: 'The three-layer system design spanning Client UI, Supabase event projection, and Mezo EVM.',
        subsections: [
          { id: 'three-layer-model', title: 'The 3-Layer System Model' },
          { id: 'client-layer', title: 'Client Web3 Workspace (Viem & Wagmi)' },
          { id: 'indexer-layer', title: 'State & Event Projection Indexer' },
          { id: 'settlement-kernel', title: 'SettlementKernel Smart Contract' },
        ],
        keywords: ['architecture', 'layers', 'supabase', 'indexer', 'viem', 'wagmi', 'evm', 'design'],
      },
      {
        id: 'state-machine',
        slug: 'state-machine',
        title: 'Settlement State Machine',
        badge: 'Solidity',
        group: 'Architecture & Invariants',
        description: 'The strict finite state machine governing cycle lifecycles from funding to payout or refund.',
        subsections: [
          { id: 'lifecycle-states', title: 'CycleState Enumeration' },
          { id: 'state-transitions', title: 'Deterministic State Transitions' },
          { id: 'deadlines-and-timeouts', title: 'Funding Deadlines & Expiry Enforcements' },
        ],
        keywords: ['state machine', 'lifecycle', 'cyclestate', 'funding', 'settled', 'expired', 'refunded'],
      },
      {
        id: 'protocol-invariants',
        slug: 'protocol-invariants',
        title: 'The 7 Protocol Invariants',
        badge: 'Security',
        group: 'Architecture & Invariants',
        description: 'Non-negotiable mathematical and cryptographic invariants enforced by SettlementKernel.',
        subsections: [
          { id: 'invariant-1-zero-sum', title: '1. Zero-Sum Balance (Σ net = 0)' },
          { id: 'invariant-2-agreement', title: '2. Agreement Before Arithmetic' },
          { id: 'invariant-3-gross-preservation', title: '3. Preservation of Gross Obligations' },
          { id: 'invariant-4-collect-distribute', title: '4. Collect-Then-Distribute Enforcement' },
          { id: 'invariant-5-mutual-refund', title: '5. Mutual-Exclusion Refund Guarantee' },
          { id: 'invariant-6-bounded-gas', title: '6. Bounded Gas Execution (Max 10 Participants)' },
          { id: 'invariant-7-reentrancy-safety', title: '7. Checks-Effects-Interactions & Non-Custodial Safety' },
        ],
        keywords: ['invariants', 'security', 'zero-sum', 'reentrancy', 'refund', 'safety', 'solvency'],
      },
      {
        id: 'merkle-commitments',
        slug: 'merkle-commitments',
        title: 'Snapshot Commitments',
        badge: 'Crypto',
        group: 'Architecture & Invariants',
        description: 'Deterministic hashing algorithm binding gross obligation sets to immutable on-chain cycle records.',
        subsections: [
          { id: 'snapshot-hash', title: 'Canonical Snapshot Commitment Hash' },
          { id: 'order-independence', title: 'Canonical Sorting & Order Independence' },
          { id: 'parameter-sensitivity', title: 'Chain ID & Token Address Sensitivity' },
        ],
        keywords: ['merkle', 'keccak256', 'hash', 'commitment', 'snapshot', 'cryptography', 'deterministic'],
      },
    ],
  },
  {
    id: 'mezo-musd',
    title: 'Mezo Network & MUSD',
    sections: [
      {
        id: 'mezo-overview',
        slug: 'mezo-overview',
        title: 'Mezo Testnet Substrate',
        badge: 'Chain',
        group: 'Mezo Network & MUSD',
        description: 'Mezo Bitcoin Layer 2 economic network specifications, RPC parameters, and gas dynamics.',
        subsections: [
          { id: 'mezo-vision', title: 'Why Mezo for Autonomous Settlement' },
          { id: 'network-parameters', title: 'Network Parameters (Chain ID 31611)' },
          { id: 'rpc-and-explorer', title: 'Official RPC & Block Explorer' },
        ],
        keywords: ['mezo', 'chain id 31611', 'testnet', 'bitcoin', 'l2', 'rpc', 'explorer'],
      },
      {
        id: 'musd-token',
        slug: 'musd-token',
        title: 'Canonical Mezo MUSD',
        badge: 'Stablecoin',
        group: 'Mezo Network & MUSD',
        description: 'The native economic settlement asset: contract addresses, tokenomics, and approval workflows.',
        subsections: [
          { id: 'canonical-address', title: 'Official Mezo MUSD Token Address' },
          { id: 'token-parameters', title: 'ERC-20 Token Parameters (18 Decimals)' },
          { id: 'approval-contract', title: 'Spender Allowance Contract Safety' },
        ],
        keywords: ['musd', 'stablecoin', 'token', 'erc20', 'allowance', 'approval', 'canonical'],
      },
      {
        id: 'deployed-contracts',
        slug: 'deployed-contracts',
        title: 'Deployed Smart Contracts',
        badge: 'Live',
        group: 'Mezo Network & MUSD',
        description: 'Authoritative registry of deployed smart contracts, compiler versions, and verified code links.',
        subsections: [
          { id: 'contract-registry', title: 'Live Contract Deployment Registry' },
          { id: 'compiler-settings', title: 'Foundry Compiler Settings (via_ir = true)' },
          { id: 'block-explorer-links', title: 'Mezo Explorer Direct Links' },
        ],
        keywords: ['contracts', 'deployments', 'settlementkernel', 'compiler', 'explorer', 'verified'],
      },
      {
        id: 'live-settlement-proof',
        slug: 'live-settlement-proof',
        title: 'Verified On-Chain Proof',
        badge: 'Proof',
        group: 'Mezo Network & MUSD',
        description: 'Complete audit of verified multi-party settlement cycle executed on Mezo Testnet with real tx hashes.',
        subsections: [
          { id: 'settlement-scenario', title: 'Verified 3-Party Cycle Scenario' },
          { id: 'cycle-identifier', title: 'Cycle ID: 0x156915a7...' },
          { id: 'transaction-hashes', title: '4-Step Verified Transaction Hashes' },
          { id: 'terminal-state-proof', title: 'On-Chain Terminal State Verification' },
        ],
        keywords: ['proof', 'audit', 'transactions', 'hashes', 'cycle id', 'verified', 'mezo testnet'],
      },
    ],
  },
  {
    id: 'workflows',
    title: 'Core Workflows & App Guide',
    sections: [
      {
        id: 'workspace-modes',
        slug: 'workspace-modes',
        title: 'Workspace Modes',
        badge: 'UX',
        group: 'Core Workflows & App Guide',
        description: 'Dual-mode architecture: Live Mezo Testnet Mode vs Zero-Setup Demo Sandbox Mode.',
        subsections: [
          { id: 'live-mezo-mode', title: 'Live Mezo Testnet Mode' },
          { id: 'demo-sandbox-mode', title: 'Demo Sandbox Mode (Zero-Wallet Instant Preview)' },
          { id: 'mode-switching', title: 'Toggle Mechanism & State Isolation' },
        ],
        keywords: ['modes', 'sandbox', 'demo', 'live mezo', 'testnet', 'workspace'],
      },
      {
        id: 'partner-groups',
        slug: 'partner-groups',
        title: 'Partner Groups Desk',
        badge: 'Collab',
        group: 'Core Workflows & App Guide',
        description: 'Forming settlement collectives, inviting counterparty wallets, and setting group policies.',
        subsections: [
          { id: 'group-creation', title: 'Creating a Settlement Collective' },
          { id: 'member-management', title: 'Managing Counterparty Wallets' },
          { id: 'group-policies', title: 'Group Settlement Policies & Limits' },
        ],
        keywords: ['groups', 'counterparties', 'collectives', 'partners', 'policy'],
      },
      {
        id: 'obligations-lifecycle',
        slug: 'obligations-lifecycle',
        title: 'Obligations Desk',
        badge: 'Ledger',
        group: 'Core Workflows & App Guide',
        description: 'Registering bilateral payment claims, counterparty acceptance, dispute handling, and netting readiness.',
        subsections: [
          { id: 'recording-claims', title: 'Recording a Payment Claim' },
          { id: 'approval-flow', title: 'Debtor Acceptance & Acknowledgment' },
          { id: 'dispute-exclusion', title: 'Dispute Handling & Silent Exclusion' },
          { id: 'status-tags', title: 'Obligation Status Tag Matrix' },
        ],
        keywords: ['obligations', 'claims', 'debtor', 'creditor', 'approval', 'dispute', 'ledger'],
      },
      {
        id: 'settlement-execution',
        slug: 'settlement-execution',
        title: 'Settlement Cycles & Execution',
        badge: 'Cycle',
        group: 'Core Workflows & App Guide',
        description: 'Assembling approved claims, previewing net positions, on-chain cycle creation, and atomic payouts.',
        subsections: [
          { id: 'cycle-creation-flow', title: '1. Grouping Approved Claims into a Cycle' },
          { id: 'net-preview', title: '2. Deterministic Net Position Preview' },
          { id: 'deposit-locking', title: '3. Net Debtor Deposit Locking' },
          { id: 'permissionless-execution', title: '4. Permissionless Atomic Execution' },
          { id: 'claim-refund', title: '5. Emergency Depositor Refund Flow' },
        ],
        keywords: ['cycle', 'execution', 'deposit', 'distribution', 'refund', 'settlement'],
      },
      {
        id: 'audit-receipts',
        slug: 'audit-receipts',
        title: 'Audit Receipts & Accounting',
        badge: 'Audit',
        group: 'Core Workflows & App Guide',
        description: 'Verifiable cryptographic receipts, block explorer reconciliation, and CSV accounting exports.',
        subsections: [
          { id: 'receipt-cards', title: 'Verifiable Payment Receipts' },
          { id: 'csv-exports', title: 'Accounting CSV Export Generator' },
          { id: 'explorer-reconciliation', title: 'Block Explorer Proof Verification' },
        ],
        keywords: ['receipts', 'audit', 'csv', 'accounting', 'tax', 'reconciliation'],
      },
    ],
  },
  {
    id: 'api-reference',
    title: 'Smart Contract API',
    sections: [
      {
        id: 'contract-methods',
        slug: 'contract-methods',
        title: 'SettlementKernel ABI Reference',
        badge: 'API',
        group: 'Smart Contract API',
        description: 'Comprehensive technical specification of all external and view functions on SettlementKernel.',
        subsections: [
          { id: 'fn-createcycle', title: 'createCycle(CycleInput struct)' },
          { id: 'fn-deposit', title: 'deposit(bytes32 cycleId, uint256 amount)' },
          { id: 'fn-executesettlement', title: 'executeSettlement(bytes32 cycleId)' },
          { id: 'fn-claimrefund', title: 'claimRefund(bytes32 cycleId)' },
          { id: 'fn-views', title: 'View & Getter Functions' },
        ],
        keywords: ['abi', 'createcycle', 'deposit', 'executesettlement', 'claimrefund', 'contract', 'api'],
      },
      {
        id: 'events-errors',
        slug: 'events-errors',
        title: 'Events & Custom Errors',
        badge: 'Events',
        group: 'Smart Contract API',
        description: 'Full reference of all indexed EVM event topics and custom gas-efficient revert errors.',
        subsections: [
          { id: 'contract-events', title: 'Indexed Solidity Events' },
          { id: 'custom-revert-errors', title: 'Custom Revert Errors Reference' },
        ],
        keywords: ['events', 'errors', 'revert', 'solidity', 'cyclecreated', 'depositreceived'],
      },
      {
        id: 'integration-guide',
        slug: 'integration-guide',
        title: 'Web3 Integration Guide',
        badge: 'Code',
        group: 'Smart Contract API',
        description: 'Complete TypeScript recipes for reading and writing to SettlementKernel using Viem and Wagmi.',
        subsections: [
          { id: 'viem-setup', title: 'Mezo Testnet Viem Client Setup' },
          { id: 'reading-cycle', title: 'Reading Cycle State & Debtor Status' },
          { id: 'submitting-txs', title: 'Submitting Approvals & Deposits' },
        ],
        keywords: ['viem', 'wagmi', 'typescript', 'recipes', 'integration', 'snippets'],
      },
      {
        id: 'cast-commands',
        slug: 'cast-commands',
        title: 'Foundry Cast CLI Verification',
        badge: 'CLI',
        group: 'Smart Contract API',
        description: 'Verify live contract state and balances directly from your terminal using cast call.',
        subsections: [
          { id: 'cast-read-kernel', title: 'Inspect SettlementKernel Details' },
          { id: 'cast-check-musd', title: 'Check MUSD Balances & Decimals' },
          { id: 'cast-verify-cycle', title: 'Query Live Cycle 0x156915a7... Status' },
        ],
        keywords: ['cast', 'foundry', 'cli', 'terminal', 'verification', 'bash'],
      },
    ],
  },
];

// Helper to look up section by ID
export function getSectionById(id: string): DocSection | undefined {
  for (const group of DOC_GROUPS) {
    const found = group.sections.find((s) => s.id === id);
    if (found) return found;
  }
  return undefined;
}

// Flat list of all sections
export const ALL_SECTIONS = DOC_GROUPS.flatMap((g) => g.sections);
