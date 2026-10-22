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
  VERIFIED_MEZO_CYCLE,
} from '../store';
import { syncCycleToSupabase, syncCyclesFromSupabase } from '@/lib/db/syncService';
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
import { useMusdToken } from '@/lib/chain/useMusdToken';
import {
  useSettlementKernel,
  useAuthoritativeCycle,
  CYCLE_STATE_LABELS,
  CycleStateOnChain,
  OnChainCycle,
} from '@/lib/chain/useSettlementKernel';
import { CONTRACT_ADDRESSES, isSupportedNetwork } from '@/lib/chain/config';
import { TransactionStatus } from '@/components/common/TransactionStatus';
import { useSettlementEvents } from '@/lib/chain/useSettlementEvents';

export interface CycleExecutionViewProps {
  cycleId: string;
}

const EXPLORER_BASE = process.env.NEXT_PUBLIC_EXPLORER_URL || 'https://explorer.test.mezo.org';

function buildSyntheticCycle(
  cycleId: string,
  onChain: OnChainCycle,
  parts?: { debtors: string[]; creditors: string[] },
  projection?: any
): SettlementCycle {
  const debtors = parts?.debtors || [];
  const creditors = parts?.creditors || [];
  const deposits: Record<string, { required: bigint; funded: bigint }> = {};
  debtors.forEach((d) => {
    const dLower = d.toLowerCase();
    deposits[dLower] = {
      required: onChain.netDebtTotal / (BigInt(debtors.length) || 1n),
      funded: onChain.totalFunded >= onChain.netDebtTotal ? onChain.netDebtTotal / (BigInt(debtors.length) || 1n) : 0n,
    };
  });
  return {
    id: cycleId,
    groupId: projection?.group_id || '00000000-0000-0000-0000-000000000001',
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
      debtors: debtors.map((d) => ({
        address: d,
        amount: onChain.netDebtTotal / (BigInt(debtors.length) || 1n),
      })),
      creditors: creditors.map((c) => ({
        address: c,
        amount: onChain.totalDistributed / (BigInt(creditors.length) || 1n),
      })),
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
  const { address: userAddress, isConnected, chainId } = useAccount();
  const musd = useMusdToken({ spenderAddress: CONTRACT_ADDRESSES.settlementKernel });
  const kernel = useSettlementKernel();
  const authoritative = useAuthoritativeCycle(cycleId);

  // Reactive CometBFT WebSocket event stream for instant single-block UI updates
  useSettlementEvents(cycleId, {
    onDepositReceived: () => {
      authoritative.refetch();
      refreshCycle();
    },
    onCycleReadyToSettle: () => {
      authoritative.refetch();
      refreshCycle();
    },
    onCycleSettled: () => {
      authoritative.refetch();
      refreshCycle();
    },
    onCycleCancelled: () => {
      authoritative.refetch();
      refreshCycle();
    },
    onRefundClaimed: () => {
      authoritative.refetch();
      refreshCycle();
    },
  });

  const [cycle, setCycle] = useState<SettlementCycle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTxAction, setActiveTxAction] = useState<string | null>(null);

  const isLiveContractReady =
    isConnected &&
    isSupportedNetwork(chainId) &&
    CONTRACT_ADDRESSES.settlementKernel !== '0x0000000000000000000000000000000000000000';

  const refreshCycle = () => {
    setIsLoading(true);
    const found = getCycleById(cycleId, mode);
    if (found) {
      setCycle(found);
      setIsLoading(false);
      return;
    }
    if (mode === 'live') {
      if (cycleId.toLowerCase() === VERIFIED_MEZO_CYCLE.id.toLowerCase()) {
        setCycle(VERIFIED_MEZO_CYCLE);
        setIsLoading(false);
        return;
      }
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
          setActionSuccess('Deposit confirmed on Mezo Testnet! On-chain state updated.');
        } else if (activeTxAction === 'execute' && kernel.txHash) {
          const localCycles = loadCycles('live');
          const existing = localCycles.find((c) => c.id.toLowerCase() === cycleId.toLowerCase());
          if (existing) {
            existing.txSettlementHash = kernel.txHash;
            saveCycles(localCycles, 'live');
          }
          setActionSuccess('Settlement successfully executed! Funds distributed atomically on Mezo Testnet.');
        } else if (activeTxAction === 'refund') {
          setActionSuccess('Refund confirmed on Mezo Testnet.');
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
    if (!base && cycleId.toLowerCase() === VERIFIED_MEZO_CYCLE.id.toLowerCase()) {
      base = VERIFIED_MEZO_CYCLE;
    }
    if (!base && authoritative.cycle && authoritative.cycle.state !== CycleStateOnChain.NonExistent) {
      base = buildSyntheticCycle(
        cycleId,
        authoritative.cycle,
        authoritative.participants ?? undefined,
        authoritative.projection
      );
    }

    if (!base) return null;

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
  }, [cycle, mode, authoritative.cycle, authoritative.participants, authoritative.debtorStatus, authoritative.projection, userAddress, cycleId]);

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

  // Handle MUSD Approval
  const handleApprove = async (amount: bigint) => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await musd.approve(CONTRACT_ADDRESSES.settlementKernel, amount);
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

    // In Live Mode: strictly require on-chain transaction on Mezo Testnet (no simulated fallback)
    if (mode === 'live') {
      if (!isLiveContractReady) {
        setErrorMsg('Live deposits require a wallet connected to Mezo Testnet (Chain ID 31611). Switch to Demo Sandbox in the header to simulate.');
        setIsSubmitting(false);
        return;
      }
      if (userAddress?.toLowerCase() !== debtorAddr.toLowerCase()) {
        setErrorMsg(`In Live Mode, only debtor ${debtorAddr.slice(0, 6)}...${debtorAddr.slice(-4)} can submit this deposit on Mezo Testnet. Switch connected wallet or switch to Demo Sandbox in the header.`);
        setIsSubmitting(false);
        return;
      }

      try {
        setActiveTxAction('deposit');
        await kernel.deposit(cycleId as `0x${string}`, remainingDue);
      } catch (err: any) {
        setErrorMsg(err.message || 'Deposit on Mezo Testnet failed.');
        setActiveTxAction(null);
        setIsSubmitting(false);
      }
      return;
    }

    // In Demo Mode: simulate instant mock token deposit
    try {
      depositToCycle(cycleId, debtorAddr, remainingDue, 'demo');
      refreshCycle();
      setActionSuccess(`[Demo Sandbox] Simulated deposit of ${formatBaseUnitsToDisplay(remainingDue)} for ${getParticipantDisplayName(debtorAddr, true)}.`);
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
        setErrorMsg('Executing live settlement requires your wallet connected to Mezo Testnet (Chain ID 31611).');
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
        setErrorMsg('Claiming refund on Mezo Testnet requires a connected wallet.');
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
        setErrorMsg('Cancelling a cycle on Mezo Testnet requires a connected wallet.');
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
  const isMusdPending = musd.isPending;
  const activeTxHash = kernel.txHash || musd.txHash;
  const activeError = kernel.error || musd.error || errorMsg;

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
          <span>Back to Settlement Cycles</span>
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
              {mode === 'demo' ? 'Demo Sandbox' : 'Mezo Testnet'}
            </span>
          </div>
          <p className={obStyles.subtitle}>
            Cycle ID: <code style={{ fontSize: '13px' }}>{displayCycle.id}</code>
          </p>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
          <Link href={`/cycles/${cycleId}/audit`} style={{ textDecoration: 'none' }}>
            <Button variant="secondary" icon={<Icon icon={FileText} size="sm" />}>
              View Audit Statement
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
              Cancel Settlement Cycle
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
            <strong>On-Chain Financial Truth Active:</strong> SettlementKernel on Mezo Testnet confirmed the latest funds/state. Supabase indexer projection is syncing in the background.
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
      {(isKernelPending || isMusdPending || activeTxHash || kernel.error || musd.error) && (
        <div style={{ marginBottom: 'var(--space-lg)' }}>
          <TransactionStatus
            state={
              kernel.isConfirmed || musd.isConfirmed
                ? 'confirmed'
                : kernel.error || musd.error
                ? 'reverted'
                : activeTxHash
                ? 'pending'
                : 'awaiting_signature'
            }
            hash={activeTxHash}
            errorMessage={kernel.error || musd.error}
            title={
              kernel.isConfirmed
                ? 'On-Chain Transaction Confirmed!'
                : musd.isConfirmed
                ? 'MUSD Allowance Confirmed!'
                : activeTxHash
                ? 'Broadcasting to Mezo Testnet...'
                : 'Awaiting Wallet Signature...'
            }
            onDismiss={() => {
              kernel.resetWrite();
              musd.resetWrite();
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

      {errorMsg && !kernel.error && !musd.error && (
        <div className={obStyles.errorBanner} role="alert">
          <Icon icon={AlertTriangle} size="sm" color="var(--color-danger)" />
          <span>{errorMsg}</span>
        </div>
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
            {formatBaseUnitsToDisplay(displayCycle.totalFunded)} / {formatBaseUnitsToDisplay(displayCycle.netDebtTotal)} ({fundingPercent}%)
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
            Verified On-Chain Transactions (Mezo Testnet Chain 31611)
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
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
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
              const needsApproval = isCurrentUser && musd.allowance < remaining;

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
                    Required: {formatBaseUnitsToDisplay(deposit.required)} &bull; Deposited: {formatBaseUnitsToDisplay(deposit.funded)}
                  </div>

                  {displayCycle.state === 'Funding' && !isDebtorDone && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                      {needsApproval ? (
                        <Button
                          variant="secondary"
                          disabled={isOffline || isSubmitting || isMusdPending}
                          isLoading={isMusdPending}
                          loadingText="Approving MUSD..."
                          onClick={() => handleApprove(remaining)}
                          style={{ width: '100%', minHeight: '36px', fontSize: '13px' }}
                        >
                          Step 1: Approve MUSD Spending
                        </Button>
                      ) : (
                        <Button
                          variant="primary"
                          disabled={isOffline || isSubmitting || isKernelPending}
                          isLoading={isKernelPending}
                          loadingText="Depositing..."
                          onClick={() => handleDeposit(debtorAddr, remaining)}
                          style={{ width: '100%', minHeight: '36px', fontSize: '13px' }}
                        >
                          {mode === 'demo'
                            ? `Simulate Deposit (${formatBaseUnitsToDisplay(remaining)})`
                            : isCurrentUser && isLiveContractReady
                            ? `Deposit on Mezo (${formatBaseUnitsToDisplay(remaining)})`
                            : `Deposit ${formatBaseUnitsToDisplay(remaining)}`}
                        </Button>
                      )}
                    </div>
                  )}

                  {(displayCycle.state === 'Expired' || displayCycle.state === 'Cancelled') && deposit.funded > 0n && (
                    <Button
                      variant="destructive"
                      disabled={isOffline || isSubmitting || isKernelPending}
                      isLoading={isSubmitting && activeTxAction === 'refund'}
                      loadingText="Claiming Refund..."
                      onClick={() => handleRefund(debtorAddr)}
                      style={{ width: '100%', minHeight: '36px', fontSize: '13px' }}
                    >
                      Claim Refund ({formatBaseUnitsToDisplay(deposit.funded)})
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
                  Receives: {formatBaseUnitsToDisplay(creditor.amount)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
