'use client';

import React, { useState } from 'react';
import styles from './ObligationsView.module.css';
import { Obligation, ObligationStatus } from '../types';
import { updateObligationStatus } from '../store';
import { syncObligationStatusToSupabase } from '@/lib/db/syncService';
import { Button } from '@/components/common/Button';
import { Icon } from '@/components/icons/Icon';
import { Check, X, Ban, Copy } from 'lucide-react';

export interface ObligationsLedgerProps {
  obligations: Obligation[];
  onUpdate: () => void;
  isOffline?: boolean;
}

const STATUS_FILTERS: (ObligationStatus | 'All')[] = [
  'All',
  'Accepted',
  'Proposed',
  'Disputed',
  'Frozen',
  'Withdrawn',
];

export function ObligationsLedger({
  obligations,
  onUpdate,
  isOffline = false,
}: ObligationsLedgerProps) {
  const [activeFilter, setActiveFilter] = useState<ObligationStatus | 'All'>('All');
  const [actionError, setActionError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = activeFilter === 'All'
    ? obligations
    : obligations.filter((o) => o.status === activeFilter);

  const handleStatusChange = (id: string, newStatus: ObligationStatus) => {
    setActionError(null);
    try {
      updateObligationStatus(id, newStatus);
      syncObligationStatusToSupabase(id, newStatus).catch((err) => {
        console.warn('[Sync] Supabase status sync deferred:', err);
      });
      onUpdate();
    } catch (err: any) {
      setActionError(err.message || 'Failed to update obligation status.');
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const getStatusBadgeClass = (status: ObligationStatus) => {
    switch (status) {
      case 'Accepted':
        return styles.statusAccepted;
      case 'Proposed':
        return styles.statusProposed;
      case 'Disputed':
        return styles.statusDisputed;
      case 'Withdrawn':
        return styles.statusWithdrawn;
      case 'Frozen':
      case 'Settled':
        return styles.statusFrozen;
      default:
        return '';
    }
  };

  return (
    <div>
      {/* Filter Row */}
      <div className={styles.filterRow}>
        <div className={styles.tabList} role="tablist" aria-label="Obligation status filters">
          {STATUS_FILTERS.map((tab) => {
            const count = tab === 'All'
              ? obligations.length
              : obligations.filter((o) => o.status === tab).length;

            const isActive = activeFilter === tab;

            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`${styles.tabButton} ${isActive ? styles.tabButtonActive : ''}`}
                onClick={() => setActiveFilter(tab)}
              >
                <span>{tab}</span>
                <span className={styles.tabCount}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {actionError && (
        <div className={styles.errorBanner} role="alert">
          <span>{actionError}</span>
          <button
            onClick={() => setActionError(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
            aria-label="Dismiss error"
          >
            &times;
          </button>
        </div>
      )}

      {/* Financial Ledger Table */}
      {filtered.length === 0 ? (
        <div className={styles.emptyState} style={{ padding: 'var(--space-2xl)' }}>
          <p className={styles.emptyStateDesc} style={{ margin: 0 }}>
            No obligations found matching the <strong>{activeFilter}</strong> filter.
          </p>
        </div>
      ) : (
        <div className={styles.ledgerContainer}>
          <div className={styles.tableWrapper}>
            <table className={styles.ledgerTable} aria-label="Financial obligation claims ledger">
              <thead>
                <tr>
                  <th scope="col">ID / Date</th>
                  <th scope="col">Debtor (Payer)</th>
                  <th scope="col">Creditor (Payee)</th>
                  <th scope="col">Reference Label</th>
                  <th scope="col" style={{ textAlign: 'right' }}>Amount</th>
                  <th scope="col">Status</th>
                  <th scope="col" style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((ob) => (
                  <tr key={ob.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span className={styles.addressCode} style={{ fontSize: '11px' }}>
                          {ob.id.slice(0, 10)}
                        </span>
                        <Button
                          variant="tertiary"
                          onClick={() => handleCopy(ob.id, ob.id)}
                          style={{ minHeight: '24px', padding: '0 2px' }}
                          title="Copy obligation ID"
                        >
                          <Icon icon={copiedId === ob.id ? Check : Copy} size="sm" />
                        </Button>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '2px' }}>
                        {new Date(ob.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td>
                      <span className={styles.addressCode} title={ob.debtorAddress}>
                        {ob.debtorAddress.slice(0, 6)}...{ob.debtorAddress.slice(-4)}
                      </span>
                    </td>
                    <td>
                      <span className={styles.addressCode} title={ob.creditorAddress}>
                        {ob.creditorAddress.slice(0, 6)}...{ob.creditorAddress.slice(-4)}
                      </span>
                    </td>
                    <td>
                      <div className={styles.labelCell} title={ob.referenceLabel}>
                        {ob.referenceLabel}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className={styles.amountCell}>{ob.amountDisplay}</span>
                    </td>
                    <td>
                      <span className={`${styles.statusBadge} ${getStatusBadgeClass(ob.status)}`}>
                        {ob.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {ob.status === 'Proposed' && (
                        <div style={{ display: 'inline-flex', gap: 'var(--space-2xs)' }}>
                          <Button
                            variant="primary"
                            disabled={isOffline}
                            onClick={() => handleStatusChange(ob.id, 'Accepted')}
                            style={{ minHeight: '30px', padding: '0 8px', fontSize: '12px' }}
                            title="Accept obligation debt"
                          >
                            <Icon icon={Check} size="sm" color="#FFFFFF" />
                            Accept
                          </Button>
                          <Button
                            variant="destructive"
                            disabled={isOffline}
                            onClick={() => handleStatusChange(ob.id, 'Disputed')}
                            style={{ minHeight: '30px', padding: '0 6px', fontSize: '12px' }}
                            title="Dispute claim"
                          >
                            <Icon icon={X} size="sm" color="var(--color-danger)" />
                            Dispute
                          </Button>
                          <Button
                            variant="tertiary"
                            disabled={isOffline}
                            onClick={() => handleStatusChange(ob.id, 'Withdrawn')}
                            style={{ minHeight: '30px', padding: '0 4px', fontSize: '11px', color: 'var(--color-muted)' }}
                            title="Withdraw claim"
                          >
                            Withdraw
                          </Button>
                        </div>
                      )}
                      {ob.status === 'Accepted' && (
                        <span style={{ fontSize: '12px', color: 'var(--color-success)', fontWeight: 500 }}>
                          Eligible for Netting
                        </span>
                      )}
                      {ob.status === 'Frozen' && (
                        <span style={{ fontSize: '12px', color: 'var(--color-info)', fontWeight: 500 }}>
                          In Active Cycle
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
