'use client';

import React, { useId, useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useTheme } from '@/context/ThemeContext';
import styles from './ThemeToggle.module.css';

export interface ThemeToggleProps {
  className?: string;
  size?: 'sm' | 'md';
}

/**
 * Netteo Bespoke Theme Toggle Button
 * Re-created in React + Framer Motion using Skiper UI / Toggles.dev reference.
 * Transforms between Sun (light mode) and Crescent Moon (wine/black dark mode)
 * via dynamic SVG clipPath and rotating rays.
 */
export function ThemeToggle({ className, size = 'md' }: ThemeToggleProps) {
  const { isDark, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const clipId = useId();
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Double-click protection during 240ms motion transition (Prototype Checklist §4)
  const handleToggle = () => {
    if (isLocked) return;
    setIsLocked(true);
    toggleTheme();
    setTimeout(() => {
      setIsLocked(false);
    }, 240);
  };

  const animDuration = shouldReduceMotion ? 0.01 : 0.24;
  const easeStandard: [number, number, number, number] = [0.2, 0, 0, 1];

  const sizeClass = size === 'sm' ? styles.sizeSm : styles.sizeMd;
  const combinedClass = `${styles.toggleButton} ${sizeClass} ${className || ''}`;

  // Prior to hydration, render width-locked skeleton/button to avoid CLS
  if (!mounted) {
    return (
      <button
        type="button"
        className={combinedClass}
        aria-label="Toggle theme"
        disabled
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 32 32"
          className={styles.svgIcon}
          aria-hidden="true"
          fill="currentColor"
          strokeLinecap="round"
        >
          <circle cx="16" cy="16" r="8" />
        </svg>
      </button>
    );
  }

  return (
    <button
      type="button"
      className={combinedClass}
      onClick={handleToggle}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      aria-pressed={isDark}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 32 32"
        className={styles.svgIcon}
        aria-hidden="true"
        fill="currentColor"
        strokeLinecap="round"
      >
        <clipPath id={`skiper-clip-${clipId}`}>
          <motion.path
            initial={false}
            animate={{
              y: isDark ? 10 : 0,
              x: isDark ? -12 : 0,
            }}
            transition={{ ease: easeStandard, duration: animDuration }}
            d="M0-5h30a1 1 0 0 0 9 13v24H0Z"
          />
        </clipPath>
        <g clipPath={`url(#skiper-clip-${clipId})`}>
          <motion.circle
            initial={false}
            animate={{ r: isDark ? 10 : 8 }}
            transition={{ ease: easeStandard, duration: animDuration }}
            cx="16"
            cy="16"
          />
          <motion.g
            initial={false}
            animate={{
              rotate: isDark ? -100 : 0,
              scale: isDark ? 0.5 : 1,
              opacity: isDark ? 0 : 1,
            }}
            transition={{ ease: easeStandard, duration: animDuration }}
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M16 5.5v-4" />
            <path d="M16 30.5v-4" />
            <path d="M1.5 16h4" />
            <path d="M26.5 16h4" />
            <path d="m23.4 8.6 2.8-2.8" />
            <path d="m5.7 26.3 2.9-2.9" />
            <path d="m5.8 5.8 2.8 2.8" />
            <path d="m23.4 23.4 2.9 2.9" />
          </motion.g>
        </g>
      </svg>
    </button>
  );
}
