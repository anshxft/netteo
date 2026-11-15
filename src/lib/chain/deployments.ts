/**
 * Netteo's deployments and on-chain evidence on Mezo Mainnet (chain 31612). The docs page and the landing page's
 * Evidence section both read from here, and `deployments.test.ts` checks every value against the live chain, so
 * nothing shown to a reader can drift from what is actually deployed. Narrative record: DEPLOYMENTS.md.
 */

export const V2_DEPLOYMENT = {
  label: 'v2 (current)',
  deployedOn: '2026-11-13',
  deployBlock: 13193001,
  factory: '0x95e35305d466dF41EF35E02AA53F1e90Db759a45',
  kernels: {
    MUSD: '0x427Ff00c792252cC364Cb3240Dc26E6e7872340e',
    mUSDC: '0xE229B3a2020FC19331E8A3e9662a2508fFF78020',
    mUSDT: '0xFecBE8a962F5C2628E877AA4C0C90C399549f18f',
  },
  /** Transactions that created the factory and the three kernels. */
  txs: [
    { name: 'Deploy SettlementKernelFactory', block: 13193001, hash: '0xfd4052f31292aab36f62166997034cef7cf6de9f973ef751997baacb439225f9' },
    { name: 'createKernel(MUSD)', block: 13193002, hash: '0xeb775d77b07bca7cc5b8c69ffe646445594eb5b2513851f1aecfed7a35a0ffc8' },
    { name: 'createKernel(mUSDC)', block: 13193002, hash: '0xf38583d65c7f913e892cbfe535cad50a610c883279f4028d3511138cfc36ff23' },
    { name: 'createKernel(mUSDT)', block: 13193002, hash: '0xdb199b7d193a10ab785ca1870fa19c8c97c191d66066676ad1699aa33029d56a' },
  ],
} as const;

/** Superseded by v2. Holds no funds; kept so earlier evidence stays checkable. */
export const V1_DEPLOYMENT = {
  label: 'v1 (superseded)',
  deployedOn: '2026-11-12',
  factory: '0xD4b9d48163352BB79b343D5AA516ddf67c8cE118',
  kernels: {
    MUSD: '0x42A249Bc6850E25D70d3331647a98b8dDe0b80F7',
    mUSDC: '0x40778f813101baD25C772Fa3774D932f922d6C17',
    mUSDT: '0x76De0938cd1a78f9f041Df7E215Bb4a429F0514E',
  },
} as const;

export interface SettledCycle {
  id: `0x${string}`;
  label: string;
  /** The token the cycle settled in. */
  symbol: 'MUSD' | 'mUSDC';
  /** The kernel the cycle ran on. */
  kernel: string;
  /** Amounts in the cycle's own token, as display strings. */
  gross: string;
  netFunded: string;
  payouts: [string, string];
  /** Exact base-unit values, asserted against the chain by deployments.test.ts. */
  grossUnits: bigint;
  netUnits: bigint;
  txs: { name: string; block: number; hash: `0x${string}` }[];
}

export const SETTLED_CYCLES: SettledCycle[] = [
  {
    id: '0x7ff4cbf39083469093a005be46bf698bd2d36b2d0c343374d4fecb224d32d420',
    label: 'Current contracts (v2)',
    symbol: 'MUSD',
    kernel: V2_DEPLOYMENT.kernels.MUSD,
    gross: '0.80',
    netFunded: '0.32',
    payouts: ['+0.08', '+0.24'],
    grossUnits: 800000000000000000n,
    netUnits: 320000000000000000n,
    txs: [
      { name: 'approve', block: 13219662, hash: '0x0184bef588efe8871b9cb5a59c318cb08b65d7778e2a79d37e27bb0086957b2b' },
      { name: 'createCycle', block: 13219663, hash: '0xdaceb9e491895ea5eb09caeb7c537f7d87b4318803c53cb1ee2ee47da122955e' },
      { name: 'deposit', block: 13219664, hash: '0x0340fd70a4e04fcf6d3b0787e5f8726cc99176b45e5f412610213bc8d3b457ce' },
      { name: 'executeSettlement', block: 13219665, hash: '0x9795326bd5fb24acd1fbbb869027bbdad231be58e9be98ab85d89226f3971f45' },
    ],
  },
  {
    id: '0x1ba7aa0cd7725361f28167fd5f21a83a7e47678e07f2373d0358340052fb1674',
    label: 'mUSDC, 6-decimal token (v2)',
    symbol: 'mUSDC',
    kernel: V2_DEPLOYMENT.kernels.mUSDC,
    gross: '0.01',
    netFunded: '0.004',
    payouts: ['+0.001', '+0.003'],
    grossUnits: 10000n,
    netUnits: 4000n,
    txs: [
      { name: 'approve', block: 13244499, hash: '0x93cd5158f1e4badce6b474ada6eefb5be6ca3219101a8963620ccdcf583a3969' },
      { name: 'createCycle', block: 13244500, hash: '0xa995a681dd58fde22b3bee90820c0611ed498a55d7ef1d833ef5641c4e5cbcb8' },
      { name: 'deposit', block: 13244501, hash: '0xb64b8fce7afa90a3cbd31d196b452f09b31934afbfa5d7f3fd2d7434423b019d' },
      { name: 'executeSettlement', block: 13244502, hash: '0xc1b2477636805830b8e661467f711f18f173e6527c42ffecd4b6bfd112c5547e' },
    ],
  },
  {
    id: '0x8bc95b8945354a78fbf6855e9cca2f6f06d215e7b11d62749057989e27b8ff5c',
    label: 'First cycle (v1, superseded)',
    symbol: 'MUSD',
    kernel: V1_DEPLOYMENT.kernels.MUSD,
    gross: '1.00',
    netFunded: '0.40',
    payouts: ['+0.10', '+0.30'],
    grossUnits: 1000000000000000000n,
    netUnits: 400000000000000000n,
    txs: [
      { name: 'approve', block: 13175624, hash: '0x7ad6088f215343a1f862c4f8692bb4b298ad7aebbef5d10dfe8d87d6d847b7ce' },
      { name: 'createCycle', block: 13175624, hash: '0xe2f2fb78315deb75edb117e84a401a51a057ed0b6c6d990c7f20a8688e2f7dce' },
      { name: 'deposit', block: 13175624, hash: '0x902a4912efc9fd508886f7ff767b294468312ed99fcaadc49dc597cc1a4a35b1' },
      { name: 'executeSettlement', block: 13175624, hash: '0x4093d636a434ae210740be916a0c10e927b40e6de9b8f1b24bdc7b7f159c3c2f' },
    ],
  },
];

/** A real round trip through the Mezo MUSD Savings Vault: 0.01 MUSD in, 0.01 MUSD out. */
export const SAVINGS_ROUND_TRIP = {
  amount: '0.01 MUSD',
  txs: [
    { name: 'approve', block: 13224433, hash: '0x465b2b8693049f1fd96eab277a7c5f57d9c00f1fe67967c4887ae0ee6b5cd4a4' },
    { name: 'deposit', block: 13224435, hash: '0x582f2266b8408fb3126ef58e7f08bbe7021d8a0b006ab697685ea1c30d506091' },
    { name: 'withdraw', block: 13224437, hash: '0x2006cdd63fde64e2b0778522569431305dac09c1627a81d038e9bb4e9d9ba15c' },
  ],
} as const;

/** The deployer and receiving wallets used in the test cycles. */
export const TEST_WALLETS = {
  debtorA: '0xb31B137c24e5f020bF07D93BBa99DAf950908a9e',
  creditorB: '0x508c1E9ec5Dd20B988585E6637C2ACF85C0fE7E2',
  creditorC: '0x678A34EE5138803549c3ea1E9a946AE9176A6f31',
} as const;
