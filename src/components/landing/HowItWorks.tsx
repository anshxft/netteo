'use client';

import React from 'react';
import styles from './HowItWorks.module.css';
import { CheckCircle2, Wallet } from 'lucide-react';
import { Icon } from '@/components/icons/Icon';
import { ObligationIcon, NettingIcon, CycleIcon } from '@/components/icons/netteo';

export function HowItWorks() {
  return (
    <section id="how-it-works" className={styles.sectionWrapper} aria-labelledby="how-it-works-title">
      <div className={styles.headerContainer}>
        <div className={styles.eyebrow}>
          <span>✦ How Settlement Works</span>
        </div>
        <h2 id="how-it-works-title" className={styles.title}>
          How our platform makes settlement
          <span className={styles.highlightPill}>frictionless</span>
        </h2>
        <p className={styles.subtitle}>
          From recording payments to one final payout on Mezo in 4 simple steps.
        </p>
      </div>

      {/* 2x2 Grid of Soft Rounded Cards */}
      <div className={styles.grid2x2}>
        {/* Step 1: Add and confirm debts */}
        <div className={styles.card}>
          <div className={styles.cardTop}>
            <div className={styles.badgeRow}>
              <div className={styles.stepNumber}>01</div>
              <div className={styles.stepIcon}>
                <Icon icon={ObligationIcon} size="md" />
              </div>
            </div>
            <h3 className={styles.cardTitle}>Add and confirm debts</h3>
            <p className={styles.cardSentence}>
              People record who owes whom and confirm the amounts.
            </p>
          </div>

          <div className={styles.previewBox}>
            <div className={styles.previewHeader}>
              <span>Starting Debts</span>
              <span className={styles.previewTotalBadge}>$200 Total</span>
            </div>
            <div className={styles.previewList}>
              <div className={styles.previewRow}>
                <span>Alice owes Bob</span>
                <span>$100</span>
              </div>
              <div className={styles.previewRow}>
                <span>Bob owes Charlie</span>
                <span>$80</span>
              </div>
              <div className={styles.previewRow}>
                <span>Charlie owes Alice</span>
                <span>$20</span>
              </div>
            </div>
          </div>
        </div>

        {/* Step 2: Cancel out matching debts */}
        <div className={styles.card}>
          <div className={styles.cardTop}>
            <div className={styles.badgeRow}>
              <div className={styles.stepNumber}>02</div>
              <div className={styles.stepIcon}>
                <Icon icon={NettingIcon} size="md" />
              </div>
            </div>
            <h3 className={styles.cardTitle}>Cancel out matching debts</h3>
            <p className={styles.cardSentence}>
              Netteo finds debts that can offset each other, reducing the total that needs to be paid.
            </p>
          </div>

          <div className={styles.previewBox}>
            <div className={styles.previewHeader}>
              <span>Matching Debts Canceled</span>
              <span className={styles.previewSavingsBadge}>-$120 Offset (60%)</span>
            </div>
            <div className={styles.previewList}>
              <div className={styles.previewRow}>
                <span>Starting debt total</span>
                <span>$200</span>
              </div>
              <div className={styles.previewRow}>
                <span>Debts canceled out</span>
                <span style={{ color: 'var(--color-wine)' }}>-$120</span>
              </div>
              <div className={styles.previewRow}>
                <span>Amount remaining to pay</span>
                <span style={{ color: 'var(--color-success)' }}>$80</span>
              </div>
            </div>
          </div>
        </div>

        {/* Step 3: Fund only what’s still owed */}
        <div className={styles.card}>
          <div className={styles.cardTop}>
            <div className={styles.badgeRow}>
              <div className={styles.stepNumber}>03</div>
              <div className={styles.stepIcon}>
                <Icon icon={Wallet} size="md" />
              </div>
            </div>
            <h3 className={styles.cardTitle}>Fund only what’s still owed</h3>
            <p className={styles.cardSentence}>
              The remaining debtors deposit the amounts needed for settlement.
            </p>
          </div>

          <div className={styles.previewBox}>
            <div className={styles.previewHeader}>
              <span>Settlement Deposits</span>
              <span className={styles.previewStatusBadge}>100% Funded</span>
            </div>
            <div className={styles.previewList}>
              <div className={styles.previewRow}>
                <span>Alice deposits</span>
                <span style={{ color: 'var(--color-ink)' }}>$80</span>
              </div>
              <div className={styles.previewRow}>
                <span>Bob & Charlie deposit</span>
                <span style={{ color: 'var(--color-muted)' }}>$0 (nothing owed)</span>
              </div>
            </div>
            <div
              className={styles.progressBarTrack}
              role="progressbar"
              aria-valuenow={100}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Settlement funding progress: 100%"
            >
              <div className={styles.progressBarFill} style={{ width: '100%' }} />
            </div>
          </div>
        </div>

        {/* Step 4: Pay everyone in one settlement */}
        <div className={styles.card}>
          <div className={styles.cardTop}>
            <div className={styles.badgeRow}>
              <div className={styles.stepNumber}>04</div>
              <div className={styles.stepIcon}>
                <Icon icon={CycleIcon} size="md" />
              </div>
            </div>
            <h3 className={styles.cardTitle}>Pay everyone in one settlement</h3>
            <p className={styles.cardSentence}>
              The contract distributes the funds and records the result on-chain.
            </p>
          </div>

          <div className={styles.previewBox}>
            <div className={styles.previewHeader}>
              <span>Final Distribution</span>
              <span className={styles.previewStatusBadge}>
                <CheckCircle2 size={11} /> All Debts Cleared
              </span>
            </div>
            <div className={styles.previewList}>
              <div className={styles.previewRow}>
                <span>Bob receives</span>
                <span style={{ color: 'var(--color-success)' }}>+$20</span>
              </div>
              <div className={styles.previewRow}>
                <span>Charlie receives</span>
                <span style={{ color: 'var(--color-success)' }}>+$60</span>
              </div>
              <div className={styles.previewRow}>
                <span>Remaining debts</span>
                <span style={{ color: 'var(--color-muted)' }}>$0 (fully settled)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
