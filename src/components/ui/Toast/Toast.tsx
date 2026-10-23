'use client';

import React from 'react';
import { ToastItem } from './ToastContext';
import styles from './Toast.module.css';
import { Icon } from '@/components/icons/Icon';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X, ExternalLink } from 'lucide-react';

interface ToastProps {
  toast: ToastItem;
  onClose: (id: string) => void;
}

export function Toast({ toast, onClose }: ToastProps) {
  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <Icon icon={CheckCircle2} size="md" color="var(--color-success)" />;
      case 'error':
        return <Icon icon={AlertCircle} size="md" color="var(--color-danger)" />;
      case 'warning':
        return <Icon icon={AlertTriangle} size="md" color="var(--color-warning)" />;
      case 'info':
      default:
        return <Icon icon={Info} size="md" color="var(--color-wine)" />;
    }
  };

  const getVariantClass = () => {
    switch (toast.type) {
      case 'success':
        return styles.toastSuccess;
      case 'error':
        return styles.toastError;
      case 'warning':
        return styles.toastWarning;
      case 'info':
      default:
        return styles.toastInfo;
    }
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className={`${styles.toast} ${getVariantClass()}`}
    >
      <div className={styles.iconWrapper}>{getIcon()}</div>
      <div className={styles.content}>
        <span className={styles.title}>{toast.title}</span>
        {toast.message && <span className={styles.message}>{toast.message}</span>}
        {toast.txHash && (
          <a
            href={`https://explorer.test.mezo.org/tx/${toast.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.txLink}
          >
            <span>View on Mezo Explorer</span>
            <Icon icon={ExternalLink} size="sm" />
          </a>
        )}
      </div>
      <button
        type="button"
        aria-label="Close notification"
        className={styles.closeButton}
        onClick={() => onClose(toast.id)}
      >
        <Icon icon={X} size="sm" />
      </button>
    </div>
  );
}
