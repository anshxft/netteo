'use client';

import { useEffect, useRef } from 'react';
import { createPublicClient, webSocket, type Address } from 'viem';
import { mezoMainnet, kernelForToken, MEZO_MAINNET_WSS_RPC_URL } from './config';
import { mezoTransport } from './transport';
import { settlementKernelAbi } from './abi';

export interface SettlementEventsCallbacks {
  onDepositReceived?: (data: {
    cycleId: `0x${string}`;
    debtor: Address;
    amount: bigint;
    totalDebtorFunded: bigint;
    totalCycleFunded: bigint;
  }) => void;
  onCycleReadyToSettle?: (data: { cycleId: `0x${string}`; totalFunded: bigint }) => void;
  onCycleSettled?: (data: {
    cycleId: `0x${string}`;
    totalDistributed: bigint;
    creditorCount: bigint;
    timestamp: bigint;
  }) => void;
  onCycleExpired?: (data: { cycleId: `0x${string}`; totalFunded: bigint; timestamp: bigint }) => void;
  onCycleCancelled?: (data: {
    cycleId: `0x${string}`;
    creator: Address;
    timestamp: bigint;
  }) => void;
  onRefundClaimed?: (data: {
    cycleId: `0x${string}`;
    participant: Address;
    amount: bigint;
    timestamp: bigint;
  }) => void;
}

/**
 * Reactive WebSocket event subscription for SettlementKernel events on Mezo Mainnet.
 * Capitalizes on CometBFT single-block finality (~1-2s blocks) for instant UI updates.
 * Automatically falls back to HTTP transport if WebSocket connection fails.
 */
export function useSettlementEvents(
  targetCycleId?: string | null,
  callbacks?: SettlementEventsCallbacks,
  /** Token whose kernel to watch. Each token has its own kernel, so this selects the contract. */
  tokenAddress?: string | null
) {
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  useEffect(() => {
    const kernelAddress = kernelForToken(tokenAddress);
    // No kernel for this token (undeployed, or not resolved yet): watch nothing rather than a default.
    if (!kernelAddress) {
      return;
    }

    const wssUrl = MEZO_MAINNET_WSS_RPC_URL;

    let client: ReturnType<typeof createPublicClient>;
    try {
      client = createPublicClient({
        chain: mezoMainnet,
        transport: typeof window !== 'undefined' && 'WebSocket' in window
          ? webSocket(wssUrl, { timeout: 10_000 })
          : mezoTransport(),
      });
    } catch {
      client = createPublicClient({
        chain: mezoMainnet,
        transport: mezoTransport(),
      });
    }

    const unwatch = client.watchContractEvent({
      address: kernelAddress as Address,
      abi: settlementKernelAbi,
      onLogs: (logs) => {
        for (const log of logs) {
          const args = (log as any).args;
          if (!args) continue;

          // If a targetCycleId is specified, filter logs to only that cycle
          if (targetCycleId && args.cycleId) {
            if (String(args.cycleId).toLowerCase() !== String(targetCycleId).toLowerCase()) {
              continue;
            }
          }

          const eventName = (log as any).eventName;
          const cb = callbacksRef.current;
          if (!cb) continue;

          if (eventName === 'DepositReceived' && cb.onDepositReceived) {
            cb.onDepositReceived({
              cycleId: args.cycleId,
              debtor: args.debtor,
              amount: args.amount,
              totalDebtorFunded: args.totalDebtorFunded,
              totalCycleFunded: args.totalCycleFunded,
            });
          } else if (eventName === 'CycleReadyToSettle' && cb.onCycleReadyToSettle) {
            cb.onCycleReadyToSettle({
              cycleId: args.cycleId,
              totalFunded: args.totalFunded,
            });
          } else if (eventName === 'CycleSettled' && cb.onCycleSettled) {
            cb.onCycleSettled({
              cycleId: args.cycleId,
              totalDistributed: args.totalDistributed,
              creditorCount: args.creditorCount,
              timestamp: args.timestamp,
            });
          } else if (eventName === 'CycleExpired' && cb.onCycleExpired) {
            cb.onCycleExpired({
              cycleId: args.cycleId,
              totalFunded: args.totalFunded,
              timestamp: args.timestamp,
            });
          } else if (eventName === 'CycleCancelled' && cb.onCycleCancelled) {
            cb.onCycleCancelled({
              cycleId: args.cycleId,
              creator: args.creator,
              timestamp: args.timestamp,
            });
          } else if (eventName === 'RefundClaimed' && cb.onRefundClaimed) {
            cb.onRefundClaimed({
              cycleId: args.cycleId,
              participant: args.participant,
              amount: args.amount,
              timestamp: args.timestamp,
            });
          }
        }
      },
      onError: (err) => {
        // Silently log warning on RPC websocket drop; client polling continues
        console.warn('[Mezo WebSocket] Event watch warning:', err.message || err);
      },
    });

    return () => {
      try {
        unwatch();
      } catch {
        // Cleanup guard
      }
    };
  }, [targetCycleId, tokenAddress]);
}
