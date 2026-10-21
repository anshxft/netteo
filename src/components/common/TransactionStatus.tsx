'use client';

import React, { useState } from 'react';
import styles from './TransactionStatus.module.css';
import { Icon } from '../icons/Icon';
import { Button } from './Button';
import { CheckCircle2, AlertCircle, ExternalLink, Copy, Check, X } from 'lucide-react';

export type TransactionLifecycleState = 'awaiting_signature' | 'pending' | 'confirmed' | 'reverted';

export interface TransactionStatusProps {
  state: TransactionLifecycleState;
  hash?: `0x${string}` | string | null;
  errorMessage?: string | null;
  title?: string;
  onDismiss?: () => void;
  onRetry?: () => void;
}

const EXPLORER_BASE = process.env.NEXT_PUBLIC_EXPLORER_URL || 'https://explorer.test.mezo.org';

/**
 * TransactionStatus component providing truthful, multi-state visual feedback
 * for Web3 lifecycle (Submitted, Pending, Confirmed, Reverted).
 * Conforms to design-addendum.md §18 and Design-Quality-Codex.pdf Part 7 feedback contract.
 */
export function TransactionStatus({
  state,
  hash,
  errorMessage,
  title,
  onDismiss,
  onRetry,
}: TransactionStatusProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!hash) return;
    navigator.clipboard.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shortHash = hash ? `${hash.slice(0, 10)}...${hash.slice(-8)}` : null;
  const explorerUrl = hash ? `${EXPLORER_BASE}/tx/${hash}` : null;

  const containerClass = `${styles.container} ${
    state === 'confirmed'
      ? styles.confirmed
      : state === 'reverted'
      ? styles.reverted
      : styles.pending
  }`;

  return (
    <div
      className={containerClass}
      role={state === 'reverted' ? 'alert' : 'status'}
      aria-live="polite"
    >
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          {state === 'awaiting_signature' && (
            <>
              <div className={styles.spinner} />
              <span>{title || 'Awaiting Signature in Wallet...'}</span>
            </>
          )}

          {state === 'pending' && (
            <>
              <div className={styles.spinner} />
              <span>{title || 'Transaction Pending on Mezo...'}</span>
            </>
          )}

          {state === 'confirmed' && (
            <>
              <Icon icon={CheckCircle2} size="sm" color="var(--color-success)" />
              <span>{title || 'Transaction Confirmed'}</span>
            </>
          )}

          {state === 'reverted' && (
            <>
              <Icon icon={AlertCircle} size="sm" color="var(--color-danger)" />
              <span>{title || 'Transaction Failed'}</span>
            </>
          )}
        </div>

        <div className={styles.actions}>
          {state === 'reverted' && onRetry && (
            <Button
              variant="secondary"
              onClick={onRetry}
              style={{ minHeight: '28px', padding: '0 8px', fontSize: '11px' }}
            >
              Try Again
            </Button>
          )}
          {onDismiss && (
            <Button
              variant="tertiary"
              onClick={onDismiss}
              style={{ minHeight: '24px', padding: '0 4px', color: 'inherit' }}
              aria-label="Dismiss message"
            >
              <Icon icon={X} size="sm" />
            </Button>
          )}
        </div>
      </div>

      {state === 'reverted' && errorMessage && (
        <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-danger)' }}>
          {errorMessage}
        </p>
      )}

      {hash && (
        <div className={styles.details}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
            <span>Hash:</span>
            <a
              href={explorerUrl!}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.hashLink}
              title="View on Mezo Explorer"
            >
              {shortHash}
              <Icon icon={ExternalLink} size="sm" style={{ marginLeft: '4px', verticalAlign: 'middle' }} />
            </a>
          </div>

          <Button
            variant="tertiary"
            onClick={handleCopy}
            style={{ minHeight: '24px', padding: '0 6px', fontSize: '11px', color: 'var(--color-muted)' }}
            title="Copy transaction hash"
          >
            <Icon icon={copied ? Check : Copy} size="sm" />
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </Button>
        </div>
      )}
    </div>
  );
}
