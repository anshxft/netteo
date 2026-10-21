import React from 'react';
import type { CustomIconProps } from './ObligationIcon';

/**
 * Custom Netteo Icon: Snapshot
 * Represents a frozen, immutable canonical commitment of obligations.
 */
export function SnapshotIcon({
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
      <title>Frozen Snapshot Commitment</title>
      {/* Outer frame representing frozen ledger */}
      <rect x="3" y="4" width="18" height="16" rx="3" />
      {/* Central cryptographic lock / seal aperture */}
      <circle cx="12" cy="12" r="3.5" />
      {/* Horizontal frozen ledger line indicators */}
      <path d="M7 8h2" />
      <path d="M15 8h2" />
      <path d="M7 16h10" />
    </svg>
  );
}
