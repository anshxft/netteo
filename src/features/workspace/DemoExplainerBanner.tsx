'use client';

import React, { useState, useEffect } from 'react';
import styles from './DemoExplainerBanner.module.css';
import { useWorkspace } from './WorkspaceContext';
import { RotateCcw, Zap, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';
import { Icon } from '@/components/icons/Icon';

export function DemoExplainerBanner() {
  const { mode, toggleMode, resetDemoWorkspace } = useWorkspace();
  const [isExpanded, setIsExpanded] = useState(true);
  const [justReset, setJustReset] = useState(false);

  // Restore user expansion preference from sessionStorage if set
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('netteo_demo_banner_expanded');
      if (stored !== null) {
        setIsExpanded(stored === 'true');
      }
    }
  }, []);

  const handleToggleExpand = () => {
    setIsExpanded((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('netteo_demo_banner_expanded', String(next));
      }
      return next;
    });
  };

  if (mode !== 'demo') {
    return null;
  }

  const handleReset = () => {
    if (justReset) return; // Double-click protection
    resetDemoWorkspace();
    setJustReset(true);
    setTimeout(() => setJustReset(false), 2000);
  };

  return (
    <aside
      role="region"
      aria-label="Interactive Demo Sandbox Explainer"
      className={`${styles.banner} ${isExpanded ? styles.bannerExpanded : ''}`}
    >
      <div className={styles.container}>
        {/* Banner Top Row */}
        <div className={styles.topRow}>
          <div className={styles.titleArea}>
            <span className={styles.badge}>
              <span className={styles.statusDot} />
              DEMO SANDBOX (MOCK TOKENS)
            </span>

            <span className={styles.titleText}>
              How Netteo Collapses Mutual Debt into 1 Net Settlement
            </span>
          </div>

          <div className={styles.controlsGroup}>
            <button
              type="button"
              onClick={handleReset}
              disabled={justReset}
              className={`${styles.actionButton} ${styles.resetButton}`}
              title="Reset the demo to the pristine 3-party scenario"
            >
              <Icon
                icon={justReset ? CheckCircle2 : RotateCcw}
                size="sm"
                color={justReset ? 'var(--color-success)' : 'currentColor'}
              />
              <span>{justReset ? 'Reset Complete!' : 'Reset Demo'}</span>
            </button>

            <button
              type="button"
              onClick={toggleMode}
              className={`${styles.actionButton} ${styles.switchButton}`}
            >
              <Icon icon={Zap} size="sm" color="#FFFFFF" />
              <span>Switch to Live Mezo Mode</span>
            </button>

            <button
              type="button"
              onClick={handleToggleExpand}
              className={styles.toggleExpandButton}
              aria-label={isExpanded ? 'Collapse concept explainer' : 'Expand concept explainer'}
              title={isExpanded ? 'Collapse explainer' : 'Expand explainer'}
            >
              <Icon icon={isExpanded ? ChevronUp : ChevronDown} size="sm" color="currentColor" />
            </button>
          </div>
        </div>

        {/* Expanded Simple English Concept Explainer */}
        {isExpanded && (
          <div className={styles.cardsGrid}>
            {/* Step 1: The Problem */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                1. Three Mutual Debts ($200 Total)
              </div>
              <p className={styles.cardBody}>
                • <strong>Alice</strong> owes Bob <strong>$100</strong><br />
                • <strong>Bob</strong> owes Charlie <strong>$80</strong><br />
                • <strong>Charlie</strong> owes Alice <strong>$20</strong>
              </p>
            </div>

            {/* Step 2: The Netting Math */}
            <div className={styles.card}>
              <div className={`${styles.cardHeader} ${styles.cardHeaderHighlight}`}>
                2. Netteo Net Calculation
              </div>
              <p className={styles.cardBody}>
                Circular debts cancel out automatically:<br />
                • <strong>Alice:</strong> pays net <strong>$80</strong><br />
                • <strong>Bob:</strong> receives net <strong>$20</strong><br />
                • <strong>Charlie:</strong> receives net <strong>$60</strong>
              </p>
            </div>

            {/* Step 3: Atomic Settlement */}
            <div className={styles.cardHighlight}>
              <div className={`${styles.cardHeader} ${styles.cardHeaderHighlight}`}>
                3. Net Settlement ($80 Funded vs $200 Gross — 60% Volume Reduction)
              </div>
              <p className={styles.cardBody}>
                Only <strong>$80 MUSD</strong> in net funding is required to clear all <strong>$200 MUSD</strong> in gross claims across 3 participants. All 3 obligations are cleared atomically in 1 transaction on Mezo.
              </p>
              <span className={styles.disclaimerText}>
                *Liquidity reduction represents settlement volume collapsed via cycle netting, not guaranteed economic savings or fee discounts.
              </span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
