'use client';

import React, { useEffect } from 'react';
import { useConnect, useAccount } from 'wagmi';
import styles from '@/features/groups/components/GroupsView.module.css';
import { Button } from '@/components/common/Button';
import { Icon } from '@/components/icons/Icon';
import { X, Wallet, AlertCircle } from 'lucide-react';

export interface WalletConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WalletConnectModal({ isOpen, onClose }: WalletConnectModalProps) {
  const { connectors, connect, isPending, error } = useConnect();
  const { isConnected } = useAccount();

  // Close automatically upon successful connection
  useEffect(() => {
    if (isConnected && isOpen) {
      onClose();
    }
  }, [isConnected, isOpen, onClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className={styles.modalBackdrop} onClick={onClose} role="presentation">
      <div
        className={styles.modalContent}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="connect-wallet-title"
      >
        <div className={styles.modalHeader}>
          <h2 id="connect-wallet-title" className={styles.modalTitle}>
            Connect Web3 Wallet
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

        <p style={{ fontSize: '13px', color: 'var(--color-muted)', marginBottom: 'var(--space-lg)', lineHeight: 1.5 }}>
          Connect your browser wallet to interact with Netteo smart contracts on Mezo Testnet (Chain ID 31611).
        </p>

        {error && (
          <div className={styles.errorBanner} role="alert">
            <Icon icon={AlertCircle} size="sm" color="var(--color-danger)" />
            <span>{error.message || 'Connection request rejected.'}</span>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          {connectors.map((connector) => (
            <button
              key={connector.uid}
              type="button"
              disabled={isPending}
              onClick={() => connect({ connector })}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 'var(--space-md)',
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                cursor: isPending ? 'wait' : 'pointer',
                fontFamily: 'inherit',
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--color-ink)',
                transition: 'border-color var(--motion-fast) var(--ease-standard), background-color var(--motion-fast)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-wine)';
                e.currentTarget.style.backgroundColor = 'var(--color-sand-light)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border)';
                e.currentTarget.style.backgroundColor = 'var(--color-surface)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                <Icon icon={Wallet} size="md" color="var(--color-wine)" />
                <span>{connector.name}</span>
              </div>
              {isPending && <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>Connecting...</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
