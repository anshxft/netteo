'use client';

import React, { useState } from 'react';
import styles from './ObligationsView.module.css';
import { Obligation, ObligationStatus } from '../types';
import { updateObligationStatus, getParticipantDisplayName } from '../store';
import { syncObligationStatusToSupabase } from '@/lib/db/syncService';
import { useWorkspace } from '@/features/workspace/WorkspaceContext';
import { useAccount, useSignMessage } from 'wagmi';
import { buildObligationActionMessage } from '@/lib/auth/challenge';
import { Button } from '@/components/common/Button';
import { Icon } from '@/components/icons/Icon';
import { Check, X, Ban, Copy } from 'lucide-react';
import { useToast } from '@/components/ui/Toast/ToastContext';

export interface ObligationsLedgerProps {
  obligations: Obligation[];
  onUpdate: () => void;
  isOffline?: boolean;
}

const STATUS_FILTER_CONFIG: { id: ObligationStatus | 'All'; label: string }[] = [
  { id: 'All', label: 'All Payments' },
  { id: 'Accepted', label: 'Ready to Settle' },
  { id: 'Proposed', label: 'Needs Approval' },
  { id: 'Frozen', label: 'In Settlement' },
  { id: 'Disputed', label: 'Disputed' },
  { id: 'Withdrawn', label: 'Withdrawn' },
];

export function ObligationsLedger({
  obligations,
  onUpdate,
  isOffline = false,
}: ObligationsLedgerProps) {
  const { mode } = useWorkspace();
  const { toast } = useToast();
  const { address: userAddress, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [activeFilter, setActiveFilter] = useState<ObligationStatus | 'All'>('All');
  const [actionError, setActionError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isAuthorizing, setIsAuthorizing] = useState(false);

  const filtered = activeFilter === 'All'
    ? obligations
    : obligations.filter((o) => o.status === activeFilter);

  const handleStatusChange = async (id: string, newStatus: ObligationStatus) => {
    setActionError(null);
    const targetObligation = obligations.find((o) => o.id === id);
    if (!targetObligation) return;

    if (mode === 'live') {
      if (!isConnected || !userAddress) {
        setActionError('Please connect your wallet to authorize this action on Mezo.');
        return;
      }

      // Check role permissions before prompting signature
      if (newStatus === 'Accepted' || newStatus === 'Disputed') {
        if (targetObligation.debtorAddress.toLowerCase() !== userAddress.toLowerCase()) {
          setActionError(
            `Forbidden: Only designated debtor (${targetObligation.debtorAddress.slice(0, 6)}...${targetObligation.debtorAddress.slice(-4)}) can ${newStatus.toLowerCase()} this debt obligation.`
          );
          return;
        }
      }

      if (newStatus === 'Withdrawn') {
        const isProposer = targetObligation.proposerAddress.toLowerCase() === userAddress.toLowerCase();
        const isCreditor = targetObligation.creditorAddress.toLowerCase() === userAddress.toLowerCase();
        if (!isProposer && !isCreditor) {
          setActionError('Forbidden: Only the proposer or creditor can withdraw this obligation.');
          return;
        }
      }

      setIsAuthorizing(true);
      try {
        const actionMap: Record<string, 'accept' | 'dispute' | 'withdraw'> = {
          Accepted: 'accept',
          accepted: 'accept',
          Disputed: 'dispute',
          disputed: 'dispute',
          Withdrawn: 'withdraw',
          withdrawn: 'withdraw',
        };
        const action = actionMap[newStatus] || (newStatus.toLowerCase() as 'accept' | 'dispute' | 'withdraw');
        const nonce = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `nonce-${Date.now()}`;
        const timestamp = Date.now();

        const challengeMsg = buildObligationActionMessage({
          action,
          obligationId: id,
          nonce,
          timestamp,
        });

        const signature = await signMessageAsync({ message: challengeMsg });

        const res = await fetch('/api/obligations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action,
            obligationId: id,
            signerAddress: userAddress,
            signature,
            nonce,
            timestamp,
          }),
        });

        const result = await res.json();
        if (!res.ok) {
          throw new Error(result.error || 'Server rejected obligation update.');
        }

        updateObligationStatus(id, newStatus, 'live');
        const statusMsgs: Record<string, { title: string; desc: string }> = {
          Accepted: { title: 'Payment Approved', desc: 'This payment is now ready for group settlement.' },
          Disputed: { title: 'Payment Disputed', desc: 'Flagged for review and excluded from netting.' },
          Withdrawn: { title: 'Payment Canceled', desc: 'Claim has been withdrawn.' },
        };
        const notify = statusMsgs[newStatus];
        if (notify) {
          if (newStatus === 'Accepted') toast.success(notify.title, notify.desc);
          else toast.info(notify.title, notify.desc);
        }
        onUpdate();
      } catch (err: any) {
        setActionError(err.message || 'Signature authorization was rejected or failed.');
      } finally {
        setIsAuthorizing(false);
      }
      return;
    }

    // Demo Sandbox mode (mock simulation)
    try {
      updateObligationStatus(id, newStatus, 'demo');
      const statusMsgs: Record<string, { title: string; desc: string }> = {
        Accepted: { title: 'Payment Approved', desc: 'This payment is now ready for group settlement.' },
        Disputed: { title: 'Payment Disputed', desc: 'Flagged for review and excluded from netting.' },
        Withdrawn: { title: 'Payment Canceled', desc: 'Claim has been withdrawn.' },
      };
      const notify = statusMsgs[newStatus];
      if (notify) {
        if (newStatus === 'Accepted') toast.success(notify.title, notify.desc);
        else toast.info(notify.title, notify.desc);
      }
      onUpdate();
    } catch (err: any) {
      setActionError(err.message || 'Failed to update payment status.');
    }
  };

  const formatStatus = (status: ObligationStatus) => {
    switch (status) {
      case 'Accepted':
        return 'Ready to Settle';
      case 'Proposed':
        return 'Needs Approval';
      case 'Frozen':
        return 'In Settlement';
      case 'Disputed':
        return 'Disputed';
      case 'Withdrawn':
        return 'Canceled';
      case 'Settled':
        return 'Settled';
      default:
        return status;
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
        <div className={styles.tabList} role="tablist" aria-label="Payment status filters">
          {STATUS_FILTER_CONFIG.map((filter) => {
            const count = filter.id === 'All'
              ? obligations.length
              : obligations.filter((o) => o.status === filter.id).length;

            const isActive = activeFilter === filter.id;

            return (
              <button
                key={filter.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`${styles.tabButton} ${isActive ? styles.tabButtonActive : ''}`}
                onClick={() => setActiveFilter(filter.id)}
              >
                <span>{filter.label}</span>
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
            No payments found in <strong>{STATUS_FILTER_CONFIG.find(c => c.id === activeFilter)?.label || activeFilter}</strong>.
          </p>
        </div>
      ) : (
        <div className={styles.ledgerContainer}>
          <div className={styles.tableWrapper}>
            <table className={styles.ledgerTable} aria-label="Payments ledger">
              <thead>
                <tr>
                  <th scope="col">Payment / Date</th>
                  <th scope="col">Who Pays (Debtor)</th>
                  <th scope="col">Who Receives (Creditor)</th>
                  <th scope="col">Description</th>
                  <th scope="col" style={{ textAlign: 'right' }}>Amount</th>
                  <th scope="col">Status</th>
                  <th scope="col" style={{ textAlign: 'right' }}>Action</th>
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
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)' }}>
                          {getParticipantDisplayName(ob.debtorAddress, mode === 'demo')}
                        </span>
                        <span className={styles.addressCode} title={ob.debtorAddress}>
                          {ob.debtorAddress.slice(0, 6)}...{ob.debtorAddress.slice(-4)}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)' }}>
                          {getParticipantDisplayName(ob.creditorAddress, mode === 'demo')}
                        </span>
                        <span className={styles.addressCode} title={ob.creditorAddress}>
                          {ob.creditorAddress.slice(0, 6)}...{ob.creditorAddress.slice(-4)}
                        </span>
                      </div>
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
                        {formatStatus(ob.status)}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {ob.status === 'Proposed' && (
                        <div style={{ display: 'inline-flex', gap: 'var(--space-2xs)' }}>
                          <Button
                            variant="primary"
                            disabled={isOffline || isAuthorizing}
                            onClick={() => handleStatusChange(ob.id, 'Accepted')}
                            style={{ minHeight: '30px', padding: '0 8px', fontSize: '12px' }}
                            title="Approve this payment claim"
                          >
                            <Icon icon={Check} size="sm" color="#FFFFFF" />
                            {isAuthorizing ? 'Signing...' : 'Approve'}
                          </Button>
                          <Button
                            variant="destructive"
                            disabled={isOffline || isAuthorizing}
                            onClick={() => handleStatusChange(ob.id, 'Disputed')}
                            style={{ minHeight: '30px', padding: '0 6px', fontSize: '12px' }}
                            title="Dispute payment claim"
                          >
                            <Icon icon={X} size="sm" color="var(--color-danger)" />
                            Dispute
                          </Button>
                          <Button
                            variant="tertiary"
                            disabled={isOffline || isAuthorizing}
                            onClick={() => handleStatusChange(ob.id, 'Withdrawn')}
                            style={{ minHeight: '30px', padding: '0 4px', fontSize: '11px', color: 'var(--color-muted)' }}
                            title="Cancel payment claim"
                          >
                            Cancel
                          </Button>
                        </div>
                      )}
                      {ob.status === 'Accepted' && (
                        <span style={{ fontSize: '12px', color: 'var(--color-wine)', fontWeight: 600 }}>
                          Ready to Settle
                        </span>
                      )}
                      {ob.status === 'Frozen' && (
                        <span style={{ fontSize: '12px', color: 'var(--color-navy)', fontWeight: 600 }}>
                          Settling in Progress
                        </span>
                      )}
                      {ob.status === 'Settled' && (
                        <span style={{ fontSize: '12px', color: 'var(--color-forest)', fontWeight: 600 }}>
                          Settled & Paid
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
