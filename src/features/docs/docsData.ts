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
        title: 'Overview',
        badge: 'Start here',
        group: 'Getting Started',
        description: 'What Netteo is, how a settlement works from claim to payout, and what is real and what is not.',
        subsections: [
          { id: 'what-is-netteo', title: 'What is Netteo?' },
          { id: 'the-problem', title: 'The problem: circular debts' },
          { id: 'how-it-works', title: 'How it works' },
          { id: 'target-users', title: 'Who it is for' },
          { id: 'honest-status', title: 'What is real, and what is not' },
        ],
        keywords: ['overview', 'musd', 'mezo', 'settlement', 'netting', 'dao', 'status', 'audit'],
      },
      {
        id: 'the-math',
        slug: 'the-math',
        title: 'The Netting Math',
        badge: 'Math',
        group: 'Getting Started',
        description: 'Net positions, the three-party example, and why the saving depends on how circular the debts are.',
        subsections: [
          { id: 'net-position', title: 'Net position' },
          { id: 'canonical-example', title: 'Worked example: $200 becomes $80' },
          { id: 'what-it-does-not-claim', title: 'What netting does not promise' },
        ],
        keywords: ['math', 'net position', 'zero-sum', 'reduction', 'circular debt', 'example'],
      },
      {
        id: 'quickstart',
        slug: 'quickstart',
        title: 'Developer Quickstart',
        badge: 'Setup',
        group: 'Getting Started',
        description: 'Clone, configure, run and test Netteo locally, including the checks that run against real Mezo Mainnet.',
        subsections: [
          { id: 'prerequisites', title: 'Prerequisites' },
          { id: 'clone-install', title: 'Clone and install' },
          { id: 'env-vars', title: 'Environment variables' },
          { id: 'local-dev', title: 'Run the app' },
          { id: 'running-tests', title: 'Run the tests' },
        ],
        keywords: ['quickstart', 'setup', 'install', 'foundry', 'nextjs', 'env', 'supabase', 'tests', 'fork'],
      },
    ],
  },
  {
    id: 'architecture',
    title: 'Architecture & Security',
    sections: [
      {
        id: 'system-architecture',
        slug: 'system-architecture',
        title: 'System Architecture',
        badge: 'Design',
        group: 'Architecture & Security',
        description: 'The contract owns the money; the app owns the workflow. How the browser, API, database, indexer and kernels fit together.',
        subsections: [
          { id: 'boundary', title: 'One boundary: who owns what' },
          { id: 'components', title: 'Components' },
          { id: 'data-flow', title: 'A settlement end to end' },
        ],
        keywords: ['architecture', 'api', 'supabase', 'indexer', 'viem', 'wagmi', 'kernel', 'factory'],
      },
      {
        id: 'state-machine',
        slug: 'state-machine',
        title: 'Cycle State Machine',
        badge: 'Solidity',
        group: 'Architecture & Security',
        description: 'The states a settlement cycle can be in, how it moves between them, and when deposits can be refunded.',
        subsections: [
          { id: 'lifecycle-states', title: 'States' },
          { id: 'state-transitions', title: 'Transitions' },
          { id: 'deadlines-and-timeouts', title: 'Deadlines, grace period and refunds' },
        ],
        keywords: ['state machine', 'lifecycle', 'funding', 'completed', 'expired', 'refunded', 'cancelled', 'grace'],
      },
      {
        id: 'protocol-invariants',
        slug: 'protocol-invariants',
        title: 'Contract Invariants',
        badge: 'Security',
        group: 'Architecture & Security',
        description: 'What the SettlementKernel guarantees, and the test that proves each guarantee.',
        subsections: [
          { id: 'guarantees', title: 'Guarantees and how they are tested' },
          { id: 'not-guaranteed', title: 'What the contract does not guarantee' },
        ],
        keywords: ['invariants', 'security', 'zero-sum', 'reentrancy', 'refund', 'admin', 'tests', 'mutation'],
      },
      {
        id: 'snapshot-commitments',
        slug: 'snapshot-commitments',
        title: 'Snapshot Commitments',
        badge: 'Hashing',
        group: 'Architecture & Security',
        description: 'The keccak256 hash that ties a cycle to the claims behind it, and exactly what checks it.',
        subsections: [
          { id: 'snapshot-hash', title: 'What the hash covers' },
          { id: 'who-checks', title: 'Who checks it' },
        ],
        keywords: ['keccak256', 'hash', 'commitment', 'snapshot', 'verification', 'registration'],
      },
      {
        id: 'security-model',
        slug: 'security-model',
        title: 'Security Model',
        badge: 'Security',
        group: 'Architecture & Security',
        description: 'Wallet sessions, signed actions, replay protection, database access rules, rate limits, and known limits.',
        subsections: [
          { id: 'sign-in', title: 'Sign-in and sessions' },
          { id: 'signed-actions', title: 'Signed actions and replay protection' },
          { id: 'database-access', title: 'Database access' },
          { id: 'abuse-protection', title: 'Rate limiting and safe errors' },
          { id: 'known-limits', title: 'Known limits' },
        ],
        keywords: ['security', 'session', 'signature', 'replay', 'nonce', 'rls', 'rate limit', 'api', 'audit'],
      },
    ],
  },
  {
    id: 'mezo-musd',
    title: 'Mezo & MUSD',
    sections: [
      {
        id: 'mezo-overview',
        slug: 'mezo-overview',
        title: 'Mezo Mainnet',
        badge: 'Chain',
        group: 'Mezo & MUSD',
        description: 'The network Netteo runs on: chain ID, gas, RPC providers and the explorer.',
        subsections: [
          { id: 'network-parameters', title: 'Network parameters' },
          { id: 'rpc-and-explorer', title: 'RPC providers and explorer' },
          { id: 'costs', title: 'What a settlement costs' },
        ],
        keywords: ['mezo', 'chain id 31612', 'mainnet', 'bitcoin', 'rpc', 'explorer', 'gas', 'btc'],
      },
      {
        id: 'musd-token',
        slug: 'musd-token',
        title: 'Settlement Tokens',
        badge: 'Tokens',
        group: 'Mezo & MUSD',
        description: 'MUSD, mUSDC and mUSDT: addresses, decimals, one kernel per token, and what is deliberately excluded.',
        subsections: [
          { id: 'canonical-tokens', title: 'Supported tokens' },
          { id: 'one-token-per-cycle', title: 'One token per cycle' },
          { id: 'excluded-tokens', title: 'Not supported' },
        ],
        keywords: ['musd', 'musdc', 'musdt', 'token', 'erc20', 'decimals', 'canonical', 'allowance', 'registry'],
      },
      {
        id: 'deployed-contracts',
        slug: 'deployed-contracts',
        title: 'Deployed Contracts',
        badge: 'Live',
        group: 'Mezo & MUSD',
        description: 'Every Netteo contract on Mezo Mainnet, with explorer links and compiler settings.',
        subsections: [
          { id: 'contract-registry', title: 'Contract registry (v2)' },
          { id: 'superseded', title: 'Superseded v1' },
          { id: 'compiler-settings', title: 'Compiler settings' },
        ],
        keywords: ['contracts', 'deployments', 'factory', 'settlementkernel', 'v2', 'compiler', 'explorer'],
      },
      {
        id: 'mainnet-evidence',
        slug: 'mainnet-evidence',
        title: 'Mainnet Evidence',
        badge: 'Verified',
        group: 'Mezo & MUSD',
        description: 'Three real settlements (MUSD and mUSDC) and a real Savings Vault round trip, with every transaction and how to check it.',
        subsections: [
          { id: 'settled-cycles', title: 'Settled cycles' },
          { id: 'savings-round-trip', title: 'Savings Vault round trip' },
          { id: 'verify-yourself', title: 'Verify it yourself' },
          { id: 'verification-scope', title: 'What was verified where' },
        ],
        keywords: ['evidence', 'proof', 'transactions', 'hashes', 'verified', 'mainnet', 'savings', 'cycle'],
      },
      {
        id: 'funding-sources',
        slug: 'funding-sources',
        title: 'Funding Without Selling Bitcoin',
        badge: 'Mezo',
        group: 'Mezo & MUSD',
        description: 'Cover a deposit from the MUSD Savings Vault or a loan against Bitcoin, and save what you receive.',
        subsections: [
          { id: 'why', title: 'Why it exists' },
          { id: 'savings-vault', title: 'MUSD Savings Vault' },
          { id: 'borrow-against-btc', title: 'Borrow against your Bitcoin' },
          { id: 'safety-rules', title: 'Safety rules' },
          { id: 'funding-check', title: 'Funding Check page' },
          { id: 'limits', title: 'Limits' },
        ],
        keywords: ['funding', 'savings', 'smusd', 'borrow', 'loan', 'trove', 'liquidation', 'collateral', 'bitcoin', 'funding check'],
      },
      {
        id: 'mezo-contracts',
        slug: 'mezo-contracts',
        title: 'Mezo Protocol Contracts',
        badge: 'Reference',
        group: 'Mezo & MUSD',
        description: 'The Mezo contracts Netteo calls, the functions it uses, and the live parameters it reads.',
        subsections: [
          { id: 'protocol-addresses', title: 'Addresses' },
          { id: 'functions-used', title: 'Functions used' },
          { id: 'live-parameters', title: 'Live parameters' },
          { id: 'oracle-note', title: 'A note on the price oracle' },
        ],
        keywords: ['borrowerOperations', 'troveManager', 'hinthelpers', 'sortedtroves', 'pricefeed', 'savings vault', 'abi', 'oracle'],
      },
    ],
  },
  {
    id: 'workflows',
    title: 'Using Netteo',
    sections: [
      {
        id: 'workspace-modes',
        slug: 'workspace-modes',
        title: 'Live and Demo Modes',
        badge: 'UX',
        group: 'Using Netteo',
        description: 'Live mode runs on Mezo Mainnet and is the default. Demo mode is a labelled sandbox that never touches the chain.',
        subsections: [
          { id: 'live-mezo-mode', title: 'Live mode' },
          { id: 'demo-sandbox-mode', title: 'Demo mode' },
          { id: 'mode-switching', title: 'Switching' },
        ],
        keywords: ['modes', 'demo', 'live', 'mainnet', 'sandbox', 'workspace'],
      },
      {
        id: 'partner-groups',
        slug: 'partner-groups',
        title: 'Groups',
        badge: 'Collab',
        group: 'Using Netteo',
        description: 'Create a group of wallets that settle together, and who can see and change what.',
        subsections: [
          { id: 'group-creation', title: 'Creating a group' },
          { id: 'member-management', title: 'Managing members' },
          { id: 'group-privacy', title: 'Privacy' },
        ],
        keywords: ['groups', 'members', 'wallets', 'privacy', 'creator', 'admin'],
      },
      {
        id: 'obligations-lifecycle',
        slug: 'obligations-lifecycle',
        title: 'Payment Claims',
        badge: 'Ledger',
        group: 'Using Netteo',
        description: 'Record a claim, get the debtor to approve it with a signature, share a link, and what each status means.',
        subsections: [
          { id: 'recording-claims', title: 'Recording a claim' },
          { id: 'approval-flow', title: 'Approval, dispute and withdrawal' },
          { id: 'share-links', title: 'Share links' },
          { id: 'status-tags', title: 'Statuses' },
        ],
        keywords: ['claims', 'obligations', 'debtor', 'creditor', 'approve', 'dispute', 'withdraw', 'share link', 'status'],
      },
      {
        id: 'settlement-execution',
        slug: 'settlement-execution',
        title: 'Settlements',
        badge: 'Cycle',
        group: 'Using Netteo',
        description: 'From approved claims to payout: net preview, on-chain cycle, verification, deposits, execution and refunds.',
        subsections: [
          { id: 'cycle-creation-flow', title: '1. Group approved claims' },
          { id: 'net-preview', title: '2. Review the net positions' },
          { id: 'register-verify', title: '3. Create and verify the cycle' },
          { id: 'deposit-locking', title: '4. Fund the net amounts' },
          { id: 'permissionless-execution', title: '5. Execute the payout' },
          { id: 'claim-refund', title: 'If something goes wrong: refunds' },
        ],
        keywords: ['cycle', 'settlement', 'deposit', 'execute', 'refund', 'verify', 'registered', 'funding sources'],
      },
      {
        id: 'audit-receipts',
        slug: 'audit-receipts',
        title: 'Receipts & Exports',
        badge: 'Audit',
        group: 'Using Netteo',
        description: 'The receipt for every settlement, the CSV export, and how to reconcile it with the explorer.',
        subsections: [
          { id: 'receipt-cards', title: 'Receipts' },
          { id: 'csv-exports', title: 'CSV export' },
          { id: 'explorer-reconciliation', title: 'Reconciling with the explorer' },
        ],
        keywords: ['receipts', 'audit', 'csv', 'accounting', 'reconciliation', 'explorer'],
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
        title: 'SettlementKernel Reference',
        badge: 'API',
        group: 'Smart Contract API',
        description: 'Every external and view function on SettlementKernel, with who may call it and when.',
        subsections: [
          { id: 'fn-createcycle', title: 'createCycle' },
          { id: 'fn-deposit', title: 'deposit and depositWithPermit' },
          { id: 'fn-executesettlement', title: 'executeSettlement' },
          { id: 'fn-claimrefund', title: 'cancelCycle and claimRefund' },
          { id: 'fn-views', title: 'View functions' },
        ],
        keywords: ['abi', 'createcycle', 'deposit', 'executesettlement', 'claimrefund', 'cancelcycle', 'contract', 'api'],
      },
      {
        id: 'events-errors',
        slug: 'events-errors',
        title: 'Events & Errors',
        badge: 'Events',
        group: 'Smart Contract API',
        description: 'Every event the kernel emits and every custom revert error.',
        subsections: [
          { id: 'contract-events', title: 'Events' },
          { id: 'custom-revert-errors', title: 'Custom errors' },
        ],
        keywords: ['events', 'errors', 'revert', 'cyclecreated', 'depositreceived', 'cyclesettled'],
      },
      {
        id: 'integration-guide',
        slug: 'integration-guide',
        title: 'Integration Guide',
        badge: 'Code',
        group: 'Smart Contract API',
        description: 'TypeScript recipes with viem: read a cycle, read a Mezo loan, plan a borrow, and deposit.',
        subsections: [
          { id: 'viem-setup', title: 'Client setup' },
          { id: 'reading-cycle', title: 'Read a cycle' },
          { id: 'reading-mezo', title: 'Read a Mezo loan and plan a borrow' },
          { id: 'submitting-txs', title: 'Approve and deposit' },
        ],
        keywords: ['viem', 'wagmi', 'typescript', 'integration', 'snippets', 'trove', 'borrow'],
      },
      {
        id: 'cast-commands',
        slug: 'cast-commands',
        title: 'Verify with Foundry Cast',
        badge: 'CLI',
        group: 'Smart Contract API',
        description: 'Check Netteo and Mezo state straight from your terminal with cast.',
        subsections: [
          { id: 'cast-read-kernel', title: 'Inspect a kernel' },
          { id: 'cast-verify-cycle', title: 'Check the real v2 cycle' },
          { id: 'cast-mezo', title: 'Read Mezo parameters and a loan' },
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
