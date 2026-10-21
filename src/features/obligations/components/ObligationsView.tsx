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
import { Plus, AlertCircle, RefreshCw, ArrowRight } from 'lucide-react';

export function ObligationsView() {
  const { mode, resetCounter } = useWorkspace();
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
      const onOnline = () => setIsOffline(false);
      const onOffline = () => setIsOffline(true);
      window.addEventListener('online', onOnline);
      window.addEventListener('offline', onOffline);
      return () => {
        window.removeEventListener('online', onOnline);
        window.removeEventListener('offline', onOffline);
      };
    }
  }, [mode, resetCounter]);

  const handleCreated = () => {
    fetchObligations();
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
          <h1>Obligation Desk</h1>
          <p className={styles.subtitle}>
            Bilateral payment obligations between defined group counterparties.
            Debtor acceptance is required before claims enter a settlement cycle.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
          <Button
            variant="secondary"
            icon={<Icon icon={Plus} size="sm" />}
            disabled={isOffline || isLoading}
            onClick={() => setIsModalOpen(true)}
          >
            Propose Obligation
          </Button>
          {acceptedCount >= 2 && (
            <Link href="/cycles/new" style={{ textDecoration: 'none' }}>
              <Button
                variant="primary"
                icon={<Icon icon={CycleIcon} size="sm" color="#FFFFFF" />}
                disabled={isOffline || isLoading}
              >
                Assemble Cycle ({acceptedCount} eligible)
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Summary KPI Strip */}
      {!isLoading && obligations.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 'var(--space-md)',
            marginBottom: 'var(--space-xl)',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-md)',
            }}
          >
            <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Claims
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--color-ink)' }}>
              {obligations.length}
            </div>
          </div>

          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-md)',
            }}
          >
            <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Accepted & Eligible for Netting
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--color-success)' }}>
              {acceptedCount}
            </div>
          </div>

          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-md)',
            }}
          >
            <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Gross Eligible Volume
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--color-wine)' }}>
              {formatBaseUnitsToDisplay(grossAcceptedTotal)}
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
            Propose a bilateral payment claim between members of a working group. Once accepted by the debtor, it can be netted in a settlement cycle.
          </p>
          <Button
            variant="primary"
            icon={<Icon icon={Plus} size="sm" color="#FFFFFF" />}
            disabled={isOffline}
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
