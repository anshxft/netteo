'use client';

import React from 'react';
import Link from 'next/link';
import styles from './CtaBand.module.css';
import { ArrowRight, FileCode } from 'lucide-react';
import { Icon } from '@/components/icons/Icon';
import { Button } from '@/components/common/Button';

export function CtaBand() {
  return (
    <section className={styles.ctaSection}>
      <div className={styles.ctaContainer}>
        <div className={styles.eyebrow}>
          <span>✦ Get Started Today</span>
        </div>

        <h2 className={styles.headline}>
          Ready to collapse reciprocal debt across your collective?
        </h2>

        <p className={styles.subtext}>
          Start registering payment obligations in seconds. No tokens, no lending risk, zero working capital
          trapped in multi-hop transfer queues.
        </p>

        <div className={styles.btnGroup}>
          <Link href="/obligations" style={{ textDecoration: 'none' }}>
            <Button
              variant="primary"
              icon={<Icon icon={ArrowRight} size="sm" color="#FFFFFF" />}
              iconPosition="right"
              style={{
                minHeight: '50px',
                padding: '0 28px',
                fontSize: '15px',
                borderRadius: 'var(--radius-full)',
              }}
            >
              Open Obligation Desk
            </Button>
          </Link>

          <a
            href="https://github.com/syther069/netteo"
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: 'none' }}
          >
            <Button
              variant="tertiary"
              icon={<Icon icon={FileCode} size="sm" />}
              iconPosition="left"
              style={{ fontSize: '15px', color: 'var(--color-ink)' }}
            >
              View Architecture Spec ↗
            </Button>
          </a>
        </div>
      </div>
    </section>
  );
}
