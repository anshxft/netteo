'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import styles from './DocsSearchModal.module.css';
import { ALL_SECTIONS, type DocSection } from './docsData';
import { Search, X, CornerDownLeft, FileText, ArrowRight } from 'lucide-react';
import { Icon } from '@/components/icons/Icon';

interface SearchResult {
  section: DocSection;
  matchedSubsection?: string;
  matchedKeyword?: string;
}

interface DocsSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSection: (sectionId: string, subId?: string) => void;
}

export function DocsSearchModal({ isOpen, onClose, onSelectSection }: DocsSearchModalProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Global keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      } else if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Search filtering
  const results: SearchResult[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      // Return top 6 featured sections by default
      return ALL_SECTIONS.slice(0, 6).map((section) => ({ section }));
    }

    const matches: SearchResult[] = [];

    ALL_SECTIONS.forEach((section) => {
      const titleMatch = section.title.toLowerCase().includes(q);
      const descMatch = section.description.toLowerCase().includes(q);
      const groupMatch = section.group.toLowerCase().includes(q);

      // Check subsections
      const matchedSub = section.subsections.find((sub) =>
        sub.title.toLowerCase().includes(q)
      );

      // Check keywords
      const matchedKw = section.keywords.find((kw) => kw.toLowerCase().includes(q));

      if (titleMatch || descMatch || groupMatch || matchedSub || matchedKw) {
        matches.push({
          section,
          matchedSubsection: matchedSub?.title,
          matchedKeyword: matchedKw,
        });
      }
    });

    return matches;
  }, [query]);

  // Handle arrow key navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = results[selectedIndex];
      if (selected) {
        onSelectSection(selected.section.id);
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Search documentation"
      >
        {/* Search Input Bar */}
        <div className={styles.inputRow}>
          <Icon icon={Search} size="md" color="var(--color-wine)" />
          <input
            ref={inputRef}
            type="text"
            className={styles.input}
            placeholder="Search specs, invariants, MUSD, contracts, methods..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
          />
          {query && (
            <button
              type="button"
              className={styles.clearBtn}
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              aria-label="Clear query"
            >
              <Icon icon={X} size="sm" />
            </button>
          )}
          <kbd className={styles.escBadge} onClick={onClose}>ESC</kbd>
        </div>

        {/* Results List */}
        <div className={styles.resultsArea}>
          {results.length > 0 ? (
            <ul ref={listRef} className={styles.resultList} role="listbox">
              {results.map((res, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <li
                    key={`${res.section.id}-${idx}`}
                    role="option"
                    aria-selected={isSelected}
                    className={`${styles.resultItem} ${isSelected ? styles.resultItemSelected : ''}`}
                    onClick={() => {
                      onSelectSection(res.section.id);
                      onClose();
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                  >
                    <div className={styles.resultIcon}>
                      <Icon icon={FileText} size="sm" />
                    </div>
                    <div className={styles.resultMeta}>
                      <div className={styles.resultGroup}>{res.section.group}</div>
                      <div className={styles.resultTitle}>{res.section.title}</div>
                      {res.matchedSubsection && (
                        <div className={styles.resultSubMatch}>
                          ↳ Subheading: <span>{res.matchedSubsection}</span>
                        </div>
                      )}
                      <div className={styles.resultDesc}>{res.section.description}</div>
                    </div>
                    <div className={styles.resultAction}>
                      <span className={styles.actionKbd}>
                        <Icon icon={CornerDownLeft} size="sm" />
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className={styles.emptyState}>
              <p className={styles.emptyTitle}>No matching documentation found</p>
              <p className={styles.emptyDesc}>
                We couldn&apos;t find any specifications matching &ldquo;<strong>{query}</strong>&rdquo;. Try searching for &ldquo;kernel&rdquo;, &ldquo;musd&rdquo;, &ldquo;zero-sum&rdquo;, or &ldquo;cycle&rdquo;.
              </p>
              <button
                type="button"
                className={styles.resetBtn}
                onClick={() => setQuery('')}
              >
                Clear Search Query
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer Tips */}
        <div className={styles.modalFooter}>
          <div className={styles.footerTip}>
            <kbd className={styles.footerKbd}>↑</kbd>
            <kbd className={styles.footerKbd}>↓</kbd>
            <span>Navigate</span>
          </div>
          <div className={styles.footerTip}>
            <kbd className={styles.footerKbd}>↵</kbd>
            <span>Select</span>
          </div>
          <div className={styles.footerTip}>
            <kbd className={styles.footerKbd}>ESC</kbd>
            <span>Close</span>
          </div>
        </div>
      </div>
    </div>
  );
}
