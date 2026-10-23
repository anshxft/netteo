'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './ObligationsView.module.css';
import { Obligation } from '../types';
import { loadObligations, saveObligations, formatBaseUnitsToDisplay } from '../store';
import { syncObligationsFromSupabase } from '@/lib/db/syncService';
import { useWorkspace } from '@/features/workspace/WorkspaceContext';
import { Button } from '@/components/common/Button';
import { Icon } from '@/components/icons/Icon';
import { ObligationsLedger } from './ObligationsLedger';
import { ProposeObligationModal } from './ProposeObligationModal';
import { ObligationIcon, CycleIcon } from '@/components/icons/netteo';
import { Plus, AlertCircle, RefreshCw, ArrowRight, WifiOff } from 'lucide-react';
import { useToast } from '@/components/ui/Toast/ToastContext';

export function ObligationsView() {
  const { mode, resetCounter } = useWorkspace();
  const { toast } = useToast();
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const fetchObligations = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (mode === 'live') {
        const remote = await syncObligationsFromSupabase();
        if (remote && remote.length > 0) {
          setObligations(remote);
          saveObligations(remote, 'live');
        } else {
          const data = loadObligations('live');
          setObligations(data);
        }
      } else {
        const data = loadObligations('demo');
        setObligations(data);
      }
    } catch {
      try {
        const data = loadObligations(mode);
        setObligations(data);
      } catch {
        setError('Unable to load obligations. Please retry.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchObligations();

    if (typeof window !== 'undefined') {
      setIsOffline(!navigator.onLine);
      const onOnline = () => {
        setIsOffline(false);
        fetchObligations();
      };
      const onOffline = () => setIsOffline(true);
      const onSynced = () => fetchObligations();

      window.addEventListener('online', onOnline);
      window.addEventListener('offline', onOffline);
      window.addEventListener('netteo_proposals_synced', onSynced);
      return () => {
        window.removeEventListener('online', onOnline);
        window.removeEventListener('offline', onOffline);
        window.removeEventListener('netteo_proposals_synced', onSynced);
      };
    }
  }, [mode, resetCounter]);

  const handleCreated = () => {
    fetchObligations();
    toast.success('Obligation Proposed', 'New obligation registered. Awaiting counterparty acceptance.');
    setSuccessNotice('Obligation proposed successfully. Awaiting debtor acceptance.');
    setTimeout(() => setSuccessNotice(null), 3000);
  };

  const acceptedCount = obligations.filter((o) => o.status === 'Accepted').length;
  const grossAcceptedTotal = obligations
    .filter((o) => o.status === 'Accepted')
    .reduce((sum, o) => sum + o.amount, 0n);

  return (
    <div>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div className={styles.titleArea}>
          <h1>Payments</h1>
          <p className={styles.subtitle}>
            Track what you owe and what others owe you. Approve payment claims to include them in the next group settlement.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
          <Button
            variant="secondary"
            icon={<Icon icon={Plus} size="sm" />}
            disabled={isLoading}
            onClick={() => setIsModalOpen(true)}
          >
            New Payment Claim
          </Button>
          {acceptedCount >= 2 && (
            <Link href="/cycles/new" style={{ textDecoration: 'none' }}>
              <Button
                variant="primary"
                icon={<Icon icon={CycleIcon} size="sm" color="#FFFFFF" />}
                disabled={isOffline || isLoading}
              >
                Start Group Settlement ({acceptedCount} ready)
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* --- STATE 5: Offline State Notice Banner --- */}
      {isOffline && (
        <div
          className={styles.errorBanner}
          style={{
            backgroundColor: 'var(--color-sand)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-ink)',
            marginBottom: 'var(--space-lg)',
          }}
          role="status"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
            <Icon icon={WifiOff} size="sm" color="var(--color-muted)" />
            <span>
              <strong>Working offline.</strong> Payments recorded now are stored locally and will automatically sync to the shared ledger when reconnected.
            </span>
          </div>
        </div>
      )}

      {/* Summary KPI Strip */}
      {!isLoading && obligations.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: 'var(--space-md)',
            marginBottom: 'var(--space-xl)',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-md) var(--space-lg)',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Payments Tracked
            </div>
            <div style={{ fontSize: '26px', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--color-ink)' }}>
              {obligations.length}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '2px' }}>
              Across all group members
            </div>
          </div>

          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-md) var(--space-lg)',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Approved & Ready to Settle
            </div>
            <div style={{ fontSize: '26px', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--color-success)' }}>
              {acceptedCount}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-success)', marginTop: '2px' }}>
              Eligible for net cancellation
            </div>
          </div>

          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-md) var(--space-lg)',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Volume Ready
            </div>
            <div style={{ fontSize: '26px', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--color-wine)' }}>
              {formatBaseUnitsToDisplay(grossAcceptedTotal)}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '2px' }}>
              MUSD gross obligation sum
            </div>
          </div>

          <div
            style={{
              backgroundColor: 'var(--color-sand-light)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-md) var(--space-lg)',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Estimated Net Savings
            </div>
            <div style={{ fontSize: '26px', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--color-success)' }}>
              ~70%
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-ink-secondary)', marginTop: '2px' }}>
              Freed up liquidity through netting
            </div>
          </div>
        </div>
      )}

      {/* Success Notification */}
      {successNotice && (
        <div className={styles.errorBanner} style={{ backgroundColor: 'var(--color-success-bg)', borderColor: 'var(--color-success-border)', color: 'var(--color-success)' }} role="status">
          <span>{successNotice}</span>
        </div>
      )}

      {/* --- STATE 1: Error State with Retry --- */}
      {error && (
        <div className={styles.errorBanner} role="alert">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
            <Icon icon={AlertCircle} size="sm" color="var(--color-danger)" />
            <span>{error}</span>
          </div>
          <Button variant="secondary" onClick={fetchObligations} style={{ minHeight: '32px' }}>
            <Icon icon={RefreshCw} size="sm" />
            Retry
          </Button>
        </div>
      )}

      {/* --- STATE 2: Loading Skeleton (within 200ms) --- */}
      {isLoading && (
        <div className={styles.ledgerContainer} aria-busy="true" aria-label="Loading obligation ledger...">
          <table className={styles.ledgerTable}>
            <tbody>
              {[1, 2, 3].map((n) => (
                <tr key={n} className={styles.skeletonRow}>
                  <td><div className={styles.skeletonLine} style={{ width: '80px' }} /></td>
                  <td><div className={styles.skeletonLine} style={{ width: '120px' }} /></td>
                  <td><div className={styles.skeletonLine} style={{ width: '120px' }} /></td>
                  <td><div className={styles.skeletonLine} style={{ width: '180px' }} /></td>
                  <td><div className={styles.skeletonLine} style={{ width: '90px' }} /></td>
                  <td><div className={styles.skeletonLine} style={{ width: '70px' }} /></td>
                  <td><div className={styles.skeletonLine} style={{ width: '100px' }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* --- STATE 3: Empty State --- */}
      {!isLoading && !error && obligations.length === 0 && (
        <div className={styles.emptyState}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-sand)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-wine)',
            }}
          >
            <Icon icon={ObligationIcon} size="lg" color="var(--color-wine)" />
          </div>
          <h2 className={styles.emptyStateTitle}>No Obligations Found</h2>
          <p className={styles.emptyStateDesc}>
            Propose a bilateral payment claim between members of a group. Once accepted by the debtor, it can be netted in a settlement.
          </p>
          <Button
            variant="primary"
            icon={<Icon icon={Plus} size="sm" color="#FFFFFF" />}
            onClick={() => setIsModalOpen(true)}
          >
            Propose Obligation
          </Button>
        </div>
      )}

      {/* --- STATE 4: Success / Populated Ledger --- */}
      {!isLoading && !error && obligations.length > 0 && (
        <ObligationsLedger
          obligations={obligations}
          onUpdate={fetchObligations}
          isOffline={isOffline}
        />
      )}

      {/* Propose Obligation Modal */}
      <ProposeObligationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={handleCreated}
      />
    </div>
  );
}
