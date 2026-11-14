'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import obStyles from '@/features/obligations/components/ObligationsView.module.css';
import { SettlementCycle } from '../types';
import {
  getCycleById,
  depositToCycle,
  executeCycleSettlement,
  claimRefundFromCycle,
  saveCycles,
  loadCycles,
} from '../store';
import { syncCyclesFromSupabase, registerCycleWithServer } from '@/lib/db/syncService';
import { formatBaseUnitsToDisplay, getParticipantDisplayName } from '@/features/obligations/store';
import { useWorkspace } from '@/features/workspace/WorkspaceContext';
import { Button } from '@/components/common/Button';
import { Icon } from '@/components/icons/Icon';
import { CycleIcon, SnapshotIcon, NetPositionIcon } from '@/components/icons/netteo';
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  FileText,
  ExternalLink,
  Wallet,
  Zap,
} from 'lucide-react';
import { useSettlementToken } from '@/lib/chain/useSettlementToken';
import { FundingSourcesPanel, NettingBenefitNote, SavePayoutPanel } from './FundingSources';
import { DEFAULT_SETTLEMENT_TOKEN, getTokenByAddress } from '@/lib/chain/tokens';
import {
  useSettlementKernel,
  useAuthoritativeCycle,
  useCycleKernelToken,
  CYCLE_STATE_LABELS,
  CycleStateOnChain,
  OnChainCycle,
  CycleAmounts,
} from '@/lib/chain/useSettlementKernel';
import { ZERO_ADDRESS, REFUND_GRACE_SECONDS, isSupportedNetwork, validateChainConfiguration, MEZO_MAINNET_EXPLORER_URL } from '@/lib/chain/config';
import { TransactionStatus } from '@/components/common/TransactionStatus';
import { useSettlementEvents } from '@/lib/chain/useSettlementEvents';
import { CdpAutoBorrowDrawer } from './CdpAutoBorrowDrawer';
import { useToast } from '@/components/ui/Toast/ToastContext';

export interface CycleExecutionViewProps {
  cycleId: string;
}

const EXPLORER_BASE = MEZO_MAINNET_EXPLORER_URL;

function buildSyntheticCycle(
  cycleId: string,
  onChain: OnChainCycle,
  _parts?: { debtors: string[]; creditors: string[] },
  projection?: any,
  amounts?: CycleAmounts
): SettlementCycle {
  // Real per-wallet amounts from the contract. Until they have loaded, list nobody rather than invent figures:
  // the old even split showed "A pays 40, B pays 40" for a cycle where A owes 70 and B owes 10, and showed every
  // creditor receiving 0 before settlement.
  const debtors = amounts?.debtors ?? [];
  const creditors = amounts?.creditors ?? [];
  const deposits: Record<string, { required: bigint; funded: bigint }> = {};
  debtors.forEach((d) => {
    deposits[d.address.toLowerCase()] = { required: d.required, funded: d.funded };
  });
  return {
    id: cycleId,
    groupId: '', // unknown for a cycle seen only on-chain; never a placeholder group id
    cycleNumber: projection?.cycle_number || 1,
    snapshotCommitment: onChain.snapshotCommitment,
    algorithmVersion: onChain.algorithmVersion || 'netteo-v1.0-deterministic',
    grossObligationTotal: onChain.grossObligationTotal,
    netDebtTotal: onChain.netDebtTotal,
    totalFunded: onChain.totalFunded,
    totalDistributed: onChain.totalDistributed,
    totalRefunded: onChain.totalRefunded,
    fundingDeadline: new Date(Number(onChain.fundingDeadline) * 1000).toISOString(),
    state: (CYCLE_STATE_LABELS[onChain.state as CycleStateOnChain] as any) || 'Funding',
    creatorAddress: onChain.creator,
    createdAt: projection?.created_at || new Date().toISOString(),
    includedObligationIds: [],
    nettingResult: {
      algorithmVersion: onChain.algorithmVersion || 'netteo-v1.0-deterministic',
      participantCount: debtors.length + creditors.length,
      obligationCount: 0,
      grossObligationTotal: onChain.grossObligationTotal,
      netFundingRequirement: onChain.netDebtTotal,
      positions: {},
      debtors: debtors.map((d) => ({ address: d.address, amount: d.required })),
      creditors: creditors.map((c) => ({ address: c.address, amount: c.amount })),
      zeroPositions: [],
      allocations: [],
      canonicalCommitmentHash: onChain.snapshotCommitment,
    },
    deposits,
    txCreationHash: projection?.creation_tx_hash,
  };
}

export function CycleExecutionView({ cycleId }: CycleExecutionViewProps) {
  const { mode, resetCounter } = useWorkspace();
  const { toast } = useToast();
  const { address: userAddress, isConnected, chainId } = useAccount();
  const [cycle, setCycle] = useState<SettlementCycle | null>(null);

  // Which currency (and so which kernel) this cycle settles in. A local record knows; a cycle
  // opened from a shared link may exist only on-chain, so ask the chain. Until resolved we pass
  // ZERO_ADDRESS, which is in no registry, so every chain hook stays disabled instead of
  // falling back to MUSD.
  const hexCycleId = (cycleId.startsWith('0x') ? cycleId : `0x${cycleId}`) as `0x${string}`;
  const chainToken = useCycleKernelToken(mode === 'live' && !cycle ? hexCycleId : null);
  const cycleToken = getTokenByAddress(
    cycle ? cycle.tokenAddress || DEFAULT_SETTLEMENT_TOKEN.address : chainToken.token?.address
  );
  const tokenAddress = cycleToken?.address ?? ZERO_ADDRESS;

  const settlement = useSettlementToken(tokenAddress);
  const kernel = useSettlementKernel(tokenAddress);
  const authoritative = useAuthoritativeCycle(cycleId, tokenAddress);

  // Reactive CometBFT WebSocket event stream for instant single-block UI updates
  useSettlementEvents(cycleId, {
    onDepositReceived: () => {
      toast.info('Deposit Confirmed', 'A counterparty net deposit was recorded on Mezo.');
      authoritative.refetch();
      refreshCycle();
    },
    onCycleReadyToSettle: () => {
      toast.success('Cycle 100% Funded', 'All net deposits received. Atomic distribution ready.');
      authoritative.refetch();
      refreshCycle();
    },
    onCycleSettled: () => {
      toast.success('Settlement Finalized', 'All net creditor payouts executed atomically.');
      authoritative.refetch();
      refreshCycle();
    },
    onCycleCancelled: () => {
      toast.warning('Cycle Cancelled', 'Funding deadline expired or cancelled by participants.');
      authoritative.refetch();
      refreshCycle();
    },
    onRefundClaimed: () => {
      toast.info('Refund Claimed', `Deposited ${cycleToken?.symbol ?? 'tokens'} returned to wallet.`);
      authoritative.refetch();
      refreshCycle();
    },
  }, tokenAddress);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTxAction, setActiveTxAction] = useState<string | null>(null);
  const [isCdpDrawerOpen, setIsCdpDrawerOpen] = useState(false);
  const [selectedDebtorForCdp, setSelectedDebtorForCdp] = useState<{
    address: string;
    required: bigint;
  } | null>(null);

  const isLiveContractReady =
    isConnected &&
    isSupportedNetwork(chainId) &&
    !chainToken.ambiguous &&
    !!cycleToken &&
    validateChainConfiguration(chainId, tokenAddress).valid &&
    kernel.isKernelVerified &&
    settlement.isKernelVerified;

  useEffect(() => {
    if (chainToken.ambiguous) {
      setErrorMsg(
        'This cycle ID exists on more than one settlement contract, so Netteo cannot tell which currency it settles in. Actions are disabled.'
      );
    }
  }, [chainToken.ambiguous]);

  const refreshCycle = () => {
    setIsLoading(true);
    const found = getCycleById(cycleId, mode);
    if (found) {
      setCycle(found);
      setIsLoading(false);
      return;
    }
    if (mode === 'live') {
      syncCyclesFromSupabase()
        .then((remote) => {
          const remoteFound = remote?.find((c) => c.id.toLowerCase() === cycleId.toLowerCase());
          if (remoteFound) setCycle(remoteFound);
        })
        .finally(() => setIsLoading(false));
      return;
    }
    setCycle(null);
    setIsLoading(false);
  };

  useEffect(() => {
    refreshCycle();

    if (typeof window !== 'undefined') {
      setIsOffline(!navigator.onLine);
      const onOnline = () => setIsOffline(false);
      const onOffline = () => setIsOffline(true);
      window.addEventListener('online', onOnline);
      window.addEventListener('offline', onOffline);
      return () => {
        window.removeEventListener('online', onOnline);
        window.removeEventListener('offline', onOffline);
      };
    }
  }, [cycleId, mode, resetCounter]);

  // Handle on-chain write completion truthfully
  useEffect(() => {
    if (kernel.isConfirmed) {
      if (mode === 'live') {
        authoritative.refetch();
        // Record confirmed tx hashes in local cache without mutating financial amounts
        if (activeTxAction === 'deposit' && kernel.txHash) {
          const localCycles = loadCycles('live');
          const existing = localCycles.find((c) => c.id.toLowerCase() === cycleId.toLowerCase());
          if (existing) {
            existing.txDepositHash = kernel.txHash;
            saveCycles(localCycles, 'live');
          }
          setActionSuccess('Deposit confirmed on Mezo Mainnet! On-chain state updated.');
        } else if (activeTxAction === 'execute' && kernel.txHash) {
          const localCycles = loadCycles('live');
          const existing = localCycles.find((c) => c.id.toLowerCase() === cycleId.toLowerCase());
          if (existing) {
            existing.txSettlementHash = kernel.txHash;
            saveCycles(localCycles, 'live');
          }
          setActionSuccess('Settlement successfully executed! Funds distributed atomically on Mezo Mainnet.');
        } else if (activeTxAction === 'refund') {
          setActionSuccess('Refund confirmed on Mezo Mainnet.');
        }
        setActiveTxAction(null);
        setIsSubmitting(false);
      }
    }
  }, [kernel.isConfirmed]);

  // Derived display cycle combining local representation with on-chain financial truth
  const displayCycle = useMemo(() => {
    if (mode === 'demo') return cycle;

    let base = cycle;
    if (!base && authoritative.cycle && authoritative.cycle.state !== CycleStateOnChain.NonExistent) {
      base = buildSyntheticCycle(
        cycleId,
        authoritative.cycle,
        authoritative.participants ?? undefined,
        authoritative.projection,
        authoritative.amounts ?? undefined
      );
    }

    if (!base) return null;

    if (cycleToken) {
      base = { ...base, tokenAddress: cycleToken.address, tokenSymbol: cycleToken.symbol };
    }

    if (authoritative.cycle && authoritative.cycle.state !== CycleStateOnChain.NonExistent) {
      const onChain = authoritative.cycle;
      const stateLabel = (CYCLE_STATE_LABELS[onChain.state as CycleStateOnChain] as any) || base.state;

      const updatedDeposits = { ...base.deposits };
      if (userAddress && authoritative.debtorStatus && authoritative.debtorStatus.required > 0n) {
        const uLower = userAddress.toLowerCase();
        updatedDeposits[uLower] = {
          required: authoritative.debtorStatus.required,
          funded: authoritative.debtorStatus.funded,
        };
      }

      return {
        ...base,
        snapshotCommitment: onChain.snapshotCommitment,
        grossObligationTotal: onChain.grossObligationTotal,
        netDebtTotal: onChain.netDebtTotal,
        totalFunded: onChain.totalFunded,
        totalDistributed: onChain.totalDistributed,
        totalRefunded: onChain.totalRefunded,
        state: stateLabel,
        deposits: updatedDeposits,
      };
    }

    return base;
  }, [cycle, mode, cycleToken, authoritative.cycle, authoritative.participants, authoritative.amounts, authoritative.debtorStatus, authoritative.projection, userAddress, cycleId]);

  const isViewLoading = isLoading && (!displayCycle && authoritative.isLoading);

  if (isViewLoading) {
    return (
      <div style={{ padding: 'var(--space-2xl) 0' }}>
        <p style={{ color: 'var(--color-muted)' }}>Loading settlement cycle {cycleId}...</p>
      </div>
    );
  }

  if (!displayCycle) {
    return (
      <div className={obStyles.emptyState}>
        <Icon icon={CycleIcon} size="lg" color="var(--color-wine)" />
        <h2 className={obStyles.emptyStateTitle}>Settlement Cycle Not Found</h2>
        <p className={obStyles.emptyStateDesc}>
          The requested cycle ID "{cycleId}" does not exist in the {mode === 'demo' ? 'Demo Sandbox' : 'Live Mezo'} workspace.
        </p>
        <Link href="/cycles" style={{ textDecoration: 'none' }}>
          <Button variant="primary">View All Cycles</Button>
        </Link>
      </div>
    );
  }

  const isFunded = displayCycle.netDebtTotal > 0n && displayCycle.totalFunded >= displayCycle.netDebtTotal;
  const fundingPercent = displayCycle.netDebtTotal > 0n
    ? Number((displayCycle.totalFunded * 100n) / displayCycle.netDebtTotal)
    : 100;

  // createCycle is open to anyone, so a cycle existing on-chain says nothing about who agreed to it: an attacker
  // can create one that names you as the payer. Live deposits are only offered for cycles the server has checked
  // against the group's accepted obligations.
  const UNVERIFIED_MESSAGE =
    'This settlement has not been verified against your group’s agreed payments, so deposits are disabled.';
  const isUnverifiedLive = mode === 'live' && !displayCycle.registered;
  // Savings and borrowing are MUSD-only Mezo products, so they are offered only for MUSD cycles.
  const isMusdCycle = (displayCycle.tokenSymbol || 'MUSD') === 'MUSD';
  const canVerify =
    isUnverifiedLive &&
    !!cycle &&
    cycle.includedObligationIds.length > 0 &&
    userAddress?.toLowerCase() === cycle.creatorAddress?.toLowerCase();

  // A fully funded cycle that cannot pay out is refundable once the grace period after its deadline has passed.
  const refundOpensAt = new Date(displayCycle.fundingDeadline.toString()).getTime() + REFUND_GRACE_SECONDS * 1000;
  const isStuckRefundOpen = displayCycle.state === 'ReadyToSettle' && Date.now() > refundOpensAt;

  const handleVerify = async () => {
    if (!cycle) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    const result = await registerCycleWithServer({
      cycleId,
      tokenAddress: cycle.tokenAddress || tokenAddress,
      groupId: cycle.groupId,
      obligationIds: cycle.includedObligationIds,
    });
    if (result.ok) {
      const stored = loadCycles('live');
      const mine = stored.find((c) => c.id.toLowerCase() === cycleId.toLowerCase());
      if (mine) {
        mine.registered = true;
        saveCycles(stored, 'live');
      }
      setActionSuccess('Settlement verified against your group. Deposits are now enabled.');
      refreshCycle();
    } else {
      setErrorMsg(result.error || 'The server could not verify this settlement.');
    }
    setIsSubmitting(false);
  };

  // Handle token approval (exact amount, only to this cycle's own kernel)
  const handleApprove = async (amount: bigint) => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      if (isUnverifiedLive) throw new Error(UNVERIFIED_MESSAGE);
      if (!settlement.kernelAddress) {
        throw new Error(`No SettlementKernel is deployed for ${displayCycle.tokenSymbol || 'this token'}. Approval is disabled.`);
      }
      await settlement.approve(settlement.kernelAddress, amount);
    } catch (err: any) {
      setErrorMsg(err.message || 'Approval rejected.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Deposit
  const handleDeposit = async (debtorAddr: string, remainingDue: bigint) => {
    setIsSubmitting(true);
    setErrorMsg(null);

    // In Live Mode: strictly require on-chain transaction on Mezo Mainnet (no simulated fallback)
    if (mode === 'live') {
      if (isUnverifiedLive) {
        setErrorMsg(UNVERIFIED_MESSAGE);
        setIsSubmitting(false);
        return;
      }
      if (!isLiveContractReady) {
        setErrorMsg('Live deposits require a wallet connected to Mezo Mainnet (Chain ID 31612). Switch to Demo Sandbox in the header to simulate.');
        setIsSubmitting(false);
        return;
      }
      if (userAddress?.toLowerCase() !== debtorAddr.toLowerCase()) {
        setErrorMsg(`In Live Mode, only debtor ${debtorAddr.slice(0, 6)}...${debtorAddr.slice(-4)} can submit this deposit on Mezo Mainnet. Switch connected wallet or switch to Demo Sandbox in the header.`);
        setIsSubmitting(false);
        return;
      }

      try {
        setActiveTxAction('deposit');
        await kernel.deposit(cycleId as `0x${string}`, remainingDue);
      } catch (err: any) {
        setErrorMsg(err.message || 'Deposit on Mezo Mainnet failed.');
        setActiveTxAction(null);
        setIsSubmitting(false);
      }
      return;
    }

    // In Demo Mode: simulate instant mock token deposit
    try {
      depositToCycle(cycleId, debtorAddr, remainingDue, 'demo');
      refreshCycle();
      setActionSuccess(`[Demo Sandbox] Simulated deposit of ${formatBaseUnitsToDisplay(remainingDue, displayCycle.tokenSymbol || 'MUSD')} for ${getParticipantDisplayName(debtorAddr, true)}.`);
      setTimeout(() => setActionSuccess(null), 3500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Demo deposit transaction failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Execute Settlement
  const handleExecute = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);

    // In Live Mode: strictly call on-chain contract
    if (mode === 'live') {
      if (!isLiveContractReady) {
        setErrorMsg('Executing live settlement requires your wallet connected to Mezo Mainnet (Chain ID 31612).');
        setIsSubmitting(false);
        return;
      }

      try {
        setActiveTxAction('execute');
        await kernel.executeSettlement(cycleId as `0x${string}`);
      } catch (err: any) {
        setErrorMsg(err.message || 'On-chain execution failed.');
        setActiveTxAction(null);
        setIsSubmitting(false);
      }
      return;
    }

    // In Demo Mode: simulate instant mock settlement distribution
    try {
      executeCycleSettlement(cycleId, 'demo');
      refreshCycle();
      setActionSuccess('[Demo Sandbox] Settlement executed! Mock tokens distributed atomically to net creditors.');
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Demo execution failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Refund
  const handleRefund = async (debtorAddr: string) => {
    setIsSubmitting(true);
    setErrorMsg(null);

    // In Live Mode: strictly call on-chain contract
    if (mode === 'live') {
      if (!isLiveContractReady) {
        setErrorMsg('Claiming refund on Mezo Mainnet requires a connected wallet.');
        setIsSubmitting(false);
        return;
      }
      if (userAddress?.toLowerCase() !== debtorAddr.toLowerCase()) {
        setErrorMsg('Only the debtor address who made the deposit can claim a refund on-chain.');
        setIsSubmitting(false);
        return;
      }

      try {
        setActiveTxAction('refund');
        await kernel.claimRefund(cycleId as `0x${string}`);
      } catch (err: any) {
        setErrorMsg(err.message || 'Refund claim failed.');
        setActiveTxAction(null);
        setIsSubmitting(false);
      }
      return;
    }

    // In Demo Mode: simulate instant refund
    try {
      claimRefundFromCycle(cycleId, debtorAddr, 'demo');
      refreshCycle();
      setActionSuccess(`[Demo Sandbox] Refund claimed for ${getParticipantDisplayName(debtorAddr, true)}.`);
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Refund claim failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Cancel Cycle (Cooperative Early Cancellation)
  const handleCancelCycle = async () => {
    if (!window.confirm('Are you sure you want to cancel this settlement cycle? All existing depositors will be able to claim immediate refunds.')) {
      return;
    }
    setIsSubmitting(true);
    setErrorMsg(null);

    if (mode === 'live') {
      if (!isLiveContractReady) {
        setErrorMsg('Cancelling a cycle on Mezo Mainnet requires a connected wallet.');
        setIsSubmitting(false);
        return;
      }
      try {
        setActiveTxAction('cancel');
        await kernel.cancelCycle(cycleId as `0x${string}`);
      } catch (err: any) {
        setErrorMsg(err.message || 'Cancel cycle failed.');
        setActiveTxAction(null);
        setIsSubmitting(false);
      }
      return;
    }

    // In Demo Mode: simulate instant cancellation
    try {
      if (cycle) {
        cycle.state = 'Cancelled' as any;
      }
      refreshCycle();
      setActionSuccess('[Demo Sandbox] Settlement cycle cancelled. Depositors can now claim immediate refunds.');
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Demo cancellation failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isKernelPending = kernel.isPending;
  const isTokenPending = settlement.isPending;
  const activeTxHash = kernel.txHash || settlement.txHash;
  const activeError = kernel.error || settlement.error || errorMsg;

  return (
    <div>
      {/* Back button and title */}
      <div style={{ marginBottom: 'var(--space-md)' }}>
        <Link
          href="/cycles"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '13px',
            color: 'var(--color-muted)',
            textDecoration: 'none',
          }}
        >
          <Icon icon={ArrowLeft} size="sm" />
          <span>Back to Settlements</span>
        </Link>
      </div>

      <div className={obStyles.pageHeader}>
        <div className={obStyles.titleArea}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
            <h1>Settlement Desk</h1>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 600,
                padding: '4px 10px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor:
                  displayCycle.state === 'Completed'
                    ? 'var(--color-success-bg)'
                    : displayCycle.state === 'ReadyToSettle'
                    ? 'var(--color-sand-light)'
                    : displayCycle.state === 'Cancelled'
                    ? 'rgba(127, 1, 31, 0.08)'
                    : 'var(--color-surface)',
                color:
                  displayCycle.state === 'Completed'
                    ? 'var(--color-success)'
                    : displayCycle.state === 'ReadyToSettle'
                    ? 'var(--color-wine)'
                    : displayCycle.state === 'Cancelled'
                    ? 'var(--color-wine)'
                    : 'var(--color-ink)',
                border: '1px solid var(--color-border)',
              }}
            >
              {displayCycle.state === 'ReadyToSettle'
                ? 'Ready to Settle (100% Funded)'
                : displayCycle.state === 'Cancelled'
                ? 'Cancelled (Refunds Active)'
                : displayCycle.state}
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                padding: '4px 8px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: mode === 'demo' ? 'var(--color-wine-subtle, #f5e8e8)' : 'var(--color-sand)',
                color: mode === 'demo' ? 'var(--color-wine)' : 'var(--color-ink)',
                border: '1px solid var(--color-border)',
              }}
            >
              {mode === 'demo' ? 'Demo Sandbox' : 'Mezo Mainnet'}
            </span>
          </div>
          <p className={obStyles.subtitle}>
            Settlement ID: <code style={{ fontSize: '13px', overflowWrap: 'anywhere' }}>{displayCycle.id}</code>
          </p>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
          <Link href={`/cycles/${cycleId}/audit`} style={{ textDecoration: 'none' }}>
            <Button variant="secondary" icon={<Icon icon={FileText} size="sm" />}>
              View Settlement Receipt
            </Button>
          </Link>

          {isFunded && displayCycle.state !== 'Completed' && (
            <Button
              variant="primary"
              icon={<Icon icon={Zap} size="sm" color="#FFFFFF" />}
              disabled={isOffline || isSubmitting || isKernelPending}
              isLoading={isSubmitting || isKernelPending}
              loadingText={mode === 'live' ? 'Broadcasting Settlement to Mezo...' : 'Executing Settlement...'}
              onClick={handleExecute}
            >
              {mode === 'live'
                ? 'Execute Settlement on Mezo (Atomic)'
                : 'Execute Demo Settlement (Simulated)'}
            </Button>
          )}

          {displayCycle.state === 'Funding' && !isFunded && (mode === 'demo' || (userAddress && displayCycle.creatorAddress && userAddress.toLowerCase() === displayCycle.creatorAddress.toLowerCase())) && (
            <Button
              variant="destructive"
              disabled={isOffline || isSubmitting || isKernelPending}
              isLoading={isSubmitting && activeTxAction === 'cancel'}
              loadingText={mode === 'live' ? 'Cancelling on Mezo...' : 'Cancelling...'}
              onClick={handleCancelCycle}
            >
              Cancel Settlement
            </Button>
          )}
        </div>
      </div>

      {/* Indexer Lag Notice (design-addendum.md §7 Feedback Contracts & Truthful Interfaces) */}
      {mode === 'live' && authoritative.indexerLag && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-sm)',
            padding: 'var(--space-md) var(--space-lg)',
            backgroundColor: 'var(--color-sand)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            marginBottom: 'var(--space-lg)',
            fontSize: '13px',
            color: 'var(--color-ink)',
          }}
          role="status"
        >
          <Icon icon={Clock} size="sm" color="var(--color-wine)" />
          <div>
            <strong>On-Chain Financial Truth Active:</strong> SettlementKernel on Mezo Mainnet confirmed the latest funds/state. Supabase indexer projection is syncing in the background.
          </div>
        </div>
      )}

      {/* Cancelled Cycle Notice */}
      {displayCycle.state === 'Cancelled' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-sm)',
            padding: 'var(--space-md) var(--space-lg)',
            backgroundColor: 'rgba(127, 1, 31, 0.06)',
            border: '1px solid rgba(127, 1, 31, 0.2)',
            borderRadius: 'var(--radius-md)',
            marginBottom: 'var(--space-lg)',
            fontSize: '13px',
            color: 'var(--color-wine)',
          }}
          role="status"
        >
          <Icon icon={AlertTriangle} size="sm" color="var(--color-wine)" />
          <div>
            <strong>Cycle Cancelled:</strong> This cycle was cancelled by the coordinator prior to settlement. Any deposited funds are available for immediate refund below without waiting for the funding deadline.
          </div>
        </div>
      )}

      {/* Web3 Transaction Status Banner */}
      {(isKernelPending || isTokenPending || activeTxHash || kernel.error || settlement.error) && (
        <div style={{ marginBottom: 'var(--space-lg)' }}>
          <TransactionStatus
            state={
              kernel.isConfirmed || settlement.isConfirmed
                ? 'confirmed'
                : kernel.error || settlement.error
                ? 'reverted'
                : activeTxHash
                ? 'pending'
                : 'awaiting_signature'
            }
            hash={activeTxHash}
            errorMessage={kernel.error || settlement.error}
            title={
              kernel.isConfirmed
                ? 'On-Chain Transaction Confirmed!'
                : settlement.isConfirmed
                ? `${displayCycle.tokenSymbol || 'Token'} Allowance Confirmed!`
                : activeTxHash
                ? 'Broadcasting to Mezo Mainnet...'
                : 'Awaiting Wallet Signature...'
            }
            onDismiss={() => {
              kernel.resetWrite();
              settlement.resetWrite();
              setIsSubmitting(false);
            }}
          />
        </div>
      )}

      {/* Action Notices */}
      {actionSuccess && !activeTxHash && (
        <div
          className={obStyles.errorBanner}
          style={{
            backgroundColor: 'var(--color-success-bg)',
            borderColor: 'var(--color-success-border)',
            color: 'var(--color-success)',
          }}
          role="status"
        >
          <span>{actionSuccess}</span>
        </div>
      )}

      {errorMsg && !kernel.error && !settlement.error && (
        <div className={obStyles.errorBanner} role="alert">
          <Icon icon={AlertTriangle} size="sm" color="var(--color-danger)" />
          <span>{errorMsg}</span>
        </div>
      )}

      {isUnverifiedLive && (
        <div
          role="alert"
          style={{
            backgroundColor: 'var(--color-warning-bg)',
            border: '1px solid var(--color-warning-border)',
            color: 'var(--color-warning)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-md) var(--space-lg)',
            marginBottom: 'var(--space-lg)',
            fontSize: '13px',
            lineHeight: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--space-md)',
            flexWrap: 'wrap',
          }}
        >
          <span>
            <strong>Not verified. Deposits are disabled.</strong> Anyone can create a settlement on-chain, so Netteo only
            accepts deposits into settlements it has checked against your group&apos;s agreed payments. This one has not
            been checked, so confirm with your group before sending anything to it.
            {!canVerify && ' If you created it, open it from the browser you created it in and verify it there.'}
          </span>
          {canVerify && (
            <Button variant="secondary" disabled={isOffline || isSubmitting} isLoading={isSubmitting} loadingText="Verifying..." onClick={handleVerify}>
              Verify with my group
            </Button>
          )}
        </div>
      )}

      {mode === 'live' && displayCycle.state === 'ReadyToSettle' && (
        <p role="status" style={{ fontSize: '12px', color: 'var(--color-muted)', margin: '0 0 var(--space-md)' }}>
          Fully funded. Anyone can settle it. If settlement cannot complete, deposits can be refunded after{' '}
          {new Date(refundOpensAt).toLocaleString()}.
        </p>
      )}

      {/* Funding Progress Bar (Verified-state progress design-addendum.md §8) */}
      <div
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-xl)',
          marginBottom: 'var(--space-xl)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xs)' }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-ink)' }}>
            Net Debtor Funding Progress
          </div>
          <div style={{ fontSize: '14px', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: isFunded ? 'var(--color-success)' : 'var(--color-wine)' }}>
            {formatBaseUnitsToDisplay(displayCycle.totalFunded, displayCycle.tokenSymbol || 'MUSD')} / {formatBaseUnitsToDisplay(displayCycle.netDebtTotal, displayCycle.tokenSymbol || 'MUSD')} ({fundingPercent}%)
          </div>
        </div>

        {/* Progress Track */}
        <div
          style={{
            height: '10px',
            backgroundColor: 'var(--color-sand)',
            borderRadius: 'var(--radius-sm)',
            overflow: 'hidden',
            marginBottom: 'var(--space-md)',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${Math.min(fundingPercent, 100)}%`,
              backgroundColor: isFunded ? 'var(--color-success)' : 'var(--color-wine)',
              transition: 'width var(--motion-slow) var(--ease-standard)',
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', fontSize: '13px', color: 'var(--color-muted)' }}>
          <Icon icon={ShieldCheck} size="sm" color="var(--color-wine)" />
          <span>
            <strong>Collect-then-distribute invariant:</strong> 100% of net debtor deposits are required before creditor distribution unlocks.
          </span>
        </div>

        <div style={{ marginTop: 'var(--space-md)' }}>
          <NettingBenefitNote
            gross={displayCycle.grossObligationTotal}
            net={displayCycle.netDebtTotal}
            symbol={displayCycle.tokenSymbol || 'MUSD'}
          />
        </div>
      </div>

      {/* On-Chain Verification Block */}
      {(displayCycle.txCreationHash || displayCycle.txDepositHash || displayCycle.txSettlementHash) && (
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-md) var(--space-lg)',
            marginBottom: 'var(--space-xl)',
          }}
        >
          <div style={{ fontSize: '11px', color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 'var(--space-xs)' }}>
            Verified On-Chain Transactions (Mezo Mainnet Chain 31612)
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-lg)', flexWrap: 'wrap', fontSize: '12px' }}>
            {displayCycle.txCreationHash && (
              <div>
                <span style={{ color: 'var(--color-muted)' }}>Creation: </span>
                <a
                  href={`${EXPLORER_BASE}/tx/${displayCycle.txCreationHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--color-wine)', fontWeight: 600, textDecoration: 'underline' }}
                >
                  {displayCycle.txCreationHash.slice(0, 10)}...{displayCycle.txCreationHash.slice(-8)}
                  <Icon icon={ExternalLink} size="sm" style={{ marginLeft: '3px', verticalAlign: 'middle' }} />
                </a>
              </div>
            )}
            {displayCycle.txDepositHash && (
              <div>
                <span style={{ color: 'var(--color-muted)' }}>Deposit: </span>
                <a
                  href={`${EXPLORER_BASE}/tx/${displayCycle.txDepositHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--color-wine)', fontWeight: 600, textDecoration: 'underline' }}
                >
                  {displayCycle.txDepositHash.slice(0, 10)}...{displayCycle.txDepositHash.slice(-8)}
                  <Icon icon={ExternalLink} size="sm" style={{ marginLeft: '3px', verticalAlign: 'middle' }} />
                </a>
              </div>
            )}
            {displayCycle.txSettlementHash && (
              <div>
                <span style={{ color: 'var(--color-muted)' }}>Settlement: </span>
                <a
                  href={`${EXPLORER_BASE}/tx/${displayCycle.txSettlementHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--color-wine)', fontWeight: 600, textDecoration: 'underline' }}
                >
                  {displayCycle.txSettlementHash.slice(0, 10)}...{displayCycle.txSettlementHash.slice(-8)}
                  <Icon icon={ExternalLink} size="sm" style={{ marginLeft: '3px', verticalAlign: 'middle' }} />
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Grid: Debtors to Fund vs Creditors to Receive */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(360px, 100%), 1fr))',
          gap: 'var(--space-xl)',
          marginBottom: 'var(--space-2xl)',
        }}
      >
        {/* Net Debtors Column */}
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-lg)',
          }}
        >
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-ink)', marginTop: 0, marginBottom: 'var(--space-md)' }}>
            Net Debtors ({Object.keys(displayCycle.deposits).length})
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {Object.entries(displayCycle.deposits).map(([debtorAddr, deposit]) => {
              const remaining = deposit.required - deposit.funded;
              const isDebtorDone = deposit.funded >= deposit.required;
              const isCurrentUser = userAddress?.toLowerCase() === debtorAddr.toLowerCase();
              const needsApproval = isCurrentUser && settlement.allowance < remaining;

              return (
                <div
                  key={debtorAddr}
                  style={{
                    border: '1px solid var(--color-border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: 'var(--space-md)',
                    backgroundColor: 'var(--color-page)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2xs)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)' }}>
                        {getParticipantDisplayName(debtorAddr, mode === 'demo')}
                      </span>
                      <span className={obStyles.addressCode}>
                        {debtorAddr.length > 14 ? `${debtorAddr.slice(0, 6)}...${debtorAddr.slice(-4)}` : debtorAddr}
                      </span>
                      {isCurrentUser && (
                        <span style={{ fontSize: '11px', backgroundColor: 'var(--color-sand)', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                          You
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: isDebtorDone ? 'var(--color-success)' : 'var(--color-wine)' }}>
                      {isDebtorDone ? 'Funded' : 'Deposit Required'}
                    </span>
                  </div>

                  <div style={{ fontSize: '13px', color: 'var(--color-muted)', marginBottom: 'var(--space-sm)', fontVariantNumeric: 'tabular-nums' }}>
                    Required: {formatBaseUnitsToDisplay(deposit.required, displayCycle.tokenSymbol || 'MUSD')} &bull; Deposited: {formatBaseUnitsToDisplay(deposit.funded, displayCycle.tokenSymbol || 'MUSD')}
                  </div>

                  {displayCycle.state === 'Funding' && !isDebtorDone && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                      {/* Live mode: the CDP drawer is a local simulation with no contract call, so it must never
                          appear next to real funds. Point to Mezo's own swap guide when the balance is short. */}
                      {mode === 'live' && isCurrentUser && userAddress && settlement.balance < remaining && isMusdCycle && (
                        <FundingSourcesPanel
                          owner={userAddress as `0x${string}`}
                          shortfall={remaining - settlement.balance}
                          disabled={isOffline || isSubmitting || !isLiveContractReady}
                          onFunded={() => settlement.refetchBalance()}
                        />
                      )}

                      {mode === 'live' && isCurrentUser && settlement.balance < remaining && !isMusdCycle && (
                        <div
                          role="status"
                          style={{
                            padding: '8px 10px',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '11px',
                            color: 'var(--color-ink)',
                            marginBottom: 'var(--space-2xs)',
                          }}
                        >
                          Your wallet holds less {displayCycle.tokenSymbol || 'MUSD'} than this deposit needs.{' '}
                          <a
                            href="https://mezo.org/docs/users/features/mezo-swap"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: 'var(--color-wine)', fontWeight: 600 }}
                          >
                            How to swap on Mezo
                          </a>
                        </div>
                      )}

                      {/* Demo-only Mezo CDP simulation (applicable for MUSD settlement) */}
                      {mode === 'demo' && (!displayCycle.tokenSymbol || displayCycle.tokenSymbol === 'MUSD') && (
                        <div
                          style={{
                            padding: '8px 10px',
                            backgroundColor: 'rgba(127, 1, 31, 0.04)',
                            border: '1px dashed rgba(127, 1, 31, 0.25)',
                            borderRadius: 'var(--radius-sm)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '8px',
                            marginBottom: 'var(--space-2xs)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Icon icon={Zap} size="sm" color="var(--color-wine)" />
                            <span style={{ fontSize: '11px', color: 'var(--color-ink)' }}>
                              Short on MUSD? <strong>Borrow against Bitcoin (tBTC)</strong>
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDebtorForCdp({ address: debtorAddr, required: remaining });
                              setIsCdpDrawerOpen(true);
                            }}
                            style={{
                              background: 'none',
                              border: '1px solid var(--color-wine)',
                              borderRadius: '4px',
                              padding: '2px 8px',
                              fontSize: '11px',
                              fontWeight: 600,
                              color: 'var(--color-wine)',
                              cursor: 'pointer',
                              fontFamily: 'inherit',
                            }}
                          >
                            Mezo CDP
                          </button>
                        </div>
                      )}

                      {needsApproval ? (
                        <Button
                          variant="secondary"
                          disabled={isOffline || isSubmitting || isTokenPending || isUnverifiedLive}
                          isLoading={isTokenPending}
                          loadingText={`Approving ${displayCycle.tokenSymbol || 'token'}...`}
                          onClick={() => handleApprove(remaining)}
                          style={{ width: '100%', minHeight: '36px', fontSize: '13px' }}
                        >
                          Step 1: Approve {displayCycle.tokenSymbol || 'Token'} Spending
                        </Button>
                      ) : (
                        <Button
                          variant="primary"
                          disabled={isOffline || isSubmitting || isKernelPending || isUnverifiedLive}
                          isLoading={isKernelPending}
                          loadingText="Depositing..."
                          onClick={() => handleDeposit(debtorAddr, remaining)}
                          style={{ width: '100%', minHeight: '36px', fontSize: '13px' }}
                        >
                          {mode === 'demo'
                            ? `Simulate Deposit (${formatBaseUnitsToDisplay(remaining, displayCycle.tokenSymbol || 'MUSD')})`
                            : isCurrentUser && isLiveContractReady
                            ? `Deposit on Mezo (${formatBaseUnitsToDisplay(remaining, displayCycle.tokenSymbol || 'MUSD')})`
                            : `Deposit ${formatBaseUnitsToDisplay(remaining, displayCycle.tokenSymbol || 'MUSD')}`}
                        </Button>
                      )}
                    </div>
                  )}

                  {(displayCycle.state === 'Expired' || displayCycle.state === 'Cancelled' || isStuckRefundOpen) && deposit.funded > 0n && (
                    <Button
                      variant="destructive"
                      disabled={isOffline || isSubmitting || isKernelPending}
                      isLoading={isSubmitting && activeTxAction === 'refund'}
                      loadingText="Claiming Refund..."
                      onClick={() => handleRefund(debtorAddr)}
                      style={{ width: '100%', minHeight: '36px', fontSize: '13px' }}
                    >
                      Claim Refund ({formatBaseUnitsToDisplay(deposit.funded, displayCycle.tokenSymbol || 'MUSD')})
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Net Creditors Column */}
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-lg)',
          }}
        >
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-ink)', marginTop: 0, marginBottom: 'var(--space-md)' }}>
            Net Creditors ({displayCycle.nettingResult.creditors.length})
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {displayCycle.nettingResult.creditors.map((creditor) => (
              <div
                key={creditor.address}
                style={{
                  border: '1px solid var(--color-border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-md)',
                  backgroundColor: 'var(--color-page)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2xs)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)' }}>
                      {getParticipantDisplayName(creditor.address, mode === 'demo')}
                    </span>
                    <span className={obStyles.addressCode}>
                      {creditor.address.length > 14 ? `${creditor.address.slice(0, 6)}...${creditor.address.slice(-4)}` : creditor.address}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: displayCycle.state === 'Completed' ? 'var(--color-success)' : 'var(--color-muted)',
                    }}
                  >
                    {displayCycle.state === 'Completed' ? 'Paid' : 'Awaiting Settlement'}
                  </span>
                </div>

                <div style={{ fontSize: '13px', color: 'var(--color-success)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                  Receives: {formatBaseUnitsToDisplay(creditor.amount, displayCycle.tokenSymbol || 'MUSD')}
                </div>

                {mode === 'live' &&
                  isMusdCycle &&
                  displayCycle.state === 'Completed' &&
                  userAddress &&
                  userAddress.toLowerCase() === creditor.address.toLowerCase() && (
                    <div style={{ marginTop: 'var(--space-md)' }}>
                      <SavePayoutPanel
                        owner={userAddress as `0x${string}`}
                        payout={creditor.amount}
                        walletBalance={settlement.balance}
                        disabled={isOffline || !isLiveContractReady}
                        onDone={() => settlement.refetchBalance()}
                      />
                    </div>
                  )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mezo CDP Auto-Borrow Drawer (simulation: Demo mode only) */}
      {mode === 'demo' && selectedDebtorForCdp && (
        <CdpAutoBorrowDrawer
          isOpen={isCdpDrawerOpen}
          onClose={() => {
            setIsCdpDrawerOpen(false);
            setSelectedDebtorForCdp(null);
          }}
          requiredMusdAmount={selectedDebtorForCdp.required}
          currentMusdBalance={settlement.balance}
          cycleId={cycleId}
          userAddress={selectedDebtorForCdp.address}
          mode={mode}
          onBorrowSuccess={(mintedAmount) => {
            setActionSuccess(
              `[Mezo CDP] Minted ${formatBaseUnitsToDisplay(mintedAmount)} backed by Bitcoin collateral. Ready to deposit!`
            );
            setTimeout(() => setActionSuccess(null), 5000);
          }}
        />
      )}
    </div>
  );
}
