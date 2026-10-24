'use client';

import React, { useRef } from 'react';
import styles from './TestimonialsCarousel.module.css';
import { ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import { Icon } from '@/components/icons/Icon';

interface Testimonial {
  id: string;
  heading: string;
  quote: string;
  author: string;
  role: string;
  company: string;
  initials: string;
  metric: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    id: '1',
    heading: '“Saved 68% liquidity on hackathon payouts”',
    quote:
      'Instead of chasing 14 separate invoices each month across our 5 developers, Netteo netted out $38,000 of circular debt into two simple MUSD deposits. Saved our infra pod over 15 hours of accounting.',
    author: 'Alex Rivera',
    role: 'Engineering Pod Lead',
    company: '@genesis-infra',
    initials: 'AR',
    metric: '68% Capital Freed',
  },
  {
    id: '2',
    heading: '“Zero disputes before smart contract settlement”',
    quote:
      'The debtor-acknowledgement requirement solved our biggest headache: disputed claims. When everyone cryptographically signs their obligations, settlements execute without drama.',
    author: 'Elena Vance',
    role: 'Operations Lead',
    company: '@devdao-guild',
    initials: 'EV',
    metric: '0 Disputed Invoices',
  },
  {
    id: '3',
    heading: '“Full on-chain Merkle audit compliance”',
    quote:
      'Being able to inspect the exact Merkle commitment hash and gross obligations on Mezo gives our audit committee complete confidence. Nothing is obscured or erased.',
    author: 'Marcus Thorne',
    role: 'Protocol Architect',
    company: '@corelabs',
    initials: 'MT',
    metric: '100% Verifiable',
  },
  {
    id: '4',
    heading: '“Contributors get paid days faster”',
    quote:
      'We cut our monthly liquidity funding requirement by 72%. Our contributors get paid faster because capital isn’t waiting in multi-hop transfer queues across different wallets.',
    author: 'Sarah Tanaka',
    role: 'Treasury Coordinator',
    company: '@station3',
    initials: 'ST',
    metric: '72% Liquidity Conserved',
  },
];

export function TestimonialsCarousel() {
  const trackRef = useRef<HTMLDivElement>(null);

  const handleScroll = (direction: 'left' | 'right') => {
    if (!trackRef.current) return;
    const card = trackRef.current.querySelector(`.${styles.testimonialCard}`) as HTMLElement | null;
    const scrollStep = card ? card.offsetWidth + 24 : trackRef.current.clientWidth * 0.85;
    const offset = direction === 'left' ? -scrollStep : scrollStep;
    trackRef.current.scrollBy({ left: offset, behavior: 'smooth' });
  };

  return (
    <section id="testimonials" className={styles.sectionWrapper}>
      <div className={styles.headerContainer}>
        <div className={styles.eyebrow}>
          <span>✦ Verified Testimonials</span>
        </div>
        <h2 className={styles.title}>
          Trusted by collective coordinators who
          <span className={styles.highlightPill}>value clarity</span>
        </h2>
        <p className={styles.subtitle}>
          How engineering pods and DAO working groups eliminate invoice friction with multilateral clearing.
        </p>
      </div>

      <div className={styles.carouselWrapper}>
        <div ref={trackRef} className={styles.cardsTrack}>
          {TESTIMONIALS.map((t) => (
            <div key={t.id} className={styles.testimonialCard}>
              <div className={styles.cardTop}>
                <div className={styles.metricBadge}>
                  <CheckCircle2 size={12} />
                  <span>{t.metric}</span>
                </div>
                <h3 className={styles.cardHeading}>{t.heading}</h3>
                <p className={styles.cardQuote}>{t.quote}</p>
              </div>

              <div className={styles.authorBlock}>
                <div className={styles.avatar}>{t.initials}</div>
                <div className={styles.authorMeta}>
                  <span className={styles.authorName}>{t.author}</span>
                  <span className={styles.authorRole}>
                    {t.role} <span className={styles.companyTag}>{t.company}</span>
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Previous and Next Navigation Controls */}
        <div className={styles.controlsRow}>
          <button
            type="button"
            className={styles.navBtn}
            onClick={() => handleScroll('left')}
            aria-label="Previous testimonial"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            className={styles.navBtn}
            onClick={() => handleScroll('right')}
            aria-label="Next testimonial"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </section>
  );
}
