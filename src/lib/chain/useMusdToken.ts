'use client';

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { erc20Abi, type Address } from 'viem';
import { CONTRACT_ADDRESSES, isSupportedNetwork } from './config';

export interface UseMusdTokenOptions {
  spenderAddress?: Address;
}

/**
 * Clean human-readable error messages for Web3 errors (Secure_Vibe_Coding.pdf Rule 04)
 */
export function sanitizeWeb3Error(err: unknown): string {
  if (!err) return 'An unexpected error occurred.';
  const msg = err instanceof Error ? err.message : String(err);

  if (msg.includes('User rejected') || msg.includes('user rejected')) {
    return 'Transaction was cancelled in your wallet.';
  }
  if (msg.includes('insufficient funds')) {
    return 'Insufficient BTC funds for gas fees on Mezo Testnet.';
  }
  if (msg.includes('transfer amount exceeds balance')) {
    return 'Insufficient MUSD balance.';
  }
  if (msg.includes('transfer amount exceeds allowance')) {
    return 'MUSD allowance not approved.';
  }
  return 'Transaction failed. Please check your wallet and try again.';
}

/**
 * Hook for interacting with the MUSD ERC-20 contract.
 * Provides reads: balanceOf, allowance, decimals.
 * Provides writes: approve (with double-click protection and receipt tracking).
 */
export function useMusdToken(options?: UseMusdTokenOptions) {
  const { address, chainId, isConnected } = useAccount();
  const tokenAddress = CONTRACT_ADDRESSES.musd;
  const spender = options?.spenderAddress || CONTRACT_ADDRESSES.settlementKernel;
  const isCorrectNetwork = isSupportedNetwork(chainId);

  // Read: Balance
  const {
    data: balance,
    isLoading: isBalanceLoading,
    refetch: refetchBalance,
  } = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: isConnected && !!address && isCorrectNetwork && tokenAddress !== '0x0000000000000000000000000000000000000000',
    },
  });

  // Read: Allowance
  const {
    data: allowance,
    isLoading: isAllowanceLoading,
    refetch: refetchAllowance,
  } = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'allowance',
    args: address && spender ? [address, spender] : undefined,
    query: {
      enabled: isConnected && !!address && isCorrectNetwork && tokenAddress !== '0x0000000000000000000000000000000000000000',
    },
  });

  // Read: Decimals
  const { data: decimals } = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'decimals',
    query: {
      enabled: isCorrectNetwork && tokenAddress !== '0x0000000000000000000000000000000000000000',
    },
  });

  // Write: Approve
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

  const approve = async (spenderAddress: Address, amount: bigint) => {
    if (!isCorrectNetwork) {
      throw new Error('Please switch to Mezo Testnet (Chain ID 31611) to approve tokens.');
    }
    return writeContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: 'approve',
      args: [spenderAddress, amount],
    });
  };

  const rawError = writeError || receiptError;
  const errorMessage = rawError ? sanitizeWeb3Error(rawError) : null;

  return {
    tokenAddress,
    balance: balance ?? 0n,
    allowance: allowance ?? 0n,
    decimals: decimals ?? 18,
    isBalanceLoading,
    isAllowanceLoading,
    refetchBalance,
    refetchAllowance,
    approve,
    txHash,
    isWritePending,
    isConfirming,
    isConfirmed,
    isPending: isWritePending || isConfirming,
    error: errorMessage,
    resetWrite,
  };
}
