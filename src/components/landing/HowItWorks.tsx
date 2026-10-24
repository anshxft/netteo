'use client';

import React from 'react';
import styles from './HowItWorks.module.css';
import { CheckCircle2, ArrowRight, ShieldCheck, Cpu, Wallet, Layers } from 'lucide-react';
import { Icon } from '@/components/icons/Icon';
import { ObligationIcon, NettingIcon, CycleIcon } from '@/components/icons/netteo';

export function HowItWorks() {
  return (
    <section id="how-it-works" className={styles.sectionWrapper}>
      <div className={styles.headerContainer}>
        <div className={styles.eyebrow}>
          <span>✦ Verified Clearing Lifecycle</span>
        </div>
        <h2 className={styles.title}>
          How our platform makes settlement
          <span className={styles.highlightPill}>frictionless</span>
        </h2>
        <p className={styles.subtitle}>
          From mutual invoice submission to on-chain non-custodial payout on Mezo in 4 simple steps.
        </p>
      </div>

      {/* 2x2 Grid of Soft Rounded Cards */}
      <div className={styles.grid2x2}>
        {/* Card 01 */}
        <div className={styles.card}>
          <div className={styles.cardTop}>
            <div className={styles.badgeRow}>
              <div className={styles.stepNumber}>01</div>
              <div className={styles.stepIcon}>
                <Icon icon={ObligationIcon} size="md" />
              </div>
            </div>
            <h3 className={styles.cardTitle}>Register Bilateral Claims</h3>
            <p className={styles.cardSentence}>
              Contributors log payment obligations; debtors explicitly verify and sign each claim with
              cryptographic authorization before netting.
            </p>
          </div>

          <div className={styles.previewBox}>
            <div className={styles.previewHeader}>
              <span>Obligation Entry</span>
              <span className={styles.previewStatusBadge}>
                <CheckCircle2 size={11} /> Accepted
              </span>
            </div>
            <div className={styles.previewRow}>
              <span>Alice (0x1111...1111) owes Bob</span>
              <span style={{ color: 'var(--color-ink)' }}>$100.00 MUSD</span>
            </div>
          </div>
        </div>

        {/* Card 02 */}
        <div className={styles.card}>
          <div className={styles.cardTop}>
            <div className={styles.badgeRow}>
              <div className={styles.stepNumber}>02</div>
              <div className={styles.stepIcon}>
                <Icon icon={NettingIcon} size="md" />
              </div>
            </div>
            <h3 className={styles.cardTitle}>Graph Netting Elimination</h3>
            <p className={styles.cardSentence}>
              Our deterministic solver analyzes circular debt paths across the partner graph and cancels
              reciprocal obligations down to the mathematical minimum.
            </p>
          </div>

          <div className={styles.previewBox}>
            <div className={styles.previewHeader}>
              <span>Graph Cycle Detected</span>
              <span style={{ color: 'var(--color-wine)', fontWeight: 700, fontSize: '11px' }}>
                -$120.00 Loop Canceled
              </span>
            </div>
            <div className={styles.previewRow}>
              <span style={{ fontSize: '12px', color: 'var(--color-ink-secondary)' }}>
                Alice → Bob ($100) → Charlie ($80) → Alice ($20)
              </span>
              <span style={{ color: 'var(--color-success)', fontWeight: 700 }}>Zero-Sum</span>
            </div>
          </div>
        </div>

        {/* Card 03 */}
        <div className={styles.card}>
          <div className={styles.cardTop}>
            <div className={styles.badgeRow}>
              <div className={styles.stepNumber}>03</div>
              <div className={styles.stepIcon}>
                <Icon icon={Wallet} size="md" />
              </div>
            </div>
            <h3 className={styles.cardTitle}>Deposit Net Deficit Only</h3>
            <p className={styles.cardSentence}>
              Only net debtors deposit MUSD into the automated settlement escrow contract on Mezo—no excess
              working capital is ever trapped in flight.
            </p>
          </div>

          <div className={styles.previewBox}>
            <div className={styles.previewHeader}>
              <span>Escrow Funding Progress</span>
              <span style={{ color: 'var(--color-success)', fontWeight: 700, fontSize: '11px' }}>
                $80 / $80 MUSD (100%)
              </span>
            </div>
            <div className={styles.progressBarTrack}>
              <div className={styles.progressBarFill} style={{ width: '100%' }} />
            </div>
          </div>
        </div>

        {/* Card 04 */}
        <div className={styles.card}>
          <div className={styles.cardTop}>
            <div className={styles.badgeRow}>
              <div className={styles.stepNumber}>04</div>
              <div className={styles.stepIcon}>
                <Icon icon={CycleIcon} size="md" />
              </div>
            </div>
            <h3 className={styles.cardTitle}>Atomic Creditor Payout</h3>
            <p className={styles.cardSentence}>
              Smart contract distributes funds to net creditors in one atomic execution, publishing
              verifiable Merkle snapshot proofs permanently on-chain.
            </p>
          </div>

          <div className={styles.previewBox}>
            <div className={styles.previewHeader}>
              <span>Mezo Transaction Confirmation</span>
              <span className={styles.previewStatusBadge}>
                <CheckCircle2 size={11} /> Settled
              </span>
            </div>
            <div className={styles.previewRow}>
              <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
                Tx: 0x8f2a...9c14
              </span>
              <span style={{ color: 'var(--color-success)', fontWeight: 700 }}>
                1 Atomic Tx
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
