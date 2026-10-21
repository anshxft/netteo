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

  return (
    <AppLayout>
      <div className={obStyles.pageHeader}>
        <div className={obStyles.titleArea}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
            <h1>Settlement Cycles</h1>
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
            Discrete multilateral settlement operations reconciling accepted obligations into single atomic net transfers on Mezo.
          </p>
        </div>

        <Link href="/cycles/new" style={{ textDecoration: 'none' }}>
          <Button variant="primary" icon={<Icon icon={Plus} size="sm" color="#FFFFFF" />}>
            Assemble New Cycle
          </Button>
        </Link>
      </div>

      {isLoading && (
        <div style={{ padding: 'var(--space-2xl) 0', color: 'var(--color-muted)' }}>
          Loading settlement cycles...
        </div>
      )}

      {!isLoading && cycles.length === 0 && (
        <div className={obStyles.emptyState}>
          <Icon icon={CycleIcon} size="lg" color="var(--color-wine)" />
          <h2 className={obStyles.emptyStateTitle}>No Settlement Cycles Found</h2>
          <p className={obStyles.emptyStateDesc}>
            Assemble a new settlement cycle from accepted obligations to collapse reciprocal debts and execute settlement.
          </p>
          <Link href="/cycles/new" style={{ textDecoration: 'none' }}>
            <Button variant="primary" icon={<Icon icon={Plus} size="sm" color="#FFFFFF" />}>
              Assemble First Cycle
            </Button>
          </Link>
        </div>
      )}

      {!isLoading && cycles.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          {cycles.map((c) => (
            <article
              key={c.id}
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-xl)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 'var(--space-md)',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', marginBottom: '4px' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-ink)', margin: 0 }}>
                    Cycle #{c.cycleNumber} ({c.id})
                  </h2>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor:
                        c.state === 'Completed'
                          ? 'var(--color-success-bg)'
                          : 'var(--color-sand)',
                      color:
                        c.state === 'Completed'
                          ? 'var(--color-success)'
                          : 'var(--color-ink)',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    {c.state}
                  </span>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--color-muted)', fontVariantNumeric: 'tabular-nums' }}>
                  Gross Volume: {formatBaseUnitsToDisplay(c.grossObligationTotal)} &bull; Net Funding Required: {formatBaseUnitsToDisplay(c.netDebtTotal)} &bull; {c.includedObligationIds.length} obligations
                </div>
              </div>

              <Link href={`/cycles/${c.id}`} style={{ textDecoration: 'none' }}>
                <Button variant="secondary" icon={<Icon icon={ArrowRight} size="sm" />} iconPosition="right">
                  Open Cycle Desk
                </Button>
              </Link>
            </article>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
