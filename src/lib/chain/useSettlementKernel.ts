'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { type Address, type Hash } from 'viem';
import { settlementKernelAbi } from './abi';
import {
  MEZO_MAINNET_CHAIN_ID,
  MEZO_MAINNET_MUSD,
  isDeployed,
  isSupportedNetwork,
  canReadMezo,
  kernelForToken,
  validateChainConfiguration,
} from './config';
import { SUPPORTED_SETTLEMENT_TOKENS, getTokenByAddress, type TokenMetadata } from './tokens';
import { sanitizeWeb3Error } from './useSettlementToken';
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
 * Every read below is scoped to the kernel that settles `tokenAddress`. A cycle id
 * only has meaning inside its own kernel, so reading it against the wrong kernel
 * would return NonExistent rather than wrong numbers — but pass the token anyway.
 */
function useKernelAddress(tokenAddress?: string | null) {
  const { chainId } = useAccount();
  const kernel = kernelForToken(tokenAddress ?? MEZO_MAINNET_MUSD);
  return {
    kernel,
    isEnabled: canReadMezo(chainId) && isDeployed(kernel),
  };
}

/**
 * Finds which kernel holds a cycle, and therefore which currency it settles in.
 *
 * A cycleId is caller-chosen and only unique within one kernel, and a cycle opened from a
 * shared link may have no local record naming its token. Probing every deployed kernel
 * and requiring exactly one hit means we never read or write a cycle against the wrong
 * asset. If the id exists on several kernels it is `ambiguous` and callers must refuse to act.
 */
export function useCycleKernelToken(cycleId?: `0x${string}` | null) {
  const { chainId } = useAccount();
  const candidates = SUPPORTED_SETTLEMENT_TOKENS.map((token) => ({ token, kernel: kernelForToken(token.address) })).filter(
    (c): c is { token: TokenMetadata; kernel: `0x${string}` } => c.kernel !== null
  );

  const { data, isLoading } = useReadContracts({
    contracts: candidates.map((c) => ({
      address: c.kernel,
      abi: settlementKernelAbi,
      functionName: 'getCycle' as const,
      args: [cycleId as `0x${string}`] as const,
      chainId: MEZO_MAINNET_CHAIN_ID,
    })),
    allowFailure: true,
    query: { enabled: !!cycleId && canReadMezo(chainId) && candidates.length > 0 },
  });

  // getCycle reverts CycleNotFound for an unknown id, so a successful call means it exists here.
  const matches = candidates.filter((_, i) => data?.[i]?.status === 'success');
  return {
    token: matches.length === 1 ? matches[0].token : undefined,
    ambiguous: matches.length > 1,
    isLoading,
  };
}

export function useCycleOnChain(cycleId?: `0x${string}` | null, tokenAddress?: string | null) {
  const { kernel, isEnabled } = useKernelAddress(tokenAddress);

  const {
    data: cycleData,
    isLoading,
    refetch,
    error,
  } = useReadContract({
    address: kernel ?? undefined,
    abi: settlementKernelAbi,
    functionName: 'getCycle',
    args: cycleId ? [cycleId] : undefined,
    query: { enabled: !!cycleId && isEnabled },
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

export function useDebtorStatusOnChain(
  cycleId?: `0x${string}` | null,
  debtor?: Address | null,
  tokenAddress?: string | null
) {
  const { kernel, isEnabled } = useKernelAddress(tokenAddress);

  const { data, isLoading, refetch } = useReadContract({
    address: kernel ?? undefined,
    abi: settlementKernelAbi,
    functionName: 'getDebtorStatus',
    args: cycleId && debtor ? [cycleId, debtor] : undefined,
    query: { enabled: !!cycleId && !!debtor && isEnabled },
  });

  return {
    status: data ? { required: data[0], funded: data[1], isFullyFunded: data[2] } : null,
    isLoading,
    refetch,
  };
}

export function useCycleParticipantsOnChain(cycleId?: `0x${string}` | null, tokenAddress?: string | null) {
  const { kernel, isEnabled } = useKernelAddress(tokenAddress);

  const { data, isLoading, refetch } = useReadContract({
    address: kernel ?? undefined,
    abi: settlementKernelAbi,
    functionName: 'getCycleParticipants',
    args: cycleId ? [cycleId] : undefined,
    query: { enabled: !!cycleId && isEnabled },
  });

  return {
    participants: data
      ? { debtors: data[0] as Address[], creditors: data[1] as Address[] }
      : null,
    isLoading,
    refetch,
  };
}

export function useCreditorPayoutOnChain(
  cycleId?: `0x${string}` | null,
  creditor?: Address | null,
  tokenAddress?: string | null
) {
  const { kernel, isEnabled } = useKernelAddress(tokenAddress);

  const { data, isLoading, refetch } = useReadContract({
    address: kernel ?? undefined,
    abi: settlementKernelAbi,
    functionName: 'getCreditorPayout',
    args: cycleId && creditor ? [cycleId, creditor] : undefined,
    query: { enabled: !!cycleId && !!creditor && isEnabled },
  });

  return { payout: (data as bigint | undefined) ?? null, isLoading, refetch };
}

export interface CycleAmounts {
  debtors: { address: Address; required: bigint; funded: bigint }[];
  creditors: { address: Address; amount: bigint }[];
}

/**
 * Every debtor's real required and funded amount, and every creditor's real payout, read from the contract in one
 * batch (at most 10 reads). The cycle page uses this instead of guessing: splitting the net total evenly shows the
 * wrong number whenever debtors owe different amounts. Returns null until ALL reads succeed, so a partial or
 * failed read can never be shown as if it were the full picture.
 */
export function useCycleAmountsOnChain(
  cycleId?: `0x${string}` | null,
  participants?: { debtors: Address[]; creditors: Address[] } | null,
  tokenAddress?: string | null
) {
  const { kernel, isEnabled } = useKernelAddress(tokenAddress);
  const debtors = participants?.debtors ?? [];
  const creditors = participants?.creditors ?? [];

  const { data, isLoading, refetch } = useReadContracts({
    contracts: [
      ...debtors.map((debtor) => ({
        address: kernel as Address,
        abi: settlementKernelAbi,
        functionName: 'getDebtorStatus' as const,
        args: [cycleId as `0x${string}`, debtor] as const,
        chainId: MEZO_MAINNET_CHAIN_ID,
      })),
      ...creditors.map((creditor) => ({
        address: kernel as Address,
        abi: settlementKernelAbi,
        functionName: 'getCreditorPayout' as const,
        args: [cycleId as `0x${string}`, creditor] as const,
        chainId: MEZO_MAINNET_CHAIN_ID,
      })),
    ] as any,
    allowFailure: true,
    query: { enabled: !!cycleId && !!kernel && isEnabled && !!participants && debtors.length + creditors.length > 0 },
  });

  let amounts: CycleAmounts | null = null;
  const results = data as { status: string; result?: unknown }[] | undefined;
  if (results && results.length === debtors.length + creditors.length && results.every((r) => r.status === 'success')) {
    amounts = {
      debtors: debtors.map((address, i) => {
        const [required, funded] = results[i].result as readonly [bigint, bigint, boolean];
        return { address, required, funded };
      }),
      creditors: creditors.map((address, i) => ({ address, amount: results[debtors.length + i].result as bigint })),
    };
  }

  return { amounts, isLoading, refetch };
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
 * On-chain contract state is the sole financial truth; the Supabase read model is
 * compared against it only to surface indexer lag.
 */
export function useAuthoritativeCycle(cycleId?: string | null, tokenAddress?: string | null) {
  const { address: userAddress } = useAccount();
  const hexCycleId = cycleId
    ? ((cycleId.startsWith('0x') ? cycleId : `0x${cycleId}`) as `0x${string}`)
    : null;

  const { cycle, isLoading: isCycleLoading, refetch: refetchCycle } = useCycleOnChain(hexCycleId, tokenAddress);
  const { participants, isLoading: isPartsLoading, refetch: refetchParts } = useCycleParticipantsOnChain(
    hexCycleId,
    tokenAddress
  );
  const { status: debtorStatus, isLoading: isDebtorLoading, refetch: refetchDebtor } = useDebtorStatusOnChain(
    hexCycleId,
    userAddress,
    tokenAddress
  );
  const { payout: creditorPayout, isLoading: isCreditorLoading, refetch: refetchCreditor } = useCreditorPayoutOnChain(
    hexCycleId,
    userAddress,
    tokenAddress
  );

  const { amounts, isLoading: isAmountsLoading, refetch: refetchAmounts } = useCycleAmountsOnChain(hexCycleId, participants, tokenAddress);

  const [projection, setProjection] = useState<any | null>(null);
  const [isProjectionLoading, setIsProjectionLoading] = useState(false);

  // A cycle id is only unique within its kernel (one kernel per token), so the projection is looked up by both.
  // Looking it up by id alone fails with .single() as soon as the same id exists on two kernels.
  const kernelKey = kernelForToken(tokenAddress ?? MEZO_MAINNET_MUSD)?.toLowerCase() ?? null;

  const fetchProjection = useCallback(async () => {
    if (!supabase || !hexCycleId || !kernelKey) return;
    try {
      setIsProjectionLoading(true);
      // Amounts are cast to text: NUMERIC arrives as a JSON number and loses digits above 2^53 (about 0.009 MUSD).
      const { data } = await supabase
        .from('cycle_projection')
        .select('kernel_address, cycle_id, total_funded::text, total_distributed::text, total_refunded::text, state')
        .eq('kernel_address', kernelKey)
        .eq('cycle_id', hexCycleId)
        .maybeSingle();
      setProjection(data || null);
    } catch {
      // Non-blocking projection read
    } finally {
      setIsProjectionLoading(false);
    }
  }, [hexCycleId, kernelKey]);

  useEffect(() => {
    fetchProjection();
  }, [fetchProjection]);

  const refetchAll = async () => {
    await Promise.all([
      refetchCycle(),
      refetchParts(),
      refetchDebtor(),
      refetchCreditor(),
      refetchAmounts(),
      fetchProjection(),
    ]);
  };

  // Indexer lag: on-chain state is ahead of the indexed Supabase projection.
  let indexerLag = false;
  if (cycle && cycle.state !== CycleStateOnChain.NonExistent) {
    if (!projection) {
      indexerLag = true;
    } else {
      const projFunded = BigInt(projection.total_funded || '0');
      if (cycle.totalFunded > projFunded) {
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
    amounts,
    userRole,
    projection,
    indexerLag,
    isLoading: isCycleLoading || isPartsLoading || isDebtorLoading || isCreditorLoading || isAmountsLoading,
    isProjectionLoading,
    refetch: refetchAll,
  };
}

/**
 * Write operations against the kernel that settles `tokenAddress`.
 * Enforces single-flight, receipt tracking and truthful confirmation state.
 */
export function useSettlementKernel(tokenAddress?: string | null) {
  const { chainId, isConnected } = useAccount();

  const token = getTokenByAddress(tokenAddress ?? MEZO_MAINNET_MUSD);
  const contractAddress = kernelForToken(token?.address);
  const isCorrectNetwork = isSupportedNetwork(chainId);

  const { data: kernelToken } = useReadContract({
    address: contractAddress ?? undefined,
    abi: settlementKernelAbi,
    functionName: 'musdToken',
    chainId: MEZO_MAINNET_CHAIN_ID,
    query: { enabled: canReadMezo(chainId) && isDeployed(contractAddress), staleTime: Infinity },
  });

  const isKernelVerified =
    !!token && !!contractAddress && kernelToken?.toLowerCase() === token.address.toLowerCase();

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

  /** Fails closed: refuses to write unless the deployed kernel proves its token binding. */
  const requireWritableKernel = (): `0x${string}` => {
    if (!isConnected) throw new Error('Please connect your Web3 wallet first.');
    if (!isCorrectNetwork) {
      throw new Error(`Please switch to Mezo Mainnet (Chain ID ${MEZO_MAINNET_CHAIN_ID}) to submit transactions.`);
    }
    const configuration = validateChainConfiguration(chainId, token?.address ?? tokenAddress);
    if (!configuration.valid || !contractAddress) {
      throw new Error(configuration.error || 'Mainnet settlement configuration is invalid.');
    }
    if (!kernelToken) {
      throw new Error('Could not verify the SettlementKernel token binding. Wait for verification and try again.');
    }
    if (!isKernelVerified) {
      throw new Error(
        `The SettlementKernel at ${contractAddress} is not bound to ${token?.symbol ?? 'the selected token'}. Transactions are disabled.`
      );
    }
    return contractAddress;
  };

  const createCycle = async (input: CycleInput) =>
    writeContract({
      address: requireWritableKernel(),
      abi: settlementKernelAbi,
      functionName: 'createCycle',
      args: [input],
    });

  const deposit = async (cycleId: `0x${string}`, amount: bigint) =>
    writeContract({
      address: requireWritableKernel(),
      abi: settlementKernelAbi,
      functionName: 'deposit',
      args: [cycleId, amount],
    });

  const depositWithPermit = async (
    cycleId: `0x${string}`,
    amount: bigint,
    deadline: bigint,
    v: number,
    r: `0x${string}`,
    s: `0x${string}`
  ) => {
    const kernel = requireWritableKernel();
    if (!token?.supportsPermit) {
      throw new Error(`${token?.symbol ?? 'This token'} does not support permit. Use approve and deposit instead.`);
    }
    return writeContract({
      address: kernel,
      abi: settlementKernelAbi,
      functionName: 'depositWithPermit',
      args: [cycleId, amount, deadline, v, r, s],
    });
  };

  const cancelCycle = async (cycleId: `0x${string}`) =>
    writeContract({
      address: requireWritableKernel(),
      abi: settlementKernelAbi,
      functionName: 'cancelCycle',
      args: [cycleId],
    });

  const executeSettlement = async (cycleId: `0x${string}`) =>
    writeContract({
      address: requireWritableKernel(),
      abi: settlementKernelAbi,
      functionName: 'executeSettlement',
      args: [cycleId],
    });

  const claimRefund = async (cycleId: `0x${string}`) =>
    writeContract({
      address: requireWritableKernel(),
      abi: settlementKernelAbi,
      functionName: 'claimRefund',
      args: [cycleId],
    });

  const rawError = writeError || receiptError;

  return {
    token,
    contractAddress: contractAddress ?? undefined,
    isKernelVerified,
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
    error: rawError ? sanitizeWeb3Error(rawError, token?.symbol) : null,
    resetWrite,
  };
}
