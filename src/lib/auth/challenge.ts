import { verifyMessage, getAddress } from 'viem';

export interface ObligationActionChallenge {
  action: 'accept' | 'dispute' | 'withdraw';
  obligationId: string;
  nonce: string;
  timestamp: number;
}

export interface ProposeObligationChallenge {
  action: 'propose';
  groupId: string;
  debtorAddress: string;
  creditorAddress: string;
  amountUnits: string;
  referenceLabel: string;
  nonce: string;
  timestamp: number;
}

export interface CreateGroupChallenge {
  action: 'create_group';
  name: string;
  description: string;
  participants: string[];
  nonce: string;
  timestamp: number;
}

// In-memory nonce cache with TTL to prevent signature replay attacks
const consumedNonces = new Map<string, number>();
const MAX_CHALLENGE_AGE_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Builds standard plain-text authorization message for obligation actions.
 */
export function buildObligationActionMessage(payload: ObligationActionChallenge): string {
  return [
    'Netteo Obligation Authorization',
    `Action: ${payload.action}`,
    `Obligation ID: ${payload.obligationId.toLowerCase()}`,
    `Nonce: ${payload.nonce}`,
    `Timestamp: ${payload.timestamp}`,
  ].join('\n');
}

/**
 * Builds standard plain-text authorization message for proposing a new obligation.
 */
export function buildProposeObligationMessage(payload: ProposeObligationChallenge): string {
  return [
    'Netteo Propose Obligation Authorization',
    `Group ID: ${payload.groupId.toLowerCase()}`,
    `Debtor: ${payload.debtorAddress.toLowerCase()}`,
    `Creditor: ${payload.creditorAddress.toLowerCase()}`,
    `Amount (Base Units): ${payload.amountUnits}`,
    `Reference: ${payload.referenceLabel}`,
    `Nonce: ${payload.nonce}`,
    `Timestamp: ${payload.timestamp}`,
  ].join('\n');
}

/**
 * Builds standard plain-text authorization message for creating a working group.
 */
export function buildCreateGroupMessage(payload: CreateGroupChallenge): string {
  const sortedParticipants = [...payload.participants]
    .map((p) => p.toLowerCase())
    .sort()
    .join(',');

  return [
    'Netteo Create Working Group Authorization',
    `Name: ${payload.name}`,
    `Description: ${payload.description}`,
    `Participants: ${sortedParticipants}`,
    `Nonce: ${payload.nonce}`,
    `Timestamp: ${payload.timestamp}`,
  ].join('\n');
}

/**
 * Verifies that the signature corresponds to the expected signer for the given message.
 */
export async function verifyChallengeSignature(
  message: string,
  signature: `0x${string}`,
  expectedSigner: string
): Promise<boolean> {
  try {
    const isValid = await verifyMessage({
      address: getAddress(expectedSigner),
      message,
      signature,
    });
    return isValid;
  } catch {
    return false;
  }
}

/**
 * Checks that the challenge timestamp is within the acceptable time window
 * and that the nonce has not been consumed previously (replay protection).
 */
export function validateAndConsumeNonce(nonce: string, timestamp: number): { valid: boolean; reason?: string } {
  if (!nonce || nonce.trim().length === 0) {
    return { valid: false, reason: 'Missing challenge nonce.' };
  }

  const now = Date.now();
  if (Math.abs(now - timestamp) > MAX_CHALLENGE_AGE_MS) {
    return { valid: false, reason: 'Challenge timestamp has expired or is invalid.' };
  }

  if (consumedNonces.has(nonce)) {
    return { valid: false, reason: 'Replay attack detected: challenge nonce has already been consumed.' };
  }

  // Consume nonce
  consumedNonces.set(nonce, timestamp);

  // Periodic cleanup of expired nonces
  if (consumedNonces.size > 1000) {
    const expiryCutoff = now - MAX_CHALLENGE_AGE_MS;
    for (const [n, ts] of consumedNonces.entries()) {
      if (ts < expiryCutoff) {
        consumedNonces.delete(n);
      }
    }
  }

  return { valid: true };
}

/**
 * Reset nonces cache (primarily used in tests).
 */
export function resetConsumedNonces(): void {
  consumedNonces.clear();
}
