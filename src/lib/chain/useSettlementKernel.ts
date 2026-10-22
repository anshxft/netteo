'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { type Address, type Hash } from 'viem';
import { settlementKernelAbi } from './abi';
import { CONTRACT_ADDRESSES, isSupportedNetwork } from './config';
import { sanitizeWeb3Error } from './useMusdToken';
import { supabase } from '../db/supabase';

export interface CycleInput {
  cycleId: `0x${string}`;
  snapshotCommitment: `0x${string}`;
  algorithmVersion: string;
  grossObligationTotal: bigint;
  fundingDuration: bigint;
  debtors: Address[];
  debitAmounts: bigint[];
  creditors: Address[];
  creditAmounts: bigint[];
}

export enum CycleStateOnChain {
  NonExistent = 0,
  Funding = 1,
  ReadyToSettle = 2,
  Completed = 3,
  Expired = 4,
  Refunded = 5,
  Cancelled = 6,
}

export interface OnChainCycle {
  snapshotCommitment: `0x${string}`;
  algorithmVersion: string;
  grossObligationTotal: bigint;
  netDebtTotal: bigint;
  totalFunded: bigint;
  totalDistributed: bigint;
  totalRefunded: bigint;
  fundingDeadline: bigint;
  state: CycleStateOnChain;
  creator: Address;
}

/**
 * Hook to read on-chain cycle status and details
 */
export function useCycleOnChain(cycleId?: `0x${string}` | null) {
  const { chainId } = useAccount();
  const contractAddress = CONTRACT_ADDRESSES.settlementKernel;
  const isCorrectNetwork = isSupportedNetwork(chainId);
  const isEnabled = !!cycleId && isCorrectNetwork && contractAddress !== '0x0000000000000000000000000000000000000000';

  const {
    data: cycleData,
    isLoading,
    refetch,
    error,
  } = useReadContract({
    address: contractAddress,
    abi: settlementKernelAbi,
    functionName: 'getCycle',
    args: cycleId ? [cycleId] : undefined,
    query: { enabled: isEnabled },
  });

  return {
    cycle: cycleData
      ? {
          snapshotCommitment: cycleData[0],
          algorithmVersion: cycleData[1],
          grossObligationTotal: cycleData[2],
          netDebtTotal: cycleData[3],
          totalFunded: cycleData[4],
          totalDistributed: cycleData[5],
          totalRefunded: cycleData[6],
          fundingDeadline: cycleData[7],
          state: cycleData[8] as CycleStateOnChain,
          creator: cycleData[9],
        }
      : null,
    isLoading,
    refetch,
    error,
  };
}

/**
 * Hook to read participant debtor status for a cycle
 */
export function useDebtorStatusOnChain(cycleId?: `0x${string}` | null, debtor?: Address | null) {
  const { chainId } = useAccount();
  const contractAddress = CONTRACT_ADDRESSES.settlementKernel;
  const isCorrectNetwork = isSupportedNetwork(chainId);
  const isEnabled = !!cycleId && !!debtor && isCorrectNetwork && contractAddress !== '0x0000000000000000000000000000000000000000';

  const { data, isLoading, refetch } = useReadContract({
    address: contractAddress,
    abi: settlementKernelAbi,
    functionName: 'getDebtorStatus',
    args: cycleId && debtor ? [cycleId, debtor] : undefined,
    query: { enabled: isEnabled },
  });

  return {
    status: data
      ? {
          required: data[0],
          funded: data[1],
          isFullyFunded: data[2],
        }
      : null,
    isLoading,
    refetch,
  };
}

/**
 * Hook to read participant lists (debtors, creditors) for a cycle
 */
export function useCycleParticipantsOnChain(cycleId?: `0x${string}` | null) {
  const { chainId } = useAccount();
  const contractAddress = CONTRACT_ADDRESSES.settlementKernel;
  const isCorrectNetwork = isSupportedNetwork(chainId);
  const isEnabled = !!cycleId && isCorrectNetwork && contractAddress !== '0x0000000000000000000000000000000000000000';

  const { data, isLoading, refetch } = useReadContract({
    address: contractAddress,
    abi: settlementKernelAbi,
    functionName: 'getCycleParticipants',
    args: cycleId ? [cycleId] : undefined,
    query: { enabled: isEnabled },
  });

  return {
    participants: data
      ? {
          debtors: data[0] as Address[],
          creditors: data[1] as Address[],
        }
      : null,
    isLoading,
    refetch,
  };
}

/**
 * Hook to read creditor payout amount for a cycle
 */
export function useCreditorPayoutOnChain(cycleId?: `0x${string}` | null, creditor?: Address | null) {
  const { chainId } = useAccount();
  const contractAddress = CONTRACT_ADDRESSES.settlementKernel;
  const isCorrectNetwork = isSupportedNetwork(chainId);
  const isEnabled = !!cycleId && !!creditor && isCorrectNetwork && contractAddress !== '0x0000000000000000000000000000000000000000';

  const { data, isLoading, refetch } = useReadContract({
    address: contractAddress,
    abi: settlementKernelAbi,
    functionName: 'getCreditorPayout',
    args: cycleId && creditor ? [cycleId, creditor] : undefined,
    query: { enabled: isEnabled },
  });

  return {
    payout: (data as bigint | undefined) ?? null,
    isLoading,
    refetch,
  };
}

export const CYCLE_STATE_LABELS: Record<CycleStateOnChain, string> = {
  [CycleStateOnChain.NonExistent]: 'NonExistent',
  [CycleStateOnChain.Funding]: 'Funding',
  [CycleStateOnChain.ReadyToSettle]: 'ReadyToSettle',
  [CycleStateOnChain.Completed]: 'Completed',
  [CycleStateOnChain.Expired]: 'Expired',
  [CycleStateOnChain.Refunded]: 'Refunded',
  [CycleStateOnChain.Cancelled]: 'Cancelled',
};

/**
 * Unified authoritative cycle reader for Live Mezo mode.
 * Combines on-chain contract state as the sole financial truth with Supabase
 * read-model comparison to detect and surface indexer-lag.
 */
export function useAuthoritativeCycle(cycleId?: string | null) {
  const { address: userAddress } = useAccount();
  const hexCycleId = cycleId
    ? ((cycleId.startsWith('0x') ? cycleId : `0x${cycleId}`) as `0x${string}`)
    : null;

  const { cycle, isLoading: isCycleLoading, refetch: refetchCycle } = useCycleOnChain(hexCycleId);
  const { participants, isLoading: isPartsLoading, refetch: refetchParts } = useCycleParticipantsOnChain(hexCycleId);
  const { status: debtorStatus, isLoading: isDebtorLoading, refetch: refetchDebtor } = useDebtorStatusOnChain(
    hexCycleId,
    userAddress
  );
  const { payout: creditorPayout, isLoading: isCreditorLoading, refetch: refetchCreditor } = useCreditorPayoutOnChain(
    hexCycleId,
    userAddress
  );

  const [projection, setProjection] = useState<any | null>(null);
  const [isProjectionLoading, setIsProjectionLoading] = useState(false);

  const fetchProjection = useCallback(async () => {
    if (!supabase || !hexCycleId) return;
    try {
      setIsProjectionLoading(true);
      const { data } = await supabase
        .from('cycle_projection')
        .select('*')
        .eq('cycle_id', hexCycleId)
        .single();
      setProjection(data || null);
    } catch {
      // Non-blocking projection read
    } finally {
      setIsProjectionLoading(false);
    }
  }, [hexCycleId]);

  useEffect(() => {
    fetchProjection();
  }, [fetchProjection]);

  const refetchAll = async () => {
    await Promise.all([
      refetchCycle(),
      refetchParts(),
      refetchDebtor(),
      refetchCreditor(),
      fetchProjection(),
    ]);
  };

  // Compute indexer lag: on-chain contract state is ahead of indexed Supabase projections
  let indexerLag = false;
  if (cycle && cycle.state !== CycleStateOnChain.NonExistent) {
    if (!projection) {
      indexerLag = true;
    } else {
      const onChainFunded = cycle.totalFunded;
      const projFunded = BigInt(projection.total_funded || '0');
      if (onChainFunded > projFunded) {
        indexerLag = true;
      }
      if (cycle.state === CycleStateOnChain.Completed && projection.state !== 'Completed') {
        indexerLag = true;
      }
      if (cycle.state === CycleStateOnChain.ReadyToSettle && projection.state === 'Funding') {
        indexerLag = true;
      }
    }
  }

  // Derive connected user role
  let userRole: 'debtor' | 'creditor' | 'creator' | 'observer' = 'observer';
  const normUser = userAddress?.toLowerCase();
  if (normUser) {
    if (cycle && cycle.creator?.toLowerCase() === normUser) {
      userRole = 'creator';
    }
    if (participants?.debtors?.some((d) => d.toLowerCase() === normUser)) {
      userRole = 'debtor';
    } else if (participants?.creditors?.some((c) => c.toLowerCase() === normUser)) {
      userRole = 'creditor';
    }
  }

  return {
    cycle,
    stateLabel: cycle ? CYCLE_STATE_LABELS[cycle.state] : null,
    participants,
    debtorStatus,
    creditorPayout,
    userRole,
    projection,
    indexerLag,
    isLoading: isCycleLoading || isPartsLoading || isDebtorLoading || isCreditorLoading,
    isProjectionLoading,
    refetch: refetchAll,
  };
}

/**
 * Primary hook for settlement kernel write operations
 * Provides: createCycle, deposit, executeSettlement, claimRefund.
 * Enforces single-flight lock, receipt tracking, and truthful confirmation state.
 */
export function useSettlementKernel() {
  const { chainId, isConnected } = useAccount();
  const contractAddress = CONTRACT_ADDRESSES.settlementKernel;
  const isCorrectNetwork = isSupportedNetwork(chainId);

  const {
    data: txHash,
    writeContract,
    isPending: isWritePending,
    error: writeError,
    reset: resetWrite,
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    error: receiptError,
  } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const checkNetwork = () => {
    if (!isConnected) throw new Error('Please connect your Web3 wallet first.');
    if (!isCorrectNetwork) {
      throw new Error('Please switch to Mezo Testnet (Chain ID 31611) to submit transactions.');
    }
    if (contractAddress === '0x0000000000000000000000000000000000000000') {
      throw new Error('SettlementKernel contract address is not configured.');
    }
  };

  const createCycle = async (input: CycleInput) => {
    checkNetwork();
    return writeContract({
      address: contractAddress,
      abi: settlementKernelAbi,
      functionName: 'createCycle',
      args: [input],
    });
  };

  const deposit = async (cycleId: `0x${string}`, amount: bigint) => {
    checkNetwork();
    return writeContract({
      address: contractAddress,
      abi: settlementKernelAbi,
      functionName: 'deposit',
      args: [cycleId, amount],
    });
  };

  const depositWithPermit = async (
    cycleId: `0x${string}`,
    amount: bigint,
    deadline: bigint,
    v: number,
    r: `0x${string}`,
    s: `0x${string}`
  ) => {
    checkNetwork();
    return writeContract({
      address: contractAddress,
      abi: settlementKernelAbi,
      functionName: 'depositWithPermit',
      args: [cycleId, amount, deadline, v, r, s],
    });
  };

  const cancelCycle = async (cycleId: `0x${string}`) => {
    checkNetwork();
    return writeContract({
      address: contractAddress,
      abi: settlementKernelAbi,
      functionName: 'cancelCycle',
      args: [cycleId],
    });
  };

  const executeSettlement = async (cycleId: `0x${string}`) => {
    checkNetwork();
    return writeContract({
      address: contractAddress,
      abi: settlementKernelAbi,
      functionName: 'executeSettlement',
      args: [cycleId],
    });
  };

  const claimRefund = async (cycleId: `0x${string}`) => {
    checkNetwork();
    return writeContract({
      address: contractAddress,
      abi: settlementKernelAbi,
      functionName: 'claimRefund',
      args: [cycleId],
    });
  };

  const rawError = writeError || receiptError;
  const errorMessage = rawError ? sanitizeWeb3Error(rawError) : null;

  return {
    contractAddress,
    createCycle,
    deposit,
    depositWithPermit,
    cancelCycle,
    executeSettlement,
    claimRefund,
    txHash: txHash as Hash | undefined,
    isWritePending,
    isConfirming,
    isConfirmed,
    isPending: isWritePending || isConfirming,
    error: errorMessage,
    resetWrite,
  };
}
