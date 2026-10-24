'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './LandingNavbar.module.css';
import { Menu, X, ArrowRight } from 'lucide-react';
import { Icon } from '@/components/icons/Icon';

const NAV_LINKS = [
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Netting Solver', href: '#simulator' },
  { label: 'Architecture', href: '#architecture' },
  { label: 'Testimonials', href: '#testimonials' },
  { label: 'FAQ', href: '#faq' },
];

export function LandingNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className={styles.navWrapper}>
      <nav className={styles.navPill} aria-label="Landing Page Navigation">
        {/* Brand */}
        <Link href="/" className={styles.brandGroup}>
          <span className={styles.brandLogo}>Netteo</span>
          <div className={styles.networkBadge}>
            <span className={styles.networkDot} />
            <span>Mezo Testnet</span>
          </div>
        </Link>

        {/* Center Desktop Links */}
        <ul className={styles.navLinks}>
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <a href={link.href} className={styles.navLink}>
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        {/* Right CTA */}
        <div className={styles.navActions}>
          <Link href="/obligations" className={styles.ctaButton}>
            <span>Open Desk</span>
            <Icon icon={ArrowRight} size="sm" color="#FFFFFF" />
          </Link>

          {/* Mobile Hamburger */}
          <button
            type="button"
            className={styles.mobileToggle}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileOpen}
          >
            <Icon icon={mobileOpen ? X : Menu} size="md" />
          </button>
        </div>
      </nav>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className={styles.mobileDrawerOverlay} onClick={() => setMobileOpen(false)}>
          <div
            className={styles.mobileDrawerContent}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Mobile Navigation Drawer"
          >
            <div className={styles.drawerHeader}>
              <div className={styles.brandGroup}>
                <span className={styles.brandLogo}>Netteo</span>
                <div className={styles.networkBadge}>
                  <span className={styles.networkDot} />
                  <span>Mezo Testnet</span>
                </div>
              </div>
              <button
                type="button"
                className={styles.mobileToggle}
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
              >
                <Icon icon={X} size="md" />
              </button>
            </div>

            <ul className={styles.drawerLinks}>
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className={styles.drawerLink}
                    onClick={() => setMobileOpen(false)}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>

            <Link
              href="/obligations"
              className={styles.drawerCta}
              onClick={() => setMobileOpen(false)}
            >
              <span>Launch Obligation Desk</span>
              <Icon icon={ArrowRight} size="sm" color="#FFFFFF" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
