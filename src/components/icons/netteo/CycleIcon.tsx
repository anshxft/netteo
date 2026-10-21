import React from 'react';
import type { CustomIconProps } from './ObligationIcon';

/**
 * Custom Netteo Icon: Cycle
 * Represents a discrete, bounded settlement cycle moving from accumulation to execution.
 */
export function CycleIcon({
  size = 24,
  strokeWidth = 1.75,
  ...props
}: CustomIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <title>Settlement Cycle</title>
      {/* Top arc flowing clockwise */}
      <path d="M12 3a9 9 0 0 1 9 9" />
      <path d="M21 8v4h-4" />
      {/* Bottom arc completing the cycle */}
      <path d="M12 21a9 9 0 0 1-9-9" />
      <path d="M3 16v-4h4" />
      {/* Center settlement checkpoint */}
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}
