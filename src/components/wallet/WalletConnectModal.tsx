'use client';

import React, { useEffect } from 'react';
import { useConnect, useAccount } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import styles from '@/features/groups/components/GroupsView.module.css';
import { Button } from '@/components/common/Button';
import { Icon } from '@/components/icons/Icon';
import { X, Wallet, AlertCircle, ExternalLink, Sparkles } from 'lucide-react';

export interface WalletConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WalletConnectModal({ isOpen, onClose }: WalletConnectModalProps) {
  const { connectors, connect, isPending, error } = useConnect();
  const { isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();

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

  // Categorize connectors
  const btcConnectors = connectors.filter((c) =>
    ['unisat', 'xverse', 'okx', 'orangekit', 'bitcoin'].some((k) =>
      c.name.toLowerCase().includes(k) || c.id.toLowerCase().includes(k)
    )
  );

  const evmConnectors = connectors.filter((c) => !btcConnectors.includes(c));

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
              Mezo Testnet (Chain ID 31611) &bull; Native BTC Gas
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
          Connect a Bitcoin wallet (via Mezo Passport) or standard EVM wallet to settle obligations on Mezo.
        </p>

        {openConnectModal && (
          <div style={{ marginBottom: 'var(--space-lg)' }}>
            <Button
              variant="primary"
              onClick={() => {
                onClose();
                openConnectModal();
              }}
              style={{ width: '100%', justifyContent: 'center' }}
              icon={<Icon icon={Sparkles} size="sm" color="#FFFFFF" />}
            >
              Open Mezo Passport Selector
            </Button>
          </div>
        )}

        {error && (
          <div className={styles.errorBanner} role="alert" style={{ marginBottom: 'var(--space-md)' }}>
            <Icon icon={AlertCircle} size="sm" color="var(--color-danger)" />
            <span>{error.message || 'Connection request rejected.'}</span>
          </div>
        )}

        {/* Bitcoin Wallets Section */}
        <div style={{ marginBottom: 'var(--space-md)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-muted)', marginBottom: 'var(--space-xs)' }}>
            Bitcoin Wallets (Mezo Native)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
            {btcConnectors.length > 0 ? (
              btcConnectors.map((connector) => (
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
                    <Icon icon={Wallet} size="sm" color="var(--color-wine)" />
                    <span>{connector.name}</span>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--color-wine)', fontWeight: 500 }}>Bitcoin</span>
                </button>
              ))
            ) : (
              <div style={{ padding: 'var(--space-xs) 0', fontSize: '12px', color: 'var(--color-muted)' }}>
                No Bitcoin browser wallet detected. Install{' '}
                <a href="https://www.xverse.app/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-wine)', textDecoration: 'underline' }}>
                  Xverse
                </a>{' '}
                or{' '}
                <a href="https://unisat.io/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-wine)', textDecoration: 'underline' }}>
                  UniSat
                </a>.
              </div>
            )}
          </div>
        </div>

        {/* EVM Wallets Section */}
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-muted)', marginBottom: 'var(--space-xs)' }}>
            EVM Wallets
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
