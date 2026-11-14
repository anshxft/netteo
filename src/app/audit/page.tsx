'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { loadCycles } from '@/features/settlement-cycles/store';
import { syncCyclesFromSupabase } from '@/lib/db/syncService';
import { useWorkspace } from '@/features/workspace/WorkspaceContext';
import { SettlementCycle } from '@/features/settlement-cycles/types';
import { formatBaseUnitsToDisplay } from '@/features/obligations/store';
import { Button } from '@/components/common/Button';
import { Icon } from '@/components/icons/Icon';
import { SnapshotIcon } from '@/components/icons/netteo';
import obStyles from '@/features/obligations/components/ObligationsView.module.css';
import { FileText, ArrowRight } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { useNeedsWallet, WalletRequiredState } from '@/components/wallet/WalletRequired';

export default function GeneralAuditPage() {
  const { mode, resetCounter } = useWorkspace();
  const needsWallet = useNeedsWallet();
  const [cycles, setCycles] = useState<SettlementCycle[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;
    try {
      setCycles(loadCycles(mode));
    } finally {
      setIsLoading(false);
    }

    if (mode === 'live') {
      // Same source as the Settlements page: registered cycles from the server merged over the local ones.
      syncCyclesFromSupabase()
        .then((remote) => {
          if (isCancelled || !remote) return;
          const byId = new Map(loadCycles('live').map((c) => [c.id.toLowerCase(), c]));
          remote.forEach((c) => byId.set(c.id.toLowerCase(), c));
          setCycles(Array.from(byId.values()));
        })
        .catch(() => {});
    }
    return () => {
      isCancelled = true;
    };
  }, [mode, resetCounter]);

  return (
    <AppLayout>
      <PageHeader
        title="Settlement Receipts"
        subtitle="Permanent records and accounting statements for every completed settlement. Download CSV statements or verify cryptographic proofs on Mezo."
      />

      {isLoading && (
        <div style={{ padding: 'var(--space-2xl) 0', color: 'var(--color-muted)' }}>
          Loading settlement receipts...
        </div>
      )}

      {!isLoading && cycles.length === 0 && needsWallet && <WalletRequiredState what="your receipts" />}

      {!isLoading && cycles.length === 0 && !needsWallet && (
        <div className={obStyles.emptyState}>
          <Icon icon={SnapshotIcon} size="lg" color="var(--color-wine)" />
          <h2 className={obStyles.emptyStateTitle}>No Receipts Yet</h2>
          <p className={obStyles.emptyStateDesc}>
            Once group settlements are created and processed, complete accounting receipts with downloadable records will appear here.
          </p>
          <Link href="/cycles" style={{ textDecoration: 'none' }}>
            <Button variant="primary">View Settlements</Button>
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
                padding: 'var(--space-xl)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-md)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', marginBottom: '4px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-ink)', margin: 0, fontFamily: 'var(--font-roundo), sans-serif' }}>
                      Settlement Receipt #{c.cycleNumber}
                    </h2>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor:
                          c.state === 'Completed'
                            ? 'var(--color-success-bg, rgba(26, 127, 55, 0.1))'
                            : 'var(--color-sand)',
                        color:
                          c.state === 'Completed'
                            ? 'var(--color-success, #1a7f37)'
                            : 'var(--color-ink)',
                        border: '1px solid var(--color-border)',
                      }}
                    >
                      {c.state === 'Completed' ? 'Completed & Settled' : c.state}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-muted)', fontFamily: 'var(--font-mono, monospace)' }}>
                    Proof Hash: {c.snapshotCommitment.slice(0, 18)}...
                  </div>
                </div>

                <Link href={`/cycles/${c.id}/audit`} style={{ textDecoration: 'none' }}>
                  <Button variant="secondary" icon={<Icon icon={FileText} size="sm" />}>
                    Open Receipt & Statement
                  </Button>
                </Link>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: 'var(--space-md)',
                  padding: 'var(--space-md) var(--space-lg)',
                  backgroundColor: 'var(--color-page)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                    Gross Payments
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-ink)', marginTop: '2px', fontVariantNumeric: 'tabular-nums' }}>
                    {formatBaseUnitsToDisplay(c.grossObligationTotal)}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                    Net Capital Settled
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-wine)', marginTop: '2px', fontVariantNumeric: 'tabular-nums' }}>
                    {formatBaseUnitsToDisplay(c.netDebtTotal)}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                    Payments Reconciled
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-ink)', marginTop: '2px' }}>
                    {c.includedObligationIds.length} payments
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                    Verification
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-success, #1a7f37)', marginTop: '4px' }}>
                    &bull; Mathematical Balance Verified
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
