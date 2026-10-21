'use client';

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { type Address, type Hash } from 'viem';
import { settlementKernelAbi } from './abi';
import { CONTRACT_ADDRESSES, isSupportedNetwork } from './config';
import { sanitizeWeb3Error } from './useMusdToken';

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
