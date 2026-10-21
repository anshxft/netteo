/**
 * Netteo Deterministic Obligation Netting Algorithm (Version 1.0)
 *
 * Rules (from PrD.md §8 and architecture.md §4.5):
 * 1. Integer token units only (bigint base units, e.g. 18 decimals). Floating-point is strictly prohibited.
 * 2. Invariants enforced:
 *    - Sum of all net positions equals zero: Σ net = 0
 *    - Total net debtor balance equals total net creditor balance: Σ debits = Σ credits
 *    - No participant pays more than their net debit or receives more than their net credit.
 * 3. Deterministic allocation:
 *    - Sorted debtor-to-creditor greedy pairing using stable address ordering.
 *    - Reproducible and verifiable off-chain and on-chain.
 */

import { keccak256, encodeAbiParameters, parseAbiParameters, stringToBytes } from 'viem';

export interface NettingContext {
  chainId?: number;
  tokenAddress?: string;
}

export interface ObligationInput {
  id: string;
  debtor: string;
  creditor: string;
  amount: bigint; // Integer units (smallest base unit, e.g., wei/MUSD base unit)
  referenceLabel?: string;
}

export interface ParticipantPosition {
  address: string;
  grossPayable: bigint;   // Total owed by this participant
  grossReceivable: bigint;// Total owed to this participant
  netPosition: bigint;    // Positive = Creditor, Negative = Debtor, Zero = Even
}

export interface AllocationTransfer {
  from: string; // Debtor address
  to: string;   // Creditor address
  amount: bigint;
}

export interface NettingResult {
  algorithmVersion: string;
  participantCount: number;
  obligationCount: number;
  grossObligationTotal: bigint;
  netFundingRequirement: bigint; // Total sum of required debtor deposits (= total creditor payouts)
  positions: Record<string, ParticipantPosition>;
  creditors: { address: string; amount: bigint }[];
  debtors: { address: string; amount: bigint }[];
  zeroPositions: string[];
  allocations: AllocationTransfer[];
  canonicalCommitmentHash: `0x${string}`; // Canonical keccak256 cryptographic commitment
}

export const NETTING_ALGORITHM_VERSION = 'netteo-v1.0-deterministic';
export const MAX_PARTICIPANTS_PER_CYCLE = 10;
export const MAX_OBLIGATIONS_PER_CYCLE = 30;

/**
 * Standardize an Ethereum address to lowercase for indexing/mapping.
 */
export function normalizeAddress(addr: string): string {
  if (!addr || !/^0x[a-fA-F0-9]{40}$/.test(addr)) {
    throw new Error(`Invalid Ethereum address: "${addr}"`);
  }
  return addr.toLowerCase();
}

/**
 * Calculate deterministic net positions and allocations from an approved obligation set.
 */
export function calculateNetting(
  obligations: ObligationInput[],
  maxParticipants = MAX_PARTICIPANTS_PER_CYCLE,
  maxObligations = MAX_OBLIGATIONS_PER_CYCLE,
  context?: NettingContext
): NettingResult {
  if (!obligations || obligations.length === 0) {
    throw new Error('Cannot run netting on empty obligation set.');
  }

  if (obligations.length > maxObligations) {
    throw new Error(`Obligation count exceeds cycle limit of ${maxObligations} (received ${obligations.length}).`);
  }

  const seenIds = new Set<string>();
  const participants = new Set<string>();
  let grossTotal = 0n;

  // Track gross ins and outs per participant
  const grossPayable: Record<string, bigint> = {};
  const grossReceivable: Record<string, bigint> = {};

  for (const ob of obligations) {
    if (!ob.id || seenIds.has(ob.id)) {
      throw new Error(`Duplicate or missing obligation ID: ${ob.id}`);
    }
    seenIds.add(ob.id);

    const debtor = normalizeAddress(ob.debtor);
    const creditor = normalizeAddress(ob.creditor);

    if (debtor === creditor) {
      throw new Error(`Self-obligation rejected for ${debtor}: debtor and creditor must be distinct.`);
    }

    if (typeof ob.amount !== 'bigint' || ob.amount <= 0n) {
      throw new Error(`Obligation amount must be a positive integer bigint. Received: ${ob.amount}`);
    }

    participants.add(debtor);
    participants.add(creditor);

    grossTotal += ob.amount;
    grossPayable[debtor] = (grossPayable[debtor] || 0n) + ob.amount;
    grossReceivable[creditor] = (grossReceivable[creditor] || 0n) + ob.amount;
  }

  if (participants.size > maxParticipants) {
    throw new Error(`Participant count exceeds cycle limit of ${maxParticipants} (found ${participants.size}).`);
  }

  const positions: Record<string, ParticipantPosition> = {};
  let totalNetPositions = 0n;
  let totalDebits = 0n;
  let totalCredits = 0n;

  const creditors: { address: string; amount: bigint }[] = [];
  const debtors: { address: string; amount: bigint }[] = [];
  const zeroPositions: string[] = [];

  // Sort participant addresses alphabetically for deterministic order
  const sortedParticipants = Array.from(participants).sort();

  for (const addr of sortedParticipants) {
    const payable = grossPayable[addr] || 0n;
    const receivable = grossReceivable[addr] || 0n;
    const net = receivable - payable;

    positions[addr] = {
      address: addr,
      grossPayable: payable,
      grossReceivable: receivable,
      netPosition: net,
    };

    totalNetPositions += net;

    if (net > 0n) {
      creditors.push({ address: addr, amount: net });
      totalCredits += net;
    } else if (net < 0n) {
      const debitAmount = -net;
      debtors.push({ address: addr, amount: debitAmount });
      totalDebits += debitAmount;
    } else {
      zeroPositions.push(addr);
    }
  }

  // Enforce zero-sum invariant
  if (totalNetPositions !== 0n) {
    throw new Error(`Settlement invariant failed: sum of net positions must be 0, got ${totalNetPositions}`);
  }

  if (totalDebits !== totalCredits) {
    throw new Error(
      `Settlement invariant failed: total debits (${totalDebits}) must equal total credits (${totalCredits})`
    );
  }

  // Deterministic Greedy Debtor-to-Creditor matching
  // Sort debtors and creditors descending by amount, tie-break by address
  const sortedDebtors = [...debtors].sort((a, b) =>
    b.amount === a.amount ? a.address.localeCompare(b.address) : b.amount > a.amount ? 1 : -1
  );
  const sortedCreditors = [...creditors].sort((a, b) =>
    b.amount === a.amount ? a.address.localeCompare(b.address) : b.amount > a.amount ? 1 : -1
  );

  const allocations: AllocationTransfer[] = [];
  let dIdx = 0;
  let cIdx = 0;

  // Work with mutable copies of remaining amounts
  const remainingDebtor = sortedDebtors.map((d) => ({ ...d }));
  const remainingCreditor = sortedCreditors.map((c) => ({ ...c }));

  while (dIdx < remainingDebtor.length && cIdx < remainingCreditor.length) {
    const curDebtor = remainingDebtor[dIdx];
    const curCreditor = remainingCreditor[cIdx];

    const matchAmount = curDebtor.amount < curCreditor.amount ? curDebtor.amount : curCreditor.amount;

    if (matchAmount > 0n) {
      allocations.push({
        from: curDebtor.address,
        to: curCreditor.address,
        amount: matchAmount,
      });

      curDebtor.amount -= matchAmount;
      curCreditor.amount -= matchAmount;
    }

    if (curDebtor.amount === 0n) dIdx++;
    if (curCreditor.amount === 0n) cIdx++;
  }

  // Verify all allocations sum to total debits
  const allocationSum = allocations.reduce((acc, a) => acc + a.amount, 0n);
  if (allocationSum !== totalDebits) {
    throw new Error(
      `Allocation invariant failed: allocations sum (${allocationSum}) does not equal total requirement (${totalDebits})`
    );
  }

  // Compute canonical deterministic keccak256 commitment hash
  const canonicalCommitmentHash = computeCanonicalCommitment(
    obligations,
    positions,
    sortedParticipants,
    allocations,
    context
  );

  return {
    algorithmVersion: NETTING_ALGORITHM_VERSION,
    participantCount: sortedParticipants.length,
    obligationCount: obligations.length,
    grossObligationTotal: grossTotal,
    netFundingRequirement: totalDebits,
    positions,
    creditors: sortedCreditors,
    debtors: sortedDebtors,
    zeroPositions,
    allocations,
    canonicalCommitmentHash,
  };
}

/**
 * Compute an immutable, cryptographic keccak256 commitment of the cycle snapshot.
 * Binds:
 * - Chain ID (uint256)
 * - Token address (address)
 * - Algorithm version (string)
 * - Canonical sorted obligations hash (bytes32)
 * - Canonical sorted net positions hash (bytes32)
 * - Canonical sorted allocations hash (bytes32)
 *
 * Guarantees: Order-independent, amount-sensitive, chain/token-sensitive.
 */
export function computeCanonicalCommitment(
  obligations: ObligationInput[],
  positions: Record<string, ParticipantPosition>,
  sortedParticipants: string[],
  allocations: AllocationTransfer[],
  context?: NettingContext
): `0x${string}` {
  const chainId = BigInt(context?.chainId ?? 31611);
  const token = (context?.tokenAddress && /^0x[a-fA-F0-9]{40}$/.test(context.tokenAddress))
    ? (context.tokenAddress.toLowerCase() as `0x${string}`)
    : ('0x0000000000000000000000000000000000000000' as `0x${string}`);

  // 1. Canonical sorted obligations (order-independent)
  const canonicalObligationEntries = [...obligations]
    .map((o) => `${o.id}:${normalizeAddress(o.debtor)}:${normalizeAddress(o.creditor)}:${o.amount.toString()}`)
    .sort();
  const obligationsPayload = canonicalObligationEntries.join('|');
  const obligationsHash = keccak256(stringToBytes(obligationsPayload));

  // 2. Canonical positions in sorted participant order
  const canonicalPositions = sortedParticipants
    .map((addr) => `${addr}:${positions[addr].grossPayable.toString()}:${positions[addr].grossReceivable.toString()}:${positions[addr].netPosition.toString()}`)
    .join('|');
  const positionsHash = keccak256(stringToBytes(canonicalPositions));

  // 3. Canonical allocations (sorted by from, to, amount)
  const canonicalAllocations = allocations
    .map((a) => `${normalizeAddress(a.from)}:${normalizeAddress(a.to)}:${a.amount.toString()}`)
    .sort()
    .join('|');
  const allocationsHash = keccak256(stringToBytes(canonicalAllocations));

  // 4. Root keccak256 commitment binding chainId, token, version, and the component hashes
  return keccak256(
    encodeAbiParameters(
      parseAbiParameters('uint256, address, string, bytes32, bytes32, bytes32'),
      [
        chainId,
        token,
        NETTING_ALGORITHM_VERSION,
        obligationsHash,
        positionsHash,
        allocationsHash,
      ]
    )
  );
}
