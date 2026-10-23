import assert from 'node:assert/strict';
import { privateKeyToAccount } from 'viem/accounts';
import {
  buildObligationActionMessage,
  buildProposeObligationMessage,
  buildCreateGroupMessage,
  verifyChallengeSignature,
  validateAndConsumeNonce,
  resetConsumedNonces,
} from './challenge';

// Standard deterministic test accounts
const DEBTOR_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const OUTSIDER_KEY = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d';
const PROPOSER_KEY = '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a';

const debtor = privateKeyToAccount(DEBTOR_KEY);
const outsider = privateKeyToAccount(OUTSIDER_KEY);
const proposer = privateKeyToAccount(PROPOSER_KEY);

async function runAuthTests() {
  console.log('Running Cryptographic Authentication & Permission Tests...\n');
  resetConsumedNonces();

  // Test 1: Legitimate debtor signs accept challenge
  {
    const obligationId = '00000000-0000-0000-0000-000000000011';
    const nonce = 'nonce-test-1-' + Date.now();
    const timestamp = Date.now();

    const challenge = buildObligationActionMessage({
      action: 'accept',
      obligationId,
      nonce,
      timestamp,
    });

    const sig = await debtor.signMessage({ message: challenge });
    const isValid = await verifyChallengeSignature(challenge, sig, debtor.address);
    assert.equal(isValid, true, 'Debtor signature should verify successfully');

    const nonceCheck = await validateAndConsumeNonce(nonce, timestamp);
    assert.equal(nonceCheck.valid, true, 'First nonce presentation should succeed');
    console.log('✔ Passed: Authorized debtor accepts obligation with valid signature and nonce');
  }

  // Test 2: Outsider wallet attempts to sign for debtor
  {
    const obligationId = '00000000-0000-0000-0000-000000000011';
    const nonce = 'nonce-test-2-' + Date.now();
    const timestamp = Date.now();

    const challenge = buildObligationActionMessage({
      action: 'accept',
      obligationId,
      nonce,
      timestamp,
    });

    // Outsider signs with their own private key
    const outsiderSig = await outsider.signMessage({ message: challenge });
    // Verifying against debtor's address must fail
    const isValidForDebtor = await verifyChallengeSignature(challenge, outsiderSig, debtor.address);
    assert.equal(isValidForDebtor, false, 'Outsider signature must not verify as debtor');
    console.log('✔ Passed: Outsider signature rejected when attempting to accept debtor obligation');
  }

  // Test 3: Replay attack prevention (consumed nonce reused)
  {
    const nonce = 'fixed-replay-nonce-' + Date.now();
    const timestamp = Date.now();

    const firstCheck = await validateAndConsumeNonce(nonce, timestamp);
    assert.equal(firstCheck.valid, true, 'Initial consumption should be valid');

    const secondCheck = await validateAndConsumeNonce(nonce, timestamp);
    assert.equal(secondCheck.valid, false, 'Replaying the same nonce must be rejected');
    assert.match(secondCheck.reason || '', /Replay attack detected/i);
    console.log('✔ Passed: Replay attack with duplicate nonce strictly rejected');
  }

  // Test 4: Expired challenge rejected (> 5 minutes old)
  {
    const expiredTimestamp = Date.now() - (6 * 60 * 1000); // 6 minutes ago
    const nonce = 'expired-nonce-' + Date.now();

    const check = await validateAndConsumeNonce(nonce, expiredTimestamp);
    assert.equal(check.valid, false, 'Expired challenge must be rejected');
    assert.match(check.reason || '', /expired/i);
    console.log('✔ Passed: Expired challenge (> 5 minutes) strictly rejected');
  }

  // Test 5: Tampered payload (altered obligation ID)
  {
    const originalObligationId = '00000000-0000-0000-0000-000000000011';
    const tamperedObligationId = '00000000-0000-0000-0000-000000000099';
    const nonce = 'nonce-tamper-' + Date.now();
    const timestamp = Date.now();

    const originalMsg = buildObligationActionMessage({
      action: 'accept',
      obligationId: originalObligationId,
      nonce,
      timestamp,
    });

    const sig = await debtor.signMessage({ message: originalMsg });

    const tamperedMsg = buildObligationActionMessage({
      action: 'accept',
      obligationId: tamperedObligationId,
      nonce,
      timestamp,
    });

    const isTamperedValid = await verifyChallengeSignature(tamperedMsg, sig, debtor.address);
    assert.equal(isTamperedValid, false, 'Signature over tampered obligation ID must fail');
    console.log('✔ Passed: Tampered obligation ID payload fails cryptographic verification');
  }

  // Test 6: Tampered proposal amount in integer base units
  {
    const nonce = 'nonce-prop-' + Date.now();
    const timestamp = Date.now();
    const validAmount = '100000000000000000000'; // 100 MUSD (18 decimals)
    const tamperedAmount = '200000000000000000000'; // 200 MUSD

    const proposalMsg = buildProposeObligationMessage({
      action: 'propose',
      groupId: '00000000-0000-0000-0000-000000000001',
      debtorAddress: debtor.address,
      creditorAddress: proposer.address,
      amountUnits: validAmount,
      referenceLabel: 'API dev work',
      nonce,
      timestamp,
    });

    const sig = await proposer.signMessage({ message: proposalMsg });

    const tamperedProposalMsg = buildProposeObligationMessage({
      action: 'propose',
      groupId: '00000000-0000-0000-0000-000000000001',
      debtorAddress: debtor.address,
      creditorAddress: proposer.address,
      amountUnits: tamperedAmount,
      referenceLabel: 'API dev work',
      nonce,
      timestamp,
    });

    const isTamperedAmountValid = await verifyChallengeSignature(tamperedProposalMsg, sig, proposer.address);
    assert.equal(isTamperedAmountValid, false, 'Signature over tampered amount must fail');
    console.log('✔ Passed: Tampered amount in base units fails cryptographic verification');
  }

  // Test 7: Group creation authorization challenge
  {
    const nonce = 'nonce-group-' + Date.now();
    const timestamp = Date.now();
    const groupMsg = buildCreateGroupMessage({
      action: 'create_group',
      name: 'DAO Audit Guild',
      description: 'Mutual audit obligations pod',
      participants: [debtor.address, proposer.address],
      nonce,
      timestamp,
    });

    const sig = await proposer.signMessage({ message: groupMsg });
    const isGroupValid = await verifyChallengeSignature(groupMsg, sig, proposer.address);
    assert.equal(isGroupValid, true, 'Valid group creator signature must verify');
    console.log('✔ Passed: Group creation authorization message verified successfully');
  }

  // Test 8: Serverless cross-lambda replay attack prevention via DB collision
  {
    const nonce = 'db-cross-lambda-nonce-' + Date.now();
    const timestamp = Date.now();

    // Mock client simulating a separate serverless lambda encountering a database collision (Postgres code 23505)
    const mockDb = {
      from: (table: string) => ({
        insert: async (data: any) => {
          assert.equal(table, 'consumed_nonces');
          return { error: { code: '23505', message: 'duplicate key value violates unique constraint' } };
        },
      }),
    };

    // Reset local memory to simulate a brand-new cold-started serverless container
    resetConsumedNonces();

    const crossLambdaCheck = await validateAndConsumeNonce(nonce, timestamp, mockDb as any);
    assert.equal(crossLambdaCheck.valid, false, 'Database collision across lambdas must reject replay');
    assert.match(crossLambdaCheck.reason || '', /Replay attack detected/i);
    console.log('✔ Passed: Cross-lambda serverless replay detected via DB collision & strictly rejected');
  }

  console.log('\nAll 8 Cryptographic Authorization Tests Passed Successfully!');
}

runAuthTests().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
