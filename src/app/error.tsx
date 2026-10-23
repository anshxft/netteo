'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/common/Button';
import { Icon } from '@/components/icons/Icon';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorBoundary({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log sanitized error identifier in development; never expose stack traces to client telemetry
    if (process.env.NODE_ENV === 'development') {
      console.error('[Netteo Protocol Error Boundary]:', error.message);
    }
  }, [error]);

  return (
    <AppLayout>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          textAlign: 'center',
          padding: 'var(--space-3xl) var(--space-lg)',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '64px',
            height: '64px',
            borderRadius: 'var(--radius-lg)',
            backgroundColor: 'var(--color-danger-bg)',
            border: '1px solid var(--color-danger-border)',
            marginBottom: 'var(--space-xl)',
            color: 'var(--color-danger)',
          }}
        >
          <Icon icon={AlertTriangle} size="lg" color="var(--color-danger)" />
        </div>

        <span
          style={{
            fontSize: '12px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--color-danger)',
            marginBottom: 'var(--space-xs)',
          }}
        >
          Protocol Interface Notice
        </span>

        <h1
          style={{
            fontSize: 'clamp(28px, 4vw, 40px)',
            fontWeight: 700,
            color: 'var(--color-ink)',
            marginBottom: 'var(--space-md)',
            letterSpacing: '-0.02em',
          }}
        >
          Settlement Synchronization Interrupted
        </h1>

        <p
          style={{
            fontSize: '16px',
            color: 'var(--color-ink-secondary)',
            maxWidth: '540px',
            lineHeight: 1.6,
            marginBottom: 'var(--space-2xl)',
          }}
        >
          An unexpected interface exception occurred while communicating with the Mezo RPC or reading the on-chain settlement state. No funds or commitments were affected.
        </p>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-md)',
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          <Button
            variant="primary"
            icon={<Icon icon={RefreshCw} size="sm" />}
            onClick={() => reset()}
          >
            Retry Synchronization
          </Button>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <Button variant="secondary" icon={<Icon icon={Home} size="sm" />}>
              Return to Protocol Home
            </Button>
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
