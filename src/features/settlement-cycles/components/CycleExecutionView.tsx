'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import obStyles from '@/features/obligations/components/ObligationsView.module.css';
import { SettlementCycle } from '../types';
import { getCycleById, depositToCycle, executeCycleSettlement, claimRefundFromCycle, saveCycles, loadCycles } from '../store';
import { syncCycleToSupabase } from '@/lib/db/syncService';
import { formatBaseUnitsToDisplay } from '@/features/obligations/store';
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
import { useSettlementKernel } from '@/lib/chain/useSettlementKernel';
import { CONTRACT_ADDRESSES, isSupportedNetwork } from '@/lib/chain/config';
import { TransactionStatus } from '@/components/common/TransactionStatus';

export interface CycleExecutionViewProps {
  cycleId: string;
}

const EXPLORER_BASE = process.env.NEXT_PUBLIC_EXPLORER_URL || 'https://explorer.test.mezo.org';

export function CycleExecutionView({ cycleId }: CycleExecutionViewProps) {
  const { address: userAddress, isConnected, chainId } = useAccount();
  const musd = useMusdToken({ spenderAddress: CONTRACT_ADDRESSES.settlementKernel });
  const kernel = useSettlementKernel();

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
    const found = getCycleById(cycleId);
    setCycle(found || null);
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
  }, [cycleId]);

  // Handle on-chain write completion
  useEffect(() => {
    if (kernel.isConfirmed && cycle) {
      if (activeTxAction === 'deposit') {
        const remaining = cycle.deposits[userAddress?.toLowerCase() || '']?.required || 0n;
        const updated = depositToCycle(cycleId, userAddress || '', remaining);
        updated.txDepositHash = kernel.txHash;
        saveCycles(loadCycles().map((c) => (c.id === updated.id ? updated : c)));
        syncCycleToSupabase(updated).catch((err) => console.warn('[Sync] Supabase cycle update deferred:', err));
        refreshCycle();
        setActionSuccess('Deposit confirmed on Mezo Testnet!');
      } else if (activeTxAction === 'execute') {
        const updated = executeCycleSettlement(cycleId);
        updated.txSettlementHash = kernel.txHash;
        saveCycles(loadCycles().map((c) => (c.id === updated.id ? updated : c)));
        syncCycleToSupabase(updated).catch((err) => console.warn('[Sync] Supabase cycle update deferred:', err));
        refreshCycle();
        setActionSuccess('Settlement successfully executed! Funds distributed on Mezo Testnet.');
      } else if (activeTxAction === 'refund') {
        const updated = claimRefundFromCycle(cycleId, userAddress || '');
        syncCycleToSupabase(updated).catch((err) => console.warn('[Sync] Supabase cycle update deferred:', err));
        refreshCycle();
        setActionSuccess('Refund confirmed on Mezo Testnet.');
      }
      setActiveTxAction(null);
    }
  }, [kernel.isConfirmed]);

  if (isLoading) {
    return (
      <div style={{ padding: 'var(--space-2xl) 0' }}>
        <p style={{ color: 'var(--color-muted)' }}>Loading settlement cycle {cycleId}...</p>
      </div>
    );
  }

  if (!cycle) {
    return (
      <div className={obStyles.emptyState}>
        <Icon icon={CycleIcon} size="lg" color="var(--color-wine)" />
        <h2 className={obStyles.emptyStateTitle}>Settlement Cycle Not Found</h2>
        <p className={obStyles.emptyStateDesc}>
          The requested cycle ID "{cycleId}" does not exist in local storage or has been archived.
        </p>
        <Link href="/cycles" style={{ textDecoration: 'none' }}>
          <Button variant="primary">View All Cycles</Button>
        </Link>
      </div>
    );
  }

  const isFunded = cycle.netDebtTotal > 0n && cycle.totalFunded >= cycle.netDebtTotal;
  const fundingPercent = cycle.netDebtTotal > 0n
    ? Number((cycle.totalFunded * 100n) / cycle.netDebtTotal)
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

    // If connected wallet matches debtor on Mezo Testnet, submit real on-chain deposit!
    if (isLiveContractReady && cycleId.startsWith('0x') && userAddress?.toLowerCase() === debtorAddr.toLowerCase()) {
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

    // Local / simulation fallback
    try {
      depositToCycle(cycleId, debtorAddr, remainingDue);
      refreshCycle();
      setActionSuccess(`Deposit of ${formatBaseUnitsToDisplay(remainingDue)} confirmed for ${debtorAddr.slice(0, 6)}...`);
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Deposit transaction failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Execute Settlement
  const handleExecute = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);

    if (isLiveContractReady && cycleId.startsWith('0x')) {
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

    try {
      executeCycleSettlement(cycleId);
      refreshCycle();
      setActionSuccess('Settlement successfully executed! Funds distributed atomically to net creditors.');
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Execution failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Refund
  const handleRefund = async (debtorAddr: string) => {
    setIsSubmitting(true);
    setErrorMsg(null);

    if (isLiveContractReady && cycleId.startsWith('0x') && userAddress?.toLowerCase() === debtorAddr.toLowerCase()) {
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

    try {
      claimRefundFromCycle(cycleId, debtorAddr);
      refreshCycle();
      setActionSuccess('Refund claimed successfully.');
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Refund claim failed.');
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
                  cycle.state === 'Completed'
                    ? 'var(--color-success-bg)'
                    : cycle.state === 'ReadyToSettle'
                    ? 'var(--color-sand-light)'
                    : 'var(--color-surface)',
                color:
                  cycle.state === 'Completed'
                    ? 'var(--color-success)'
                    : cycle.state === 'ReadyToSettle'
                    ? 'var(--color-wine)'
                    : 'var(--color-ink)',
                border: '1px solid var(--color-border)',
              }}
            >
              {cycle.state === 'ReadyToSettle' ? 'Ready to Settle (100% Funded)' : cycle.state}
            </span>
          </div>
          <p className={obStyles.subtitle}>
            Cycle ID: <code style={{ fontSize: '13px' }}>{cycle.id}</code>
          </p>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
          <Link href={`/cycles/${cycleId}/audit`} style={{ textDecoration: 'none' }}>
            <Button variant="secondary" icon={<Icon icon={FileText} size="sm" />}>
              View Audit Statement
            </Button>
          </Link>

          {isFunded && cycle.state !== 'Completed' && (
            <Button
              variant="primary"
              icon={<Icon icon={Zap} size="sm" color="#FFFFFF" />}
              disabled={isOffline || isSubmitting || isKernelPending}
              isLoading={isSubmitting || isKernelPending}
              loadingText="Executing Settlement..."
              onClick={handleExecute}
            >
              Execute Settlement (Atomic Distribution)
            </Button>
          )}
        </div>
      </div>

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
            {formatBaseUnitsToDisplay(cycle.totalFunded)} / {formatBaseUnitsToDisplay(cycle.netDebtTotal)} ({fundingPercent}%)
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
      {(cycle.txCreationHash || cycle.txDepositHash || cycle.txSettlementHash) && (
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
            {cycle.txCreationHash && (
              <div>
                <span style={{ color: 'var(--color-muted)' }}>Creation: </span>
                <a
                  href={`${EXPLORER_BASE}/tx/${cycle.txCreationHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--color-wine)', fontWeight: 600, textDecoration: 'underline' }}
                >
                  {cycle.txCreationHash.slice(0, 10)}...{cycle.txCreationHash.slice(-8)}
                  <Icon icon={ExternalLink} size="sm" style={{ marginLeft: '3px', verticalAlign: 'middle' }} />
                </a>
              </div>
            )}
            {cycle.txDepositHash && (
              <div>
                <span style={{ color: 'var(--color-muted)' }}>Deposit: </span>
                <a
                  href={`${EXPLORER_BASE}/tx/${cycle.txDepositHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--color-wine)', fontWeight: 600, textDecoration: 'underline' }}
                >
                  {cycle.txDepositHash.slice(0, 10)}...{cycle.txDepositHash.slice(-8)}
                  <Icon icon={ExternalLink} size="sm" style={{ marginLeft: '3px', verticalAlign: 'middle' }} />
                </a>
              </div>
            )}
            {cycle.txSettlementHash && (
              <div>
                <span style={{ color: 'var(--color-muted)' }}>Settlement: </span>
                <a
                  href={`${EXPLORER_BASE}/tx/${cycle.txSettlementHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--color-wine)', fontWeight: 600, textDecoration: 'underline' }}
                >
                  {cycle.txSettlementHash.slice(0, 10)}...{cycle.txSettlementHash.slice(-8)}
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
            Net Debtors ({Object.keys(cycle.deposits).length})
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {Object.entries(cycle.deposits).map(([debtorAddr, deposit]) => {
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                      <span className={obStyles.addressCode}>{debtorAddr}</span>
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

                  {cycle.state === 'Funding' && !isDebtorDone && (
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
                          {isCurrentUser && isLiveContractReady
                            ? `Deposit on Mezo (${formatBaseUnitsToDisplay(remaining)})`
                            : `Deposit ${formatBaseUnitsToDisplay(remaining)}`}
                        </Button>
                      )}
                    </div>
                  )}

                  {cycle.state === 'Expired' && deposit.funded > 0n && (
                    <Button
                      variant="destructive"
                      disabled={isOffline || isSubmitting || isKernelPending}
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
            Net Creditors ({cycle.nettingResult.creditors.length})
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {cycle.nettingResult.creditors.map((creditor) => (
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
                  <span className={obStyles.addressCode}>{creditor.address}</span>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: cycle.state === 'Completed' ? 'var(--color-success)' : 'var(--color-muted)',
                    }}
                  >
                    {cycle.state === 'Completed' ? 'Paid' : 'Awaiting Settlement'}
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
