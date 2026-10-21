'use client';

import React, { useState, useEffect } from 'react';
import styles from './ObligationsView.module.css';
import modalStyles from '@/features/groups/components/GroupsView.module.css';
import { Button } from '@/components/common/Button';
import { Icon } from '@/components/icons/Icon';
import { proposeObligation } from '../store';
import { syncObligationToSupabase } from '@/lib/db/syncService';
import { loadGroups } from '@/features/groups/store';
import { X } from 'lucide-react';

export interface ProposeObligationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function ProposeObligationModal({ isOpen, onClose, onCreated }: ProposeObligationModalProps) {
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [groupId, setGroupId] = useState('');
  const [debtorAddress, setDebtorAddress] = useState('');
  const [creditorAddress, setCreditorAddress] = useState('');
  const [amountMusd, setAmountMusd] = useState('');
  const [referenceLabel, setReferenceLabel] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const loaded = loadGroups();
      setGroups(loaded.map((g) => ({ id: g.id, name: g.name })));
      if (loaded.length > 0 && !groupId) {
        setGroupId(loaded[0].id);
      }
    }
  }, [isOpen, groupId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const created = proposeObligation({
        groupId,
        debtorAddress,
        creditorAddress,
        amountMusd,
        referenceLabel,
      });

      // Background sync to Supabase (non-blocking)
      syncObligationToSupabase(created, groupId).catch((err) => {
        console.warn('[Sync] Supabase sync deferred:', err);
      });

      // Clear only upon successful creation (input preservation on error)
      setDebtorAddress('');
      setCreditorAddress('');
      setAmountMusd('');
      setReferenceLabel('');
      onCreated();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to propose obligation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={modalStyles.modalBackdrop} onClick={onClose} role="presentation">
      <div
        className={modalStyles.modalContent}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-propose-title"
      >
        <div className={modalStyles.modalHeader}>
          <h2 id="modal-propose-title" className={modalStyles.modalTitle}>
            Propose Obligation
          </h2>
          <Button
            variant="tertiary"
            onClick={onClose}
            style={{ minHeight: '32px', padding: '0 4px' }}
            aria-label="Close dialog"
          >
            <Icon icon={X} size="sm" />
          </Button>
        </div>

        {errorMsg && (
          <div className={styles.errorBanner} role="alert">
            <span>{errorMsg}</span>
            <button
              onClick={() => setErrorMsg(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
              aria-label="Dismiss error"
            >
              &times;
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className={modalStyles.fieldGroup}>
            <label htmlFor="target-group" className={modalStyles.fieldLabel}>
              Working Group *
            </label>
            <select
              id="target-group"
              className={modalStyles.input}
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              disabled={isSubmitting}
              required
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          <div className={modalStyles.fieldGroup}>
            <label htmlFor="debtor-address" className={modalStyles.fieldLabel}>
              Debtor Address (Payer) *
            </label>
            <input
              id="debtor-address"
              type="text"
              className={modalStyles.input}
              placeholder="0x... (address obligated to pay)"
              value={debtorAddress}
              onChange={(e) => setDebtorAddress(e.target.value)}
              required
              disabled={isSubmitting}
              pattern="^0x[a-fA-F0-9]{40}$"
              title="Must be a valid 42-character hex address beginning with 0x"
            />
          </div>

          <div className={modalStyles.fieldGroup}>
            <label htmlFor="creditor-address" className={modalStyles.fieldLabel}>
              Creditor Address (Payee) *
            </label>
            <input
              id="creditor-address"
              type="text"
              className={modalStyles.input}
              placeholder="0x... (address entitled to receive)"
              value={creditorAddress}
              onChange={(e) => setCreditorAddress(e.target.value)}
              required
              disabled={isSubmitting}
              pattern="^0x[a-fA-F0-9]{40}$"
              title="Must be a valid 42-character hex address beginning with 0x"
            />
          </div>

          <div className={modalStyles.fieldGroup}>
            <label htmlFor="musd-amount" className={modalStyles.fieldLabel}>
              Amount in MUSD *
            </label>
            <input
              id="musd-amount"
              type="text"
              inputMode="decimal"
              className={modalStyles.input}
              placeholder="e.g. 100.00"
              value={amountMusd}
              onChange={(e) => setAmountMusd(e.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>

          <div className={modalStyles.fieldGroup}>
            <label htmlFor="ref-label" className={modalStyles.fieldLabel}>
              Reference Label / Invoice ID *
            </label>
            <input
              id="ref-label"
              type="text"
              className={modalStyles.input}
              placeholder="e.g. Frontend development sprint deliverables"
              value={referenceLabel}
              onChange={(e) => setReferenceLabel(e.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)', marginTop: 'var(--space-xl)' }}>
            <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting || !debtorAddress || !creditorAddress || !amountMusd || !referenceLabel}
              isLoading={isSubmitting}
              loadingText="Submitting..."
            >
              Propose Claim
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
