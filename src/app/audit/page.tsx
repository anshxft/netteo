'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { loadCycles } from '@/features/settlement-cycles/store';
import { SettlementCycle } from '@/features/settlement-cycles/types';
import { formatBaseUnitsToDisplay } from '@/features/obligations/store';
import { Button } from '@/components/common/Button';
import { Icon } from '@/components/icons/Icon';
import { SnapshotIcon } from '@/components/icons/netteo';
import obStyles from '@/features/obligations/components/ObligationsView.module.css';
import { FileText, ArrowRight } from 'lucide-react';

export default function GeneralAuditPage() {
  const [cycles, setCycles] = useState<SettlementCycle[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      setCycles(loadCycles());
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <AppLayout>
      <div className={obStyles.pageHeader}>
        <div className={obStyles.titleArea}>
          <h1>Settlement Audit Ledger</h1>
          <p className={obStyles.subtitle}>
            Historical cryptographic statements linking gross obligations to on-chain settlement payouts.
          </p>
        </div>
      </div>

      {isLoading && (
        <div style={{ padding: 'var(--space-2xl) 0', color: 'var(--color-muted)' }}>
          Loading audit registry...
        </div>
      )}

      {!isLoading && cycles.length === 0 && (
        <div className={obStyles.emptyState}>
          <Icon icon={SnapshotIcon} size="lg" color="var(--color-wine)" />
          <h2 className={obStyles.emptyStateTitle}>No Audit Records Found</h2>
          <p className={obStyles.emptyStateDesc}>
            Once settlement cycles are created and frozen, immutable audit statements with cryptographic proofs and CSV export become available here.
          </p>
          <Link href="/cycles/new" style={{ textDecoration: 'none' }}>
            <Button variant="primary">Assemble First Cycle</Button>
          </Link>
        </div>
      )}

      {!isLoading && cycles.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {cycles.map((c) => (
            <article
              key={c.id}
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-lg)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 'var(--space-md)',
              }}
            >
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-ink)', margin: '0 0 4px 0' }}>
                  Cycle #{c.cycleNumber} ({c.id})
                </h3>
                <div style={{ fontSize: '12px', color: 'var(--color-muted)', fontVariantNumeric: 'tabular-nums' }}>
                  Commitment: {c.snapshotCommitment.slice(0, 18)}... &bull; Net Volume: {formatBaseUnitsToDisplay(c.netDebtTotal)} &bull; {c.state}
                </div>
              </div>

              <Link href={`/cycles/${c.id}/audit`} style={{ textDecoration: 'none' }}>
                <Button variant="secondary" icon={<Icon icon={FileText} size="sm" />}>
                  View Audit Statement
                </Button>
              </Link>
            </article>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
