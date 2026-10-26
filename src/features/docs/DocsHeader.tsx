'use client';

import React from 'react';
import Link from 'next/link';
import styles from './DocsHeader.module.css';
import { Search, ArrowRight, ExternalLink, Menu, X, BookOpen } from 'lucide-react';
import { Icon } from '@/components/icons/Icon';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { NetteoLogoMark } from '@/components/common/NetteoLogo';

interface DocsHeaderProps {
  onOpenSearch: () => void;
  mobileMenuOpen: boolean;
  onToggleMobileMenu: () => void;
}

export function DocsHeader({ onOpenSearch, mobileMenuOpen, onToggleMobileMenu }: DocsHeaderProps) {
  return (
    <header className={styles.header} aria-label="Documentation Header">
      <div className={styles.headerInner}>
        {/* Left: Mobile hamburger & Brand */}
        <div className={styles.leftGroup}>
          <button
            type="button"
            className={styles.mobileToggle}
            onClick={onToggleMobileMenu}
            aria-label={mobileMenuOpen ? 'Close navigation drawer' : 'Open navigation drawer'}
            aria-expanded={mobileMenuOpen}
          >
            <Icon icon={mobileMenuOpen ? X : Menu} size="md" />
          </button>

          <Link href="/" className={styles.brandLink}>
            <NetteoLogoMark size={24} />
            <span className={styles.brandLogo}>Netteo</span>
            <span className={styles.docsBadge}>DOCS</span>
          </Link>
        </div>

        {/* Center: Live Protocol Indicator */}
        <div className={styles.centerStatus}>
          <span className={styles.pulseDot} />
          <span className={styles.statusText}>SPECIFICATION // MEZO TESTNET PROTOCOL (31611)</span>
        </div>

        {/* Right: Search, GitHub, Explorer, Theme, App Button */}
        <div className={styles.rightGroup}>
          <button
            type="button"
            onClick={onOpenSearch}
            className={styles.searchButton}
            aria-label="Search documentation"
          >
            <Icon icon={Search} size="sm" />
            <span className={styles.searchText}>Search...</span>
            <kbd className={styles.searchKbd}>⌘K</kbd>
          </button>

          <div className={styles.divider} />

          <a
            href="https://github.com/syther069/netteo"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.iconLink}
            aria-label="GitHub Repository"
            title="View on GitHub"
          >
            <Icon icon={BookOpen} size="sm" />
            <span className={styles.desktopOnlyText}>GitHub</span>
          </a>

          <a
            href="https://explorer.test.mezo.org"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.iconLink}
            aria-label="Mezo Testnet Explorer"
            title="Mezo Testnet Explorer"
          >
            <span className={styles.desktopOnlyText}>Explorer</span>
            <Icon icon={ExternalLink} size="sm" />
          </a>

          <ThemeToggle size="sm" />

          <Link href="/obligations" className={styles.appCtaButton}>
            <span>Open Desk</span>
            <Icon icon={ArrowRight} size="sm" />
          </Link>
        </div>
      </div>
    </header>
  );
}
