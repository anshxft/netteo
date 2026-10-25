'use client';

import React, { useState } from 'react';
import { Play, Sparkles, Sliders, ChevronUp, ChevronDown, RotateCcw } from 'lucide-react';
import { Icon } from '@/components/icons/Icon';
import { PreloaderMode, PreloaderState } from './StaircasePreloader';

export interface StaircasePreviewDockProps {
  onTrigger: (config: {
    mode: PreloaderMode;
    columnCount: number;
    durationMs: number;
    state?: PreloaderState;
  }) => void;
  isPreloaderActive: boolean;
}

export function StaircasePreviewDock({
  onTrigger,
  isPreloaderActive,
}: StaircasePreviewDockProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<PreloaderMode>('converging');
  const [columnCount, setColumnCount] = useState<number>(5);
  const [durationMs, setDurationMs] = useState<number>(2200);
  const [simulatedState, setSimulatedState] = useState<PreloaderState | 'normal'>('normal');
  const [isDebounced, setIsDebounced] = useState(false);

  const handleLaunch = () => {
    if (isDebounced || isPreloaderActive) return;
    setIsDebounced(true);
    setTimeout(() => setIsDebounced(false), 600);

    onTrigger({
      mode,
      columnCount,
      durationMs,
      state: simulatedState === 'normal' ? undefined : simulatedState,
    });
  };

  return (
    <aside
      aria-label="Staircase Preloader Interactive Controls"
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9000,
        fontFamily: 'var(--font-roundo)',
      }}
    >
      {/* Expanded Control Panel */}
      {isOpen && (
        <div
          style={{
            marginBottom: '10px',
            width: '320px',
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border-strong)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--nav-pill-shadow)',
            padding: 'var(--space-md)',
            color: 'var(--color-ink)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-sm)',
            fontSize: '13px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid var(--color-border)',
              paddingBottom: '8px',
            }}
          >
            <span style={{ fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Icon icon={Sparkles} size="sm" color="var(--color-wine)" />
              Staircase Configurator
            </span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: 'var(--color-wine)',
                backgroundColor: 'var(--color-wine-subtle)',
                padding: '2px 6px',
                borderRadius: '4px',
              }}
            >
              DUAL-DIRECTION
            </span>
          </div>

          {/* Mode Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--color-muted)', marginBottom: '4px' }}>
              ANIMATION PATTERN
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
              {(['converging', 'interlocked', 'center-out'] as PreloaderMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  style={{
                    padding: '6px 4px',
                    fontSize: '11px',
                    fontWeight: 600,
                    textTransform: 'capitalize',
                    border: mode === m ? '1px solid var(--color-wine)' : '1px solid var(--color-border)',
                    backgroundColor: mode === m ? 'var(--color-wine-subtle)' : 'var(--color-surface-elevated)',
                    color: mode === m ? 'var(--color-wine)' : 'var(--color-ink)',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                  }}
                >
                  {m === 'center-out' ? 'Center' : m}
                </button>
              ))}
            </div>
          </div>

          {/* Columns & Speed Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--color-muted)', marginBottom: '4px' }}>
                COLUMNS ({columnCount})
              </label>
              <div style={{ display: 'flex', gap: '4px' }}>
                {[4, 5, 6, 8].map((cols) => (
                  <button
                    key={cols}
                    type="button"
                    onClick={() => setColumnCount(cols)}
                    style={{
                      flex: 1,
                      padding: '4px 0',
                      fontSize: '11px',
                      fontWeight: 600,
                      border: columnCount === cols ? '1px solid var(--color-wine)' : '1px solid var(--color-border)',
                      backgroundColor: columnCount === cols ? 'var(--color-wine-subtle)' : 'var(--color-surface-elevated)',
                      color: columnCount === cols ? 'var(--color-wine)' : 'var(--color-ink)',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                    }}
                  >
                    {cols}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--color-muted)', marginBottom: '4px' }}>
                TIMING
              </label>
              <div style={{ display: 'flex', gap: '4px' }}>
                {[
                  { label: 'Snap', ms: 1400 },
                  { label: 'Norm', ms: 2200 },
                  { label: 'Cine', ms: 3500 },
                  { label: 'Hold', ms: 8000 },
                ].map((preset) => (
                  <button
                    key={preset.ms}
                    type="button"
                    onClick={() => setDurationMs(preset.ms)}
                    style={{
                      flex: 1,
                      padding: '4px 0',
                      fontSize: '11px',
                      fontWeight: 600,
                      border: durationMs === preset.ms ? '1px solid var(--color-wine)' : '1px solid var(--color-border)',
                      backgroundColor: durationMs === preset.ms ? 'var(--color-wine-subtle)' : 'var(--color-surface-elevated)',
                      color: durationMs === preset.ms ? 'var(--color-wine)' : 'var(--color-ink)',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                    }}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 5-State Simulator */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--color-muted)', marginBottom: '4px' }}>
              SIMULATE 5-SCREEN STATE
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
              {(['normal', 'error', 'offline', 'empty'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setSimulatedState(st)}
                  style={{
                    padding: '4px 2px',
                    fontSize: '10px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    border: simulatedState === st ? '1px solid var(--color-wine)' : '1px solid var(--color-border)',
                    backgroundColor: simulatedState === st ? 'var(--color-wine-subtle)' : 'var(--color-surface-elevated)',
                    color: simulatedState === st ? 'var(--color-wine)' : 'var(--color-ink)',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                  }}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Trigger Button with double-click guard */}
          <button
            id="play-staircase-config-btn"
            type="button"
            onClick={handleLaunch}
            disabled={isDebounced || isPreloaderActive}
            style={{
              marginTop: '6px',
              padding: '8px var(--space-md)',
              backgroundColor: 'var(--color-wine)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              fontWeight: 600,
              fontSize: '12px',
              cursor: isDebounced || isPreloaderActive ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: '0 2px 8px rgba(127, 1, 31, 0.25)',
              opacity: isDebounced || isPreloaderActive ? 0.6 : 1,
            }}
          >
            <Icon icon={Play} size="sm" color="#FFFFFF" />
            <span>Play Double Staircase</span>
          </button>
        </div>
      )}

      {/* Floating Pill Launch Button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <button
          id="replay-staircase-btn"
          type="button"
          onClick={handleLaunch}
          disabled={isDebounced || isPreloaderActive}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            backgroundColor: 'var(--color-surface)',
            color: 'var(--color-ink)',
            border: '1px solid var(--color-border-strong)',
            borderRadius: 'var(--radius-full)',
            boxShadow: 'var(--nav-pill-shadow)',
            fontWeight: 600,
            fontSize: '13px',
            cursor: isDebounced || isPreloaderActive ? 'not-allowed' : 'pointer',
            transition: 'all var(--motion-fast)',
          }}
          title="Replay the double staircase animation"
        >
          <Icon icon={RotateCcw} size="sm" color="var(--color-wine)" />
          <span>Replay Staircase</span>
        </button>

        <button
          id="staircase-config-btn"
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-label="Toggle Staircase Preloader settings"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
            backgroundColor: 'var(--color-surface)',
            color: 'var(--color-ink)',
            border: '1px solid var(--color-border-strong)',
            borderRadius: '50%',
            boxShadow: 'var(--nav-pill-shadow)',
            cursor: 'pointer',
          }}
        >
          <Icon icon={isOpen ? ChevronDown : Sliders} size="sm" />
        </button>
      </div>
    </aside>
  );
}
