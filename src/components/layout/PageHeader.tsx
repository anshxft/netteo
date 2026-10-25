'use client';

import React from 'react';
import styles from './PageHeader.module.css';

export interface PageHeaderProps {
  title: string;
  subtitle: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Standardized Workspace Page Header Component
 * Unifies title typography, mode badge, subtitle hierarchy, and responsive actions
 * across Payments, Settlements, Groups, Receipts, and other workspace desks.
 */
export function PageHeader({
  title,
  subtitle,
  badge,
  actions,
  className = '',
}: PageHeaderProps) {
  return (
    <header className={`${styles.pageHeader} ${className}`}>
      <div className={styles.titleArea}>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>{title}</h1>
          {badge && <div className={styles.badge}>{badge}</div>}
        </div>
        <p className={styles.subtitle}>{subtitle}</p>
      </div>

      {actions && <div className={styles.actionsArea}>{actions}</div>}
    </header>
  );
}
