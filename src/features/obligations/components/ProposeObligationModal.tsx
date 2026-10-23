'use client';

import React, { useState, useEffect } from 'react';
import styles from './ObligationsView.module.css';
import modalStyles from '@/features/groups/components/GroupsView.module.css';
import { Button } from '@/components/common/Button';
import { Icon } from '@/components/icons/Icon';
import { proposeObligation, parseMusdToBaseUnits } from '../store';
import { saveUnsyncedProposal } from '@/lib/db/syncService';
import { loadGroups } from '@/features/groups/store';
import { useWorkspace } from '@/features/workspace/WorkspaceContext';
import { useAccount, useSignMessage } from 'wagmi';
import { buildProposeObligationMessage } from '@/lib/auth/challenge';
import { X } from 'lucide-react';
import { useToast } from '@/components/ui/Toast/ToastContext';

export interface ProposeObligationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function ProposeObligationModal({ isOpen, onClose, onCreated }: ProposeObligationModalProps) {
  const { mode } = useWorkspace();
  const { toast } = useToast();
  const { address: userAddress, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
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
      const loaded = loadGroups(mode);
      setGroups(loaded.map((g) => ({ id: g.id, name: g.name })));
      if (loaded.length > 0 && !groupId) {
        setGroupId(loaded[0].id);
      }
    }
  }, [isOpen, groupId, mode]);

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
      let isQueuedOffline = false;

      if (mode === 'live') {
        if (!isConnected || !userAddress) {
          throw new Error('Please connect your wallet to propose an obligation on Mezo.');
        }

        const amountUnits = parseMusdToBaseUnits(amountMusd).toString();
        const nonce = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `nonce-${Date.now()}`;
        const timestamp = Date.now();

        const challengeMsg = buildProposeObligationMessage({
          action: 'propose',
          groupId,
          debtorAddress: debtorAddress.trim(),
          creditorAddress: creditorAddress.trim(),
          amountUnits,
          referenceLabel: referenceLabel.trim(),
          nonce,
          timestamp,
        });

        const signature = await signMessageAsync({ message: challengeMsg });

        try {
          const res = await fetch('/api/obligations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'propose',
              groupId,
              debtorAddress: debtorAddress.trim(),
              creditorAddress: creditorAddress.trim(),
              amountUnits,
              referenceLabel: referenceLabel.trim(),
              signerAddress: userAddress,
              signature,
              nonce,
              timestamp,
            }),
          });

          if (!res.ok) {
            const result = await res.json().catch(() => ({}));
            throw new Error(result.error || 'Failed to persist obligation to shared ledger.');
          }
        } catch (netErr: any) {
          // If offline or network drop occurs, queue proposal for auto-sync
          if (
            (typeof navigator !== 'undefined' && !navigator.onLine) ||
            netErr.message?.includes('fetch') ||
            netErr.name === 'TypeError'
          ) {
            isQueuedOffline = true;
            saveUnsyncedProposal({
              id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `offline-${Date.now()}`,
              groupId,
              debtorAddress: debtorAddress.trim(),
              creditorAddress: creditorAddress.trim(),
              amountUnits,
              referenceLabel: referenceLabel.trim(),
              signerAddress: userAddress,
              signature,
              nonce,
              timestamp,
              queuedAt: new Date().toISOString(),
            });
          } else {
            throw netErr;
          }
        }

        // Also record in local live store
        proposeObligation(
          {
            groupId,
            debtorAddress,
            creditorAddress,
            amountMusd,
            referenceLabel,
          },
          userAddress,
          'live'
        );
      } else {
        // Demo mode (mock simulation)
        proposeObligation(
          {
            groupId,
            debtorAddress,
            creditorAddress,
            amountMusd,
            referenceLabel,
          },
          '0x1111111111111111111111111111111111111111',
          'demo'
        );
      }

      // Clear form inputs only upon successful proposal (input preservation)
      setDebtorAddress('');
      setCreditorAddress('');
      setAmountMusd('');
      setReferenceLabel('');

      if (isQueuedOffline) {
        toast.info(
          'Payment saved locally',
          'You are currently offline. Your claim was recorded locally and queued to sync automatically when reconnected.'
        );
      } else {
        toast.success(
          'Payment claim recorded',
          'Your payment has been logged to the shared ledger and awaits approval.'
        );
      }
      onCreated();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to record payment.');
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
            Record New Payment
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
              Group *
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
              Who Pays (Debtor Address) *
            </label>
            <input
              id="debtor-address"
              type="text"
              className={modalStyles.input}
              placeholder="0x... (address paying this amount)"
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
              Who Receives (Creditor Address) *
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
              Amount (MUSD) *
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
              Description / Invoice Reference *
            </label>
            <input
              id="ref-label"
              type="text"
              className={modalStyles.input}
              placeholder="e.g. Design sprint deliverables or Invoice #104"
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
              Record Payment
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
