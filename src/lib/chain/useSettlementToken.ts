'use client';

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { erc20Abi, type Address } from 'viem';
import {
  MEZO_MAINNET_CHAIN_ID,
  MEZO_MAINNET_MUSD,
  isDeployed,
  isSupportedNetwork,
  kernelForToken,
} from './config';
import { getTokenByAddress, isSupportedSettlementToken } from './tokens';
import { settlementKernelAbi } from './abi';

/**
 * Human-readable error messages for Web3 errors (Secure_Vibe_Coding.pdf Rule 04:
 * never leak internal paths, schema or stack traces to the user).
 */
export function sanitizeWeb3Error(err: unknown, tokenSymbol = 'tokens'): string {
  if (!err) return 'An unexpected error occurred.';
  const msg = err instanceof Error ? err.message : String(err);

  if (msg.includes('User rejected') || msg.includes('user rejected')) {
    return 'Transaction was cancelled in your wallet.';
  }
  if (msg.includes('insufficient funds')) {
    return 'Insufficient BTC for gas fees on Mezo Mainnet.';
  }
  if (msg.includes('transfer amount exceeds balance')) {
    return `Insufficient ${tokenSymbol} balance.`;
  }
  if (msg.includes('transfer amount exceeds allowance')) {
    return `${tokenSymbol} allowance not approved.`;
  }
  if (msg.includes('ExcessiveDeposit')) {
    return 'That deposit is larger than the amount still due for this cycle.';
  }
  if (msg.includes('FundingDeadlineExpired')) {
    return 'The funding window for this cycle has closed.';
  }
  return 'Transaction failed. Please check your wallet and try again.';
}

export interface UseSettlementTokenOptions {
  /** Defaults to the token's own kernel. Only that kernel may be approved. */
  spenderAddress?: Address;
}

/**
 * Reads and approvals for any token in Netteo's verified Mezo registry.
 *
 * Decimals come from the registry rather than an RPC read: `tokens.test.ts`
 * verifies every entry's decimals against the chain, so there is no runtime
 * round trip and no `?? 18` default that could mis-size a 6-decimal token.
 */
export function useSettlementToken(
  tokenAddress?: string | null,
  options?: UseSettlementTokenOptions
) {
  const { address, chainId, isConnected } = useAccount();

  const token = getTokenByAddress(tokenAddress ?? MEZO_MAINNET_MUSD);
  const resolvedToken = token?.address;
  const kernel = kernelForToken(resolvedToken);
  const spender = options?.spenderAddress || kernel || undefined;
  const isCorrectNetwork = isSupportedNetwork(chainId);

  // The kernel's token binding is immutable on-chain. Config says which kernel to
  // use; only this read proves the kernel actually holds the token we think it does.
  const { data: kernelToken, isLoading: isVerifyingKernel } = useReadContract({
    address: kernel ?? undefined,
    abi: settlementKernelAbi,
    functionName: 'musdToken',
    chainId: MEZO_MAINNET_CHAIN_ID,
    query: { enabled: isCorrectNetwork && isDeployed(kernel), staleTime: Infinity },
  });

  const isKernelVerified =
    !!kernel && !!resolvedToken && kernelToken?.toLowerCase() === resolvedToken.toLowerCase();

  const canRead = isConnected && !!address && isCorrectNetwork && !!resolvedToken;

  const {
    data: balance,
    isLoading: isBalanceLoading,
    refetch: refetchBalance,
  } = useReadContract({
    address: resolvedToken,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: canRead },
  });

  const {
    data: allowance,
    isLoading: isAllowanceLoading,
    refetch: refetchAllowance,
  } = useReadContract({
    address: resolvedToken,
    abi: erc20Abi,
    functionName: 'allowance',
    args: address && spender ? [address, spender] : undefined,
    query: { enabled: canRead && !!spender },
  });

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
  } = useWaitForTransactionReceipt({ hash: txHash });

  const approve = async (spenderAddress: Address, amount: bigint) => {
    if (!isConnected) throw new Error('Connect your wallet before approving a settlement token.');
    if (!isCorrectNetwork) {
      throw new Error(`Please switch to Mezo Mainnet (Chain ID ${MEZO_MAINNET_CHAIN_ID}) to approve tokens.`);
    }
    if (!token || !resolvedToken || !isSupportedSettlementToken(resolvedToken)) {
      throw new Error('That token is not in Netteo’s verified Mezo registry. Approval is disabled.');
    }
    if (!kernel) {
      throw new Error(`No SettlementKernel is deployed for ${token.symbol}. Approval is disabled.`);
    }
    if (!isKernelVerified) {
      throw new Error(
        `The ${token.symbol} SettlementKernel has not been verified against its on-chain token binding. Approval is disabled.`
      );
    }
    if (spenderAddress.toLowerCase() !== kernel.toLowerCase()) {
      throw new Error(`Approvals are restricted to the verified ${token.symbol} SettlementKernel.`);
    }
    if (isWritePending || isConfirming) {
      throw new Error(`A ${token.symbol} approval is already pending.`);
    }
    return writeContract({
      address: resolvedToken,
      abi: erc20Abi,
      functionName: 'approve',
      args: [spenderAddress, amount],
    });
  };

  const rawError = writeError || receiptError;

  return {
    token,
    tokenAddress: resolvedToken,
    symbol: token?.symbol ?? 'tokens',
    decimals: token?.decimals,
    supportsPermit: token?.supportsPermit ?? false,
    kernelAddress: kernel,
    isKernelVerified,
    isVerifyingKernel,
    balance: balance ?? 0n,
    allowance: allowance ?? 0n,
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
    error: rawError ? sanitizeWeb3Error(rawError, token?.symbol) : null,
    resetWrite,
  };
}
