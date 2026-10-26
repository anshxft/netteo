import React from 'react';

export interface NetteoLogoProps {
  size?: number | string;
  variant?: 'mark' | 'tile' | 'full';
  showTagline?: boolean;
  className?: string;
  style?: React.CSSProperties;
  priority?: boolean;
}

/**
 * Netteo Official Brand Logo Mark
 *
 * Sourced from official brand asset:
 * Architectural monogram composed of converging financial vectors (Wine Red, Warm Sand, and Ink)
 * collapsing reciprocal obligations into an equilibrium netting point.
 */
export function NetteoLogoMark({
  size = 28,
  className,
  style,
  ...props
}: Omit<NetteoLogoProps, 'variant' | 'showTagline'> & React.HTMLAttributes<HTMLSpanElement>) {
  const pixelSize = typeof size === 'number' ? `${size}px` : size;
  const numSize = typeof size === 'number' ? size : parseInt(size, 10) || 28;

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: pixelSize,
        height: pixelSize,
        flexShrink: 0,
        verticalAlign: 'middle',
        ...style,
      }}
      aria-label="Netteo Brand Mark"
      role="img"
      {...props}
    >
      <picture style={{ display: 'contents' }}>
        <source srcSet="/brand/netteo-mark.webp" type="image/webp" />
        <img
          src="/brand/netteo-mark.png"
          alt="Netteo"
          width={numSize}
          height={numSize}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            display: 'block',
          }}
          loading="eager"
          decoding="async"
        />
      </picture>
    </span>
  );
}

/**
 * Netteo Official Squircle Tile Logo
 * Features the brand mark seated within a refined warm sand (#FDF9F2) squircle medallion.
 */
export function NetteoLogoTile({
  size = 32,
  className,
  style,
  ...props
}: Omit<NetteoLogoProps, 'variant' | 'showTagline'> & React.HTMLAttributes<HTMLSpanElement>) {
  const pixelSize = typeof size === 'number' ? `${size}px` : size;
  const numSize = typeof size === 'number' ? size : parseInt(size, 10) || 32;

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: pixelSize,
        height: pixelSize,
        flexShrink: 0,
        verticalAlign: 'middle',
        borderRadius: typeof size === 'number' ? `${Math.round(size * 0.22)}px` : '8px',
        overflow: 'hidden',
        ...style,
      }}
      aria-label="Netteo Brand Tile"
      role="img"
      {...props}
    >
      <picture style={{ display: 'contents' }}>
        <source srcSet="/brand/netteo-tile.webp" type="image/webp" />
        <img
          src="/brand/netteo-tile.png"
          alt="Netteo"
          width={numSize}
          height={numSize}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            display: 'block',
          }}
          loading="eager"
          decoding="async"
        />
      </picture>
    </span>
  );
}

/**
 * Netteo Complete Brand Logo
 * Supports mark, tile, or full brand presentation with typographic wordmark.
 */
export function NetteoLogo({
  size = 28,
  variant = 'mark',
  showTagline = false,
  className,
  style,
  ...props
}: NetteoLogoProps) {
  if (variant === 'tile') {
    return <NetteoLogoTile size={size} className={className} style={style} {...props} />;
  }

  if (variant === 'mark') {
    return <NetteoLogoMark size={size} className={className} style={style} {...props} />;
  }

  const numSize = typeof size === 'number' ? size : parseInt(size, 10) || 28;

  return (
    <div
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '10px',
        textDecoration: 'none',
        ...style,
      }}
    >
      <NetteoLogoMark size={size} {...props} />
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
        <span
          style={{
            fontFamily: 'inherit',
            fontWeight: 700,
            fontSize: `${Math.round(numSize * 0.72)}px`,
            letterSpacing: '-0.03em',
            color: 'var(--color-ink, #211A1B)',
            textTransform: 'none',
          }}
        >
          netteo
        </span>
        {showTagline && (
          <span
            style={{
              fontSize: `${Math.max(8, Math.round(numSize * 0.3))}px`,
              fontWeight: 600,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--color-muted, #756B6B)',
              marginTop: '3px',
            }}
          >
            Multilateral Netting
          </span>
        )}
      </div>
    </div>
  );
}
