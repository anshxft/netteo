'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { SettlementCycle } from '@/features/settlement-cycles/types';
import { loadCycles, VERIFIED_MEZO_CYCLE } from '@/features/settlement-cycles/store';
import { syncCyclesFromSupabase } from '@/lib/db/syncService';
import { formatBaseUnitsToDisplay } from '@/features/obligations/store';
import { useWorkspace } from '@/features/workspace/WorkspaceContext';
import { Button } from '@/components/common/Button';
import { Icon } from '@/components/icons/Icon';
import { CycleIcon, SnapshotIcon } from '@/components/icons/netteo';
import obStyles from '@/features/obligations/components/ObligationsView.module.css';
import { Plus, ArrowRight } from 'lucide-react';

export default function CyclesPage() {
  const { mode, resetCounter } = useWorkspace();
  const [cycles, setCycles] = useState<SettlementCycle[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;
    try {
      const data = loadCycles(mode);
      setCycles(data);
    } finally {
      setIsLoading(false);
    }

    if (mode === 'live') {
      syncCyclesFromSupabase()
        .then((remoteCycles) => {
          if (isCancelled) return;
          const map = new Map<string, SettlementCycle>();
          // Canonical verified Mezo cycle is always accessible in Live mode
          map.set(VERIFIED_MEZO_CYCLE.id.toLowerCase(), VERIFIED_MEZO_CYCLE);
          const local = loadCycles('live');
          if (remoteCycles) {
            remoteCycles.forEach((c) => map.set(c.id.toLowerCase(), c));
          }
          setCycles(Array.from(map.values()));
        })
        .catch((err) => {
          console.warn('Could not sync cycles from Supabase:', err);
        });
    }

    return () => {
      isCancelled = true;
    };
  }, [mode, resetCounter]);

  const formatStateLabel = (state: string) => {
    switch (state) {
      case 'Proposed':
        return 'Planning';
      case 'Depositing':
        return 'Waiting for Deposits';
      case 'Executing':
        return 'Processing Transfers';
      case 'Completed':
        return 'Settled & Completed';
      case 'Failed':
        return 'Failed';
      default:
        return state;
    }
  };

  return (
    <AppLayout>
      <div className={obStyles.pageHeader}>
        <div className={obStyles.titleArea}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
            <h1>Settlements</h1>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: mode === 'demo' ? 'var(--color-wine-subtle, #f5e8e8)' : 'var(--color-sand)',
                color: mode === 'demo' ? 'var(--color-wine)' : 'var(--color-ink)',
                border: '1px solid var(--color-border)',
              }}
            >
              {mode === 'demo' ? 'Demo Sandbox' : 'Live Mezo'}
            </span>
          </div>
          <p className={obStyles.subtitle}>
            Batch and reconcile multiple accepted payments into single net transfers, saving up to 70% in liquidity.
          </p>
        </div>

        <Link href="/cycles/new" style={{ textDecoration: 'none' }}>
          <Button variant="primary" icon={<Icon icon={Plus} size="sm" color="#FFFFFF" />}>
            Start New Settlement
          </Button>
        </Link>
      </div>

      {isLoading && (
        <div style={{ padding: 'var(--space-2xl) 0', color: 'var(--color-muted)' }}>
          Loading settlements...
        </div>
      )}

      {!isLoading && cycles.length === 0 && (
        <div className={obStyles.emptyState}>
          <Icon icon={CycleIcon} size="lg" color="var(--color-wine)" />
          <h2 className={obStyles.emptyStateTitle}>No Settlements Yet</h2>
          <p className={obStyles.emptyStateDesc}>
            Combine approved payments from your group to calculate net balances and settle in a single atomic step.
          </p>
          <Link href="/cycles/new" style={{ textDecoration: 'none' }}>
            <Button variant="primary" icon={<Icon icon={Plus} size="sm" color="#FFFFFF" />}>
              Start First Settlement
            </Button>
          </Link>
        </div>
      )}

      {!isLoading && cycles.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {cycles.map((c) => {
            const grossBig = BigInt(c.grossObligationTotal || '0');
            const netBig = BigInt(c.netDebtTotal || '0');
            const savedBig = grossBig > netBig ? grossBig - netBig : 0n;
            const savingsPct = grossBig > 0n ? Number((savedBig * 100n) / grossBig) : 0;

            return (
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
                  transition: 'border-color 150ms ease, box-shadow 150ms ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', marginBottom: '4px' }}>
                      <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-ink)', margin: 0, fontFamily: 'var(--font-roundo), sans-serif' }}>
                        Settlement #{c.cycleNumber}
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
                        {formatStateLabel(c.state)}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-muted)', fontFamily: 'var(--font-mono, monospace)' }}>
                      ID: {c.id}
                    </div>
                  </div>

                  <Link href={`/cycles/${c.id}`} style={{ textDecoration: 'none' }}>
                    <Button variant="secondary" icon={<Icon icon={ArrowRight} size="sm" />} iconPosition="right">
                      View Settlement Details
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
                      Total Payments Value
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-ink)', marginTop: '2px', fontVariantNumeric: 'tabular-nums' }}>
                      {formatBaseUnitsToDisplay(c.grossObligationTotal)}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                      Actually Needed (Net)
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-wine)', marginTop: '2px', fontVariantNumeric: 'tabular-nums' }}>
                      {formatBaseUnitsToDisplay(c.netDebtTotal)}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                      Capital Saved
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-forest, #2d6a4f)', marginTop: '2px', fontVariantNumeric: 'tabular-nums' }}>
                      {savingsPct > 0 ? `${formatBaseUnitsToDisplay(savedBig)} (${savingsPct}%)` : '$0.00 MUSD'}
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
                </div>
              </article>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
}
