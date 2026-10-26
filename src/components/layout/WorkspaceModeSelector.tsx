'use client';

import React, { useState, useEffect, useRef } from 'react';
import styles from './WorkspaceModeSelector.module.css';
import { useWorkspace, WorkspaceMode } from '@/features/workspace/WorkspaceContext';
import { useToast } from '@/components/ui/Toast/ToastContext';
import { Check, Zap, ShieldAlert } from 'lucide-react';
import { Icon } from '@/components/icons/Icon';
import { Button } from '@/components/common/Button';

export interface WorkspaceModeSelectorProps {
  className?: string;
  style?: React.CSSProperties;
}

/**
 * WorkspaceModeSelector
 * Accessible segmented mode selector for switching between Demo and Live Mezo workspace modes.
 * Adheres to:
 * - Prototype_vs_Production_Checklist §4 (Double-click protection, state confirmation)
 * - UX.md §13 (Truthful interfaces, honest explanation of on-chain vs simulated execution)
 * - UI.md §2, §5 (Roundo typography, contrast tokens, zero slop)
 */
export function WorkspaceModeSelector({ className, style }: WorkspaceModeSelectorProps) {
  const { mode, setMode } = useWorkspace();
  const { toast } = useToast();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const demoRadioRef = useRef<HTMLButtonElement>(null);
  const liveRadioRef = useRef<HTMLButtonElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  // Focus trap / escape key handler for confirmation dialog
  useEffect(() => {
    if (!showConfirmModal) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowConfirmModal(false);
        liveRadioRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showConfirmModal]);

  // Handle switching to Demo (zero friction)
  const handleSelectDemo = () => {
    if (mode === 'demo') return;
    setIsSwitching(true);
    setMode('demo');
    toast.info('Switched to Demo Mode', 'Obligations and settlements are now simulated locally with mock balances.');
    setTimeout(() => setIsSwitching(false), 150);
  };

  // Handle clicking Live: require confirmation if currently in demo
  const handleSelectLive = () => {
    if (mode === 'live') return;
    setShowConfirmModal(true);
  };

  // Confirmed switch to Live
  const handleConfirmLive = () => {
    if (isSwitching) return;
    setIsSwitching(true);
    setMode('live');
    setShowConfirmModal(false);
    toast.success('Switched to Live Mode', 'Connected to Mezo Testnet. Obligations and settlements require on-chain execution.');
    setTimeout(() => setIsSwitching(false), 200);
  };

  // Accessible keyboard navigation across radio segments
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      if (mode === 'demo') {
        handleSelectLive();
      } else {
        handleSelectDemo();
      }
    }
  };

  return (
    <div className={`${styles.container} ${className || ''}`} style={style}>
      {/* 2-Option Segmented Control */}
      <div
        className={styles.segmentedControl}
        role="radiogroup"
        aria-label="Workspace Mode Selector"
        onKeyDown={handleKeyDown}
      >
        {/* Demo Option */}
        <button
          ref={demoRadioRef}
          type="button"
          role="radio"
          aria-checked={mode === 'demo'}
          className={`${styles.segment} ${mode === 'demo' ? styles.activeDemo : ''}`}
          onClick={handleSelectDemo}
          title="Demo Mode: Zero-wallet simulation. Test obligation netting and settlements locally with mock funds."
          disabled={isSwitching}
        >
          <span className={styles.iconWrapper} aria-hidden="true">
            {mode === 'demo' ? (
              <Icon icon={Check} size="sm" color="var(--color-wine)" />
            ) : (
              <span className={styles.inactiveDot} />
            )}
          </span>
          <span>Demo</span>
        </button>

        {/* Live Option */}
        <button
          ref={liveRadioRef}
          type="button"
          role="radio"
          aria-checked={mode === 'live'}
          className={`${styles.segment} ${mode === 'live' ? styles.activeLive : ''}`}
          onClick={handleSelectLive}
          title="Live Mode: Real Mezo Testnet execution. Requires a connected wallet to sign on-chain contracts and settle actual MUSD."
          disabled={isSwitching}
        >
          <span className={styles.iconWrapper} aria-hidden="true">
            {mode === 'live' ? (
              <span className={styles.liveDot} />
            ) : (
              <Icon icon={Zap} size="sm" color="var(--color-muted)" />
            )}
          </span>
          <span>Live</span>
        </button>
      </div>

      {/* Confirmation Modal when switching to Live */}
      {showConfirmModal && (
        <div
          className={styles.overlay}
          onClick={() => setShowConfirmModal(false)}
          role="presentation"
        >
          <div
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-live-title"
            aria-describedby="confirm-live-desc"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className={styles.dialogHeader}>
              <div className={styles.dialogIconWrap}>
                <Icon icon={ShieldAlert} size="md" color="var(--color-wine)" />
              </div>
              <div className={styles.dialogTitleGroup}>
                <h3 id="confirm-live-title" className={styles.dialogTitle}>
                  Switch to Live Mode?
                </h3>
                <div className={styles.badgeMezo}>
                  <span className={styles.badgeDot} />
                  <span>Mezo Testnet • Chain 31611</span>
                </div>
              </div>
            </div>

            {/* Content & Truthful explanation */}
            <div id="confirm-live-desc" className={styles.dialogBody}>
              <p style={{ margin: 0 }}>
                In <strong>Live Mode</strong>, all obligation acceptances, partner groups, and settlement cycles interact directly with the <strong>Mezo Testnet smart contracts</strong>.
              </p>
              <p style={{ margin: 0 }}>
                Transactions require cryptographic wallet signatures and on-chain MUSD execution that <strong>cannot be undone</strong>.
              </p>
              <div className={styles.dialogNotice}>
                ✓ <strong>Your Demo Work is Preserved:</strong> Your simulated demo obligations and cycles remain safely stored in your demo workspace and will be waiting whenever you return to Demo mode.
              </div>
            </div>

            {/* Actions with Double-Click Protection */}
            <div className={styles.dialogActions}>
              <Button
                variant="secondary"
                onClick={() => setShowConfirmModal(false)}
                disabled={isSwitching}
              >
                Stay in Demo
              </Button>
              <Button
                ref={confirmButtonRef}
                variant="primary"
                icon={<Icon icon={Zap} size="sm" color="#FFFFFF" />}
                onClick={handleConfirmLive}
                disabled={isSwitching}
              >
                {isSwitching ? 'Switching...' : 'Switch to Live'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
