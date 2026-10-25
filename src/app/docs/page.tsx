'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import styles from './page.module.css';
import { ALL_SECTIONS, getSectionById, type DocSection } from '@/features/docs/docsData';
import { DocsHeader } from '@/features/docs/DocsHeader';
import { DocsSidebar } from '@/features/docs/DocsSidebar';
import { DocsTOC } from '@/features/docs/DocsTOC';
import { DocsSearchModal } from '@/features/docs/DocsSearchModal';
import { DocsContentRenderer } from '@/features/docs/docsContent';
import { ArrowLeft, ArrowRight, ArrowUp, WifiOff } from 'lucide-react';
import { Icon } from '@/components/icons/Icon';

function DocsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Active section state
  const initialSectionId = searchParams.get('section') || 'overview';
  const [activeSectionId, setActiveSectionId] = useState<string>(initialSectionId);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  // Sync section from URL query param
  useEffect(() => {
    const s = searchParams.get('section');
    if (s && getSectionById(s)) {
      setActiveSectionId(s);
    }
  }, [searchParams]);

  // Track scroll progress & scroll-to-top button
  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        const currentProgress = (window.scrollY / totalHeight) * 100;
        setScrollProgress(Math.min(100, Math.max(0, currentProgress)));
      }
      setShowScrollTop(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOffline(!navigator.onLine);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSelectSection = (sectionId: string) => {
    setActiveSectionId(sectionId);
    router.replace(`/docs?section=${sectionId}`, { scroll: false });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const currentSection: DocSection = getSectionById(activeSectionId) || ALL_SECTIONS[0];
  const currentIndex = ALL_SECTIONS.findIndex((s) => s.id === currentSection.id);
  const prevSection = currentIndex > 0 ? ALL_SECTIONS[currentIndex - 1] : null;
  const nextSection = currentIndex < ALL_SECTIONS.length - 1 ? ALL_SECTIONS[currentIndex + 1] : null;

  return (
    <div className={styles.pageWrapper}>
      {/* Scroll Progress Bar */}
      <div
        className={styles.scrollProgressBar}
        style={{ width: `${scrollProgress}%` }}
        role="progressbar"
        aria-valuenow={Math.round(scrollProgress)}
        aria-valuemin={0}
        aria-valuemax={100}
      />

      {/* Offline Status Warning */}
      {isOffline && (
        <div className={styles.offlineBanner} role="status">
          <Icon icon={WifiOff} size="sm" />
          <span>You are currently offline. Viewing cached protocol documentation.</span>
        </div>
      )}

      {/* Top Header */}
      <DocsHeader
        onOpenSearch={() => setSearchModalOpen(true)}
        mobileMenuOpen={mobileMenuOpen}
        onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
      />

      {/* 3-Column Documentation Container */}
      <div className={styles.docsContainer}>
        {/* Left Column: Categorized Navigation */}
        <DocsSidebar
          activeSectionId={currentSection.id}
          onSelectSection={handleSelectSection}
          onOpenSearch={() => setSearchModalOpen(true)}
          isOpenMobile={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
        />

        {/* Center Column: Specification Body */}
        <main className={styles.mainPane} id="docs-content-pane">
          {/* Breadcrumb Path */}
          <nav className={styles.breadcrumbs} aria-label="Documentation Breadcrumbs">
            <span className={styles.specBadge}>SPEC</span>
            <span className={styles.breadcrumbSlash}>//</span>
            <span className={styles.breadcrumbGroup}>{currentSection.group}</span>
            <span className={styles.breadcrumbSlash}>//</span>
            <span className={styles.breadcrumbCurrent}>{currentSection.title}</span>
          </nav>

          {/* Section Header */}
          <header className={styles.sectionHeader}>
            <div className={styles.titleRow}>
              <h1 className={styles.sectionTitle}>{currentSection.title}</h1>
              {currentSection.badge && (
                <span
                  className={`${styles.sectionBadge} ${
                    currentSection.badge === 'Live' || currentSection.badge === 'Core'
                      ? styles.sectionBadgeAccent
                      : ''
                  }`}
                >
                  {currentSection.badge}
                </span>
              )}
            </div>
            <p className={styles.sectionDescription}>{currentSection.description}</p>
          </header>

          {/* Render Rich Specification Body */}
          <DocsContentRenderer sectionId={currentSection.id} />

          {/* Previous / Next Navigation Cards */}
          <nav className={styles.prevNextNav} aria-label="Specification Navigation">
            {prevSection ? (
              <button
                type="button"
                className={styles.navCard}
                onClick={() => handleSelectSection(prevSection.id)}
              >
                <div className={styles.navCardDirection}>
                  <Icon icon={ArrowLeft} size="sm" />
                  <span>PREVIOUS SPECIFICATION</span>
                </div>
                <div className={styles.navCardTitle}>{prevSection.title}</div>
                <div className={styles.navCardDesc}>{prevSection.description}</div>
              </button>
            ) : (
              <div />
            )}

            {nextSection && (
              <button
                type="button"
                className={`${styles.navCard} ${styles.navCardRight}`}
                onClick={() => handleSelectSection(nextSection.id)}
              >
                <div className={styles.navCardDirection}>
                  <span>NEXT SPECIFICATION</span>
                  <Icon icon={ArrowRight} size="sm" />
                </div>
                <div className={styles.navCardTitle}>{nextSection.title}</div>
                <div className={styles.navCardDesc}>{nextSection.description}</div>
              </button>
            )}
          </nav>

          {/* Documentation Page Footer */}
          <footer className={styles.docsFooter}>
            <div>
              NETTEO PROTOCOL // MULTILATERAL OBLIGATION NETTING SPECIFICATION.
            </div>
            <div className={styles.footerLinks}>
              <a
                href="https://github.com/syther069/netteo"
                target="_blank"
                rel="noreferrer"
                className={styles.footerLink}
              >
                [ GitHub ]
              </a>
              <a
                href="https://explorer.test.mezo.org/address/0x3c5Efa1E7fb42ec5351d132bcAce83C8C4dbc3D5"
                target="_blank"
                rel="noreferrer"
                className={styles.footerLink}
              >
                [ Mezo Contract ]
              </a>
            </div>
          </footer>
        </main>

        {/* Right Column: Sticky Table of Contents */}
        <DocsTOC subsections={currentSection.subsections} />
      </div>

      {/* Floating Scroll To Top Button */}
      {showScrollTop && (
        <button
          type="button"
          className={styles.scrollTopBtn}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Scroll back to top of documentation"
        >
          <Icon icon={ArrowUp} size="sm" />
          <span>TOP</span>
        </button>
      )}

      {/* ⌘K Search Modal */}
      <DocsSearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        onSelectSection={handleSelectSection}
      />
    </div>
  );
}

export default function DocsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center font-mono text-sm font-bold text-[#7F011F] bg-[#F9F6EF]">
          [ LOADING NETTEO SPECIFICATION MANUAL... ]
        </div>
      }
    >
      <DocsContent />
    </Suspense>
  );
}
