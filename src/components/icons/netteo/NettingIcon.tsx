import React from 'react';
import type { CustomIconProps } from './ObligationIcon';

/**
 * Custom Netteo Icon: Netting
 * Represents multiple reciprocal obligation vectors converging into a single net settlement transfer.
 */
export function NettingIcon({
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
      <title>Obligation Netting</title>
      {/* Three incoming gross lines */}
      <path d="M3 6c4 0 7 3.5 10 6" />
      <path d="M3 12h10" />
      <path d="M3 18c4 0 7-3.5 10-6" />
      {/* Net focal convergence node */}
      <circle cx="13" cy="12" r="1.5" />
      {/* Single resolved net transfer vector */}
      <path d="M14.5 12h6.5" />
      <path d="M18 9l3 3-3 3" />
    </svg>
  );
}
