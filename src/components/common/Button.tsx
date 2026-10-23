'use client';

import React, { useRef, useState, useEffect } from 'react';
import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'destructive' | 'sandSolid' | 'wineOutline';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  isLoading?: boolean;
  loadingText?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  enableLift?: boolean;
  enableArrowSlide?: boolean;
  /**
   * Minimum lock time in ms to block duplicate rapid clicks (default: 600ms)
   */
  doubleClickLockMs?: number;
}

/**
 * Netteo Standard Button Component
 *
 * Adheres to:
 * - design-addendum.md §7 (Netteo button spec, 8-10px radius, 120ms motion, no glow)
 * - Prototype_vs_Production_Checklist §4 (Double-click protection, width-locked spinner)
 * - UX.md §13 (Truthful interface feedback)
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    children,
    variant = 'primary',
    isLoading = false,
    loadingText,
    icon,
    iconPosition = 'left',
    enableLift = false,
    enableArrowSlide = false,
    disabled,
    onClick,
    doubleClickLockMs = 600,
    className = '',
    style,
    ...props
  },
  forwardedRef
) {
  const internalRef = useRef<HTMLButtonElement | null>(null);
  const [lockedWidth, setLockedWidth] = useState<number | undefined>(undefined);
  const isClickLockedRef = useRef(false);
  const lockTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Lock width when entering loading state to prevent cumulative layout shift (CLS)
  useEffect(() => {
    if (isLoading && internalRef.current) {
      setLockedWidth(internalRef.current.offsetWidth);
    } else if (!isLoading) {
      setLockedWidth(undefined);
    }
  }, [isLoading]);

  // Clean up lock timer on unmount
  useEffect(() => {
    return () => {
      if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    };
  }, []);

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || isLoading || isClickLockedRef.current) {
      e.preventDefault();
      return;
    }

    // Double-click protection: lock against rapid consecutive clicks
    isClickLockedRef.current = true;
    lockTimerRef.current = setTimeout(() => {
      isClickLockedRef.current = false;
    }, doubleClickLockMs);

    if (onClick) {
      try {
        const maybePromise = onClick(e) as unknown;
        if (maybePromise instanceof Promise) {
          await maybePromise;
        }
      } finally {
        if (!lockTimerRef.current) {
          isClickLockedRef.current = false;
        }
      }
    }
  };

  const variantClass = styles[variant] || styles.primary;
  const isBusy = isLoading;
  const isDisabled = disabled || isBusy;

  const combinedStyle: React.CSSProperties = {
    ...style,
    ...(lockedWidth ? { width: `${lockedWidth}px` } : {}),
  };

  const buttonClasses = [
    styles.button,
    variantClass,
    isBusy ? styles.loading : '',
    enableLift ? styles.liftOnHover : '',
    enableArrowSlide ? styles.arrowSlide : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      ref={(node) => {
        internalRef.current = node;
        if (typeof forwardedRef === 'function') {
          forwardedRef(node);
        } else if (forwardedRef) {
          forwardedRef.current = node;
        }
      }}
      type={props.type || 'button'}
      className={buttonClasses}
      disabled={isDisabled}
      aria-busy={isBusy ? 'true' : undefined}
      aria-disabled={isDisabled ? 'true' : undefined}
      onClick={handleClick}
      style={combinedStyle}
      {...props}
    >
      {isBusy ? (
        <>
          <span className={styles.spinner} role="status" aria-label="Loading..." />
          {loadingText ? <span>{loadingText}</span> : children}
        </>
      ) : (
        <>
          {icon && iconPosition === 'left' && <span style={{ display: 'inline-flex' }}>{icon}</span>}
          <span>{children}</span>
          {icon && iconPosition === 'right' && (
            <span className={enableArrowSlide ? styles.arrowSlideIcon : undefined} style={{ display: 'inline-flex' }}>
              {icon}
            </span>
          )}
        </>
      )}
    </button>
  );
});
