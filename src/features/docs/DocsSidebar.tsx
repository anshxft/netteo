'use client';

import React from 'react';
import styles from './DocsSidebar.module.css';
import { DOC_GROUPS, type DocSection } from './docsData';
import { ChevronRight, Search, X } from 'lucide-react';
import { Icon } from '@/components/icons/Icon';

interface DocsSidebarProps {
  activeSectionId: string;
  onSelectSection: (sectionId: string) => void;
  onOpenSearch: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export function DocsSidebar({
  activeSectionId,
  onSelectSection,
  onOpenSearch,
  isOpenMobile,
  onCloseMobile,
}: DocsSidebarProps) {
  const handleSelect = (sectionId: string) => {
    onSelectSection(sectionId);
    onCloseMobile();
  };

  const content = (
    <div className={styles.sidebarContent}>
      {/* Search trigger inside sidebar */}
      <div className={styles.searchBoxWrapper}>
        <button
          type="button"
          onClick={onOpenSearch}
          className={styles.sidebarSearchBtn}
          aria-label="Search specifications"
        >
          <Icon icon={Search} size="sm" />
          <span>Search documentation...</span>
          <kbd className={styles.kbd}>⌘K</kbd>
        </button>
      </div>

      {/* Group Navigation */}
      <nav className={styles.nav} aria-label="Documentation Categories">
        {DOC_GROUPS.map((group) => (
          <div key={group.id} className={styles.groupBlock}>
            <div className={styles.groupHeader}>
              <span>{group.title}</span>
            </div>
            <ul className={styles.sectionList}>
              {group.sections.map((section: DocSection) => {
                const isActive = section.id === activeSectionId;
                return (
                  <li key={section.id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(section.id)}
                      className={`${styles.sectionBtn} ${isActive ? styles.sectionBtnActive : ''}`}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <div className={styles.sectionLabelRow}>
                        <span className={styles.sectionTitle}>{section.title}</span>
                        {section.badge && (
                          <span
                            className={`${styles.sectionBadge} ${
                              section.badge === 'Live' || section.badge === 'Core'
                                ? styles.badgeAccent
                                : ''
                            }`}
                          >
                            {section.badge}
                          </span>
                        )}
                      </div>
                      <span className={styles.chevron}>
                        <Icon icon={ChevronRight} size="sm" />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  );

  return (
    <>
      {/* Desktop Sticky Sidebar */}
      <aside className={styles.desktopSidebar}>
        {content}
      </aside>

      {/* Mobile Drawer */}
      {isOpenMobile && (
        <div className={styles.mobileOverlay} onClick={onCloseMobile}>
          <div
            className={styles.mobileDrawer}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Documentation Navigation"
          >
            <div className={styles.drawerHeader}>
              <div className={styles.drawerBrand}>
                <span className={styles.brandTitle}>Netteo</span>
                <span className={styles.docsBadge}>DOCS</span>
              </div>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={onCloseMobile}
                aria-label="Close navigation"
              >
                <Icon icon={X} size="md" />
              </button>
            </div>
            <div className={styles.drawerScrollArea}>
              {content}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
