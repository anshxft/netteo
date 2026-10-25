'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import styles from './LandingHero.module.css';
import { ArrowRight, CheckCircle2, ShieldCheck, Zap, Lock, Sparkles } from 'lucide-react';
import { Icon } from '@/components/icons/Icon';
import { ObligationIcon, NettingIcon, CycleIcon } from '@/components/icons/netteo';
import { Button } from '@/components/common/Button';

export function LandingHero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 12;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 12;
    setMouseOffset({ x, y });
  };

  const handleMouseLeave = () => {
    setMouseOffset({ x: 0, y: 0 });
  };

  return (
    <section className={styles.heroOuter}>
      <div
        ref={containerRef}
        className={styles.heroCard}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={
          {
            '--parallax-x': mouseOffset.x,
            '--parallax-y': mouseOffset.y,
          } as React.CSSProperties
        }
      >
        <div className={styles.heroContent}>
          {/* Eyebrow Tag */}
          <div className={styles.eyebrow}>
            <span className={styles.eyebrowSparkle}>✦</span>
            <span>Multilateral Debt Clearing on Mezo</span>
          </div>

          {/* Centered Headline with ONE Highlighted Word in a Rounded Pill */}
          <h1 className={styles.headline}>
            Collapse reciprocal debt with
            <span className={styles.highlightPill}>Netteo</span>
          </h1>

          {/* 2-line Subtext */}
          <p className={styles.subtext}>
            Turn tangled bilateral invoices into a single net settlement. Conserve 60% upfront liquidity in standard 3-party settlements (and up to 75%+ in high-density networks) with zero-sum mathematical certainty on Mezo testnet.
          </p>

          {/* Dual Action Row */}
          <div className={styles.actionRow}>
            <Link href="/obligations" style={{ textDecoration: 'none' }}>
              <Button
                variant="primary"
                icon={<Icon icon={ArrowRight} size="sm" color="#FFFFFF" />}
                iconPosition="right"
                style={{ minHeight: '50px', padding: '0 28px', fontSize: '15px', borderRadius: 'var(--radius-full)' }}
              >
                Open Obligation Desk
              </Button>
            </Link>

            <a href="#simulator" style={{ textDecoration: 'none' }}>
              <Button
                variant="tertiary"
                style={{ fontSize: '15px' }}
              >
                Explore Netting Simulator ↓
              </Button>
            </a>
          </div>
        </div>

        {/* Visual Stage: Central Mockup & Flanking Floating UI Cards */}
        <div className={styles.stageContainer}>
          {/* Floating UI Card Left: Approved Obligations */}
          <div className={styles.floatingCardLeft}>
            <div className={styles.floatingHeader}>
              <Icon icon={ObligationIcon} size="sm" />
              <span>Approved Claims (3)</span>
            </div>
            <div className={styles.floatingItem}>
              <span>Alice owes Bob</span>
              <span className={styles.itemAcceptedBadge}>
                <CheckCircle2 size={10} /> $100.00
              </span>
            </div>
            <div className={styles.floatingItem}>
              <span>Bob owes Charlie</span>
              <span className={styles.itemAcceptedBadge}>
                <CheckCircle2 size={10} /> $80.00
              </span>
            </div>
            <div className={styles.floatingItem}>
              <span>Charlie owes Alice</span>
              <span className={styles.itemAcceptedBadge}>
                <CheckCircle2 size={10} /> $20.00
              </span>
            </div>
          </div>

          {/* Central Mockup Device */}
          <div className={styles.mockupDevice}>
            <div className={styles.deviceHeader}>
              <div className={styles.deviceTitle}>
                <Icon icon={CycleIcon} size="sm" />
                <span>Mezo Settlement #004</span>
              </div>
              <div className={styles.cycleLiveBadge}>
                <span className={styles.deviceStatusDot} />
                <span>Ready to Settle</span>
              </div>
            </div>

            {/* Net Settlement Summary Card */}
            <div className={styles.deviceSummaryCard}>
              <div className={styles.summaryTop}>
                <span className={styles.summaryLabel}>Net Liquidity Required</span>
                <span className={styles.summarySavingsBadge}>60% Volume Collapsed</span>
              </div>
              <div className={styles.summaryAmount}>$80.00 MUSD</div>
              <div className={styles.summarySub}>
                Clears all $200.00 gross claims in 1 atomic Mezo transaction. (Liquidity volume reduction, not guaranteed fee savings).
              </div>
            </div>

            {/* Participant Resolution Rows */}
            <div className={styles.deviceList}>
              <div className={styles.deviceRow}>
                <div>
                  <div className={styles.rowActor}>Alice (Design)</div>
                  <div style={{ fontSize: '10.5px', color: 'var(--color-muted)' }}>Net Debtor</div>
                </div>
                <div className={`${styles.rowNet} ${styles.rowNetDebtor}`}>- $80.00 MUSD</div>
              </div>

              <div className={styles.deviceRow}>
                <div>
                  <div className={styles.rowActor}>Bob (Infra)</div>
                  <div style={{ fontSize: '10.5px', color: 'var(--color-muted)' }}>Net Creditor</div>
                </div>
                <div className={`${styles.rowNet} ${styles.rowNetCreditor}`}>+ $20.00 MUSD</div>
              </div>

              <div className={styles.deviceRow}>
                <div>
                  <div className={styles.rowActor}>Charlie (Audit)</div>
                  <div style={{ fontSize: '10.5px', color: 'var(--color-muted)' }}>Net Creditor</div>
                </div>
                <div className={`${styles.rowNet} ${styles.rowNetCreditor}`}>+ $60.00 MUSD</div>
              </div>
            </div>

            <Link href="/obligations" style={{ textDecoration: 'none', width: '100%' }}>
              <Button
                variant="primary"
                icon={<ArrowRight size={14} />}
                iconPosition="right"
                style={{ width: '100%', minHeight: '38px', fontSize: '12.5px' }}
              >
                View Full Obligation Desk
              </Button>
            </Link>
          </div>

          {/* Floating UI Card Right: Net Position Solver */}
          <div className={styles.floatingCardRight}>
            <div className={styles.floatingHeader}>
              <Icon icon={NettingIcon} size="sm" />
              <span>Net Resolution Invariant</span>
            </div>
            <div className={styles.floatingItem}>
              <span>Gross Claim Sum</span>
              <strong style={{ fontVariantNumeric: 'tabular-nums' }}>$200.00</strong>
            </div>
            <div className={styles.floatingItem}>
              <span>Loop Canceled</span>
              <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>-$120.00</span>
            </div>
            <div className={styles.floatingItem}>
              <span>Conservation Check</span>
              <span style={{ color: 'var(--color-wine)', fontWeight: 700 }}>Σ Net = 0.00</span>
            </div>
          </div>

          {/* Floating Chips */}
          <div className={styles.floatingChip1}>
            <ShieldCheck size={14} color="var(--color-success)" />
            <span>Non-Custodial Escrow</span>
          </div>

          <div className={styles.floatingChip2}>
            <Lock size={14} color="var(--color-wine)" />
            <span>EIP-712 Signed Claims</span>
          </div>
        </div>
      </div>
    </section>
  );
}
