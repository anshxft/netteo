import React from 'react';
import type { LucideIcon, LucideProps } from 'lucide-react';

export type IconSize = 'sm' | 'md' | 'lg';

export interface IconProps extends Omit<LucideProps, 'size'> {
  icon: LucideIcon | React.ComponentType<React.SVGProps<SVGSVGElement> & { size?: number | string; strokeWidth?: number | string }>;
  size?: IconSize | number;
  strokeWidth?: number;
  color?: string;
  className?: string;
  ariaLabel?: string;
}

const SIZE_MAP: Record<IconSize, number> = {
  sm: 16, // --icon-size-sm
  md: 20, // --icon-size-md
  lg: 24, // --icon-size-lg
};

/**
 * Unified Netteo Icon wrapper.
 * Enforces:
 * - Single unified stroke token (--icon-stroke: 1.75px) across Lucide and custom SVGs.
 * - Consistent size tokens (sm: 16px, md: 20px, lg: 24px).
 * - Stroke linecap & linejoin set to 'round'.
 * - Accessible aria-hidden when purely decorative, or role="img" when labelled.
 */
export function Icon({
  icon: Component,
  size = 'md',
  strokeWidth = 1.75, // Netteo token --icon-stroke
  color = 'currentColor',
  className = '',
  ariaLabel,
  ...props
}: IconProps) {
  const pixelSize = typeof size === 'number' ? size : SIZE_MAP[size];

  const accessibilityProps = ariaLabel
    ? { role: 'img', 'aria-label': ariaLabel }
    : { 'aria-hidden': true };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        lineHeight: 1,
        verticalAlign: 'middle',
      }}
      {...accessibilityProps}
    >
      <Component
        size={pixelSize}
        width={pixelSize}
        height={pixelSize}
        strokeWidth={strokeWidth}
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        {...props}
      />
    </span>
  );
}
