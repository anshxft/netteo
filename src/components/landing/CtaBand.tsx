'use client';

import React from 'react';
import Link from 'next/link';
import styles from './CtaBand.module.css';
import { ArrowRight, FileCode } from 'lucide-react';
import { Icon } from '@/components/icons/Icon';

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
          <Link href="/obligations" className={styles.primaryBtn}>
            <span>Open Obligation Desk</span>
            <Icon icon={ArrowRight} size="sm" color="#FFFFFF" />
          </Link>

          <a
            href="https://github.com/syther069/netteo"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.secondaryLink}
          >
            <Icon icon={FileCode} size="sm" />
            <span>View Architecture Spec ↗</span>
          </a>
        </div>
      </div>
    </section>
  );
}
