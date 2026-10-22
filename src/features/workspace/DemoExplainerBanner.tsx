'use client';

import React, { useState } from 'react';
import { useWorkspace } from './WorkspaceContext';
import { RotateCcw, Zap, Sparkles, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';
import { Icon } from '@/components/icons/Icon';

export function DemoExplainerBanner() {
  const { mode, toggleMode, resetDemoWorkspace } = useWorkspace();
  const [isExpanded, setIsExpanded] = useState(true);
  const [justReset, setJustReset] = useState(false);

  if (mode !== 'demo') {
    return null;
  }

  const handleReset = () => {
    resetDemoWorkspace();
    setJustReset(true);
    setTimeout(() => setJustReset(false), 2000);
  };

  return (
    <aside
      role="region"
      aria-label="Interactive Demo Sandbox Explainer"
      style={{
        backgroundColor: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        padding: isExpanded ? 'var(--space-md) var(--space-xl)' : 'var(--space-xs) var(--space-xl)',
        transition: 'padding var(--motion-fast)',
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-sm)',
        }}
      >
        {/* Banner Top Row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 'var(--space-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                backgroundColor: 'rgba(127, 1, 31, 0.08)',
                color: 'var(--color-wine)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '12px',
                fontWeight: 600,
                letterSpacing: '0.02em',
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-success)',
                }}
              />
              DEMO SANDBOX (MOCK TOKENS)
            </span>

            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-ink)' }}>
              How Netteo Collapses Mutual Debt into 1 Net Settlement
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
            <button
              type="button"
              onClick={handleReset}
              disabled={justReset}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 500,
                backgroundColor: 'transparent',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--color-ink)',
                cursor: justReset ? 'default' : 'pointer',
              }}
              title="Reset the demo to the pristine 3-party scenario"
            >
              <Icon icon={justReset ? CheckCircle2 : RotateCcw} size="sm" color={justReset ? 'var(--color-success)' : 'currentColor'} />
              <span>{justReset ? 'Reset Complete!' : 'Reset Demo'}</span>
            </button>

            <button
              type="button"
              onClick={toggleMode}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 600,
                backgroundColor: 'var(--color-wine)',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--color-page)',
                cursor: 'pointer',
              }}
            >
              <Icon icon={Zap} size="sm" color="var(--color-page)" />
              <span>Switch to Live Mezo Mode</span>
            </button>

            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              aria-label={isExpanded ? 'Collapse concept explainer' : 'Expand concept explainer'}
              style={{
                background: 'transparent',
                border: 'none',
                padding: '6px',
                cursor: 'pointer',
                color: 'var(--color-muted)',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Icon icon={isExpanded ? ChevronUp : ChevronDown} size="sm" color="currentColor" />
            </button>
          </div>
        </div>

        {/* Expanded Simple English Concept Explainer */}
        {isExpanded && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 'var(--space-md)',
              paddingTop: 'var(--space-xs)',
              borderTop: '1px dashed var(--color-border)',
              marginTop: 'var(--space-xs)',
            }}
          >
            {/* Step 1: The Problem */}
            <div
              style={{
                backgroundColor: 'var(--color-page)',
                padding: 'var(--space-sm) var(--space-md)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                1. Three Mutual Debts ($200 Total)
              </div>
              <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.5, color: 'var(--color-ink)' }}>
                • <strong>Alice</strong> owes Bob <strong>$100</strong><br />
                • <strong>Bob</strong> owes Charlie <strong>$80</strong><br />
                • <strong>Charlie</strong> owes Alice <strong>$20</strong>
              </p>
            </div>

            {/* Step 2: The Netting Math */}
            <div
              style={{
                backgroundColor: 'var(--color-page)',
                padding: 'var(--space-sm) var(--space-md)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-wine)', textTransform: 'uppercase', marginBottom: '4px' }}>
                2. Netteo Net Calculation
              </div>
              <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.5, color: 'var(--color-ink)' }}>
                Circular debts cancel out automatically:<br />
                • <strong>Alice:</strong> pays net <strong>$80</strong><br />
                • <strong>Bob:</strong> receives net <strong>$20</strong><br />
                • <strong>Charlie:</strong> receives net <strong>$60</strong>
              </p>
            </div>

            {/* Step 3: Atomic Settlement */}
            <div
              style={{
                backgroundColor: 'rgba(127, 1, 31, 0.04)',
                padding: 'var(--space-sm) var(--space-md)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid rgba(127, 1, 31, 0.15)',
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-wine)', textTransform: 'uppercase', marginBottom: '4px' }}>
                3. Net Settlement ($80 Funded vs $200 Gross)
              </div>
              <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.5, color: 'var(--color-ink)' }}>
                Only <strong>$80 MUSD</strong> in net funding is required to clear all <strong>$200 MUSD</strong> in gross claims across 3 participants. All 3 obligations are cleared atomically in 1 transaction on Mezo. (Note: reduced settlement volume is a liquidity efficiency metric, not guaranteed economic savings).
              </p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
