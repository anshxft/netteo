'use client';

import React from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/common/Button';
import { Icon } from '@/components/icons/Icon';
import { FileQuestion, ArrowLeft, RefreshCw, Compass } from 'lucide-react';

export default function NotFound() {
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
            backgroundColor: 'var(--color-sand)',
            border: '1px solid var(--color-border)',
            marginBottom: 'var(--space-xl)',
            color: 'var(--color-wine)',
          }}
        >
          <Icon icon={FileQuestion} size="lg" color="var(--color-wine)" />
        </div>

        <span
          style={{
            fontSize: '12px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--color-wine)',
            marginBottom: 'var(--space-xs)',
          }}
        >
          404 &bull; Record Not Found
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
          Settlement Record Unavailable
        </h1>

        <p
          style={{
            fontSize: '16px',
            color: 'var(--color-ink-secondary)',
            maxWidth: '520px',
            lineHeight: 1.6,
            marginBottom: 'var(--space-2xl)',
          }}
        >
          The settlement cycle, obligation, or desk address you requested does not exist or has been moved to an archived settlement batch on Mezo Testnet.
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
          <Link href="/obligations" style={{ textDecoration: 'none' }}>
            <Button variant="primary" icon={<Icon icon={Compass} size="sm" />}>
              Open Obligations Desk
            </Button>
          </Link>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <Button variant="secondary" icon={<Icon icon={ArrowLeft} size="sm" />}>
              Return to Protocol Home
            </Button>
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
