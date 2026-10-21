import assert from 'node:assert';
import { calculateNetting, ObligationInput } from './netting';

function runTests() {
  console.log('Running Netting Algorithm Test Suite...');

  // 1. PRD Canonical 3-Participant Example (PrD.md §2)
  const addrA = '0x1111111111111111111111111111111111111111';
  const addrB = '0x2222222222222222222222222222222222222222';
  const addrC = '0x3333333333333333333333333333333333333333';

  // 100 MUSD = 100 * 10^18
  const base = 10n ** 18n;
  const canonicalObligations: ObligationInput[] = [
    { id: 'ob-1', debtor: addrA, creditor: addrB, amount: 100n * base, referenceLabel: 'Design services' },
    { id: 'ob-2', debtor: addrB, creditor: addrC, amount: 80n * base, referenceLabel: 'Infra reimbursement' },
    { id: 'ob-3', debtor: addrC, creditor: addrA, amount: 20n * base, referenceLabel: 'Shared API costs' },
  ];

  const result = calculateNetting(canonicalObligations);

  // Assert counts and totals
  assert.strictEqual(result.participantCount, 3, 'Participant count must be 3');
  assert.strictEqual(result.obligationCount, 3, 'Obligation count must be 3');
  assert.strictEqual(result.grossObligationTotal, 200n * base, 'Gross total must be 200 MUSD');
  assert.strictEqual(result.netFundingRequirement, 80n * base, 'Net funding requirement must be 80 MUSD');

  // Assert individual net positions
  assert.strictEqual(result.positions[addrA].netPosition, -80n * base, 'A must owe 80 MUSD net');
  assert.strictEqual(result.positions[addrB].netPosition, 20n * base, 'B must be owed 20 MUSD net');
  assert.strictEqual(result.positions[addrC].netPosition, 60n * base, 'C must be owed 60 MUSD net');

  // Assert allocations
  assert.strictEqual(result.allocations.length, 2, 'Allocations must be reduced to 2 transfers');
  const transferToB = result.allocations.find((a) => a.to === addrB);
  const transferToC = result.allocations.find((a) => a.to === addrC);

  assert.ok(transferToB, 'Transfer to B must exist');
  assert.strictEqual(transferToB?.amount, 20n * base, 'B must receive 20 MUSD from A');
  assert.strictEqual(transferToB?.from, addrA, 'B must receive from A');

  assert.ok(transferToC, 'Transfer to C must exist');
  assert.strictEqual(transferToC?.amount, 60n * base, 'C must receive 60 MUSD from A');
  assert.strictEqual(transferToC?.from, addrA, 'C must receive from A');

  console.log('✔ Passed: PRD canonical 3-participant netting example');

  // 2. Circular Debt with Zero-Net Participants
  const addrD = '0x4444444444444444444444444444444444444444';
  const circularObligations: ObligationInput[] = [
    { id: 'c-1', debtor: addrA, creditor: addrB, amount: 50n * base },
    { id: 'c-2', debtor: addrB, creditor: addrC, amount: 50n * base },
    { id: 'c-3', debtor: addrC, creditor: addrD, amount: 50n * base },
    { id: 'c-4', debtor: addrD, creditor: addrA, amount: 50n * base },
  ];

  const circResult = calculateNetting(circularObligations);
  assert.strictEqual(circResult.netFundingRequirement, 0n, 'Net funding requirement must be 0 for circular debt');
  assert.strictEqual(circResult.creditors.length, 0, 'No creditors in balanced circle');
  assert.strictEqual(circResult.debtors.length, 0, 'No debtors in balanced circle');
  assert.strictEqual(circResult.zeroPositions.length, 4, 'All 4 participants must be zero-net');
  assert.strictEqual(circResult.allocations.length, 0, 'Zero allocations needed');

  console.log('✔ Passed: 4-participant circular debt resolves to 0 net transfers');

  // 3. Error handling: Self-obligation
  assert.throws(() => {
    calculateNetting([{ id: 'err-1', debtor: addrA, creditor: addrA, amount: 10n * base }]);
  }, /Self-obligation rejected/);
  console.log('✔ Passed: Self-obligation rejection');

  // 4. Error handling: Non-positive or zero amount
  assert.throws(() => {
    calculateNetting([{ id: 'err-2', debtor: addrA, creditor: addrB, amount: 0n }]);
  }, /Obligation amount must be a positive/);
  console.log('✔ Passed: Zero-value obligation rejection');

  // 5. Error handling: Duplicate obligation ID
  assert.throws(() => {
    calculateNetting([
      { id: 'dup-1', debtor: addrA, creditor: addrB, amount: 10n * base },
      { id: 'dup-1', debtor: addrB, creditor: addrC, amount: 20n * base },
    ]);
  }, /Duplicate or missing obligation ID/);
  console.log('✔ Passed: Duplicate ID rejection');

  // 6. Error handling: Exceeds participant cap
  const manyObligations: ObligationInput[] = [];
  for (let i = 0; i < 11; i++) {
    const pad = i.toString().padStart(2, '0');
    const d = `0x${pad}00000000000000000000000000000000000001`;
    const c = `0x${pad}00000000000000000000000000000000000002`;
    manyObligations.push({ id: `ob-${i}`, debtor: d, creditor: c, amount: 10n * base });
  }
  assert.throws(() => {
    calculateNetting(manyObligations, 10, 30);
  }, /Participant count exceeds cycle limit/);
  // 7. Cryptographic Keccak256 Commitment Invariants
  const ob1: ObligationInput = { id: 'ob-1', debtor: addrA, creditor: addrB, amount: 100n * base };
  const ob2: ObligationInput = { id: 'ob-2', debtor: addrB, creditor: addrC, amount: 80n * base };
  const ob3: ObligationInput = { id: 'ob-3', debtor: addrC, creditor: addrA, amount: 20n * base };

  // 7a. Order Independence: Shuffled input order must produce identical commitment hash
  const resOrderA = calculateNetting([ob1, ob2, ob3]);
  const resOrderB = calculateNetting([ob3, ob1, ob2]);
  const resOrderC = calculateNetting([ob2, ob3, ob1]);
  assert.strictEqual(resOrderA.canonicalCommitmentHash, resOrderB.canonicalCommitmentHash, 'Commitment must be order independent (A vs B)');
  assert.strictEqual(resOrderA.canonicalCommitmentHash, resOrderC.canonicalCommitmentHash, 'Commitment must be order independent (A vs C)');
  assert.ok(resOrderA.canonicalCommitmentHash.startsWith('0x'), 'Commitment must be 0x-prefixed hex');
  assert.strictEqual(resOrderA.canonicalCommitmentHash.length, 66, 'Commitment must be 32 bytes (66 hex characters)');
  console.log('✔ Passed: Commitment order independence (shuffled arrays match)');

  // 7b. Amount Sensitivity: 1 wei change produces completely distinct commitment
  const resAmountDiff = calculateNetting([{ ...ob1, amount: ob1.amount + 1n }, ob2, ob3]);
  assert.notStrictEqual(resOrderA.canonicalCommitmentHash, resAmountDiff.canonicalCommitmentHash, 'Commitment must change with amount');
  console.log('✔ Passed: Commitment amount sensitivity (1 wei delta alters hash)');

  // 7c. Chain ID Sensitivity: Different chain IDs produce distinct commitments
  const resChainDiff = calculateNetting([ob1, ob2, ob3], 10, 30, { chainId: 1 });
  assert.notStrictEqual(resOrderA.canonicalCommitmentHash, resChainDiff.canonicalCommitmentHash, 'Commitment must change with chain ID');
  console.log('✔ Passed: Commitment chain ID sensitivity');

  // 7d. Token Address Sensitivity: Different token addresses produce distinct commitments
  const resTokenDiff = calculateNetting([ob1, ob2, ob3], 10, 30, { tokenAddress: '0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503' });
  assert.notStrictEqual(resOrderA.canonicalCommitmentHash, resTokenDiff.canonicalCommitmentHash, 'Commitment must change with token address');
  console.log('✔ Passed: Commitment token address sensitivity');

  console.log('All Netting Tests Passed Successfully!');
}

runTests();

