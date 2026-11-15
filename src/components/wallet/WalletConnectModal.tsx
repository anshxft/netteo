'use client';

import React, { useEffect } from 'react';
import { useConnect, useAccount } from 'wagmi';
import styles from '@/features/groups/components/GroupsView.module.css';
import { Button } from '@/components/common/Button';
import { Icon } from '@/components/icons/Icon';
import { X, Wallet, AlertCircle } from 'lucide-react';

/** Opens the app's wallet dialog from anywhere (AppLayout listens for it). */
export const OPEN_WALLET_MODAL_EVENT = 'netteo_open_wallet_modal';
export function openWalletModal() {
  window.dispatchEvent(new Event(OPEN_WALLET_MODAL_EVENT));
}

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

  // Every connector is an EVM wallet. Bitcoin-native wallets (Mezo Passport) are not integrated.
  const evmConnectors = connectors;

  return (
    <div className={styles.modalBackdrop} onClick={onClose} role="presentation">
      <div
        className={styles.modalContent}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="connect-wallet-title"
        style={{ maxWidth: '440px' }}
      >
        <div className={styles.modalHeader}>
          <div>
            <h2 id="connect-wallet-title" className={styles.modalTitle}>
              Connect Wallet
            </h2>
            <span style={{ fontSize: '12px', color: 'var(--color-wine)', fontWeight: 600 }}>
              Mezo Mainnet (Chain ID 31612) &bull; Native BTC Gas
            </span>
          </div>
          <Button
            variant="tertiary"
            onClick={onClose}
            style={{ minHeight: '32px', padding: '0 4px' }}
            aria-label="Close dialog"
          >
            <Icon icon={X} size="sm" />
          </Button>
        </div>

        <p style={{ fontSize: '13px', color: 'var(--color-muted)', marginBottom: 'var(--space-md)', lineHeight: 1.5 }}>
          Connect an EVM wallet to use Netteo on Mezo Mainnet. Bitcoin-native wallets are not supported yet.
        </p>

        {error && (
          <div className={styles.errorBanner} role="alert" style={{ marginBottom: 'var(--space-md)' }}>
            <Icon icon={AlertCircle} size="sm" color="var(--color-danger)" />
            <span>{error.message || 'Connection request rejected.'}</span>
          </div>
        )}

        {/* EVM Wallets Section */}
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-muted)', marginBottom: 'var(--space-xs)' }}>
            Wallets
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
            {evmConnectors.map((connector) => (
              <button
                key={connector.uid}
                type="button"
                disabled={isPending}
                onClick={() => connect({ connector })}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 'var(--space-sm) var(--space-md)',
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  cursor: isPending ? 'wait' : 'pointer',
                  fontFamily: 'inherit',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--color-ink)',
                  transition: 'all var(--motion-fast)',
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
                  <Icon icon={Wallet} size="sm" color="var(--color-muted)" />
                  <span>{connector.name}</span>
                </div>
                {isPending && <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>Connecting...</span>}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
