import React from 'react';

export interface CustomIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  strokeWidth?: number | string;
}

/**
 * Custom Netteo Icon: Obligation
 * Represents a directed bilateral financial claim between two counterparty nodes.
 */
export function ObligationIcon({
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
      <title>Bilateral Obligation</title>
      {/* Debtor node */}
      <circle cx="5" cy="12" r="2.5" />
      {/* Creditor node */}
      <circle cx="19" cy="12" r="2.5" />
      {/* Directed obligation claim line */}
      <path d="M7.5 12h8" />
      <path d="M12.5 8.5l3.5 3.5-3.5 3.5" />
    </svg>
  );
}
