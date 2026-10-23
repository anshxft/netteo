import { verifyMessage, getAddress, createPublicClient, http, type PublicClient } from 'viem';
import { mezoTestnet } from '../chain/config';
import { getServiceRoleClient, supabase } from '../db/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

let defaultClient: PublicClient | undefined;

function getVerificationClient(): PublicClient {
  if (!defaultClient) {
    defaultClient = createPublicClient({
      chain: mezoTestnet,
      transport: http(process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc.test.mezo.org'),
    });
  }
  return defaultClient;
}

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
 * Supports both standard EOA secp256k1 signatures and EIP-1271 smart contract signatures
 * (e.g. Mezo Safe DAO multi-sigs) via RPC verification.
 */
export async function verifyChallengeSignature(
  message: string,
  signature: `0x${string}`,
  expectedSigner: string,
  customClient?: PublicClient
): Promise<boolean> {
  try {
    const formattedAddress = getAddress(expectedSigner);

    // 1. Fast local ECDSA verification (zero network latency for EOAs)
    const isEoaValid = await verifyMessage({
      address: formattedAddress,
      message,
      signature,
    });
    if (isEoaValid) return true;

    // 2. Fallback to on-chain EIP-1271 isValidSignature query for Smart Contract Accounts (Safe multi-sigs)
    const client = customClient || getVerificationClient();
    return await client.verifyMessage({
      address: formattedAddress,
      message,
      signature,
    });
  } catch {
    return false;
  }
}

/**
 * Checks that the challenge timestamp is within the acceptable time window
 * and that the nonce has not been consumed previously (replay protection).
 * Persists consumed nonces to Supabase (`consumed_nonces` table) to maintain
 * cross-instance replay prevention across serverless cold starts.
 */
export async function validateAndConsumeNonce(
  nonce: string,
  timestamp: number,
  customDbClient?: SupabaseClient | null
): Promise<{ valid: boolean; reason?: string }> {
  if (!nonce || nonce.trim().length === 0) {
    return { valid: false, reason: 'Missing challenge nonce.' };
  }

  const now = Date.now();
  if (Math.abs(now - timestamp) > MAX_CHALLENGE_AGE_MS) {
    return { valid: false, reason: 'Challenge timestamp has expired or is invalid.' };
  }

  // 1. Fast local in-memory check (prevents replay within the same node instance)
  if (consumedNonces.has(nonce)) {
    return { valid: false, reason: 'Replay attack detected: challenge nonce has already been consumed.' };
  }

  // Consume in local memory cache
  consumedNonces.set(nonce, timestamp);

  // Periodic cleanup of expired nonces in local cache
  if (consumedNonces.size > 1000) {
    const expiryCutoff = now - MAX_CHALLENGE_AGE_MS;
    for (const [n, ts] of consumedNonces.entries()) {
      if (ts < expiryCutoff) {
        consumedNonces.delete(n);
      }
    }
  }

  // 2. Database persistence for cross-lambda serverless replay protection
  const dbClient = customDbClient !== undefined ? customDbClient : (getServiceRoleClient() || supabase);
  if (dbClient) {
    try {
      const { error } = await dbClient.from('consumed_nonces').insert({
        nonce,
        challenge_timestamp: timestamp,
        consumed_at: new Date().toISOString(),
      });

      if (error) {
        // Postgres unique violation (23505) or duplicate key error indicates nonce collision
        if (
          error.code === '23505' ||
          error.message?.includes('duplicate key') ||
          error.message?.includes('unique constraint') ||
          error.message?.includes('already exists')
        ) {
          return { valid: false, reason: 'Replay attack detected: challenge nonce has already been consumed.' };
        }
        // Non-blocking notice for unmigrated local DBs (Secure_Vibe_Coding.pdf Rule 04: log server-side only)
        console.warn('Database nonce persistence notice:', error.message);
      }
    } catch (err) {
      console.warn('Database nonce persistence fell back to in-memory store:', err);
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

