import React from 'react';
import type { CustomIconProps } from './ObligationIcon';

export interface NetPositionIconProps extends CustomIconProps {
  type?: 'credit' | 'debit' | 'zero';
}

/**
 * Custom Netteo Icon: NetPosition
 * Represents a participant's net settlement balance status:
 * - credit: net positive payout receiver (upward arrow)
 * - debit: net debtor deposit required (downward arrow)
 * - zero: balanced position with zero net transfer (even line)
 */
export function NetPositionIcon({
  type = 'zero',
  size = 24,
  strokeWidth = 1.75,
  ...props
}: NetPositionIconProps) {
  if (type === 'credit') {
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
        <title>Net Creditor (Receivable)</title>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 16V8" />
        <path d="M8.5 11.5L12 8l3.5 3.5" />
      </svg>
    );
  }

  if (type === 'debit') {
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
        <title>Net Debtor (Payable)</title>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v8" />
        <path d="M8.5 12.5L12 16l3.5-3.5" />
      </svg>
    );
  }

  // Zero position (balanced)
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
      <title>Zero Net Position (Balanced)</title>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12h8" />
    </svg>
  );
}
