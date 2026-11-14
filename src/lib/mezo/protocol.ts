import { parseAbi } from 'viem';

/**
 * Mezo Mainnet (chain 31612) protocol contracts Netteo reads and writes.
 *
 * Source: the official deployment artifacts in github.com/mezo-org/musd
 * (solidity/artifacts/deployments/mainnet) and the Mezo docs. `protocol.test.ts` checks on-chain that every
 * address here has code, so a wrong or placeholder address cannot ship.
 */
export const MEZO_PROTOCOL = {
  borrowerOperations: '0x44b1bac67dDA612a41a58AAf779143B181dEe031',
  troveManager: '0x94AfB503dBca74aC3E4929BACEeDfCe19B93c193',
  hintHelpers: '0xD267b3bE2514375A075fd03C3D9CBa6b95317DC3',
  sortedTroves: '0x8C5DB4C62BF29c1C4564390d10c20a47E0b2749f',
  priceFeed: '0xc5aC5A8892230E0A3e1c473881A2de7353fFcA88',
  interestRateManager: '0x4a453700d157717Fe02fB62E7700ED7845048285',
  /** MUSD Savings Rate (sMUSD), a proxy; the implementation is 0xb33c3f97...9e87. */
  savingsVault: '0xb4D498029af77680cD1eF828b967f010d06C51CC',
} as const satisfies Record<string, `0x${string}`>;

export const borrowerOperationsAbi = parseAbi([
  'function withdrawMUSD(uint256 _amount, address _upperHint, address _lowerHint)',
  'function borrowingRate() view returns (uint256)',
  'function getBorrowingFee(uint256 _debt) view returns (uint256)',
  'function minNetDebt() view returns (uint256)',
]);

export const troveManagerAbi = parseAbi([
  'function getTroveStatus(address _borrower) view returns (uint8)',
  'function getEntireDebtAndColl(address _borrower) view returns (uint256 coll, uint256 principal, uint256 interest, uint256 pendingCollateral, uint256 pendingPrincipal, uint256 pendingInterest)',
  'function getCurrentICR(address _borrower, uint256 _price) view returns (uint256)',
  'function getTroveOwnersCount() view returns (uint256)',
  'function getTroveInterestRate(address _borrower) view returns (uint16)',
  'function checkRecoveryMode(uint256 _price) view returns (bool)',
  'function MCR() view returns (uint256)',
  'function MUSD_GAS_COMPENSATION() view returns (uint256)',
]);

export const hintHelpersAbi = parseAbi([
  'function getApproxHint(uint256 _CR, uint256 _numTrials, uint256 _inputRandomSeed) view returns (address hintAddress, uint256 diff, uint256 latestRandomSeed)',
  'function computeNominalCR(uint256 _coll, uint256 _debt) pure returns (uint256)',
]);

export const sortedTrovesAbi = parseAbi([
  'function findInsertPosition(uint256 _NICR, address _prevId, address _nextId) view returns (address, address)',
]);

export const priceFeedAbi = parseAbi(['function fetchPrice() view returns (uint256)']);

export const interestRateManagerAbi = parseAbi(['function interestRate() view returns (uint16)']);

/** The vault is a custom contract, not ERC-4626: deposits mint sMUSD 1:1 and yield is claimed separately. */
export const savingsVaultAbi = parseAbi([
  'function deposit(uint256 amount)',
  'function withdraw(uint256 amount)',
  'function claimYield() returns (uint256)',
  'function claimableYield(address) view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
  'function musdToken() view returns (address)',
]);

/** TroveManager.Status enum. */
export const TROVE_STATUS = {
  nonExistent: 0,
  active: 1,
  closedByOwner: 2,
  closedByLiquidation: 3,
  closedByRedemption: 4,
} as const;

/** Mezo links used for actions Netteo deliberately does not perform in-app. */
export const MEZO_LINKS = {
  borrowDocs: 'https://mezo.org/docs/users/borrow/mint-musd',
  borrowApp: 'https://mezo.org/borrow',
  savingsApp: 'https://mezo.org/earn/vaults',
  feesDocs: 'https://mezo.org/docs/users/borrow/fees',
} as const;
