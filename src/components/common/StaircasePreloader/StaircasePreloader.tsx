'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import styles from './StaircasePreloader.module.css';
import { AlertCircle, WifiOff, CheckCircle2, RotateCw, X } from 'lucide-react';
import { Icon } from '@/components/icons/Icon';

export type PreloaderMode = 'converging' | 'interlocked' | 'center-out';
export type PreloaderState = 'loading' | 'success' | 'error' | 'empty' | 'offline';

export interface StaircasePreloaderProps {
  /**
   * Number of vertical staircase columns across the screen (default: 5)
   */
  columnCount?: number;
  /**
   * Directional animation mode (default: 'converging')
   */
  mode?: PreloaderMode;
  /**
   * Approximate total active loading duration in ms before exit starts (default: 2200ms)
   */
  durationMs?: number;
  /**
   * Fired when the staircase exit animation finishes completely
   */
  onComplete?: () => void;
  /**
   * Allow user to bypass the animation immediately with button or Escape key (default: true)
   */
  showSkip?: boolean;
  /**
   * Force a specific 5-state condition for testing/error recovery
   */
  state?: PreloaderState;
  /**
   * Custom array of institutional milestone messages displayed during progress
   */
  milestones?: string[];
  /**
   * Explicit control to keep preloader open or restart it
   */
  isOpen?: boolean;
  /**
   * Error message to display when state === 'error' (sanitized, safe)
   */
  errorMessage?: string;
  /**
   * Retry callback when error is displayed
   */
  onRetry?: () => void;
}

const DEFAULT_MILESTONES = [
  'INITIALIZING MULTILATERAL LEDGER...',
  'CALIBRATING ZERO-SUM NETTING MATRICES...',
  'SYNCHRONIZING MEZO RPC (CHAIN 31611)...',
  'ATOMIC CLEARING ENGINE VERIFIED.',
];

/**
 * Advanced Staircase Preloader with Dual-Direction Animations and Complex Timing
 * Features synchronized top and bottom staircase panels, smooth cubic-bezier easing,
 * full 5-screen-state handling, reduced-motion compatibility, and double-click protection.
 */
export function StaircasePreloader({
  columnCount = 5,
  mode = 'converging',
  durationMs = 900,
  onComplete,
  showSkip = true,
  state: controlledState,
  milestones = DEFAULT_MILESTONES,
  isOpen = true,
  errorMessage = 'Clearing engine synchronization timed out. Settle locally or retry.',
  onRetry,
}: StaircasePreloaderProps) {
  // Animation phases: 'idle' | 'enter' | 'holding' | 'exit' | 'complete'
  const [phase, setPhase] = useState<'idle' | 'enter' | 'holding' | 'exit' | 'complete'>('idle');
  const [progress, setProgress] = useState(0);
  const [milestoneIndex, setMilestoneIndex] = useState(0);
  const [isOffline, setIsOffline] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isActionLocked, setIsActionLocked] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const completedCalledRef = useRef<boolean>(false);

  // Derive active 5-state
  const currentState: PreloaderState = useMemo(() => {
    if (controlledState) return controlledState;
    if (isOffline) return 'offline';
    if (progress >= 100) return 'success';
    if (!milestones || milestones.length === 0) return 'empty';
    return 'loading';
  }, [controlledState, isOffline, progress, milestones]);

  // Reduced motion media query check
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Offline detection (Prototype Checklist §4)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsOffline(!navigator.onLine);

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const phaseRef = useRef<'idle' | 'enter' | 'holding' | 'exit' | 'complete'>('idle');
  phaseRef.current = phase;

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const isActionLockedRef = useRef(isActionLocked);
  isActionLockedRef.current = isActionLocked;

  const prefersReducedMotionRef = useRef(prefersReducedMotion);
  prefersReducedMotionRef.current = prefersReducedMotion;

  // Stable exit trigger helper with double-click protection
  const triggerExit = useCallback(() => {
    if (isActionLockedRef.current || phaseRef.current === 'exit' || phaseRef.current === 'complete') return;
    setIsActionLocked(true);
    setPhase('exit');

    // Exit transition duration is the max column exit delay + step transition (450ms)
    const exitDuration = prefersReducedMotionRef.current ? 40 : 420;
    setTimeout(() => {
      setPhase('complete');
      setIsActionLocked(false);
      if (!completedCalledRef.current) {
        completedCalledRef.current = true;
        onCompleteRef.current?.();
      }
    }, exitDuration);
  }, []);

  // Keyboard shortcut: Escape, Space, or Enter to skip
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') && isOpen && phaseRef.current !== 'complete') {
        if (e.key === ' ') e.preventDefault();
        triggerExit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, triggerExit]);

  // Main lifecycle loop
  useEffect(() => {
    if (!isOpen) {
      setPhase('idle');
      return;
    }

    // Immediate bypass under prefers-reduced-motion
    if (prefersReducedMotionRef.current) {
      setPhase('complete');
      if (!completedCalledRef.current) {
        completedCalledRef.current = true;
        onCompleteRef.current?.();
      }
      return;
    }

    completedCalledRef.current = false;
    setPhase('enter');
    setProgress(0);
    setMilestoneIndex(0);
    startTimeRef.current = Date.now();

    // After entrance staircase panels arrive, switch to holding stage
    const entranceDuration = 220;
    const enterTimer = setTimeout(() => {
      setPhase('holding');
    }, entranceDuration);

    // Progress counter ticker
    const intervalMs = 25;
    const totalSteps = durationMs / intervalMs;
    let stepCount = 0;

    progressIntervalRef.current = setInterval(() => {
      stepCount++;
      const currentPct = Math.min(100, Math.round((stepCount / totalSteps) * 100));
      setProgress(currentPct);

      // Cycle milestone messages based on percentage
      if (milestones && milestones.length > 0) {
        const index = Math.min(
          milestones.length - 1,
          Math.floor((currentPct / 100) * milestones.length)
        );
        setMilestoneIndex(index);
      }

      if (currentPct >= 100) {
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        // Small brief lingering beat at 100% before exit
        timerRef.current = setTimeout(() => {
          triggerExit();
        }, 120);
      }
    }, intervalMs);

    return () => {
      clearTimeout(enterTimer);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isOpen, durationMs, milestones, triggerExit]);

  // Calculate synchronized delays per column based on chosen mode
  const getColumnDelays = useCallback(
    (index: number, total: number) => {
      const baseStagger = 65; // ms per step
      switch (mode) {
        case 'interlocked': {
          // Even columns: Top leads, Bottom follows
          // Odd columns: Bottom leads, Top follows
          const isEven = index % 2 === 0;
          const topEnterDelay = isEven ? index * baseStagger : index * baseStagger + 120;
          const bottomEnterDelay = isEven ? index * baseStagger + 120 : index * baseStagger;
          const topExitDelay = isEven ? (total - 1 - index) * 50 : (total - 1 - index) * 50 + 80;
          const bottomExitDelay = isEven ? (total - 1 - index) * 50 + 80 : (total - 1 - index) * 50;
          return { topEnterDelay, bottomEnterDelay, topExitDelay, bottomExitDelay };
        }
        case 'center-out': {
          // Cascades outward from the center symmetrically
          const center = (total - 1) / 2;
          const dist = Math.abs(index - center);
          const enterDelay = dist * 80;
          const exitDelay = dist * 60;
          return {
            topEnterDelay: enterDelay,
            bottomEnterDelay: enterDelay,
            topExitDelay: exitDelay,
            bottomExitDelay: exitDelay,
          };
        }
        case 'converging':
        default: {
          // Top cascades left-to-right; Bottom cascades counter right-to-left
          const topEnterDelay = index * baseStagger;
          const bottomEnterDelay = (total - 1 - index) * baseStagger;
          const topExitDelay = index * 45;
          const bottomExitDelay = (total - 1 - index) * 45;
          return { topEnterDelay, bottomEnterDelay, topExitDelay, bottomExitDelay };
        }
      }
    },
    [mode]
  );

  if (phase === 'complete' && !isOpen) {
    return null;
  }

  const columns = Array.from({ length: columnCount }, (_, i) => i);
  const isHidden = phase === 'complete' || !isOpen;

  return (
    <div
      id="staircase-preloader-overlay"
      className={`${styles.preloaderOverlay} ${isHidden ? styles.preloaderHidden : ''}`}
      role="status"
      aria-live="polite"
      aria-label="Netteo Multilateral Clearing Engine Preloader"
      aria-busy={phase !== 'complete' && currentState === 'loading'}
    >
      {/* 1. Double Staircase Background Columns */}
      <div className={styles.staircaseContainer} aria-hidden="true">
        {columns.map((colIndex) => {
          const delays = getColumnDelays(colIndex, columnCount);

          // Top panel transform logic
          let topTransform = 'translateY(-100%)';
          let topTransition = 'transform 480ms cubic-bezier(0.85, 0, 0.15, 1)';
          let topDelay = `${delays.topEnterDelay}ms`;

          if (phase === 'holding') {
            topTransform = 'translateY(0%)';
            topDelay = '0ms';
          } else if (phase === 'exit' || phase === 'complete') {
            topTransform = 'translateY(-100%)';
            topTransition = 'transform 440ms cubic-bezier(0.76, 0, 0.24, 1)';
            topDelay = `${delays.topExitDelay}ms`;
          } else if (phase === 'enter') {
            topTransform = 'translateY(0%)';
          }

          // Bottom panel transform logic
          let bottomTransform = 'translateY(100%)';
          let bottomTransition = 'transform 480ms cubic-bezier(0.85, 0, 0.15, 1)';
          let bottomDelay = `${delays.bottomEnterDelay}ms`;

          if (phase === 'holding') {
            bottomTransform = 'translateY(0%)';
            bottomDelay = '0ms';
          } else if (phase === 'exit' || phase === 'complete') {
            bottomTransform = 'translateY(100%)';
            bottomTransition = 'transform 440ms cubic-bezier(0.76, 0, 0.24, 1)';
            bottomDelay = `${delays.bottomExitDelay}ms`;
          } else if (phase === 'enter') {
            bottomTransform = 'translateY(0%)';
          }

          return (
            <div key={colIndex} className={styles.staircaseColumn}>
              {/* Top Staircase Step (Moves down from top) */}
              <div
                className={styles.stepTop}
                style={{
                  backgroundColor: colIndex % 2 === 0 ? 'var(--color-surface-elevated)' : 'var(--color-surface)',
                  transform: prefersReducedMotion ? 'none' : topTransform,
                  transition: prefersReducedMotion ? 'none' : topTransition,
                  transitionDelay: prefersReducedMotion ? '0ms' : topDelay,
                }}
              />

              {/* Bottom Staircase Step (Moves up from bottom) */}
              <div
                className={styles.stepBottom}
                style={{
                  backgroundColor: colIndex % 2 === 0 ? 'var(--color-surface)' : 'var(--color-sand-light)',
                  transform: prefersReducedMotion ? 'none' : bottomTransform,
                  transition: prefersReducedMotion ? 'none' : bottomTransition,
                  transitionDelay: prefersReducedMotion ? '0ms' : bottomDelay,
                }}
              />
            </div>
          );
        })}
      </div>

      {/* 2. Equator Line Accent */}
      <div
        className={`${styles.equatorLine} ${
          phase === 'holding' || phase === 'enter' ? styles.equatorLineActive : ''
        }`}
        aria-hidden="true"
      />

      {/* 3. Central Brand & Settlement Insignia Stage */}
      <div
        className={`${styles.centralStage} ${
          phase === 'holding' || phase === 'enter'
            ? styles.centralStageVisible
            : phase === 'exit'
            ? styles.centralStageExit
            : ''
        }`}
      >
        {/* Insignia / Netting Node Graphic */}
        <div className={styles.insigniaBox}>
          <div className={styles.insigniaPulseRing} />
          <svg
            className={styles.insigniaSvg}
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            {/* Outer Hexagonal Clearing Ring */}
            <circle
              cx="32"
              cy="32"
              r="26"
              stroke="var(--color-border-strong)"
              strokeWidth="1.5"
              strokeDasharray="4 3"
            />
            {/* Tri-Node Directed Obligation Lines Collapsing to Center */}
            <path
              d="M32 12 L32 28"
              stroke="var(--color-wine)"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M14.68 42 L28.54 34"
              stroke="var(--color-wine)"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M49.32 42 L35.46 34"
              stroke="var(--color-wine)"
              strokeWidth="2"
              strokeLinecap="round"
            />
            {/* Central Atomic Net Settlement Nexus */}
            <circle
              cx="32"
              cy="32"
              r="6.5"
              fill="var(--color-wine)"
              stroke="var(--color-surface-elevated)"
              strokeWidth="2"
            />
          </svg>
        </div>

        {/* Counter Badge Header */}
        <div className={styles.counterBadge}>
          <span className={styles.pulseDot} />
          <span>SYNCHRONIZING • {progress.toString().padStart(3, '0')}%</span>
        </div>

        {/* Main Title */}
        <h2 className={styles.preloaderTitle}>Netteo Clearinghouse</h2>

        {/* Dynamic Status / 5-State Render */}
        {currentState === 'error' ? (
          <div className={styles.errorBox} role="alert">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <Icon icon={AlertCircle} size="sm" color="var(--color-danger)" />
              <strong>Settlement Kernel Offline</strong>
            </div>
            <p style={{ margin: 0 }}>{errorMessage}</p>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className={styles.skipButton}
                style={{ marginTop: '8px', color: 'var(--color-danger)', borderColor: 'var(--color-danger-border)' }}
              >
                <Icon icon={RotateCw} size="sm" /> Retry Connection
              </button>
            )}
          </div>
        ) : currentState === 'empty' ? (
          <div className={styles.preloaderStatus}>
            <span style={{ color: 'var(--color-muted)' }}>AWAITING CLEARING SIGNALS...</span>
          </div>
        ) : currentState === 'offline' ? (
          <div className={styles.offlineNotice}>
            <Icon icon={WifiOff} size="sm" color="var(--color-warning)" />
            <span>Offline Mode Active • Local queue ready</span>
          </div>
        ) : (
          <div className={styles.preloaderStatus}>
            {currentState === 'success' ? (
              <span style={{ color: 'var(--color-success)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Icon icon={CheckCircle2} size="sm" color="var(--color-success)" />
                ATOMIC ENGINE READY
              </span>
            ) : (
              milestones[milestoneIndex] || 'PROCESSING...'
            )}
          </div>
        )}

        {/* Progress Bar Track */}
        <div className={styles.progressTrack} aria-hidden="true">
          <div
            className={styles.progressBar}
            style={{
              width: `${progress}%`,
              backgroundColor:
                currentState === 'error'
                  ? 'var(--color-danger)'
                  : currentState === 'success'
                  ? 'var(--color-success)'
                  : 'var(--color-wine)',
            }}
          />
        </div>

        {/* Technical Metadata Footer */}
        <div className={styles.metaFooter}>
          <div className={styles.metaItem}>
            <span>CHAIN:</span>
            <strong style={{ color: 'var(--color-ink)' }}>31611</strong>
          </div>
          <div className={styles.metaItem}>
            <span>ASSET:</span>
            <strong style={{ color: 'var(--color-ink)' }}>MUSD</strong>
          </div>
          <div className={styles.metaItem}>
            <span>MODE:</span>
            <strong style={{ color: 'var(--color-ink)', textTransform: 'uppercase' }}>{mode}</strong>
          </div>

          {showSkip && (
            <button
              type="button"
              className={styles.skipButton}
              onClick={triggerExit}
              disabled={isActionLocked}
              title="Skip preloader animation (Esc)"
              aria-label="Skip preloader animation"
            >
              Skip (Esc)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
