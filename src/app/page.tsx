import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/common/Button';
import { Icon } from '@/components/icons/Icon';
import { ObligationIcon, NettingIcon, CycleIcon, SnapshotIcon } from '@/components/icons/netteo';
import { ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function HomePage() {
  return (
    <AppLayout>
      <div style={{ maxWidth: '960px', margin: '0 auto' }}>
        {/* Hero Section */}
        <header style={{ marginBottom: 'var(--space-3xl)' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--space-xs)',
              padding: 'var(--space-xs) var(--space-sm)',
              backgroundColor: 'var(--color-sand)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '13px',
              fontWeight: 500,
              color: 'var(--color-ink)',
              marginBottom: 'var(--space-md)',
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-wine)',
              }}
            />
            Mezo Testnet (Chain ID 31611) &bull; MUSD Settlement
          </div>

          <h1
            style={{
              fontSize: '40px',
              fontWeight: 700,
              color: 'var(--color-ink)',
              letterSpacing: '-0.02em',
              lineHeight: 1.15,
              marginBottom: 'var(--space-md)',
            }}
          >
            Many obligations.<br />One net settlement.
          </h1>
          <p
            style={{
              fontSize: '18px',
              color: 'var(--color-muted)',
              maxWidth: '620px',
              lineHeight: 1.5,
              marginBottom: 'var(--space-xl)',
            }}
          >
            Reconcile bilateral payment claims across Web3 service collectives and DAO working groups.
            Compute deterministic net balances and settle atomically in MUSD on Mezo.
          </p>

          <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
            <Link href="/obligations" style={{ textDecoration: 'none' }}>
              <Button
                variant="primary"
                icon={<Icon icon={ArrowRight} size="sm" color="#FFFFFF" />}
                iconPosition="right"
              >
                Open Obligation Desk
              </Button>
            </Link>
            <Link href="/cycles" style={{ textDecoration: 'none' }}>
              <Button variant="secondary">
                View Settlement Cycles
              </Button>
            </Link>
          </div>
        </header>

        {/* Feature Pillars */}
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 'var(--space-lg)',
            marginBottom: 'var(--space-3xl)',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-xl)',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-sand)',
                color: 'var(--color-wine)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 'var(--space-md)',
              }}
            >
              <Icon icon={ObligationIcon} size="md" color="var(--color-wine)" />
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: 'var(--space-xs)', color: 'var(--color-ink)' }}>
              1. Agree on Claims
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--color-muted)', lineHeight: 1.5 }}>
              Contributors record bilateral obligations with receipt hashes. Debtor acceptance is strictly required before any claim enters a settlement cycle.
            </p>
          </div>

          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-xl)',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-sand)',
                color: 'var(--color-wine)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 'var(--space-md)',
              }}
            >
              <Icon icon={NettingIcon} size="md" color="var(--color-wine)" />
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: 'var(--space-xs)', color: 'var(--color-ink)' }}>
              2. Deterministic Netting
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--color-muted)', lineHeight: 1.5 }}>
              Freeze approved obligations into a settlement cycle. Netting calculates exact mathematical balances (&Sigma; net = 0) and collapses reciprocal debt loops.
            </p>
          </div>

          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-xl)',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-sand)',
                color: 'var(--color-wine)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 'var(--space-md)',
              }}
            >
              <Icon icon={CycleIcon} size="md" color="var(--color-wine)" />
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: 'var(--space-xs)', color: 'var(--color-ink)' }}>
              3. Atomic Settlement
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--color-muted)', lineHeight: 1.5 }}>
              Net debtors deposit required balances in MUSD. Once 100% funded, the smart contract atomically distributes funds to net creditors in a single transaction.
            </p>
          </div>
        </section>

        {/* Protocol Invariant Guarantee */}
        <section
          style={{
            backgroundColor: 'var(--color-sand-light)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-xl)',
            marginBottom: 'var(--space-3xl)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 'var(--space-md)',
          }}
        >
          <Icon icon={ShieldCheck} size="lg" color="var(--color-wine)" />
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-ink)', marginBottom: '4px' }}>
              Collect-Then-Distribute Invariant
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--color-ink-secondary)', lineHeight: 1.5, margin: 0 }}>
              Netteo guarantees solvency on-chain: no partial payouts exist. If all net debtors do not fund before the 72-hour deadline, the cycle expires and every depositor is guaranteed a full mutual-exclusion refund via <code style={{ fontVariantNumeric: 'tabular-nums' }}>claimRefund()</code>.
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer
          style={{
            paddingTop: 'var(--space-xl)',
            borderTop: '1px solid var(--color-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '13px',
            color: 'var(--color-muted)',
            flexWrap: 'wrap',
            gap: 'var(--space-sm)',
          }}
        >
          <span>Netteo Protocol &bull; Settlement Kernel on Mezo</span>
          <span>Version 1.0</span>
        </footer>
      </div>
    </AppLayout>
  );
}
