'use client';

import React, { useState, useEffect } from 'react';
import styles from './ProposeObligationModal.module.css';
import { Button } from '@/components/common/Button';
import { Icon } from '@/components/icons/Icon';
import { proposeObligation, parseMusdToBaseUnits } from '../store';
import { saveUnsyncedProposal } from '@/lib/db/syncService';
import { loadGroups } from '@/features/groups/store';
import { Group } from '@/features/groups/types';
import { useWorkspace } from '@/features/workspace/WorkspaceContext';
import { useAccount, useSignMessage } from 'wagmi';
import { buildProposeObligationMessage } from '@/lib/auth/challenge';
import {
  X,
  ChevronDown,
  ArrowDown,
  ArrowUpRight,
  ArrowDownLeft,
  Wallet,
  AlertCircle,
  WifiOff,
  Send,
  Users,
} from 'lucide-react';
import { ObligationIcon } from '@/components/icons/netteo';
import { useToast } from '@/components/ui/Toast/ToastContext';

export interface ProposeObligationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const AMOUNT_PRESETS = ['50', '100', '250', '500', '1000'];

function formatShortAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function ProposeObligationModal({ isOpen, onClose, onCreated }: ProposeObligationModalProps) {
  const { mode } = useWorkspace();
  const { toast } = useToast();
  const { address: userAddress, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const [groups, setGroups] = useState<Group[]>([]);
  const [groupId, setGroupId] = useState('');
  const [debtorAddress, setDebtorAddress] = useState('');
  const [creditorAddress, setCreditorAddress] = useState('');
  const [amountMusd, setAmountMusd] = useState('');
  const [referenceLabel, setReferenceLabel] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  // Monitor network online/offline state
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsOffline(!navigator.onLine);
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load groups on open
  useEffect(() => {
    if (isOpen) {
      const loaded = loadGroups(mode);
      setGroups(loaded);
      if (loaded.length > 0 && !groupId) {
        setGroupId(loaded[0].id);
      }
    }
  }, [isOpen, groupId, mode]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const activeGroup = groups.find((g) => g.id === groupId);
  const groupParticipants = activeGroup?.participants || [];

  const isDebtorSameAsCreditor =
    debtorAddress.trim() !== '' &&
    creditorAddress.trim() !== '' &&
    debtorAddress.trim().toLowerCase() === creditorAddress.trim().toLowerCase();

  const isValidAddress = (addr: string) => /^0x[a-fA-F0-9]{40}$/.test(addr.trim());

  const numAmount = parseFloat(amountMusd);
  const isAmountValid = !isNaN(numAmount) && numAmount > 0;

  const isFormReady =
    groupId &&
    isValidAddress(debtorAddress) &&
    isValidAddress(creditorAddress) &&
    !isDebtorSameAsCreditor &&
    isAmountValid &&
    referenceLabel.trim().length > 0;

  const handleUseMyAddress = (target: 'debtor' | 'creditor') => {
    if (!userAddress) return;
    if (target === 'debtor') {
      setDebtorAddress(userAddress);
    } else {
      setCreditorAddress(userAddress);
    }
    setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanDebtor = debtorAddress.trim();
    const cleanCreditor = creditorAddress.trim();
    const cleanRef = referenceLabel.trim();

    if (!isValidAddress(cleanDebtor)) {
      setErrorMsg('Debtor address must be a valid 42-character hex address starting with 0x.');
      return;
    }
    if (!isValidAddress(cleanCreditor)) {
      setErrorMsg('Creditor address must be a valid 42-character hex address starting with 0x.');
      return;
    }
    if (cleanDebtor.toLowerCase() === cleanCreditor.toLowerCase()) {
      setErrorMsg('Debtor and creditor cannot be the same address. Obligation must be bilateral.');
      return;
    }
    if (!isAmountValid) {
      setErrorMsg('Please enter a valid positive payment amount.');
      return;
    }

    setIsSubmitting(true);

    try {
      let isQueuedOffline = false;

      if (mode === 'live') {
        if (!isConnected || !userAddress) {
          throw new Error('Please connect your Web3 wallet to sign and propose this obligation on Mezo.');
        }

        const amountUnits = parseMusdToBaseUnits(amountMusd).toString();
        const nonce = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `nonce-${Date.now()}`;
        const timestamp = Date.now();

        const challengeMsg = buildProposeObligationMessage({
          action: 'propose',
          groupId,
          debtorAddress: cleanDebtor,
          creditorAddress: cleanCreditor,
          amountUnits,
          referenceLabel: cleanRef,
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
              debtorAddress: cleanDebtor,
              creditorAddress: cleanCreditor,
              amountUnits,
              referenceLabel: cleanRef,
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
              debtorAddress: cleanDebtor,
              creditorAddress: cleanCreditor,
              amountUnits,
              referenceLabel: cleanRef,
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

        // Record in local live store
        proposeObligation(
          {
            groupId,
            debtorAddress: cleanDebtor,
            creditorAddress: cleanCreditor,
            amountMusd,
            referenceLabel: cleanRef,
          },
          userAddress,
          'live'
        );
      } else {
        // Demo sandbox mode
        proposeObligation(
          {
            groupId,
            debtorAddress: cleanDebtor,
            creditorAddress: cleanCreditor,
            amountMusd,
            referenceLabel: cleanRef,
          },
          cleanDebtor,
          'demo'
        );
      }

      // Input preservation: clear only after successful creation
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
          `Payment of ${amountMusd} MUSD proposed to group ledger.`
        );
      }
      onCreated();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to record payment. Please review inputs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.modalBackdrop} onClick={onClose} role="presentation">
      <div
        className={styles.modalCard}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-record-title"
      >
        {/* Header Metadata */}
        <div className={styles.headerMeta}>
          <div className={styles.categoryBadge}>
            <Icon icon={ObligationIcon} size="sm" color="var(--color-wine)" />
            <span>MUSD Obligation Claim</span>
          </div>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close dialog"
          >
            <Icon icon={X} size="sm" />
          </button>
        </div>

        {/* Title & Context */}
        <h2 id="modal-record-title" className={styles.modalTitle}>
          Record New Payment
        </h2>
        <p className={styles.modalSubtitle}>
          Propose a bilateral payment within your group. Mutual obligations are netted and settled atomically in MUSD on Mezo.
        </p>

        {/* Offline Warning Banner */}
        {isOffline && (
          <div className={styles.offlineNotice} role="status">
            <Icon icon={WifiOff} size="sm" color="var(--color-warning)" />
            <span>
              <strong>Offline Mode:</strong> Network disconnected. Your payment will be preserved locally and synced automatically when reconnected.
            </span>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className={styles.errorBanner} role="alert" style={{ marginBottom: 'var(--space-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Icon icon={AlertCircle} size="sm" color="var(--color-danger)" />
              <span>{errorMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMsg(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: '2px' }}
              aria-label="Dismiss error"
            >
              <Icon icon={X} size="sm" />
            </button>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Group Picker */}
          <div className={styles.fieldGroup}>
            <div className={styles.fieldHeader}>
              <label htmlFor="target-group-select" className={styles.fieldLabel}>
                <Icon icon={Users} size="sm" color="var(--color-wine)" />
                <span>Group *</span>
              </label>
              {activeGroup && (
                <span style={{ fontSize: '11px', color: 'var(--color-muted)', fontVariantNumeric: 'tabular-nums' }}>
                  {activeGroup.participants.length} member{activeGroup.participants.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className={styles.selectWrapper}>
              <select
                id="target-group-select"
                className={styles.select}
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
              <span className={styles.selectChevron}>
                <Icon icon={ChevronDown} size="sm" />
              </span>
            </div>
          </div>

          {/* Counterparties Flow Box */}
          <div className={styles.counterpartiesBox}>
            {/* Debtor */}
            <div className={styles.fieldGroup}>
              <div className={styles.fieldHeader}>
                <label htmlFor="debtor-address-input" className={styles.fieldLabel}>
                  <Icon icon={ArrowUpRight} size="sm" color="var(--color-danger)" />
                  <span>Who Pays (Debtor Address) *</span>
                </label>
                {isConnected && userAddress && (
                  <button
                    type="button"
                    className={styles.quickActionBtn}
                    onClick={() => handleUseMyAddress('debtor')}
                    disabled={isSubmitting}
                  >
                    <Icon icon={Wallet} size="sm" color="var(--color-wine)" />
                    <span>I am paying</span>
                  </button>
                )}
              </div>
              <input
                id="debtor-address-input"
                type="text"
                className={`${styles.input} ${styles.inputMono}`}
                placeholder="0x... (address paying this amount)"
                value={debtorAddress}
                onChange={(e) => {
                  setDebtorAddress(e.target.value);
                  setErrorMsg(null);
                }}
                required
                disabled={isSubmitting}
                pattern="^0x[a-fA-F0-9]{40}$"
                title="Must be a valid 42-character hex address beginning with 0x"
              />
              {/* Member Quick Chips for Debtor */}
              {groupParticipants.length > 0 && (
                <div className={styles.memberSuggestions}>
                  <span className={styles.suggestionLabel}>Group members:</span>
                  {groupParticipants.map((p) => {
                    const isSelected = debtorAddress.toLowerCase() === p.toLowerCase();
                    return (
                      <button
                        key={`debtor-${p}`}
                        type="button"
                        className={`${styles.memberChip} ${isSelected ? styles.memberChipActive : ''}`}
                        onClick={() => {
                          setDebtorAddress(p);
                          setErrorMsg(null);
                        }}
                        disabled={isSubmitting}
                      >
                        {p.toLowerCase() === userAddress?.toLowerCase() ? 'You' : formatShortAddress(p)}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Directional Flow Divider */}
            <div className={styles.flowDivider}>
              <span className={styles.flowIconPill}>
                <Icon icon={ArrowDown} size="sm" />
                <span>Directional Debt</span>
              </span>
            </div>

            {/* Creditor */}
            <div className={styles.fieldGroup}>
              <div className={styles.fieldHeader}>
                <label htmlFor="creditor-address-input" className={styles.fieldLabel}>
                  <Icon icon={ArrowDownLeft} size="sm" color="var(--color-success)" />
                  <span>Who Receives (Creditor Address) *</span>
                </label>
                {isConnected && userAddress && (
                  <button
                    type="button"
                    className={styles.quickActionBtn}
                    onClick={() => handleUseMyAddress('creditor')}
                    disabled={isSubmitting}
                  >
                    <Icon icon={Wallet} size="sm" color="var(--color-wine)" />
                    <span>I am receiving</span>
                  </button>
                )}
              </div>
              <input
                id="creditor-address-input"
                type="text"
                className={`${styles.input} ${styles.inputMono}`}
                placeholder="0x... (address entitled to receive)"
                value={creditorAddress}
                onChange={(e) => {
                  setCreditorAddress(e.target.value);
                  setErrorMsg(null);
                }}
                required
                disabled={isSubmitting}
                pattern="^0x[a-fA-F0-9]{40}$"
                title="Must be a valid 42-character hex address beginning with 0x"
              />
              {/* Member Quick Chips for Creditor */}
              {groupParticipants.length > 0 && (
                <div className={styles.memberSuggestions}>
                  <span className={styles.suggestionLabel}>Group members:</span>
                  {groupParticipants.map((p) => {
                    const isSelected = creditorAddress.toLowerCase() === p.toLowerCase();
                    return (
                      <button
                        key={`creditor-${p}`}
                        type="button"
                        className={`${styles.memberChip} ${isSelected ? styles.memberChipActive : ''}`}
                        onClick={() => {
                          setCreditorAddress(p);
                          setErrorMsg(null);
                        }}
                        disabled={isSubmitting}
                      >
                        {p.toLowerCase() === userAddress?.toLowerCase() ? 'You' : formatShortAddress(p)}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Same address warning */}
            {isDebtorSameAsCreditor && (
              <div className={styles.inlineWarning} role="alert">
                <Icon icon={AlertCircle} size="sm" color="var(--color-danger)" />
                <span>Debtor and creditor cannot be the same address.</span>
              </div>
            )}
          </div>

          {/* Amount (MUSD) */}
          <div className={styles.fieldGroup}>
            <label htmlFor="musd-amount-input" className={styles.fieldLabel}>
              <span>Amount (MUSD) *</span>
            </label>
            <div className={styles.amountContainer}>
              <input
                id="musd-amount-input"
                type="text"
                inputMode="decimal"
                className={styles.amountInput}
                placeholder="0.00"
                value={amountMusd}
                onChange={(e) => {
                  // Allow numbers and single decimal point
                  const val = e.target.value;
                  if (/^\d*\.?\d*$/.test(val)) {
                    setAmountMusd(val);
                    setErrorMsg(null);
                  }
                }}
                required
                disabled={isSubmitting}
              />
              <span className={styles.musdBadge}>MUSD</span>
            </div>
            {/* Quick Presets */}
            <div className={styles.presetsRow}>
              {AMOUNT_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className={styles.presetChip}
                  onClick={() => {
                    setAmountMusd(preset);
                    setErrorMsg(null);
                  }}
                  disabled={isSubmitting}
                >
                  ${preset}
                </button>
              ))}
            </div>
          </div>

          {/* Description / Reference */}
          <div className={styles.fieldGroup}>
            <label htmlFor="ref-label-input" className={styles.fieldLabel}>
              <span>Description / Invoice Reference *</span>
            </label>
            <input
              id="ref-label-input"
              type="text"
              className={styles.input}
              placeholder="e.g. Design sprint deliverables or Invoice #104"
              value={referenceLabel}
              onChange={(e) => {
                setReferenceLabel(e.target.value);
                setErrorMsg(null);
              }}
              required
              disabled={isSubmitting}
              maxLength={120}
            />
          </div>

          {/* Live Settlement Preview */}
          {isValidAddress(debtorAddress) && isValidAddress(creditorAddress) && !isDebtorSameAsCreditor && isAmountValid && (
            <div className={styles.settlementPreview}>
              <div className={styles.previewHeader}>
                <span>Claim Summary</span>
                <span>Atomic Netting Target</span>
              </div>
              <div className={styles.previewBody}>
                <span>
                  {debtorAddress.toLowerCase() === userAddress?.toLowerCase() ? 'You' : formatShortAddress(debtorAddress)}
                  {' '}&rarr;{' '}
                  {creditorAddress.toLowerCase() === userAddress?.toLowerCase() ? 'You' : formatShortAddress(creditorAddress)}
                </span>
                <span className={styles.previewAmount}>
                  {numAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MUSD
                </span>
              </div>
              <p className={styles.previewNote}>
                This payment will be verified by the debtor and collapsed during multilateral cycle assembly.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className={styles.actionsRow}>
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              icon={<Icon icon={Send} size="sm" color="#FFFFFF" />}
              disabled={isSubmitting || !isFormReady}
              isLoading={isSubmitting}
              loadingText={mode === 'live' ? 'Signing & Recording...' : 'Recording...'}
            >
              Record Payment
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
