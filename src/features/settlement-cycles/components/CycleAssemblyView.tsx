'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { keccak256, toHex, type Address } from 'viem';
import styles from './NettingGraph.module.css';
import obStyles from '@/features/obligations/components/ObligationsView.module.css';
import { loadObligations, formatBaseUnitsToDisplay } from '@/features/obligations/store';
import { Obligation } from '@/features/obligations/types';
import { calculateNetting, ObligationInput } from '../netting';
import { createCycleFromObligations, saveCycles, loadCycles } from '../store';
import { syncCycleToSupabase } from '@/lib/db/syncService';
import { NettingGraph } from './NettingGraph';
import { Button } from '@/components/common/Button';
import { Icon } from '@/components/icons/Icon';
import { CycleIcon, SnapshotIcon } from '@/components/icons/netteo';
import { ArrowLeft, Check, AlertCircle, RefreshCw, Send } from 'lucide-react';
import { useSettlementKernel, CycleInput } from '@/lib/chain/useSettlementKernel';
import { CONTRACT_ADDRESSES, isSupportedNetwork, MEZO_TESTNET_CHAIN_ID } from '@/lib/chain/config';
import { SUPPORTED_SETTLEMENT_TOKENS, getTokenByAddress } from '@/lib/chain/tokens';
import { TransactionStatus } from '@/components/common/TransactionStatus';
import { useWorkspace } from '@/features/workspace/WorkspaceContext';
import { useToast } from '@/components/ui/Toast/ToastContext';

export function CycleAssemblyView() {
  const router = useRouter();
  const { mode, resetCounter } = useWorkspace();
  const { toast } = useToast();
  const { isConnected, chainId, address: userAddress } = useAccount();
  const { createCycle, isPending: isTxPending, isConfirming, isConfirmed, txHash, error: txError, resetWrite } = useSettlementKernel();

  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [pendingCycleId, setPendingCycleId] = useState<`0x${string}` | null>(null);
  const [selectedTokenAddress, setSelectedTokenAddress] = useState<string>(CONTRACT_ADDRESSES.musd);

  const isLiveContractReady =
    isConnected &&
    isSupportedNetwork(chainId) &&
    CONTRACT_ADDRESSES.settlementKernel !== '0x0000000000000000000000000000000000000000';

  useEffect(() => {
    try {
      const all = loadObligations(mode);
      const accepted = all.filter((o) => o.status === 'Accepted');
      setObligations(accepted);
      setSelectedIds(accepted.map((o) => o.id));
    } catch {
      setError('Failed to load eligible obligations.');
    } finally {
      setIsLoading(false);
    }

    if (typeof window !== 'undefined') {
      setIsOffline(!navigator.onLine);
    }
  }, [mode, resetCounter]);

  // When on-chain cycle creation confirms
  useEffect(() => {
    if (isConfirmed && pendingCycleId && nettingResult) {
      try {
        const cycle = createCycleFromObligations(
          selectedObligations[0]?.groupId || '00000000-0000-0000-0000-000000000001',
          selectedIds,
          userAddress || undefined
        );
        cycle.id = pendingCycleId;
        cycle.txCreationHash = txHash;
        const existing = loadCycles().filter((c) => c.id !== cycle.id);
        saveCycles([cycle, ...existing]);

        // Background sync to Supabase
        syncCycleToSupabase(cycle).catch((err) => {
          console.warn('[Sync] Supabase cycle sync deferred:', err);
        });

        setTimeout(() => {
          router.push(`/cycles/${pendingCycleId}`);
        }, 1500);
      } catch (err: any) {
        setError(err.message || 'Error finalizing cycle navigation.');
      }
    }
  }, [isConfirmed, pendingCycleId]);

  const handleToggle = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === obligations.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(obligations.map((o) => o.id));
    }
  };

  const selectedObligations = obligations.filter((o) => selectedIds.includes(o.id));

  // Compute live netting
  const nettingInputs: ObligationInput[] = selectedObligations.map((o) => ({
    id: o.id,
    debtor: o.debtorAddress,
    creditor: o.creditorAddress,
    amount: o.amount,
    referenceLabel: o.referenceLabel,
  }));

  const nettingResult = selectedObligations.length > 0
    ? calculateNetting(nettingInputs, 10, 30, {
        chainId: chainId || MEZO_TESTNET_CHAIN_ID,
        tokenAddress: selectedTokenAddress,
      })
    : null;

  const handleFreezeCycle = async () => {
    if (selectedIds.length === 0 || !nettingResult) return;
    setIsSubmitting(true);
    setError(null);

    // In Live Mode: strictly require live contract on Mezo Testnet (fail-closed, no fake simulation)
    if (mode === 'live') {
      if (!isLiveContractReady) {
        setError(
          !isConnected
            ? 'Live cycle creation requires a connected wallet. Please connect your wallet to Mezo Testnet (Chain ID 31611) or switch to Demo Sandbox in the header.'
            : !isSupportedNetwork(chainId)
            ? `Please switch your wallet to Mezo Testnet (Chain ID ${MEZO_TESTNET_CHAIN_ID}).`
            : 'SettlementKernel contract address is not configured.'
        );
        setIsSubmitting(false);
        return;
      }

      try {
        const randSeed = Math.floor(Math.random() * 1000000000);
        const generatedCycleId = keccak256(toHex(`netteo-cycle-${Date.now()}-${randSeed}`)) as `0x${string}`;
        setPendingCycleId(generatedCycleId);

        const cycleInput: CycleInput = {
          cycleId: generatedCycleId,
          snapshotCommitment: nettingResult.canonicalCommitmentHash as `0x${string}`,
          algorithmVersion: 'netteo-v1.0-deterministic',
          grossObligationTotal: nettingResult.grossObligationTotal,
          fundingDuration: 72n * 3600n, // 72 hours
          debtors: nettingResult.debtors.map((d) => d.address as Address),
          debitAmounts: nettingResult.debtors.map((d) => d.amount),
          creditors: nettingResult.creditors.map((c) => c.address as Address),
          creditAmounts: nettingResult.creditors.map((c) => c.amount),
        };

        toast.info('Submitting Transaction', 'Broadcasting cycle snapshot to Mezo Testnet...');
        await createCycle(cycleInput);
      } catch (err: any) {
        toast.error('Cycle Freeze Failed', err.message || 'On-chain cycle creation failed.');
        setError(err.message || 'On-chain cycle creation failed.');
        setIsSubmitting(false);
      }
      return;
    }

    // In Demo Sandbox: simulate freezing in isolated demo storage
    try {
      const cycle = createCycleFromObligations(
        selectedObligations[0]?.groupId || '00000000-0000-0000-0000-000000000001',
        selectedIds,
        '0x1111111111111111111111111111111111111111',
        'demo',
        selectedTokenAddress
      );
      toast.success('Settlement Cycle Frozen', 'Deterministic net positions calculated and snapshot locked.');
      router.push(`/cycles/${cycle.id}`);
    } catch (err: any) {
      toast.error('Assembly Failed', err.message || 'Failed to assemble and freeze demo settlement cycle.');
      setError(err.message || 'Failed to assemble and freeze demo settlement cycle.');
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: 'var(--space-2xl) 0' }}>
        <p style={{ color: 'var(--color-muted)' }}>Loading eligible obligations...</p>
      </div>
    );
  }

  if (obligations.length === 0) {
    return (
      <div className={obStyles.emptyState}>
        <Icon icon={CycleIcon} size="lg" color="var(--color-wine)" />
        <h2 className={obStyles.emptyStateTitle}>No Approved Payments Ready</h2>
        <p className={obStyles.emptyStateDesc}>
          To start a group settlement, at least two payments must be approved by their respective payers.
        </p>
        <Link href="/obligations" style={{ textDecoration: 'none' }}>
          <Button variant="primary">
            Go to Payments
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className={obStyles.pageHeader}>
        <div className={obStyles.titleArea}>
          <div style={{ marginBottom: 'var(--space-xs)' }}>
            <Link
              href="/obligations"
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
              <span>Back to Payments</span>
            </Link>
          </div>
          <h1>Start Group Settlement</h1>
          <p className={obStyles.subtitle}>
            Select approved payments to calculate net balances. Payments are locked into an atomic settlement where reciprocal debts cancel out.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', marginTop: 'var(--space-xs)' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Settlement Currency:
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              {SUPPORTED_SETTLEMENT_TOKENS.map((token) => {
                const isSelected = selectedTokenAddress.toLowerCase() === token.address.toLowerCase();
                return (
                  <button
                    key={token.address}
                    type="button"
                    onClick={() => setSelectedTokenAddress(token.address)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '16px',
                      fontSize: '12px',
                      fontFamily: 'inherit',
                      fontWeight: isSelected ? 600 : 400,
                      cursor: 'pointer',
                      border: isSelected ? '1px solid var(--color-wine)' : '1px solid var(--color-border)',
                      background: isSelected ? 'rgba(127, 1, 31, 0.08)' : 'var(--color-surface)',
                      color: isSelected ? 'var(--color-wine)' : 'var(--color-ink)',
                      transition: 'all 120ms cubic-bezier(0.2, 0, 0, 1)',
                    }}
                  >
                    {token.symbol}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 'var(--space-xs)' }}>
          <Button
            variant="primary"
            icon={<Icon icon={isLiveContractReady ? Send : SnapshotIcon} size="sm" color="#FFFFFF" />}
            disabled={selectedIds.length === 0 || isOffline || isSubmitting || isTxPending}
            isLoading={isSubmitting || isTxPending}
            loadingText={isConfirming ? 'Confirming on Mezo...' : 'Locking Settlement...'}
            onClick={handleFreezeCycle}
          >
            {mode === 'live'
              ? isLiveContractReady
                ? `Lock & Settle on Mezo (${selectedIds.length} payments)`
                : `Connect Wallet to Settle (${selectedIds.length} payments)`
              : `Lock & Settle Demo (${selectedIds.length} payments)`}
          </Button>
          {mode === 'demo' ? (
            <span style={{ fontSize: '11px', color: 'var(--color-wine)', fontWeight: 500 }}>
              &bull; Demo Sandbox Mode (Instant Settlement Simulation)
            </span>
          ) : isLiveContractReady ? (
            <span style={{ fontSize: '11px', color: 'var(--color-success)', fontWeight: 500 }}>
              &bull; Connected to Mezo Testnet ({CONTRACT_ADDRESSES.settlementKernel.slice(0, 6)}...{CONTRACT_ADDRESSES.settlementKernel.slice(-4)})
            </span>
          ) : (
            <span style={{ fontSize: '11px', color: 'var(--color-danger)', fontWeight: 500 }}>
              &bull; Wallet/Kernel not connected to Mezo Testnet
            </span>
          )}
        </div>
      </div>

      {/* Transaction Status Feedback */}
      {(isTxPending || txHash || txError) && (
        <div style={{ marginBottom: 'var(--space-lg)' }}>
          <TransactionStatus
            state={
              isConfirmed
                ? 'confirmed'
                : txError
                ? 'reverted'
                : txHash
                ? 'pending'
                : 'awaiting_signature'
            }
            hash={txHash}
            errorMessage={txError}
            title={
              isConfirmed
                ? 'Settlement Created on Mezo Testnet!'
                : txHash
                ? 'Broadcasting Settlement to Mezo Testnet...'
                : 'Awaiting Signature to Lock Settlement...'
            }
            onDismiss={() => {
              resetWrite();
              setIsSubmitting(false);
            }}
          />
        </div>
      )}

      {error && !txError && (
        <div className={obStyles.errorBanner} role="alert" style={{ marginBottom: 'var(--space-lg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
            <Icon icon={AlertCircle} size="sm" color="var(--color-danger)" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Netting Graph Preview */}
      {nettingResult && (
        <NettingGraph
          nettingResult={nettingResult}
          includedObligations={nettingInputs}
        />
      )}

      {/* Snapshot Commitment Preview */}
      {nettingResult && (
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-md) var(--space-lg)',
            marginBottom: 'var(--space-xl)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 'var(--space-sm)',
          }}
        >
          <div>
            <div style={{ fontSize: '11px', color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Settlement Proof Hash (Keccak256)
            </div>
            <code style={{ fontSize: '12px', color: 'var(--color-ink)', fontVariantNumeric: 'tabular-nums' }}>
              {nettingResult.canonicalCommitmentHash}
            </code>
            <div style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '2px' }}>
              Cryptographic proof tying together all participants, payments, and net balances.
            </div>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--color-success)', fontWeight: 500 }}>
            &bull; Mathematical Balance Verified (&Sigma; net = 0)
          </span>
        </div>
      )}

      {/* Obligation Checklist Table */}
      <div className={obStyles.ledgerContainer}>
        <div style={{ padding: 'var(--space-md) var(--space-lg)', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-ink)', margin: 0 }}>
            Approved Payments to Include
          </h3>
          <Button variant="tertiary" onClick={handleSelectAll} style={{ minHeight: '30px', fontSize: '12px' }}>
            {selectedIds.length === obligations.length ? 'Deselect All' : 'Select All'}
          </Button>
        </div>

        <div className={obStyles.tableWrapper}>
          <table className={obStyles.ledgerTable} aria-label="Eligible payments selection table">
            <thead>
              <tr>
                <th scope="col" style={{ width: '40px' }}>Include</th>
                <th scope="col">Payment ID</th>
                <th scope="col">Who Pays (Debtor)</th>
                <th scope="col">Who Receives (Creditor)</th>
                <th scope="col">Description</th>
                <th scope="col" style={{ textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {obligations.map((ob) => {
                const isChecked = selectedIds.includes(ob.id);
                return (
                  <tr
                    key={ob.id}
                    onClick={() => handleToggle(ob.id)}
                    style={{ cursor: 'pointer', backgroundColor: isChecked ? 'rgba(245, 235, 208, 0.3)' : undefined }}
                  >
                    <td>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // handled by row onClick
                        aria-label={`Select obligation ${ob.id}`}
                      />
                    </td>
                    <td><span className={obStyles.addressCode}>{ob.id.slice(0, 10)}</span></td>
                    <td><span className={obStyles.addressCode}>{ob.debtorAddress.slice(0, 6)}...{ob.debtorAddress.slice(-4)}</span></td>
                    <td><span className={obStyles.addressCode}>{ob.creditorAddress.slice(0, 6)}...{ob.creditorAddress.slice(-4)}</span></td>
                    <td><div className={obStyles.labelCell}>{ob.referenceLabel}</div></td>
                    <td style={{ textAlign: 'right' }}><span className={obStyles.amountCell}>{ob.amountDisplay}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
